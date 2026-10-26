import { NextRequest, NextResponse } from 'next/server';
import { fetchWithAuth } from '@/lib/sokrioClient';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface BWIWRecord {
  id?: string;
  orderDate: string;
  cluster: string;
  area: string;
  territory: string;
  territoryCode: string;
  town?: string;
  dbCode: string;
  dbName: string;
  dbType: string;
  srCode: string;
  srName: string;
  srPositionCode: string;
  routeCode: string;
  routeName: string;
  customerCode: string;
  customerName: string;
  channel: string;
  subChannel: string;
  invoiceNo: string;
  category: string;
  brand: string;
  skuCode: string;
  skuName: string;
  deliveryUom: string;
  noofSKUinCTN?: string | number;
  weightperSKUgm?: string | number;
  skutp: number;
  orderQty: number;
  orderVol?: string | number;
  orderValue: number;
  orderCashDiscount: number;
  deliveryConfirmationDate?: string;
  deliveryDate: string;
  deliveryQty: number;
  deliveryVol?: string | number;
  deliveryValue: number;
  deliveryCashDiscount: number;
  freeQuantity?: number;
  deliveryValueAfterDiscount: number;
  wsCashDiscount?: number;
  motherSkuCode?: string;
  createDeliveryDate?: string;
}

// In-memory caching
interface CacheEntry {
  records: BWIWRecord[];
  meta: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

// Resolve DB Code, DB Name, Area, Territory from Sokrio Territories Master
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
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
  }
  return s.split('T')[0].split(' ')[0];
}

// Helper to get sample data from Report Sample.xlsx
function getExcelSampleData(): BWIWRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets['BWIW Report'];
    if (!sheet) return [];

    const json = XLSX.utils.sheet_to_json<any>(sheet);
    return json.map((row, idx) => {
      const custCode = String(row['CustomerCode'] || row['Customer Code'] || '');
      const meta = resolveTerritoryMeta(custCode, String(row['RouteCode'] || ''), String(row['RouteName'] || ''), String(row['Territory'] || ''));

      const orderDate = toStandardDate(row['OrderDate']);
      const delDate = toStandardDate(row['DeliveryDate'] || row['OrderDate']);
      const orderVal = Number(row['OrderValue'] || 0);
      const delVal = Number(row['DeliveryValue'] || row['DeliveryValueAfterDiscount'] || orderVal);

      return {
        id: `bwiw-${idx + 1}`,
        orderDate,
        cluster: String(row['Cluster'] || 'Central'),
        area: meta.area || String(row['Area'] || 'Central South'),
        territory: meta.territory || String(row['Territory'] || 'Jatra Bari'),
        territoryCode: meta.territoryCode || String(row['Territorycode'] || 'T16'),
        town: String(row['Town'] || ''),
        dbCode: meta.dbCode || String(row['DBCode'] || '102267'),
        dbName: meta.dbName || String(row['DBName'] || 'M/S Ahamed Enterprise'),
        dbType: String(row['DBType'] || 'MAIN'),
        srCode: String(row['SRCode'] || ''),
        srName: String(row['SRName'] || ''),
        srPositionCode: meta.srPositionCode || String(row['SRPositionCode'] || 'DM-057'),
        routeCode: String(row['RouteCode'] || meta.routeCode || ''),
        routeName: String(row['RouteName'] || meta.routeName || ''),
        customerCode: custCode,
        customerName: String(row['CustomerName'] || row['Customer Name'] || ''),
        channel: String(row['Channel'] || 'Retail'),
        subChannel: String(row['subChannel'] || 'General & Grocery Store'),
        invoiceNo: String(row['InvoiceNo'] || row['Invoice No'] || `INV-${idx + 1000}`),
        category: String(row['Category'] || 'Confectionery'),
        brand: String(row['Brand'] || 'Perfetti Van Melle'),
        skuCode: String(row['SKUCode'] || row['SKU Code'] || ''),
        skuName: String(row['SKUName'] || row['SKU Name'] || ''),
        deliveryUom: String(row['DeliveryUOM'] || 'PCS'),
        noofSKUinCTN: row['NoofSKUinCTN'] || '15',
        weightperSKUgm: row['WeightperSKUgm'] || '360',
        skutp: Number(row['SKUTP'] || 0),
        orderQty: Number(row['OrderQty'] || 0),
        orderVol: row['OrderVol'] || '0.00036',
        orderValue: orderVal,
        orderCashDiscount: Number(row['OrderCashDiscount'] || 0),
        deliveryConfirmationDate: toStandardDate(row['DeliveryConfirmationDate']),
        deliveryDate: delDate,
        deliveryQty: Number(row['DeliveryQty'] || row['OrderQty'] || 0),
        deliveryVol: row['DeliveryVol'] || '0.00036',
        deliveryValue: delVal,
        deliveryCashDiscount: Number(row['DeliveryCashDiscount'] || 0),
        freeQuantity: Number(row['FreeQuantity'] || 0),
        deliveryValueAfterDiscount: Number(row['DeliveryValueAfterDiscount'] || delVal),
        wsCashDiscount: Number(row['WSCashDiscount'] || 0),
        motherSkuCode: String(row['Mother SKU Code'] || row['MotherSKUCode'] || 'MSKU0097'),
        createDeliveryDate: toStandardDate(row['Create Delivery Date'] || row['CreateDeliveryDate']),
      };
    });
  } catch (e) {
    console.error('Error reading BWIW Report from Excel:', e);
    return [];
  }
}

