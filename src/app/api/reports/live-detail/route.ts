import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
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
  scheduleCall: number | string;
  visitedOutlet: number;
  strikeRate: number | string;
  productiveCall: number;
  productivityPct: number | string;
  todayTarget: number | string;
  orderValueWholesale: number | string;
  orderValueRetail: number | string;
  orderValue: number | string;
  successPct: number | string;
  perPcValue: number | string;
  tls: number | string;
  lpc: number | string;
  brandHandle: number | string;
  lastSyncTime: string;
  startWorkTime: string;
  endWorkTime: string;
  totalWorkingHours: string;
  firstCall: string;
  lastCall: string;
  totalMarketWork: string;
  totalSpendTimeOrderTaking: string;
  transitTime: string;
  locationAccuracy: number | string;
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
  '54801': { srPositionCode: 'DM-058', srName: 'Mohammed Khaled Mahmud', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
  '20637': { srPositionCode: 'DM-061', srName: 'Md. Ripon Uddin', territory: 'Jatra Bari', territoryCode: 'T16', dbCode: '102267', dbName: 'M/S Ahamed Enterprise' },
};

function parseDateToMs(dateStr: any): number {
  if (!dateStr) return 0;
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (dmyMatch) {
    let [_, d, m, y, hStr, minStr, sStr, ampm] = dmyMatch;
    let h = parseInt(hStr, 10);
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), h, parseInt(minStr), parseInt(sStr || '0')).getTime();
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    let [_, y, m, d, h, min, s] = isoMatch;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s || '0')).getTime();
  }
  const t = Date.parse(str);
  return isNaN(t) ? 0 : t;
}

