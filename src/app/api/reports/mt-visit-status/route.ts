import { NextRequest, NextResponse } from 'next/server';
import { fetchWithAuth } from '@/lib/sokrioClient';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface MTVisitRecord {
  id?: string;
  date: string;
  area: string;
  territory: string;
  dbCode: string;
  dbName: string;
  srPositionCode: string;
  srCode: string;
  srName: string;
  routeCode: string;
  routeName: string;
  customerNo: string;
  customerName: string;
  clockInTime: string;
  clockOutTime: string;
  timeSpentMinutes?: number;
}

// In-memory caching and request deduplication
interface CacheEntry {
  records: MTVisitRecord[];
  meta: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<{ records: MTVisitRecord[]; meta: any }>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// Helper to format Date into YYYY-MM-DD HH:mm:ss
function formatDateTime(val: any, isTimeOnly = false): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return String(val);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  if (isTimeOnly) {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Resolve DB Code, DB Name, Area, Territory from Sokrio Territories Master (territories-bulk-download)
function resolveTerritoryMeta(customerNo: string, routeCode: string, routeName: string, territoryName: string) {
  const prefix = customerNo.split('-')[0].trim().toUpperCase();
  const cleanRouteCode = String(routeCode || '').trim();
  const cleanRouteName = String(routeName || '').trim().toLowerCase();
  const cleanTerritory = String(territoryName || '').trim().toLowerCase();

  const prefixMap: Record<string, any> = territoriesMasterData.prefixMap || {};
  const routeMap: Record<string, any> = territoriesMasterData.routeMap || {};

  // 1. Match by Customer prefix (e.g. T16 -> M/S Ahamed Enterprise, T19 / T03 -> Sara Enterprise)
  if (prefix && prefixMap[prefix]) {
    return prefixMap[prefix];
  }

  // 2. Match by Route Code (e.g. T16R..., T19R...)
  if (cleanRouteCode && routeMap[cleanRouteCode]) {
    return routeMap[cleanRouteCode];
  }

  // 3. Match by Route Name
  if (cleanRouteName && routeMap[cleanRouteName]) {
    return routeMap[cleanRouteName];
  }

  // 4. Default by territory keyword
  if (cleanTerritory.includes('jatra') || cleanTerritory.includes('sarulia') || prefix === 'T16') {
    return {
      area: 'Central South',
      territory: 'Jatra Bari',
      dbCode: '102267',
      dbName: 'M/S Ahamed Enterprise',
      srPositionCode: 'JTB-01',
    };
  }

  return {
    area: 'Central South',
    territory: 'Gulshan',
    dbCode: '101820',
    dbName: 'Sara Enterprise',
    srPositionCode: 'GUL-01',
  };
}

// Helper to get sample data from Report Sample.xlsx
function getExcelSampleData(forDate?: string): MTVisitRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets['MT Visit Status'];
    if (!sheet) return [];

    const json = XLSX.utils.sheet_to_json<any>(sheet);
    return json.map((row, idx) => {
      const clockIn = formatDateTime(row['Clock In Time']);
      const clockOut = formatDateTime(row['Clock Out Time']);
      const dateVal = forDate || (clockIn ? clockIn.split(' ')[0] : '2026-10-25');
      const custNo = String(row['Customer No'] || '');
      const meta = resolveTerritoryMeta(custNo, String(row['Route Code'] || ''), String(row['Route Name'] || ''), String(row['Territory'] || ''));

      return {
        id: `sample-${idx + 1}`,
        date: dateVal,
        area: meta.area || String(row['Area'] || 'Central South'),
        territory: meta.territory || String(row['Territory'] || 'Gulshan'),
        dbCode: meta.dbCode || String(row['DB Code'] || '101820'),
        dbName: meta.dbName || String(row['DB Name'] || 'Sara Enterprise'),
        srPositionCode: meta.srPositionCode || String(row['SR Position Code'] || `SR-${(idx % 2) + 1}`),
        srCode: String(row['SR Code'] || ''),
        srName: String(row['SR Name'] || ''),
        routeCode: String(row['Route Code'] || ''),
        routeName: String(row['Route Name'] || ''),
        customerNo: custNo,
        customerName: String(row['Customer Name'] || ''),
        clockInTime: clockIn,
        clockOutTime: clockOut,
      };
    });
  } catch (e) {
    console.error('Error reading Report Sample.xlsx:', e);
    return [];
  }
}

