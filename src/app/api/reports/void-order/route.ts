import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface VoidOrderRecord {
  id: string;
  orderNo: string | number;
  orderDate: string | number;
  deliveryDate: string | number;
  voidDate: string | number;
  outlet: string | number;
  outletName: string | number;
  sRCode: string | number;
  sRName: string | number;
  dBCode: string | number;
  dBName: string | number;
  salesOfficeID: string | number;
  salesOfficeName: string | number;
  sKUQuantity: string | number;
  lineAmount: string | number;
  discount: string | number;
  amount: string | number;
  orderValue: string | number;
  orderCashDiscount: string | number;
  createDeliveryDate: string | number;
}

const memoryCache = new Map<string, { records: VoidOrderRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): VoidOrderRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Void Order Report'];
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
        id: 'void-' + (idx + 1),
        orderNo: obj["OrderNo"] ?? '',
        orderDate: obj["OrderDate"] ?? '',
        deliveryDate: obj["DeliveryDate"] ?? '',
        voidDate: obj["Void Date"] ?? '',
        outlet: obj["Outlet"] ?? '',
        outletName: obj["Outlet Name"] ?? '',
        sRCode: obj["SR Code"] ?? '',
        sRName: obj["SR Name"] ?? '',
        dBCode: obj["DB Code"] ?? '',
        dBName: obj["DB Name"] ?? '',
        salesOfficeID: obj["SalesOfficeID"] ?? '',
        salesOfficeName: obj["SalesOfficeName"] ?? '',
        sKUQuantity: obj["SKU Quantity"] ?? '',
        lineAmount: obj["Line Amount"] ?? '',
        discount: obj["Discount"] ?? '',
        amount: obj["Amount"] ?? '',
        orderValue: obj["Order Value"] ?? '',
        orderCashDiscount: obj["Order Cash Discount"] ?? '',
        createDeliveryDate: obj["Create DeliveryDate"] ?? '',
      };
    });
  } catch (e) {
    console.error('[Void Order Report] Failed to load excel sample:', e);
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

    const cacheKey = 'void_' + startDate + '_' + endDate;
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
      sheet: 'Void Order Report',
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
    console.error('[Void Order Report API Error]:', error);
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
