import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as XLSX from 'xlsx';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

export interface LiveOrderUpdateRecord {
  id?: string;
  cluster: string;
  area: string;
  territory: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  srPosition: string;
  srCode: string;
  srName: string;
  orderDate: string;
  routeCode: string;
  routeName: string;
  customerNo: string;
  customerName: string;
  orderNo: string;
  category: string;
  motherSkuCode: string;
  motherSkuName: string;
  brand: string;
  skuCode: string;
  skuName: string;
  qty: number;
  price: number;
  orderValue: number;
  discountValue: number;
  cashDiscount: number;
  valueAfterDiscount: number;
  orderStatus: string;
  uom: string;
  channel: string;
}

interface CacheEntry {
  records: LiveOrderUpdateRecord[];
  meta: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000;

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

const SKU_CATALOG: Record<string, { motherSkuCode: string; motherSkuName: string; category: string; uom: string; brand: string }> = skuCatalogData as any;

function getSampleExcelData(): LiveOrderUpdateRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Live Order Update Report'];
    if (!sheet) return [];

    const rows: any[] = XLSX.utils.sheet_to_json(sheet) || [];
    return rows.map((r, idx) => ({
      id: `live-order-sample-${idx + 1}`,
      cluster: String(r['Cluster'] || 'Central'),
      area: String(r['Area'] || 'Central South'),
      territory: String(r['1'] || r['Territory'] || 'Jatra Bari'),
      dbCode: r['DB Code'] || '102267',
      dbName: String(r['DB Name'] || 'M/S Ahamed Enterprise'),
      dbType: String(r['DB Type'] || ''),
      srPosition: String(r['SR Position'] || 'DM-060'),
      srCode: String(r['SR Code'] || ''),
      srName: String(r['SR Name'] || ''),
      orderDate: String(r['Order Date'] || ''),
      routeCode: String(r['Route Code'] || ''),
      routeName: String(r['Route Name'] || ''),
      customerNo: String(r['Customer No'] || ''),
      customerName: String(r['Customer Name'] || ''),
      orderNo: String(r['Order No'] || ''),
      category: String(r['Category'] || 'Gum'),
      motherSkuCode: String(r['Mother SKU Code'] || ''),
      motherSkuName: String(r['Mother SKU Name'] || ''),
      brand: String(r['Brand'] || ''),
      skuCode: String(r['SKU Code'] || ''),
      skuName: String(r['SKU Name'] || ''),
      qty: Number(r['Qty'] || 0),
      price: Number(r['Price'] || 0),
      orderValue: Number(r['Order Value'] || 0),
      discountValue: Number(r['Discount Value'] || 0),
      cashDiscount: Number(r['Cash Discount'] || 0),
      valueAfterDiscount: Number(r['Value After Discount'] || 0),
      orderStatus: String(r['Order Status'] || 'Pending'),
      uom: String(r['UOM'] || 'BOX'),
      channel: String(r['Channel'] || 'Retail'),
    }));
  } catch (e) {
    console.error('[Live Order Update] Error loading sample excel:', e);
    return [];
  }
}

