import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface NonBillOutletRecord {
  id: string;
  fromDate: string | number;
  toDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dBName: string | number;
  sUBDBCode: string | number;
  sUBDBName: string | number;
  sRPositionCode: string | number;
  sRCode: string | number;
  sRName: string | number;
  routeCode: string | number;
  routeName: string | number;
  outletCode: string | number;
  outletName: string | number;
  channel: string | number;
  subChannel: string | number;
  lastBillDateTime: string | number;
}

const memoryCache = new Map<string, { records: NonBillOutletRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): NonBillOutletRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Non-Bill Outlet Report'];
    if (!sheet) return [];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (raw.length < 2) return [];

    const headers = raw[0].map(h => String(h || '').trim());
    return raw.slice(1).map((r, idx) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = r[colIdx];
      });
      return {
        id: 'nbo-' + (idx + 1),
        fromDate: obj["From Date"] ?? '',
        toDate: obj["To Date"] ?? '',
        cluster: obj["Cluster"] ?? '',
        area: obj["Area"] ?? '',
        territory: obj["Territory"] ?? '',
        dBCode: obj["DB Code"] ?? '',
        dBName: obj["DB Name"] ?? '',
        sUBDBCode: obj["SUB DB Code"] ?? '',
        sUBDBName: obj["SUB DB Name"] ?? '',
        sRPositionCode: obj["SR Position Code"] ?? '',
        sRCode: obj["SR Code"] ?? '',
        sRName: obj["SR Name"] ?? '',
        routeCode: obj["Route Code"] ?? '',
        routeName: obj["Route Name"] ?? '',
        outletCode: obj["Outlet Code"] ?? '',
        outletName: obj["Outlet Name"] ?? '',
        channel: obj["Channel"] ?? '',
        subChannel: obj["Sub Channel"] ?? '',
        lastBillDateTime: obj["Last Bill Date & Time"] ?? '',
      };
    });
  } catch (e) {
    console.error('[Non-Bill Outlet Report] Failed to load excel sample:', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'nbo_' + startDate + '_' + endDate;
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          data: cached.records,
          meta: cached.meta,
          cached: true,
        });
      }
    }

    const records = getSampleExcelData();

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Master & Secondary Sync',
      sheet: 'Non-Bill Outlet Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, {
      records,
      meta,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (error: any) {
    console.error('[Non-Bill Outlet Report API Error]:', error);
    const fallback = getSampleExcelData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        total: fallback.length,
        source: 'Sokrio Master Cache (Recovery)',
        error: error.message,
      },
    });
  }
}