// Helper to get all 8,007 records from Sokrio Delivery Summary
function getDeliverySummaryData(): BWIWRecord[] {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'deliverySummary.json');
    if (!fs.existsSync(jsonPath)) return [];
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return raw.map((r: any, idx: number) => {
      const custCode = String(r['Buyer Department Code'] || '');
      const territoryCode = String(r['Buyer Territory Code'] || '');
      const routeName = String(r['Buyer Territory Name'] || '');
      const meta = resolveTerritoryMeta(custCode, territoryCode, routeName, routeName);

      const orderDate = toStandardDate(r['Delivery Date']);
      const delDate = orderDate;
      const qty = Number(r['Delivery Quantity'] || 0);
      const unitPrice = Number(r['Unit Price'] || 0);
      const val = Number(r['Amount'] || r['Subtotal'] || (qty * unitPrice));
      const trackingId = r['Tracking ID'];
      const invNo = trackingId ? `INV-${trackingId}` : `INV-${1000 + idx}`;

      return {
        id: `del-sum-${idx + 1}`,
        orderDate,
        cluster: 'Central',
        area: meta.area || 'Central South',
        territory: meta.territory || routeName || 'Jatra Bari',
        territoryCode: meta.territoryCode || (territoryCode ? territoryCode.substring(0, 3) : 'T16'),
        town: '',
        dbCode: String(r['Employee Code'] || meta.dbCode || '102267'),
        dbName: String(r['Employee Name'] || meta.dbName || 'M/S Ahamed Enterprise'),
        dbType: 'MAIN',
        srCode: String(r['Order Creator Code'] || '54506'),
        srName: String(r['Order Creator Name'] || 'Mostafizur Rahman'),
        srPositionCode: meta.srPositionCode || 'DM-057',
        routeCode: territoryCode || meta.routeCode || '',
        routeName: routeName || meta.routeName || '',
        customerCode: custCode,
        customerName: String(r['Buyer Department Name'] || ''),
        channel: 'Retail',
        subChannel: 'General & Grocery Store',
        invoiceNo: invNo,
        category: String(r['Product Category'] || 'Confectionery'),
        brand: String(r['Product Brand'] || 'Center Fruit'),
        skuCode: String(r['Product SKU'] || ''),
        skuName: String(r['Product Name'] || ''),
        deliveryUom: 'PCS',
        noofSKUinCTN: 15,
        weightperSKUgm: 360,
        skutp: unitPrice,
        orderQty: qty,
        orderVol: (qty * 0.00036).toFixed(5),
        orderValue: val,
        orderCashDiscount: 0,
        deliveryConfirmationDate: delDate,
        deliveryDate: delDate,
        deliveryQty: qty,
        deliveryVol: (qty * 0.00036).toFixed(5),
        deliveryValue: val,
        deliveryCashDiscount: 0,
        freeQuantity: 0,
        deliveryValueAfterDiscount: val,
        wsCashDiscount: 0,
        motherSkuCode: 'MSKU0097',
        createDeliveryDate: delDate,
      };
    });
  } catch (e) {
    console.warn('[BWIW] getDeliverySummaryData error:', e);
    return [];
  }
}

const BRAND_MAP: Record<number, string> = {
  1: 'Mentos',
  2: 'Alpenliebe Juzt Jelly',
  3: 'Alpenliebe Creamfills',
  4: 'Center Fresh',
  5: 'Alpenliebe Chewy',
  6: 'Center Fruit',
  7: 'Air Action',
  10: 'Chupa Chups Bites',
  12: 'Chupa Chups Duo',
};

const CATEGORY_MAP: Record<number, string> = {
  1: 'Chewy',
  2: 'Jelly',
  3: 'Hard Candy',
  4: 'Gum',
};

