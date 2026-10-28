import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import * as XLSX from 'xlsx';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

export interface DailySRRecord {
  id?: string;
  orderDate: string;
  cluster: string;
  area: string;
  territory: string;
  town?: string;
  dbCode: string;
  dbName: string;
  dbType: string;
  srCode: string;
  srName: string;
  srPositionCode: string;
  routeCode: string;
  routeName: string;
  routeDay: string;
  routeChannel: string;
  logingStatus: string;
  retailOutlet: number | string;
  wsOutlet: number | string;
  totalOutlet: number | string;
  retailCall: number | string;
  wsCall: number | string;
  totalCall: number | string;
  retailPC: number | string;
  wsPC: number | string;
  totalPC: number | string;
  retailValue: number | string;
  retailValueb4disc: number | string;
  wsValue: number | string;
  wsValueb4disc: number | string;
  totalValue: number | string;
  totalValueb4disc: number | string;
  lpc: number | string;
  strikeRate: string;
  retailPCDelivery: number | string;
  wsPCDelivery: number | string;
  totalPCDelivery: number | string;
  retailValueDelivery: number | string;
  retailValueDeliveryb4Disc: number | string;
  wsValueDelivery: number | string;
  wsValueDeliveryb4Disc: number | string;
  totalValueDelivery: number | string;
  totalValueDeliveryb4Disc: number | string;
  deliveryRate: string;
  deliveryLPC: number | string;
  dropSize: number | string;
  noOfRetailScheme: number | string;
  noOfWSScheme: number | string;
  locationAccuracy: string;
  latitude: string;
  longitude: string;
  firstCall: string;
  lastCall: string;
  totalTimeWorked: string;
  totalTimeinOutlet: string;
  totalTrasitTime: string;
  timePerOutlet: string;
  twoLPCOrder: number | string;
  twoLPCDelivery: number | string;
}

interface CacheEntry {
  records: DailySRRecord[];
  meta: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<DailySRRecord[]>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL for stable high performance

const SR_METADATA_MAP: Record<string, { srPositionCode: string; srName: string; territory: string; territoryCode: string; dbCode: string; dbName: string }> = {
  '54506': {
    srPositionCode: 'DM-060',
    srName: 'Mostafizur Rahman',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '53995': {
    srPositionCode: 'DM-057',
    srName: 'Chaon Khandker',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '54233': {
    srPositionCode: 'DM-059',
    srName: 'Md. Asebur Rahman Ashik',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '51639': {
    srPositionCode: 'DM-217',
    srName: 'Md. Shawkat Hossen',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
};

function resolveTerritoryMeta(customerNo: string, routeCode: string, routeName: string, territoryName: string) {
  const prefix = String(customerNo || '').split('-')[0].trim().toUpperCase();
  const cleanRouteCode = String(routeCode || '').trim();
  const cleanRouteName = String(routeName || '').trim().toLowerCase();
  const cleanTerritory = String(territoryName || '').trim().toLowerCase();

  const prefixMap: Record<string, any> = (territoriesMasterData as any).prefixMap || {};
  const routeMap: Record<string, any> = (territoriesMasterData as any).routeMap || {};

  if (prefix && prefixMap[prefix]) return prefixMap[prefix];
  if (cleanRouteCode && routeMap[cleanRouteCode]) return routeMap[cleanRouteCode];
  if (cleanRouteName && routeMap[cleanRouteName]) return routeMap[cleanRouteName];

  if (cleanTerritory.includes('jatra') || cleanTerritory.includes('sarulia') || prefix === 'T16') {
    return {
      area: 'Central South',
      territory: 'Jatra Bari',
      territoryCode: 'T16',
      dbCode: '102267',
      dbName: 'M/S Ahamed Enterprise',
      srPositionCode: 'DM-057',
    };
  }

  return {
    area: 'Central South',
    territory: 'Gulshan',
    territoryCode: 'T03',
    dbCode: '101820',
    dbName: 'Sara Enterprise',
    srPositionCode: 'DM-060',
  };
}

function toStandardDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return s.split('T')[0].split(' ')[0];
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!m) return null;
  let hrs = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const meridiem = (m[3] || '').toLowerCase();
  if (meridiem === 'pm' && hrs < 12) hrs += 12;
  if (meridiem === 'am' && hrs === 12) hrs = 0;
  return hrs * 60 + mins;
}

/**
 * Fetch and merge Live Checkin Report + Order Summary + Delivery Summary from Sokrio Reporting APIs
 * 100% Live, Real-Time Dynamic Processing
 */
async function fetchLiveDailySRPerformance(startDate: string, endDate: string): Promise<DailySRRecord[]> {
  let token = await getValidToken();

  const makeRequests = async (authToken: string) => {
    const checkinUrl = `https://pvm.report.sokrio.com/api/v1/checkin-report?range=${startDate}%2C${endDate}&territory_id=1&roles=&type=xlsx&download`;
    const orderUrl = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${startDate}%2C${endDate}&territory_id=1&download&type=xlsx`;
    const delUrl = `https://pvm.report.sokrio.com/api/v3/delivery-summary-export?range=${startDate}%2C${endDate}&territory_id=2&download&type=xlsx`;

    return await Promise.all([
      axios.get(checkinUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 35000,
      }),
      axios.get(orderUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 35000,
      }),
      axios.get(delUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 35000,
      }),
    ]);
  };

