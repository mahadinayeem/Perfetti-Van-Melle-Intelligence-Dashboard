import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import { resolveChannel, resolveOutletEnglishName } from '@/lib/outletResolver';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';
import customerMapData from '@/lib/customerMap.json';
import * as XLSX from 'xlsx';
import axios from 'axios';

const CUSTOMER_MAP: Record<string, string> = customerMapData as Record<string, string>;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format any date value into DD-MMM-YYYY (e.g., 11-Oct-2026) matching sample format.
 * Returns empty string if no date value is provided (no dummy fallback).
 */
function formatDDMMMYYYY(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Already in DD-MMM-YYYY (e.g. 11-Oct-2026 or 11-OCT-2026)
  const ddMmmMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (ddMmmMatch) {
    const day = ddMmmMatch[1].padStart(2, '0');
    const mon = ddMmmMatch[2].charAt(0).toUpperCase() + ddMmmMatch[2].slice(1, 3).toLowerCase();
    const yr = ddMmmMatch[3];
    return `${day}-${mon}-${yr}`;
  }

  // If YYYY-MM-DD (e.g. from Sokrio API '2026-10-14')
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const yr = ymdMatch[1];
    const mIdx = parseInt(ymdMatch[2], 10) - 1;
    const day = ymdMatch[3].padStart(2, '0');
    if (mIdx >= 0 && mIdx < 12) {
      return `${day}-${MONTH_NAMES[mIdx]}-${yr}`;
    }
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mIdx = parseInt(dmyMatch[2], 10) - 1;
    const yr = dmyMatch[3];
    if (mIdx >= 0 && mIdx < 12) {
      return `${day}-${MONTH_NAMES[mIdx]}-${yr}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = MONTH_NAMES[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  }

  return str;
}

/**
 * Direct Live Order Number: Uses live Order Reference if present,
 * or the exact live Tracking ID directly from Sokrio server as-is.
 * Leaves empty if neither is available (no dummy data).
 */
function formatOrderNo(orderRef: any, trackingId: any): string {
  const refStr = String(orderRef || '').trim();
  if (refStr && refStr !== '-' && refStr !== 'null' && refStr !== 'undefined') {
    return refStr;
  }
  const trackStr = String(trackingId || '').trim();
  if (trackStr && trackStr !== '-' && trackStr !== 'null' && trackStr !== 'undefined') {
    return trackStr;
  }
  return '';
}

function toEnglishOutletName(name: string, custCode: string): string {
  if (custCode && CUSTOMER_MAP[custCode]) return CUSTOMER_MAP[custCode];
  if (!name) return '';

  // If already ASCII/English
  if (!/[\u0980-\u09FF]/.test(name)) return name;

  // Replace common Bengali retail terms
  const eng = name
    .replace(/মেসার্স/g, 'M/S')
    .replace(/স্টোর/g, 'Store')
    .replace(/ষ্টোর/g, 'Store')
    .replace(/ভ্যারাইটিজ/g, 'Varieties')
    .replace(/ভ্যারাইটিস/g, 'Varieties')
    .replace(/কনফেকশনারী/g, 'Confectionery')
    .replace(/ট্রেডার্স/g, 'Traders')
    .replace(/ট্রেডিং/g, 'Trading')
    .replace(/বেকারী/g, 'Bakery')
    .replace(/এন্টারপ্রাইজ/g, 'Enterprise')
    .replace(/টি স্টল/g, 'Tea Stall')
    .replace(/জেনারেল স্টোর/g, 'General Store')
    .replace(/হোটেল/g, 'Hotel')
    .replace(/ফার্মেসী/g, 'Pharmacy')
    .replace(/ডিপার্টমেন্টাল/g, 'Departmental');

  return eng.trim() || name.trim();
}

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
  const rows = orderRaw.slice(4).map((r) => {
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
    const subtotal = Number(r['Subtotal'] || qty * price);
    const amount = Number(r['Amount'] || subtotal);
    const discount = Math.max(0, subtotal - amount);

    let uom = 'PCS';
    if (r['BOX']) uom = 'BOX';
    else if (r['JAR']) uom = 'JAR';
    else if (r['Ctn']) uom = 'CTN';
    else if (r['HNG']) uom = 'HNG';
    else if (skuInfo?.uom) uom = skuInfo.uom;

    const dbCode = String(r['Seller Department Code'] || srMeta?.dbCode || '');
    const custNo = String(r['Buyer Department Code'] || '').trim();

    return {
      id: `live-order-${idx + 1}`,
      cluster: 'Central',
      area: 'Central South',
      territory: srMeta?.territory || 'Jatra Bari',
      dbCode,
      dbName: String(r['Seller Department Name'] || srMeta?.dbName || ''),
      dbType: 'MAIN DB',
      srPosition: srMeta?.srPositionCode || '',
      srCode,
      srName: srMeta?.srName || String(r['Order Creator Name'] || r['Employee Name'] || ''),
      orderDate: formatDDMMMYYYY(r['Order Date'] || startDate),
      routeCode: String(r['Buyer Territory Code'] || '').trim(),
      routeName: String(r['Buyer Territory Name'] || '').trim(),
      customerNo: custNo,
      customerName: resolveOutletEnglishName(custNo, toEnglishOutletName(String(r['Buyer Department Name'] || ''), custNo)),
      orderNo: formatOrderNo(r['Order Reference'], r['Tracking ID']),
      category: skuInfo?.category || String(r['Product Category'] || '').trim(),
      motherSkuCode: skuInfo?.motherSkuCode || (skuCode ? `MSKU00${skuCode.slice(-2)}` : ''),
      motherSkuName: skuInfo?.motherSkuName || String(r['Product Brand'] || '').trim(),
      brand: skuInfo?.brand || String(r['Product Brand'] || '').trim(),
      skuCode,
      skuName: resolveEnglishSkuName(skuCode, String(r['Product Name'] || '')),
      qty,
      price,
      orderValue: subtotal,
      discountValue: discount,
      cashDiscount: 0,
      valueAfterDiscount: amount,
      orderStatus: r['Order Status'] ? String(r['Order Status']).trim() : '',
      uom,
      channel: resolveChannel(custNo),
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startDate = url.searchParams.get('startDate') || todayStr;
    const endDate = url.searchParams.get('endDate') || todayStr;

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

    const totalOrders = new Set(records.map((r) => r.orderNo).filter(Boolean)).size;
    const totalOutlets = new Set(records.map((r) => r.customerNo).filter(Boolean)).size;
    const totalSKUs = new Set(records.map((r) => r.skuCode).filter(Boolean)).size;
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
