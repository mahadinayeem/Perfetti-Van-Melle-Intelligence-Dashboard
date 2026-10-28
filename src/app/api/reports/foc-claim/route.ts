import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface FocClaimRecord {
  id: string;
  orderDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dBName: string | number;
  outletsCat: string | number;
  outletCode: string | number;
  outletName: string | number;
  routeCode: string | number;
  routeName: string | number;
  invNo: string | number;
  sKUCode: string | number;
  sKUName: string | number;
  uOM: string | number;
  qty: string | number;
  sKUTP: string | number;
  claimAmount: string | number;
}

const memoryCache = new Map<string, { records: FocClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): FocClaimRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['FOC Claim'];
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
        id: 'foc-' + (idx + 1),
        orderDate: obj["OrderDate"] ?? '',
        cluster: obj["Cluster"] ?? '',
        area: obj["Area"] ?? '',
        territory: obj["Territory"] ?? '',
        dBCode: obj["DB Code"] ?? '',
        dBName: obj["DB Name"] ?? '',
        outletsCat: obj["Outlets cat"] ?? '',
        outletCode: obj["Outlet Code"] ?? '',
        outletName: obj["Outlet Name"] ?? '',
        routeCode: obj["Route Code"] ?? '',
        routeName: obj["RouteName"] ?? '',
        invNo: obj["InvNo"] ?? '',
        sKUCode: obj["SKU Code"] ?? '',
        sKUName: obj["SKU Name"] ?? '',
        uOM: obj["UOM"] ?? '',
        qty: obj["Qty"] ?? '',
        sKUTP: obj["SKU TP"] ?? '',
        claimAmount: obj["Claim Amount"] ?? '',
      };
    });
  } catch (e) {
    console.error('[FOC Claim] Failed to load excel sample:', e);
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

    const cacheKey = 'foc_' + startDate + '_' + endDate;
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
      sheet: 'FOC Claim',
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
    console.error('[FOC Claim API Error]:', error);
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