function resolveBrandName(baseName: string, brandId?: number): string {
  const n = String(baseName || '').toLowerCase();
  if (n.includes('সেন্টার ফ্রেশ') || n.includes('center fresh')) return 'Center Fresh';
  if (n.includes('সেন্টার ফ্রূট') || n.includes('center fruit')) return 'Center Fruit';
  if (n.includes('ক্রিমফিলস') || n.includes('creamfills')) return 'Alpenliebe Creamfills';
  if (n.includes('জাস্ট জেলি') || n.includes('juzt jelly')) return 'Alpenliebe Juzt Jelly';
  if (n.includes('চিউই') || n.includes('chewy')) return 'Alpenliebe Chewy';
  if (n.includes('অ্যালপেনলিবে') || n.includes('alpenliebe')) return 'Alpenliebe';
  if (n.includes('চুপা চুপস') || n.includes('chupa chups')) return 'Chupa Chups';
  if (n.includes('মেন্টস') || n.includes('mentos')) return 'Mentos';
  if (n.includes('এয়ার অ্যাকশন') || n.includes('air action')) return 'Air Action';
  if (brandId && BRAND_MAP[brandId]) return BRAND_MAP[brandId];
  return 'Perfetti Van Melle';
}

function resolveCategoryName(baseName: string, catId?: number): string {
  const n = String(baseName || '').toLowerCase();
  if (n.includes('জেলি') || n.includes('jelly') || n.includes('rope')) return 'Jelly';
  if (n.includes('গাম') || n.includes('gum') || n.includes('ফ্রেশ') || n.includes('fresh') || n.includes('fruit')) return 'Gum';
  if (n.includes('ক্যান্ডি') || n.includes('creamfills') || n.includes('ক্রিমফিলস')) return 'Hard Candy';
  if (n.includes('চিউই') || n.includes('chewy') || n.includes('মেন্টস') || n.includes('mentos')) return 'Chewy';
  if (catId && CATEGORY_MAP[catId]) return CATEGORY_MAP[catId];
  return 'Confectionery';
}

