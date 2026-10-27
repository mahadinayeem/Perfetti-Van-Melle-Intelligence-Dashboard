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
const CACHE_TTL_MS = 60 * 1000;

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

    const totalCall = grp.calls > 0 ? grp.calls : '';
    const totalPC = grp.orderCustomers.size > 0 ? grp.orderCustomers.size : '';
    const totalValOrder = grp.orderTotalValue > 0 ? Math.round(grp.orderTotalValue) : '';

    // LPC & Drop size
    const lpc = (typeof totalPC === 'number' && totalPC > 0) ? Number((grp.orderLineCount / totalPC).toFixed(2)) : '';
    const dropSize = (typeof totalPC === 'number' && totalPC > 0 && typeof totalValOrder === 'number') ? Math.round(totalValOrder / totalPC) : '';

    // Strike Rate (only if both calls and productive calls exist)
    const strikeRate = (typeof totalCall === 'number' && totalCall > 0 && typeof totalPC === 'number')
      ? ((totalPC / totalCall) * 100).toFixed(2) + '%'
      : '';

    // Delivery metrics: ONLY compute if delivery data actually exists in live delivery export
    const hasDelivery = grp.delCustomers.size > 0 || grp.delTotalValue > 0;
    const totalPCDel = hasDelivery && grp.delCustomers.size > 0 ? grp.delCustomers.size : '';
    const totalValDel = hasDelivery && grp.delTotalValue > 0 ? Math.round(grp.delTotalValue) : '';
    const deliveryRate = (typeof totalValOrder === 'number' && totalValOrder > 0 && typeof totalValDel === 'number' && totalValDel > 0)
      ? ((totalValDel / totalValOrder) * 100).toFixed(2) + '%'
      : '';
    const deliveryLPC = (typeof totalPCDel === 'number' && totalPCDel > 0)
      ? Number((grp.delLineCount / totalPCDel).toFixed(2))
      : '';

    // 2 LPC counts: distinct SKUs per order/delivery invoice >= 2
    let twoLpcOrder: number | string = '';
    if (grp.orderInvoices.size > 0) {
      let count = 0;
      grp.orderInvoices.forEach(skus => {
        if (skus.size >= 2) count++;
      });
      twoLpcOrder = count;
    }

    let twoLpcDel: number | string = '';
    if (hasDelivery && grp.delInvoices.size > 0) {
      let count = 0;
      grp.delInvoices.forEach(skus => {
        if (skus.size >= 2) count++;
      });
      twoLpcDel = count;
    }

    // Time calculations from live checkin report
    let firstCall = '';
    let lastCall = '';
    let totalTimeinOutlet = '';
    let timePerOutlet = '';

    if (grp.calls > 0) {
      if (grp.firstCheckin) firstCall = String(grp.firstCheckin).replace(/^.*?\s+/, '');
      if (grp.lastCheckin) lastCall = String(grp.lastCheckin).replace(/^.*?\s+/, '');

      if (grp.inOutletMinutes > 0) {
        const inHrs = Math.floor(grp.inOutletMinutes / 60);
        const inMins = Math.round(grp.inOutletMinutes % 60);
        totalTimeinOutlet = `${String(inHrs).padStart(2, '0')}:${String(inMins).padStart(2, '0')}`;
        timePerOutlet = `00:${String(Math.round(grp.inOutletMinutes / grp.calls)).padStart(2, '0')}:00`;
      }
    }

    records.push({
      id: `daily-sr-${idx++}`,
      orderDate,
      cluster: 'Central',
      area: meta.area || 'Central South',
      territory: srMeta?.territory || meta.territory || 'Jatra Bari',
      town: '',
      dbCode: srMeta?.dbCode || meta.dbCode || '102267',
      dbName: srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise',
      dbType: '',
      srCode: grp.srCode,
      srName: srMeta?.srName || grp.srName,
      srPositionCode: srMeta?.srPositionCode || meta.srPositionCode || '',
      routeCode: grp.routeCode || '',
      routeName: grp.routeName || '',
      routeDay: dayOfWeek,
      routeChannel: 'Retail',
      logingStatus: grp.calls > 0 ? 'Yes' : (grp.orderCustomers.size > 0 ? 'Yes' : 'No'),
      retailOutlet: '',
      wsOutlet: '',
      totalOutlet: '',
      retailCall: totalCall,
      wsCall: '',
      totalCall,
      retailPC: totalPC,
      wsPC: '',
      totalPC,
      retailValue: totalValOrder,
      retailValueb4disc: totalValOrder,
      wsValue: '',
      wsValueb4disc: '',
      totalValue: totalValOrder,
      totalValueb4disc: totalValOrder,
      lpc,
      strikeRate,
      retailPCDelivery: totalPCDel,
      wsPCDelivery: '',
      totalPCDelivery: totalPCDel,
      retailValueDelivery: totalValDel,
      retailValueDeliveryb4Disc: totalValDel,
      wsValueDelivery: '',
      wsValueDeliveryb4Disc: '',
      totalValueDelivery: totalValDel,
      totalValueDeliveryb4Disc: totalValDel,
      deliveryRate,
      deliveryLPC,
      dropSize,
      noOfRetailScheme: '',
      noOfWSScheme: '',
      locationAccuracy: '',
      latitude: grp.lat || '',
      longitude: grp.lng || '',
      firstCall,
      lastCall,
      totalTimeWorked: '',
      totalTimeinOutlet,
      totalTrasitTime: '',
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

    const cacheKey = `daily_sr_${startDate}_${endDate}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cached.records,
        meta: cached.meta,
      });
    }

    // Always fetch directly and purely from Sokrio Live APIs
    let records: DailySRRecord[] = [];
    let source = 'live_sokrio_api';

    try {
      records = await fetchLiveDailySRPerformance(startDate, endDate);
    } catch (err: any) {
      console.error('[Daily SR Performance] Live fetch error:', err.message);
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