  let checkinRes: any;
  let orderRes: any;
  let delRes: any;

  try {
    [checkinRes, orderRes, delRes] = await makeRequests(token);
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      console.warn('[Daily SR Performance] Token expired during export download. Refreshing and retrying...');
      token = await getValidToken(true);
      [checkinRes, orderRes, delRes] = await makeRequests(token);
    } else {
      throw err;
    }
  }

  // 1. Parse Checkin Report XLSX
  const wbCheckin = XLSX.read(checkinRes.data, { type: 'buffer' });
  const checkinRows: any[] = XLSX.utils.sheet_to_json(wbCheckin.Sheets[wbCheckin.SheetNames[0]]) || [];

  // 2. Parse Order Summary Export XLSX
  const wbOrder = XLSX.read(orderRes.data, { type: 'buffer' });
  const orderRaw: any[][] = XLSX.utils.sheet_to_json(wbOrder.Sheets[wbOrder.SheetNames[0]], { header: 1 }) || [];
  const orderHeaders = (orderRaw[3] || []).map((h: any) => String(h || '').trim());
  const orderRows: any[] = orderRaw.slice(4).map(r => {
    const obj: Record<string, any> = {};
    orderHeaders.forEach((h: any, idx: number) => {
      if (h) obj[h] = r[idx];
    });
    return obj;
  });

  // 3. Parse Delivery Summary Export XLSX
  const wbDel = XLSX.read(delRes.data, { type: 'buffer' });
  const delRaw: any[][] = XLSX.utils.sheet_to_json(wbDel.Sheets[wbDel.SheetNames[0]], { header: 1 }) || [];
  const delHeaders = (delRaw[3] || []).map((h: any) => String(h || '').trim());
  const delRows: any[] = delRaw.slice(4).map(r => {
    const obj: Record<string, any> = {};
    delHeaders.forEach((h: any, idx: number) => {
      if (h) obj[h] = r[idx];
    });
    return obj;
  });

  interface SRGroupData {
    srCode: string;
    srName: string;
    orderDate: string;
    routeCode: string;
    routeName: string;
    calls: number;
    visitedOutlets: Set<string>;
    firstCheckin: string | null;
    lastCheckin: string | null;
    inOutletMinutes: number;
    lat: string;
    lng: string;
    orderCustomers: Set<string>;
    orderInvoices: Map<string, Set<string>>; // inv -> SKUs
    orderTotalValue: number;
    orderLineCount: number;
    delCustomers: Set<string>;
    delInvoices: Map<string, Set<string>>; // inv -> SKUs
    delTotalValue: number;
    delLineCount: number;
    freeQty: number;
    schemeCount: number;
  }

  const groups = new Map<string, SRGroupData>();

  function getOrCreateGroup(srCode: string, date: string, routeCode: string, routeName: string, srName: string): SRGroupData {
    const key = `${srCode}_${date}_${routeCode || 'R1'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        srCode,
        srName: srName || 'SR ' + srCode,
        orderDate: date,
        routeCode,
        routeName: routeName || 'General Route',
        calls: 0,
        visitedOutlets: new Set<string>(),
        firstCheckin: null,
        lastCheckin: null,
        inOutletMinutes: 0,
        lat: '',
        lng: '',
        orderCustomers: new Set<string>(),
        orderInvoices: new Map<string, Set<string>>(),
        orderTotalValue: 0,
        orderLineCount: 0,
        delCustomers: new Set<string>(),
        delInvoices: new Map<string, Set<string>>(),
        delTotalValue: 0,
        delLineCount: 0,
        freeQty: 0,
        schemeCount: 0,
      });
    }
    return groups.get(key)!;
  }

  // A. Process Checkins
  checkinRows.forEach(c => {
    const code = String(c['Employee Code'] || '').trim();
    if (!code) return;
    const rawDate = c['Date'];
    const date = toStandardDate(rawDate) || startDate;
    const routeName = String(c['Territory Name'] || '').trim();
    const grp = getOrCreateGroup(code, date, '', routeName, String(c['Name'] || '').trim());

    grp.calls++;
    const dept = c['Department Code'] || c['Visited Department'];
    if (dept) grp.visitedOutlets.add(String(dept));

    const checkTime = c['Check in Time '] || c['Time'];
    if (checkTime) {
      if (!grp.firstCheckin || checkTime < grp.firstCheckin) grp.firstCheckin = String(checkTime);
      if (!grp.lastCheckin || checkTime > grp.lastCheckin) grp.lastCheckin = String(checkTime);
    }
    const mins = parseFloat(c['Time spent(minutes)']) || 0;
    grp.inOutletMinutes += mins;

    if (!grp.lat && c['Latitude']) grp.lat = String(c['Latitude']);
    if (!grp.lng && c['Longitude']) grp.lng = String(c['Longitude']);
  });

  // B. Process Orders
  orderRows.forEach(o => {
    const code = String(o['Order Creator Code'] || o['Employee Code'] || '').trim();
    if (!code) return;
    const date = toStandardDate(o['Order Date']) || startDate;
    const routeCode = String(o['Buyer Territory Code'] || '').trim();
    const routeName = String(o['Buyer Territory Name'] || '').trim();
    const grp = getOrCreateGroup(code, date, routeCode, routeName, String(o['Order Creator Name'] || o['Employee Name'] || '').trim());

    if (routeCode && !grp.routeCode) grp.routeCode = routeCode;
    if (routeName && (!grp.routeName || grp.routeName === 'General Route')) grp.routeName = routeName;

    const buyerCode = String(o['Buyer Department Code'] || '');
    if (buyerCode) grp.orderCustomers.add(buyerCode);

    const inv = String(o['Order Reference'] || o['Tracking ID'] || '');
    const sku = String(o['Product SKU'] || '');
    if (inv) {
      if (!grp.orderInvoices.has(inv)) grp.orderInvoices.set(inv, new Set<string>());
      if (sku) grp.orderInvoices.get(inv)!.add(sku);
    }

    const amt = parseFloat(o['Amount']) || parseFloat(o['Subtotal']) || 0;
    grp.orderTotalValue += amt;
    grp.orderLineCount++;

    const cat = String(o['Product Category'] || '').toLowerCase();
    const qty = parseFloat(o['Order Quantity']) || 0;
    const price = parseFloat(o['Unit Price']) || 0;
    if (cat.includes('promo') || cat.includes('scheme') || (qty > 0 && price === 0)) {
      grp.schemeCount++;
    }
  });

  // C. Process Deliveries
  delRows.forEach(d => {
    const code = String(d['Order Creator Code'] || d['Employee Code'] || '').trim();
    if (!code) return;
    const date = toStandardDate(d['Delivery Date']) || startDate;
    const routeCode = String(d['Buyer Territory Code'] || '').trim();
    const routeName = String(d['Buyer Territory Name'] || '').trim();
    const grp = getOrCreateGroup(code, date, routeCode, routeName, String(d['Order Creator Name'] || '').trim());

    if (routeCode && !grp.routeCode) grp.routeCode = routeCode;
    if (routeName && (!grp.routeName || grp.routeName === 'General Route')) grp.routeName = routeName;

    const buyerCode = String(d['Buyer Department Code'] || '');
    if (buyerCode) grp.delCustomers.add(buyerCode);

    const inv = String(d['Tracking ID'] || d['Order Reference'] || '');
    const sku = String(d['Product SKU'] || '');
    if (inv) {
      if (!grp.delInvoices.has(inv)) grp.delInvoices.set(inv, new Set<string>());
      if (sku) grp.delInvoices.get(inv)!.add(sku);
    }

    const amt = parseFloat(d['Amount']) || parseFloat(d['Subtotal']) || 0;
    grp.delTotalValue += amt;
    grp.delLineCount++;

    const free = parseFloat(d['Free Quantity']) || 0;
    grp.freeQty += free;
  });

  const records: DailySRRecord[] = [];
  let idx = 1;

  for (const [_, grp] of groups.entries()) {
    const srMeta = SR_METADATA_MAP[grp.srCode];
    const meta = resolveTerritoryMeta('', grp.routeCode, grp.routeName, grp.routeName);

    const orderDate = grp.orderDate;
    const dayOfWeek = new Date(orderDate).toLocaleDateString('en-US', { weekday: 'long' });

    // Active unique outlets calculated from all visited outlets and ordering outlets
    const uniqueActiveOutlets = new Set([...Array.from(grp.visitedOutlets), ...Array.from(grp.orderCustomers)]).size;
    const retailOutlet = uniqueActiveOutlets > 0 ? uniqueActiveOutlets : Math.max(grp.calls, grp.orderCustomers.size);
    const wsOutlet = 0;
    const totalOutlet = retailOutlet + wsOutlet;

    // Calls: retail + ws
    const retailCall = grp.calls > 0 ? grp.calls : grp.orderCustomers.size;
    const wsCall = 0;
    const totalCall = retailCall + wsCall;

    // Productive Calls (PC): retail + ws
    const retailPC = grp.orderCustomers.size;
    const wsPC = 0;
    const totalPC = retailPC + wsPC;

    // Values: retail + ws
    const retailValue = Math.round(grp.orderTotalValue);
    const retailValueb4disc = Math.round(grp.orderTotalValue);
    const wsValue = 0;
    const wsValueb4disc = 0;
    const totalValue = retailValue + wsValue;
    const totalValueb4disc = retailValueb4disc + wsValueb4disc;

    // Strike rate & LPC & Drop size
    const strikeRate = totalCall > 0 ? ((totalPC / totalCall) * 100).toFixed(2) + '%' : (totalPC > 0 ? '100.00%' : '0.00%');
    const lpc = totalPC > 0 ? Number((grp.orderLineCount / totalPC).toFixed(2)) : 0;
    const dropSize = totalPC > 0 ? Math.round(totalValue / totalPC) : 0;

    // Delivery metrics: calculated from delivery summary
    const retailPCDel = grp.delCustomers.size;
    const wsPCDel = 0;
    const totalPCDelivery = retailPCDel + wsPCDel;

    const retailValDel = Math.round(grp.delTotalValue);
    const wsValDel = 0;
    const totalValDel = retailValDel + wsValDel;

    const deliveryRate = totalValue > 0 ? ((totalValDel / totalValue) * 100).toFixed(2) + '%' : (totalValDel > 0 ? '100.00%' : '0.00%');
    const deliveryLPC = totalPCDelivery > 0 ? Number((grp.delLineCount / totalPCDelivery).toFixed(2)) : 0;

    // 2 LPC counts: distinct SKUs per order/delivery invoice >= 2
    let twoLpcOrder = 0;
    grp.orderInvoices.forEach(skus => {
      if (skus.size >= 2) twoLpcOrder++;
    });

    let twoLpcDel = 0;
    grp.delInvoices.forEach(skus => {
      if (skus.size >= 2) twoLpcDel++;
    });

    // Time calculations calculated dynamically from firstCall, lastCall, and inOutletMinutes
    let firstCall = '';
    let lastCall = '';
    let totalTimeinOutlet = '';
    let totalTimeWorked = '';
    let totalTrasitTime = '';
    let timePerOutlet = '';

    if (grp.calls > 0) {
      if (grp.firstCheckin) firstCall = String(grp.firstCheckin).replace(/^.*?\s+/, '');
      if (grp.lastCheckin) lastCall = String(grp.lastCheckin).replace(/^.*?\s+/, '');

      const inHrs = Math.floor(grp.inOutletMinutes / 60);
      const inMins = Math.round(grp.inOutletMinutes % 60);
      totalTimeinOutlet = grp.inOutletMinutes > 0 ? `${inHrs} hr${inHrs !== 1 ? 's' : ''} ${inMins} min${inMins !== 1 ? 's' : ''}` : '-';

      const t1 = parseTimeToMinutes(firstCall);
      const t2 = parseTimeToMinutes(lastCall);
      let workedMins = 0;
      if (t1 !== null && t2 !== null && t2 >= t1) {
        workedMins = Math.max(t2 - t1, grp.inOutletMinutes);
      } else {
        workedMins = grp.inOutletMinutes;
      }

      if (workedMins > 0) {
        const wHrs = Math.floor(workedMins / 60);
        const wMins = Math.round(workedMins % 60);
        totalTimeWorked = `${wHrs} hr${wHrs !== 1 ? 's' : ''} ${wMins} min${wMins !== 1 ? 's' : ''}`;

        const transitMins = Math.max(0, workedMins - grp.inOutletMinutes);
        const trHrs = Math.floor(transitMins / 60);
        const trMins = Math.round(transitMins % 60);
        totalTrasitTime = transitMins > 0 ? `${trHrs} hr${trHrs !== 1 ? 's' : ''} ${trMins} min${trMins !== 1 ? 's' : ''}` : '-';
      }

      const avgMins = Math.round(grp.inOutletMinutes / totalCall);
      timePerOutlet = `00:${String(avgMins).padStart(2, '0')}:00`;
    }

    const territory = srMeta?.territory || meta.territory || 'Jatra Bari';
    const town = territory;
    const dbType = '';

    records.push({
      id: `daily-sr-${idx++}`,
      orderDate,
      cluster: 'Central',
      area: meta.area || 'Central South',
      territory,
      town,
      dbCode: srMeta?.dbCode || meta.dbCode || '102267',
      dbName: srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise',
      dbType,
      srCode: grp.srCode,
      srName: srMeta?.srName || grp.srName,
      srPositionCode: srMeta?.srPositionCode || meta.srPositionCode || 'DM-057',
      routeCode: grp.routeCode || meta.routeCode || '',
      routeName: grp.routeName || meta.routeName || '',
      routeDay: dayOfWeek,
      routeChannel: 'Retail',
      logingStatus: grp.calls > 0 || totalPC > 0 ? 'Yes' : 'No',
      retailOutlet,
      wsOutlet,
      totalOutlet,
      retailCall,
      wsCall,
      totalCall,
      retailPC,
      wsPC,
      totalPC,
      retailValue,
      retailValueb4disc,
      wsValue,
      wsValueb4disc,
      totalValue,
      totalValueb4disc,
      lpc,
      strikeRate,
      retailPCDelivery: retailPCDel,
      wsPCDelivery: wsPCDel,
      totalPCDelivery,
      retailValueDelivery: retailValDel,
      retailValueDeliveryb4Disc: retailValDel,
      wsValueDelivery: wsValDel,
      wsValueDeliveryb4Disc: wsValDel,
      totalValueDelivery: totalValDel,
      totalValueDeliveryb4Disc: totalValDel,
      deliveryRate,
      deliveryLPC,
      dropSize,
      noOfRetailScheme: grp.schemeCount > 0 ? grp.schemeCount : (grp.freeQty > 0 ? grp.freeQty : 0),
      noOfWSScheme: 0,
      locationAccuracy: '',
      latitude: grp.lat || '',
      longitude: grp.lng || '',
      firstCall,
      lastCall,
      totalTimeWorked,
      totalTimeinOutlet,
      totalTrasitTime,
      timePerOutlet,
      twoLPCOrder: twoLpcOrder,
      twoLPCDelivery: twoLpcDel,
    });
  }

  // Sort by date descending, then srCode
  records.sort((a, b) => b.orderDate.localeCompare(a.orderDate) || a.srCode.localeCompare(b.srCode));
  return records;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '2026-10-14';
    const endDate = url.searchParams.get('endDate') || '2026-10-14';

    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const cacheKey = `daily_sr_${startDate}_${endDate}`;
    const cached = memoryCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cached.records,
        meta: cached.meta,
      });
    }

    // Reuse in-flight request for identical date ranges
    let records: DailySRRecord[] = [];
    let source = 'live_sokrio_api';

    try {
      let pending = inFlightRequests.get(cacheKey);
      if (!pending) {
        pending = fetchLiveDailySRPerformance(startDate, endDate).finally(() => {
          inFlightRequests.delete(cacheKey);
        });
        inFlightRequests.set(cacheKey, pending);
      }
      records = await pending;
    } catch (err: any) {
      console.error('[Daily SR Performance] Live fetch error:', err.message);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.records,
          meta: { ...cached.meta, note: 'Serving cached data during remote API update' },
        });
      }
    }

    if ((!records || records.length === 0) && cached) {
      records = cached.records;
    }

    const totalActiveSRs = new Set(records.map(r => r.srCode)).size;
    const totalOutletsVisited = records.reduce((s, r) => s + (Number(r.totalCall) || 0), 0);
    const totalProductiveCalls = records.reduce((s, r) => s + (Number(r.totalPC) || 0), 0);
    const totalSalesVal = records.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    const avgStrikeRate = records.length > 0
      ? (records.reduce((s, r) => s + parseFloat(r.strikeRate || '0'), 0) / records.length).toFixed(1) + '%'
      : '0%';

    const meta = {
      totalRecords: records.length,
      totalActiveSRs,
      totalOutletsVisited,
      totalProductiveCalls,
      totalSalesVal,
      avgStrikeRate,
      source,
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (err: any) {
    console.error('[Daily SR Performance API] Error:', err);
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalRecords: 0,
        totalActiveSRs: 0,
        totalOutletsVisited: 0,
        totalProductiveCalls: 0,
        totalSalesVal: 0,
        avgStrikeRate: '0%',
        source: 'error',
      },
    });
  }
}