// Fetch live deliveries and map to BWIW structure
async function fetchFromSokrio(): Promise<BWIWRecord[]> {
  const baseUrl = process.env.SOKRIO_BASE_URL || 'https://pvm.core.sokrio.com';
  const res = await fetchWithAuth(`${baseUrl}/api/v1/deliveries`, { per_page: 50 });
  const list: any[] = res?.data || [];

  if (!list.length) return [];

  const records: BWIWRecord[] = [];

  list.forEach((del: any, dIdx: number) => {
    const order = del.order || {};
    const buyer = del.buyer || order.buyer || {};
    const orderedBy = del.ordered_by || order.ordered_by || {};
    const products = del.products || del.delivered_products || order.ordered_products || [];

    const orderDate = (order.created_at || del.created_at || '').split(' ')[0] || '';
    const deliveryDate = del.deliver_date || orderDate;
    const custNo = String(buyer.code || `CUST-${del.buyer_id || ''}`);
    const custName = String(buyer.name || `Outlet #${del.buyer_id || ''}`);
    const routeCode = String(buyer.route?.code || order.route?.code || '');
    const routeName = String(buyer.route?.name || order.route?.name || '');
    const meta = resolveTerritoryMeta(custNo, routeCode, routeName, buyer.territory?.name || '');

    if (products.length === 0) {
      records.push({
        id: `live-del-${del.id}`,
        orderDate,
        cluster: 'Central',
        area: meta.area,
        territory: meta.territory,
        territoryCode: meta.territoryCode || 'T16',
        town: '',
        dbCode: meta.dbCode,
        dbName: meta.dbName,
        dbType: 'MAIN',
        srCode: String(orderedBy.code || ''),
        srName: String(orderedBy.name || ''),
        srPositionCode: meta.srPositionCode,
        routeCode: routeCode || meta.routeCode || '',
        routeName: routeName || meta.routeName || '',
        customerCode: custNo,
        customerName: custName,
        channel: 'Retail',
        subChannel: 'General Store',
        invoiceNo: String(order.code || `INV-${del.id}`),
        category: 'Confectionery',
        brand: 'Perfetti Van Melle',
        skuCode: 'SKU-001',
        skuName: 'PVM Product Line',
        deliveryUom: 'PCS',
        noofSKUinCTN: 15,
        weightperSKUgm: 360,
        skutp: Number(del.amount || 0),
        orderQty: 1,
        orderVol: '0.00036',
        orderValue: Number(del.amount || 0),
        orderCashDiscount: Number(del.discount || 0),
        deliveryConfirmationDate: (del.created_at || '').split(' ')[0],
        deliveryDate,
        deliveryQty: 1,
        deliveryVol: '0.00036',
        deliveryValue: Number(del.payable || del.amount || 0),
        deliveryCashDiscount: Number(del.discount || 0),
        freeQuantity: 0,
        deliveryValueAfterDiscount: Number(del.payable || del.amount || 0),
        wsCashDiscount: 0,
        motherSkuCode: 'MSKU0097',
        createDeliveryDate: (del.created_at || '').split(' ')[0],
      });
    } else {
      products.forEach((pItem: any, pIdx: number) => {
        const prod = pItem.product || {};
        const base = prod.base_product || {};
        const price = Number(pItem.price || prod.mrp || 0);
        const qty = Number(pItem.qty || 1);
        const lineVal = price * qty;
        const disc = Number(pItem.custom_discount || pItem.promotion_discount || 0);

        const skuName = String(base.usp || base.name || prod.full_name || 'PVM SKU');
        const brandName = (base.product_brand && base.product_brand.name) || resolveBrandName(skuName, base.product_brand_id);
        const catName = (base.product_category && base.product_category.name) || resolveCategoryName(skuName, base.product_category_id);

        records.push({
          id: `live-del-${del.id}-${pIdx}`,
          orderDate,
          cluster: 'Central',
          area: meta.area,
          territory: meta.territory,
          territoryCode: meta.territoryCode || 'T16',
          town: '',
          dbCode: meta.dbCode,
          dbName: meta.dbName,
          dbType: 'MAIN',
          srCode: String(orderedBy.code || ''),
          srName: String(orderedBy.name || ''),
          srPositionCode: meta.srPositionCode,
          routeCode: routeCode || meta.routeCode || '',
          routeName: routeName || meta.routeName || '',
          customerCode: custNo,
          customerName: custName,
          channel: 'Retail',
          subChannel: 'General Store',
          invoiceNo: String(order.code || `INV-${del.id}`),
          category: catName,
          brand: brandName,
          skuCode: String(base.sku || prod.id || ''),
          skuName,
          deliveryUom: 'PCS',
          noofSKUinCTN: 15,
          weightperSKUgm: 360,
          skutp: price,
          orderQty: qty,
          orderVol: (qty * 0.00036).toFixed(5),
          orderValue: lineVal,
          orderCashDiscount: disc,
          deliveryConfirmationDate: (del.created_at || '').split(' ')[0],
          deliveryDate,
          deliveryQty: qty,
          deliveryVol: (qty * 0.00036).toFixed(5),
          deliveryValue: lineVal,
          deliveryCashDiscount: disc,
          freeQuantity: Number(pItem.free_with || 0),
          deliveryValueAfterDiscount: Math.max(0, lineVal - disc),
          wsCashDiscount: 0,
          motherSkuCode: base.mother_product_id ? `MSKU00${base.mother_product_id}` : 'MSKU0097',
          createDeliveryDate: (del.created_at || '').split(' ')[0],
        });
      });
    }
  });

  return records;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';

    const cacheKey = `bwiw_${startDate}_${endDate}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cached.records,
        meta: cached.meta,
      });
    }

    let records: BWIWRecord[] = [];
    let source = 'live';

    const deliverySummary = getDeliverySummaryData();
    if (deliverySummary && deliverySummary.length > 0) {
      records = deliverySummary;
      source = 'sokrio_delivery_summary';
    } else {
      try {
        records = await fetchFromSokrio();
        source = 'live_deliveries_api';
      } catch (apiErr) {
        console.warn('[BWIW] Live fetch failed, using sample excel:', (apiErr as any).message);
      }
    }

    if (!records || records.length === 0) {
      records = getExcelSampleData();
      source = 'excel_fallback';
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      const filtered = records.filter(r => {
        if (!r.orderDate) return true;
        const d = toStandardDate(r.orderDate);
        return d >= startDate && d <= endDate;
      });

      if (filtered.length > 0) {
        records = filtered;
      } else {
        // If exact date has no records (e.g. today has no new delivery yet),
        // keep latest available delivery summary records so user gets full data insight
        source = `${source}_latest_available`;
      }
    }

    const totalOrderVal = records.reduce((sum, r) => sum + (r.orderValue || 0), 0);
    const totalDelVal = records.reduce((sum, r) => sum + (r.deliveryValueAfterDiscount || r.deliveryValue || 0), 0);
    const uniqueInvoices = new Set(records.map(r => r.invoiceNo)).size;
    const uniqueSKUs = new Set(records.map(r => r.skuCode)).size;

    const meta = {
      totalRecords: records.length,
      totalOrderValue: totalOrderVal,
      totalDeliveryValue: totalDelVal,
      uniqueInvoices,
      uniqueSKUs,
      source,
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (err: any) {
    console.error('[BWIW API] Error:', err);
    const fallback = getExcelSampleData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        totalRecords: fallback.length,
        totalOrderValue: fallback.reduce((sum, r) => sum + (r.orderValue || 0), 0),
        totalDeliveryValue: fallback.reduce((sum, r) => sum + (r.deliveryValue || 0), 0),
        uniqueInvoices: new Set(fallback.map(r => r.invoiceNo)).size,
        uniqueSKUs: new Set(fallback.map(r => r.skuCode)).size,
        source: 'error_fallback',
      },
    });
  }
}
