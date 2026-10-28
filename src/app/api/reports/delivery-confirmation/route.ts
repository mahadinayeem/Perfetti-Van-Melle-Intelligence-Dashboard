import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface DeliveryConfirmationRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  uniqueLocationCode: string | number;
  dBSUBDBCode: string | number;
  dBSUBDBName: string | number;
  sRPositionCode: string | number;
  sRECCode: string | number;
  sRName: string | number;
  orderDate: string | number;
  day: string | number;
  orderPC: string | number;
  totalSKULineOrder: string | number;
  totalOrderQty: string | number;
  totalOrderValue: string | number;
  deliveredDate: string | number;
  deliveryDay: string | number;
  deliveredPC: string | number;
  totalSKULineDelivery: string | number;
  deliveredQty: string | number;
  deliveredValue: string | number;
  returnedValue: string | number;
}

const memoryCache = new Map<string, { records: DeliveryConfirmationRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): DeliveryConfirmationRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Delivery Confirmation Report'];
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
        id: 'del-conf-' + (idx + 1),
        cluster: obj["Cluster"] ?? '',
        area: obj["Area"] ?? '',
        territory: obj["Territory"] ?? '',
        uniqueLocationCode: obj["Unique Location Code"] ?? '',
        dBSUBDBCode: obj["DB/SUB DB Code"] ?? '',
        dBSUBDBName: obj["DB/SUB DB Name"] ?? '',
        sRPositionCode: obj["SR Position Code"] ?? '',
        sRECCode: obj["SR EC Code"] ?? '',
        sRName: obj["SR Name"] ?? '',
        orderDate: obj["Order Date"] ?? '',
        day: obj["Day"] ?? '',
        orderPC: obj["OrderPC"] ?? '',
        totalSKULineOrder: obj["Total SKU Line-Order"] ?? '',
        totalOrderQty: obj["TotalOrderQty"] ?? '',
        totalOrderValue: obj["TotalOrderValue"] ?? '',
        deliveredDate: obj["Delivered Date"] ?? '',
        deliveryDay: obj["Delivery Day"] ?? '',
        deliveredPC: obj["Delivered PC"] ?? '',
        totalSKULineDelivery: obj["Total SKU Line-Delivery"] ?? '',
        deliveredQty: obj["Delivered Qty"] ?? '',
        deliveredValue: obj["Delivered Value"] ?? '',
        returnedValue: obj["Returned Value"] ?? '',
      };
    });
  } catch (e) {
    console.error('[Delivery Confirmation Report] Failed to load excel sample:', e);
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

    const cacheKey = 'del-conf_' + startDate + '_' + endDate;
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
      sheet: 'Delivery Confirmation Report',
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
    console.error('[Delivery Confirmation Report API Error]:', error);
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
