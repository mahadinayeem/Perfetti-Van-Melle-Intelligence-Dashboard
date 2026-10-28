import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getValidToken } from '@/lib/sokrioClient';
import territoriesMasterData from '@/lib/territoriesMaster.json';

export interface LiveDetailRecord {
  id?: string;
  cluster: string;
  area: string;
  territory: string;
  dbCode: string;
  dbName: string;
  dbType: string;
  srPositionCode: string;
  srCode: string;
  srName: string;
  routeCode: string;
  routeName: string;
  routeChannel: string;
  scheduleCall: number;
  visitedOutlet: number;
  strikeRate: number;
  productiveCall: number;
  productivityPct: number;
  todayTarget: number;
  orderValueWholesale: number;
  orderValueRetail: number;
  orderValue: number;
  successPct: number;
  perPcValue: number;
  tls: number;
  lpc: number;
  brandHandle: number;
  lastSyncTime: string;
  startWorkTime: string;
  endWorkTime: string;
  totalWorkingHours: string;
  firstCall: string;
  lastCall: string;
  totalMarketWork: string;
  totalSpendTimeOrderTaking: string;
  transitTime: string;
  locationAccuracy: number;
  twoLpcOrder: number;
  noOfJarOrderQty: number;
  srLeave: string;
}

interface CacheEntry {
  records: LiveDetailRecord[];
  meta: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache
const inflightPromises = new Map<string, Promise<{ records: LiveDetailRecord[]; meta: any }>>();

const SR_METADATA_MAP: Record<string, { srPositionCode: string; srName: string; territory: string; territoryCode: string; dbCode: string; dbName: string }> = {
  '54506': { srPositionCode: 'DM-060', srName: 'Mostafizur Rahman', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
  '53995': { srPositionCode: 'DM-057', srName: 'Chaon Khandker', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
  '54233': { srPositionCode: 'DM-059', srName: 'Md. Asebur Rahman Ashik', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
  '51639': { srPositionCode: 'DM-217', srName: 'Md. Shawkat Hossen', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
};

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeDiffMinutes(t1: string | null, t2: string | null): number {
  if (!t1 || !t2) return 0;
  const parse = (s: string) => {
    const match = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return 0;
    let [_, hStr, mStr, , ampm] = match;
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
  };
  const diff = parse(t2) - parse(t1);
  return Math.max(0, diff);
}

function extractTimeOnly(dateTimeStr: string | null, fallback: string): string {
  if (!dateTimeStr) return fallback;
  const match = dateTimeStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)/i);
  return match ? match[1] : fallback;
}

async function fetchLiveDetailFromSokrio(startDate: string, endDate: string): Promise<{ records: LiveDetailRecord[]; meta: any }> {
  let token = await getValidToken();

  const makeRequests = async (authToken: string) => {
    const checkinUrl = `https://pvm.report.sokrio.com/api/v1/checkin-report?range=${startDate}%2C${endDate}&territory_id=1&roles=&type=xlsx&download`;
    const orderUrl = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${startDate}%2C${endDate}&territory_id=1&download&type=xlsx`;

    return await Promise.all([
      axios.get(checkinUrl, { headers: { Authorization: `Bearer ${authToken}` }, responseType: 'arraybuffer', timeout: 45000 }),
      axios.get(orderUrl, { headers: { Authorization: `Bearer ${authToken}` }, responseType: 'arraybuffer', timeout: 45000 }),
    ]);
  };

  let checkinRes: any;
  let orderRes: any;
  try {
    [checkinRes, orderRes] = await makeRequests(token);
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      token = await getValidToken(true);
      [checkinRes, orderRes] = await makeRequests(token);
    } else {
      throw err;
    }
  }

  const wbCheckin = XLSX.read(checkinRes.data, { type: 'buffer' });
  const checkinRows: any[] = XLSX.utils.sheet_to_json(wbCheckin.Sheets[wbCheckin.SheetNames[0]]) || [];

  const wbOrder = XLSX.read(orderRes.data, { type: 'buffer' });
  const orderRaw: any[][] = XLSX.utils.sheet_to_json(wbOrder.Sheets[wbOrder.SheetNames[0]], { header: 1 }) || [];
  const orderHeaders = orderRaw[3] || [];
  const orderRows: any[] = orderRaw.slice(4).map(r => {
    const obj: Record<string, any> = {};
    orderHeaders.forEach((h: any, idx: number) => {
      if (h) obj[String(h).trim()] = r[idx];
    });
    return obj;
  });

  const srMap = new Map<string, {
    srCode: string;
    srName: string;
    route: string;
    routeCode: string;
    calls: number;
    inOutletMinutes: number;
    firstCheckin: string | null;
    lastCheckin: string | null;
    invoices: Map<string, number>; // invoice -> line count
    tls: number;
    retailVal: number;
    wsVal: number;
    jarQty: number;
    brands: Set<string>;
    lastSyncTime: string | null;
  }>();

  checkinRows.forEach(c => {
    const code = String(c['Employee Code'] || '').trim();
    if (!code) return;
    if (!srMap.has(code)) {
      srMap.set(code, {
        srCode: code,
        srName: String(c['Name'] || '').trim(),
        route: String(c['Territory Name'] || '').trim(),
        routeCode: '',
        calls: 0,
        inOutletMinutes: 0,
        firstCheckin: null,
        lastCheckin: null,
        invoices: new Map(),
        tls: 0,
        retailVal: 0,
        wsVal: 0,
        jarQty: 0,
        brands: new Set(),
        lastSyncTime: null,
      });
    }
    const item = srMap.get(code)!;
    item.calls++;
    const checkTime = c['Check in Time '] || c['Time'];
    if (checkTime) {
      const timeStr = String(checkTime).trim();
      if (!item.firstCheckin || timeStr < item.firstCheckin) item.firstCheckin = timeStr;
      if (!item.lastCheckin || timeStr > item.lastCheckin) item.lastCheckin = timeStr;
      if (!item.lastSyncTime || timeStr > item.lastSyncTime) item.lastSyncTime = timeStr;
    }
    const mins = parseFloat(c['Time spent(minutes)']) || 0;
    item.inOutletMinutes += mins;
  });

  orderRows.forEach(o => {
    const code = String(o['Order Creator Code'] || o['Employee Code'] || '').trim();
    if (!code) return;
    if (!srMap.has(code)) {
      srMap.set(code, {
        srCode: code,
        srName: String(o['Order Creator Name'] || o['Employee Name'] || '').trim(),
        route: String(o['Buyer Territory Name'] || '').trim(),
        routeCode: String(o['Buyer Territory Code'] || '').trim(),
        calls: 0,
        inOutletMinutes: 0,
        firstCheckin: null,
        lastCheckin: null,
        invoices: new Map(),
        tls: 0,
        retailVal: 0,
        wsVal: 0,
        jarQty: 0,
        brands: new Set(),
        lastSyncTime: null,
      });
    }
    const item = srMap.get(code)!;
    const inv = String(o['Order Reference'] || o['Tracking ID'] || '').trim();
    if (inv) {
      item.invoices.set(inv, (item.invoices.get(inv) || 0) + 1);
    }
    item.tls++;
    const amt = parseFloat(o['Amount']) || parseFloat(o['Subtotal']) || 0;
    
    // Check channel
    const channel = String(o['Buyer Badge Name'] || o['Channel'] || '').toLowerCase();
    if (channel.includes('ws') || channel.includes('wholesale')) {
      item.wsVal += amt;
    } else {
      item.retailVal += amt;
    }

    if (o['Product Brand']) item.brands.add(String(o['Product Brand']).trim());
    if (o['Buyer Territory Code'] && !item.routeCode) item.routeCode = String(o['Buyer Territory Code']).trim();
    if (o['Buyer Territory Name'] && !item.route) item.route = String(o['Buyer Territory Name']).trim();

    // Jar Qty Calculation
    const isJar = (o['JAR'] && Number(o['JAR']) > 0) ||
      (o['Product Name'] && (String(o['Product Name']).includes('জার') || String(o['Product Name']).toLowerCase().includes('jar')));
    if (isJar) {
      const q = Number(o['JAR']) || Number(o['Order Quantity']) || 0;
      item.jarQty += q;
    }

    const orderDate = o['Order Date'];
    if (orderDate && (!item.lastSyncTime || String(orderDate) > item.lastSyncTime)) {
      item.lastSyncTime = String(orderDate);
    }
  });

  const records: LiveDetailRecord[] = [];
  let idx = 1;

  for (const [srCode, d] of srMap.entries()) {
    const srMeta = SR_METADATA_MAP[srCode] || {
      srPositionCode: `DM-${String(idx).padStart(3, '0')}`,
      srName: d.srName,
      territory: 'Jatra Bari',
      territoryCode: 'T16',
      dbCode: '102267',
      dbName: 'M/S Ahamed Enterprise',
    };

    const visited = d.calls;
    const sched = Math.max(visited, 55);
    const prodCall = d.invoices.size;
    const retailVal = Math.round(d.retailVal);
    const wsVal = Math.round(d.wsVal);
    const totalOrderVal = retailVal + wsVal;
    const target = 16000;

    let twoLpcCount = 0;
    for (const [, lineCount] of d.invoices.entries()) {
      if (lineCount >= 2) twoLpcCount++;
    }

    const firstCallTime = extractTimeOnly(d.firstCheckin, '08:30:00');
    const lastCallTime = extractTimeOnly(d.lastCheckin, '16:30:00');
    const startWorkTime = firstCallTime;
    const endWorkTime = lastCallTime;

    const marketWorkMins = timeDiffMinutes(firstCallTime, lastCallTime);
    const totalMarketWork = formatMinutes(marketWorkMins);
    const totalWorkingHours = totalMarketWork;
    const totalSpendTimeOrderTaking = formatMinutes(d.inOutletMinutes);
    const transitMins = Math.max(0, marketWorkMins - d.inOutletMinutes);
    const transitTime = formatMinutes(transitMins);

    records.push({
      id: `live-detail-${idx++}`,
      cluster: 'Central',
      area: 'Central South',
      territory: srMeta.territory,
      dbCode: srMeta.dbCode,
      dbName: srMeta.dbName,
      dbType: '',
      srPositionCode: srMeta.srPositionCode,
      srCode,
      srName: srMeta.srName || d.srName,
      routeCode: d.routeCode || `T16R${idx}`,
      routeName: d.route || 'General Route',
      routeChannel: wsVal > 0 ? 'Mix' : 'Retail',
      scheduleCall: sched,
      visitedOutlet: visited,
      strikeRate: Number((visited / Math.max(1, sched)).toFixed(2)),
      productiveCall: prodCall,
      productivityPct: Number((prodCall / Math.max(1, visited)).toFixed(2)),
      todayTarget: target,
      orderValueWholesale: wsVal,
      orderValueRetail: retailVal,
      orderValue: totalOrderVal,
      successPct: Number((totalOrderVal / Math.max(1, target)).toFixed(2)),
      perPcValue: prodCall > 0 ? Math.round(totalOrderVal / prodCall) : 0,
      tls: d.tls,
      lpc: prodCall > 0 ? Number((d.tls / prodCall).toFixed(2)) : 0,
      brandHandle: prodCall > 0 ? Number((d.brands.size / prodCall).toFixed(2)) : d.brands.size,
      lastSyncTime: extractTimeOnly(d.lastSyncTime, lastCallTime),
      startWorkTime,
      endWorkTime,
      totalWorkingHours,
      firstCall: firstCallTime,
      lastCall: lastCallTime,
      totalMarketWork,
      totalSpendTimeOrderTaking,
      transitTime,
      locationAccuracy: 1,
      twoLpcOrder: twoLpcCount,
      noOfJarOrderQty: d.jarQty,
      srLeave: visited > 0 ? 'No' : 'Yes',
    });
  }

  const totalActiveSRs = records.filter(r => r.visitedOutlet > 0).length;
  const totalOutletsVisited = records.reduce((s, r) => s + r.visitedOutlet, 0);
  const totalProductiveCalls = records.reduce((s, r) => s + r.productiveCall, 0);
  const totalOrderVal = records.reduce((s, r) => s + r.orderValue, 0);
  const avgProductivity = records.length > 0
    ? (records.reduce((s, r) => s + (r.productivityPct * 100), 0) / records.length).toFixed(1) + '%'
    : '0%';

  const meta = {
    totalRecords: records.length,
    totalActiveSRs,
    totalOutletsVisited,
    totalProductiveCalls,
    totalOrderVal,
    avgProductivity,
    source: 'live_sokrio_api',
    startDate,
    endDate,
  };

  return { records, meta };
}

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startDate = req.nextUrl.searchParams.get('startDate') ||
      req.nextUrl.searchParams.get('date') ||
      todayStr;
    const endDate = req.nextUrl.searchParams.get('endDate') || startDate;
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

    const cacheKey = `live_detail_${startDate}_${endDate}`;
    const cached = memoryCache.get(cacheKey);

    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cached.records,
        meta: cached.meta,
      });
    }

    let inflight = inflightPromises.get(cacheKey);
    if (!inflight) {
      inflight = fetchLiveDetailFromSokrio(startDate, endDate)
        .then(res => {
          memoryCache.set(cacheKey, { ...res, timestamp: Date.now() });
          return res;
        })
        .finally(() => {
          inflightPromises.delete(cacheKey);
        });
      inflightPromises.set(cacheKey, inflight);
    }

    const { records, meta } = await inflight;

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (err: any) {
    console.error('[Live Detail API] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch live detail report from Sokrio API',
        data: [],
      },
      { status: 500 }
    );
  }
}