async function fetchLiveOrdersFromSokrio(startDate: string, endDate: string): Promise<LiveOrderUpdateRecord[]> {
  let token = await getValidToken();

  const url = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${startDate}%2C${endDate}&territory_id=1&download&type=xlsx`;

  let res: any;
  try {
    res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      token = await getValidToken(true);
      res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer',
        timeout: 30000,
      });
    } else {
      throw err;
    }
  }

  const wb = XLSX.read(res.data, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const orderRaw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) || [];
  if (orderRaw.length < 5) return [];

  const headers = orderRaw[3] || [];
  const rows = orderRaw.slice(4).map(r => {
    const obj: Record<string, any> = {};
    headers.forEach((h: any, idx: number) => {
      if (h) obj[String(h).trim()] = r[idx];
    });
    return obj;
  });

  return rows.map((r, idx) => {
    const srCode = String(r['Order Creator Code'] || r['Employee Code'] || '').trim();
    const srMeta = SR_METADATA_MAP[srCode];
    const skuCode = String(r['Product SKU'] || '').trim();
    const skuInfo = SKU_CATALOG[skuCode];

    const qty = Number(r['Order Quantity'] || 0);
    const price = Number(r['Unit Price'] || 0);
    const subtotal = Number(r['Subtotal'] || (qty * price));
    const amount = Number(r['Amount'] || subtotal);
    const discount = Math.max(0, subtotal - amount);

    let uom = 'PCS';
    if (r['BOX']) uom = 'BOX';
    else if (r['JAR']) uom = 'JAR';
    else if (r['Ctn']) uom = 'CTN';
    else if (r['HNG']) uom = 'HNG';
    else if (skuInfo?.uom) uom = skuInfo.uom;

    return {
      id: `live-order-${idx + 1}`,
      cluster: 'Central',
      area: 'Central South',
      territory: srMeta?.territory || 'Jatra Bari',
      dbCode: r['Seller Department Code'] || srMeta?.dbCode || '102267',
      dbName: r['Seller Department Name'] || srMeta?.dbName || 'M/S Ahamed Enterprise',
      dbType: '',
      srPosition: srMeta?.srPositionCode || 'DM-057',
      srCode,
      srName: srMeta?.srName || String(r['Order Creator Name'] || r['Employee Name'] || ''),
      orderDate: String(r['Order Date'] || startDate),
      routeCode: String(r['Buyer Territory Code'] || `T16R${idx + 1}`),
      routeName: String(r['Buyer Territory Name'] || 'General Route'),
      customerNo: String(r['Buyer Department Code'] || ''),
      customerName: String(r['Buyer Department Name'] || ''),
      orderNo: String(r['Order Reference'] || r['Tracking ID'] || `ORD-${idx + 1}`),
      category: skuInfo?.category || String(r['Product Category'] || 'Confectionery'),
      motherSkuCode: skuInfo?.motherSkuCode || `MSKU00${skuCode.slice(-2)}`,
      motherSkuName: skuInfo?.motherSkuName || String(r['Product Brand'] || 'Perfetti SKU'),
      brand: skuInfo?.brand || String(r['Product Brand'] || ''),
      skuCode,
      skuName: String(r['Product Name'] || ''),
      qty,
      price,
      orderValue: subtotal,
      discountValue: discount,
      cashDiscount: 0,
      valueAfterDiscount: amount,
      orderStatus: String(r['Order Status'] || 'Pending'),
      uom,
      channel: 'Retail',
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '2026-10-26';
    const endDate = url.searchParams.get('endDate') || '2026-10-26';

    const cacheKey = `live_order_${startDate}_${endDate}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cached.records,
        meta: cached.meta,
      });
    }

    let records: LiveOrderUpdateRecord[] = [];
    let source = 'sokrio_live_api';

    try {
      records = await fetchLiveOrdersFromSokrio(startDate, endDate);
    } catch (err: any) {
      console.warn('[Live Order Update] Live API fetch failed:', err.message);
    }

    const totalOrders = new Set(records.map(r => r.orderNo)).size;
    const totalOutlets = new Set(records.map(r => r.customerNo)).size;
    const totalSKUs = new Set(records.map(r => r.skuCode)).size;
    const totalValue = records.reduce((s, r) => s + (r.valueAfterDiscount || r.orderValue || 0), 0);
    const totalQty = records.reduce((s, r) => s + (r.qty || 0), 0);

    const meta = {
      totalRecords: records.length,
      totalOrders,
      totalOutlets,
      totalSKUs,
      totalValue,
      totalQty,
      source,
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (err: any) {
    console.error('[Live Order Update API] Error:', err);
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalRecords: 0,
        totalOrders: 0,
        totalOutlets: 0,
        totalSKUs: 0,
        totalValue: 0,
        totalQty: 0,
        source: 'error',
      },
    });
  }
}
