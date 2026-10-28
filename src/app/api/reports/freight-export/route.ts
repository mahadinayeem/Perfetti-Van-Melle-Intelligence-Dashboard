import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface FreightExportRecord {
  id: string;
  date: string | number;
  dBCode: string | number;
  dBName: string | number;
  sUBDBCode: string | number;
  sUBDBName: string | number;
  sKUCode: string | number;
  sKUName: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  salesQtyLoose: string | number;
  salesQtyInCTN: string | number;
  amount: string | number;
  isConfirmed: string | number;
  pONo: string | number;
}

const memoryCache = new Map<string, { records: FreightExportRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): FreightExportRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Freight Export'];
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
        id: 'fe-' + (idx + 1),
        date: obj["Date"] ?? '',
        dBCode: obj["DB Code"] ?? '',
        dBName: obj["DB Name"] ?? '',
        sUBDBCode: obj["SUB DB Code"] ?? '',
        sUBDBName: obj["SUB DB Name"] ?? '',
        sKUCode: obj["SKU Code"] ?? '',
        sKUName: obj["SKU Name"] ?? '',
        invoiceNo: obj["Invoice No"] ?? '',
        deliveryDate: obj["Delivery Date"] ?? '',
        salesQtyLoose: obj["SalesQtyLoose"] ?? '',
        salesQtyInCTN: obj["Sales Qty in CTN"] ?? '',
        amount: obj["Amount"] ?? '',
        isConfirmed: obj["IsConfirmed"] ?? '',
        pONo: obj["PONo"] ?? '',
      };
    });
  } catch (e) {
    console.error('[Freight Export] Failed to load excel sample:', e);
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

    const cacheKey = 'fe_' + startDate + '_' + endDate;
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
      sheet: 'Freight Export',
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
    console.error('[Freight Export API Error]:', error);
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