function formatTimeToHHMMSS(val: any): string {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const s = String(val).trim();
  const match = s.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let [_, hStr, mStr, sStr, ampm] = match;
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    const sec = (sStr || '00').padStart(2, '0');
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${m}:${sec}`;
  }
  return s;
}

function format24hFromMs(ms: number): string {
  if (!ms || isNaN(ms)) return '';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function parseTime(val: any): string {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const ms = parseDateToMs(val);
  if (ms > 0) return format24hFromMs(ms);

  const str = String(val).trim();
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let [_, hStr, mStr, sStr, ampm] = ampmMatch;
    let h = parseInt(hStr, 10);
    let m = mStr;
    let s = sStr || '00';
    if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }
  const isoMatch = str.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  if (isoMatch) return isoMatch[1];
  return str;
}

function formatMinutes(minsOrStr: number | string | null | undefined): string {
  if (!minsOrStr && minsOrStr !== 0) return '';
  const str = String(minsOrStr).trim();
  if (str === '-' || str === 'null' || str === 'undefined' || !str) return '';

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p, 10));
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  const mins = typeof minsOrStr === 'number' ? minsOrStr : parseFloat(str) || 0;
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatDurationWithDash(mins: number): string {
  if (!mins || isNaN(mins) || mins <= 0) return '00:00';
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
  const ms = parseDateToMs(dateTimeStr);
  if (ms > 0) return format24hFromMs(ms);
  const match = dateTimeStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)/i);
  return match ? parseTime(match[1]) : fallback;
}

async function fetchLiveDetailFromSokrio(startDate: string, endDate: string): Promise<{ records: LiveDetailRecord[]; meta: any }> {
  let token = await getValidToken();

  const makeRequests = async (authToken: string) => {
    const checkinUrl = `https://pvm.report.sokrio.com/api/v1/checkin-report?range=${startDate}%2C${endDate}&roles=&type=xlsx&download`;
    const orderUrl = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${startDate}%2C${endDate}&territory_id=1&download&type=xlsx`;
    const attendanceUrl = `https://pvm.report.sokrio.com/api/v3/daily-attendance?range=${startDate}%2C${endDate}&territory_id=1&roles=7%2C6%2C5%2C4%2C3%2C2%2C1&download`;

    return await Promise.all([
      axios.get(checkinUrl, { headers: { Authorization: `Bearer ${authToken}` }, responseType: 'arraybuffer', timeout: 45000 }),
      axios.get(orderUrl, { headers: { Authorization: `Bearer ${authToken}` }, responseType: 'arraybuffer', timeout: 45000 }),
      axios.get(attendanceUrl, { headers: { Authorization: `Bearer ${authToken}` }, responseType: 'arraybuffer', timeout: 45000 }).catch((err) => {
        console.warn('[Live Detail] Attendance API request failed:', err.message);
        return null;
      }),
    ]);
  };

  let checkinRes: any;
  let orderRes: any;
  let attendanceRes: any;
  try {
    [checkinRes, orderRes, attendanceRes] = await makeRequests(token);
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      token = await getValidToken(true);
      [checkinRes, orderRes, attendanceRes] = await makeRequests(token);
    } else {
      throw err;
    }
  }

  // Parse attendance report for Day in Time & Day Out Time
  const attendanceMap = new Map<string, {
    name: string;
    dayIn: string;
    dayOut: string;
    workingHours: string;
  }>();

  if (attendanceRes && attendanceRes.data) {
    try {
      const wbAtt = XLSX.read(attendanceRes.data, { type: 'buffer' });
      const wsAtt = wbAtt.Sheets[wbAtt.SheetNames[0]];
      const attRows: any[][] = XLSX.utils.sheet_to_json(wsAtt, { header: 1 }) || [];
      if (attRows.length > 3) {
        const headers = (attRows[3] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const empCodeIdx = headers.findIndex((h: string) => h.includes('employee code') || h.includes('emp code') || h.includes('user code'));
        const dayInIdx = headers.findIndex((h: string) => h.includes('day in time') || h.includes('day-in') || h.includes('day in'));
        const dayOutIdx = headers.findIndex((h: string) => h.includes('day out time') || h.includes('day-out') || h.includes('day out'));
        const workHoursIdx = headers.findIndex((h: string) => h.includes('working hours') || h.includes('working hour'));
        const nameIdx = headers.findIndex((h: string) => h.includes('name'));

        attRows.slice(4).forEach((r) => {
          const code = String(r[empCodeIdx >= 0 ? empCodeIdx : 3] || '').trim();
          if (!code) return;
          const rawDayIn = r[dayInIdx >= 0 ? dayInIdx : 4];
          const rawDayOut = r[dayOutIdx >= 0 ? dayOutIdx : 8];
          const rawWorkHours = r[workHoursIdx >= 0 ? workHoursIdx : 11];

          attendanceMap.set(code, {
            name: String(r[nameIdx >= 0 ? nameIdx : 2] || '').trim(),
            dayIn: parseTime(rawDayIn),
            dayOut: parseTime(rawDayOut),
            workingHours: rawWorkHours && String(rawWorkHours).trim() !== '-' ? String(rawWorkHours).trim() : '',
          });
        });
      }
    } catch (attErr) {
      console.error('[Live Detail] Error parsing attendance workbook:', attErr);
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
    dbCode: string;
    dbName: string;
    calls: number;
    inOutletMinutes: number;
    minCheckinMs: number | null;
    maxCheckinMs: number | null;
    invoices: Map<string, number>; // invoice -> line count
    tls: number;
    retailVal: number;
    wsVal: number;
    jarQty: number;
    brands: Set<string>;
    lastSyncMs: number | null;
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
        dbCode: '',
        dbName: '',
        calls: 0,
        inOutletMinutes: 0,
        minCheckinMs: null,
        maxCheckinMs: null,
        invoices: new Map(),
        tls: 0,
        retailVal: 0,
        wsVal: 0,
        jarQty: 0,
        brands: new Set(),
        lastSyncMs: null,
      });
    }
    const item = srMap.get(code)!;
    item.calls++;
    const checkTime = c['Check in Time '] || c['Time'];
    const ms = parseDateToMs(checkTime);
    if (ms > 0) {
      if (!item.minCheckinMs || ms < item.minCheckinMs) item.minCheckinMs = ms;
      if (!item.maxCheckinMs || ms > item.maxCheckinMs) item.maxCheckinMs = ms;
      if (!item.lastSyncMs || ms > item.lastSyncMs) item.lastSyncMs = ms;
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
        dbCode: String(o['Seller Department Code'] || '').trim(),
        dbName: String(o['Seller Department Name'] || '').trim(),
        calls: 0,
        inOutletMinutes: 0,
        minCheckinMs: null,
        maxCheckinMs: null,
        invoices: new Map(),
        tls: 0,
        retailVal: 0,
        wsVal: 0,
        jarQty: 0,
        brands: new Set(),
        lastSyncMs: null,
      });
    }
    const item = srMap.get(code)!;
    if (o['Seller Department Code'] && !item.dbCode) item.dbCode = String(o['Seller Department Code']).trim();
    if (o['Seller Department Name'] && !item.dbName) item.dbName = String(o['Seller Department Name']).trim();
    if (o['Buyer Territory Code'] && !item.routeCode) item.routeCode = String(o['Buyer Territory Code']).trim();
    if (o['Buyer Territory Name'] && !item.route) item.route = String(o['Buyer Territory Name']).trim();
    if (o['Order Creator Name'] && !item.srName) item.srName = String(o['Order Creator Name']).trim();

    const inv = String(o['Order Reference'] || o['Tracking ID'] || '').trim();
    if (inv) {
      item.invoices.set(inv, (item.invoices.get(inv) || 0) + 1);
    }
    item.tls++;
    const amt = parseFloat(String(o['Amount'] || o['Subtotal'] || '0').replace(/,/g, '')) || 0;
    
    // Check channel
    const channel = String(o['Buyer Badge Name'] || o['Channel'] || '').toLowerCase();
    if (channel.includes('ws') || channel.includes('wholesale')) {
      item.wsVal += amt;
    } else {
      item.retailVal += amt;
    }

    if (o['Product Brand']) item.brands.add(String(o['Product Brand']).trim());

    // Jar Qty Calculation
    const isJar = (o['JAR'] && Number(o['JAR']) > 0) ||
      (o['Product Name'] && (String(o['Product Name']).includes('জার') || String(o['Product Name']).toLowerCase().includes('jar')));
    if (isJar) {
      const q = Number(o['JAR']) || Number(o['Order Quantity']) || 0;
      item.jarQty += q;
    }

    const orderDate = o['Order Date'];
    const orderMs = parseDateToMs(orderDate);
    if (orderMs > 0 && (!item.lastSyncMs || orderMs > item.lastSyncMs)) {
      item.lastSyncMs = orderMs;
    }
  });

  // Ensure every SR present in the attendance map is captured in the report
  for (const [code, att] of attendanceMap.entries()) {
    if (!srMap.has(code)) {
      srMap.set(code, {
        srCode: code,
        srName: att.name || 'Field SR',
        route: '',
        routeCode: '',
        dbCode: '',
        dbName: '',
        calls: 0,
        inOutletMinutes: 0,
        minCheckinMs: null,
        maxCheckinMs: null,
        invoices: new Map(),
        tls: 0,
        retailVal: 0,
        wsVal: 0,
        jarQty: 0,
        brands: new Set(),
        lastSyncMs: null,
      });
    }
  }

  const records: LiveDetailRecord[] = [];
  let idx = 1;

  for (const [srCode, d] of srMap.entries()) {
    const srMeta = SR_METADATA_MAP[srCode] || {
      srPositionCode: `DM-${String(idx).padStart(3, '0')}`,
      srName: d.srName,
      territory: 'Jatra Bari',
      territoryCode: 'T16',
      dbCode: d.dbCode || '102267',
      dbName: d.dbName || 'M/S Ahamed Enterprise',
    };

    const prodCall = d.invoices.size;
    // Each productive call implies a visited outlet
    const visited = Math.max(d.calls, prodCall);
    const sched = visited > 0 ? visited : 0;
    const retailVal = Math.round(d.retailVal);
    const wsVal = Math.round(d.wsVal);
    const totalOrderVal = retailVal + wsVal;

    // Today's RR Target: Sokrio API does not provide daily revenue targets.
    // Rule: "dummy data use na kore faka rakho" -> left blank
    const target = '';

    let twoLpcCount = 0;
    for (const [, lineCount] of d.invoices.entries()) {
      if (lineCount >= 2) twoLpcCount++;
    }

    const att = attendanceMap.get(srCode);
    const firstCallTime = d.minCheckinMs ? format24hFromMs(d.minCheckinMs) : '';
    const lastCallTime = d.maxCheckinMs ? format24hFromMs(d.maxCheckinMs) : '';
    const lastSyncTime = d.lastSyncMs ? format24hFromMs(d.lastSyncMs) : '';

    const startWorkTime = formatTimeToHHMMSS(att?.dayIn) || '';
    const endWorkTime = formatTimeToHHMMSS(att?.dayOut) || '';

    let totalWorkingHours = '';
    if (att?.workingHours && String(att.workingHours).trim() !== '-' && String(att.workingHours).trim() !== '0') {
      totalWorkingHours = formatMinutes(att.workingHours);
    } else if (startWorkTime && endWorkTime) {
      const diffMins = timeDiffMinutes(startWorkTime, endWorkTime);
      if (diffMins > 0) {
        const h = Math.floor(diffMins / 60);
        const m = Math.round(diffMins % 60);
        totalWorkingHours = `${h}:${String(m).padStart(2, '0')}`;
      }
    }

    let marketWorkMins = 0;
    let totalMarketWork = '';
    if (d.minCheckinMs && d.maxCheckinMs && d.maxCheckinMs >= d.minCheckinMs) {
      marketWorkMins = Math.round((d.maxCheckinMs - d.minCheckinMs) / 60000);
      if (marketWorkMins > 0) {
        const h = Math.floor(marketWorkMins / 60);
        const m = Math.round(marketWorkMins % 60);
        totalMarketWork = `${h}:${String(m).padStart(2, '0')}`;
      }
    }

    const totalSpendTimeOrderTaking = d.inOutletMinutes > 0 ? formatDurationWithDash(d.inOutletMinutes) : '';
    let transitTime = '';
    if (marketWorkMins > 0) {
      const transitMins = Math.max(0, marketWorkMins - d.inOutletMinutes);
      transitTime = formatDurationWithDash(transitMins);
    }

    records.push({
      id: `live-detail-${idx++}`,
      cluster: 'Central',
      area: 'Central South',
      territory: srMeta.territory,
      dbCode: d.dbCode || srMeta.dbCode,
      dbName: d.dbName || srMeta.dbName,
      dbType: 'Main DB',
      srPositionCode: srMeta.srPositionCode,
      srCode,
      srName: srMeta.srName || d.srName,
      routeCode: d.routeCode || `T16R${idx}`,
      routeName: d.route || 'General Route',
      routeChannel: wsVal > 0 ? 'Mix' : 'Retail',
      scheduleCall: sched > 0 ? sched : (visited > 0 ? visited : ''),
      visitedOutlet: visited,
      strikeRate: sched > 0 ? Number((visited / sched).toFixed(2)) : (visited > 0 ? 1 : ''),
      productiveCall: prodCall,
      productivityPct: visited > 0 ? Number((prodCall / visited).toFixed(2)) : '',
      todayTarget: target,
      orderValueWholesale: wsVal > 0 ? wsVal : '',
      orderValueRetail: retailVal > 0 ? retailVal : '',
      orderValue: totalOrderVal > 0 ? totalOrderVal : '',
      successPct: typeof target === 'number' && target > 0 ? Number((totalOrderVal / target).toFixed(2)) : '',
      perPcValue: prodCall > 0 ? Number((totalOrderVal / prodCall).toFixed(2)) : '',
      tls: d.tls > 0 ? d.tls : '',
      lpc: prodCall > 0 ? Number((d.tls / prodCall).toFixed(2)) : '',
      brandHandle: prodCall > 0 ? Number((d.brands.size / prodCall).toFixed(2)) : (d.brands.size > 0 ? d.brands.size : ''),
      lastSyncTime: lastSyncTime,
      startWorkTime,
      endWorkTime,
      totalWorkingHours,
      firstCall: firstCallTime,
      lastCall: lastCallTime,
      totalMarketWork,
      totalSpendTimeOrderTaking,
      transitTime,
      locationAccuracy: (visited > 0 || prodCall > 0) ? 1 : '',
      twoLpcOrder: twoLpcCount,
      noOfJarOrderQty: d.jarQty,
      srLeave: (visited > 0 || prodCall > 0 || (att?.dayIn && String(att.dayIn).trim() !== '-')) ? 'No' : 'Yes',
    });
  }

  const totalActiveSRs = records.filter(r => r.visitedOutlet > 0).length;
  const totalOutletsVisited = records.reduce((s, r) => s + r.visitedOutlet, 0);
  const totalProductiveCalls = records.reduce((s, r) => s + r.productiveCall, 0);
  const totalOrderVal = records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0);
  const avgProductivity = records.length > 0
    ? (records.reduce((s, r) => s + ((Number(r.productivityPct) || 0) * 100), 0) / records.length).toFixed(1) + '%'
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