async function fetchFromSokrio(start: string, end: string): Promise<{ records: MTVisitRecord[]; meta: any }> {
  const baseUrl = process.env.SOKRIO_BASE_URL || 'https://pvm.core.sokrio.com';
  const checkinUrl = `${baseUrl}/api/v1/checkin-report`;
  
  const checkinRes = await fetchWithAuth(checkinUrl, {
    range: `${start},${end}`,
    per_page: 5000,
  });

  const checkinList: any[] = checkinRes?.checkinReport || [];

  const records: MTVisitRecord[] = checkinList.map((item: any, idx: number) => {
    const createdAt = item.created_at || '';
    const checkedOutAt = item.checked_out_at || '';
    const datePart = createdAt.split(' ')[0] || start;

    let timeSpent = 0;
    if (createdAt && checkedOutAt) {
      const inMs = new Date(createdAt.replace(/-/g, '/')).getTime();
      const outMs = new Date(checkedOutAt.replace(/-/g, '/')).getTime();
      if (!isNaN(inMs) && !isNaN(outMs)) {
        timeSpent = Math.max(0, Math.round((outMs - inMs) / (1000 * 60)));
      }
    }

    const dept = item.department || {};
    const user = item.user || {};
    const route = item.route || {};

    const customerNo = String(dept.code || '').trim();
    const customerName = String(dept.name || '').trim();
    const rawTerritory = dept.territory?.name || route.name || '';
    const rawRouteCode = route.code || (item.route_id ? `R-${item.route_id}` : '');
    const rawRouteName = route.name || '';

    // Dynamically resolve DB Code, DB Name, Area, Territory from Sokrio Territories Bulk Master
    const meta = resolveTerritoryMeta(customerNo, rawRouteCode, rawRouteName, rawTerritory);

    return {
      id: item._id || `rec-${idx + 1}`,
      date: datePart,
      area: meta.area || dept.territory?.parent?.name || 'Central South',
      territory: meta.territory || rawTerritory || 'Gulshan',
      dbCode: meta.dbCode,
      dbName: meta.dbName,
      srPositionCode: user.position_code || meta.srPositionCode || `SR-${user.code || idx + 1}`,
      srCode: String(user.code || ''),
      srName: user.name || '',
      routeCode: rawRouteCode || meta.routeCode || `R-${item.route_id || idx}`,
      routeName: rawRouteName || meta.routeName || rawTerritory,
      customerNo: customerNo,
      customerName: customerName,
      clockInTime: createdAt,
      clockOutTime: checkedOutAt,
      timeSpentMinutes: timeSpent,
    };
  });

  const totalVisits = records.length;
  const uniqueSRs = new Set(records.map((r) => r.srCode).filter(Boolean)).size;
  const uniqueCustomers = new Set(records.map((r) => r.customerNo).filter(Boolean)).size;
  const completedVisits = records.filter((r) => r.clockOutTime).length;

  return {
    records,
    meta: {
      dateRange: { start, end },
      totalRecords: totalVisits,
      uniqueSRs,
      uniqueCustomers,
      completedVisits,
      source: 'Live Sokrio SFA API (Dynamic Territories Master)',
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || '2026-10-25';
  const end = searchParams.get('end') || start;
  const cacheKey = `${start}_${end}`;

  // 1. Check memory cache (fast return)
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      meta: { ...cached.meta, cached: true },
      data: cached.records,
    });
  }

  try {
    // 2. In-flight request deduplication
    let fetchPromise = inFlightRequests.get(cacheKey);
    if (!fetchPromise) {
      fetchPromise = fetchFromSokrio(start, end).finally(() => {
        inFlightRequests.delete(cacheKey);
      });
      inFlightRequests.set(cacheKey, fetchPromise);
    }

    const result = await fetchPromise;

    // Save to cache
    memoryCache.set(cacheKey, {
      records: result.records,
      meta: result.meta,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      meta: result.meta,
      data: result.records,
    });
  } catch (error: any) {
    console.error(`API Error in mt-visit-status (${cacheKey}):`, error?.message || error);

    // If we have any cached data (even stale), return it on error
    if (cached) {
      return NextResponse.json({
        success: true,
        meta: { ...cached.meta, stale: true, warning: 'Returning stale cached data' },
        data: cached.records,
      });
    }

    // Otherwise fallback to sample data mapped to current date and master territories
    const sampleRecords = getExcelSampleData(start);
    return NextResponse.json({
      success: true,
      meta: {
        dateRange: { start, end },
        totalRecords: sampleRecords.length,
        uniqueSRs: new Set(sampleRecords.map((r) => r.srCode)).size,
        uniqueCustomers: new Set(sampleRecords.map((r) => r.customerNo)).size,
        completedVisits: sampleRecords.filter((r) => r.clockOutTime).length,
        source: 'Sample Excel (Fallback)',
        warning: error?.message,
      },
      data: sampleRecords,
    });
  }
}
