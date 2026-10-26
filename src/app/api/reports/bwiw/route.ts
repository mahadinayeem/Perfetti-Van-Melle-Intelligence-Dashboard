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
  skutp: number;
  orderQty: number;
  orderValue: number;
  orderCashDiscount: number;
  deliveryDate: string;
  deliveryQty: number;
  deliveryValue: number;
  deliveryCashDiscount: number;
  deliveryValueAfterDiscount: number;
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
        skutp: Number(row['SKUTP'] || 0),
        orderQty: Number(row['OrderQty'] || 0),
        orderValue: orderVal,
        orderCashDiscount: Number(row['OrderCashDiscount'] || 0),
        deliveryDate: delDate,
        deliveryQty: Number(row['DeliveryQty'] || row['OrderQty'] || 0),
        deliveryValue: delVal,
        deliveryCashDiscount: Number(row['DeliveryCashDiscount'] || 0),
        deliveryValueAfterDiscount: Number(row['DeliveryValueAfterDiscount'] || delVal),
      };
    });
  } catch (e) {
    console.error('Error reading BWIW Report from Excel:', e);
    return [];
  }
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
    const buyer = del.buyer || {};
    const seller = del.seller || {};
    const orderedBy = del.ordered_by || order.ordered_by || {};
    const deliveredProducts = del.delivered_products || order.ordered_products || [];

    const orderDate = (order.created_at || del.created_at || '').split(' ')[0] || '';
    const deliveryDate = del.deliver_date || orderDate;
    const custNo = String(buyer.code || `CUST-${del.buyer_id || ''}`);
    const custName = String(buyer.name || `Outlet #${del.buyer_id || ''}`);
    const routeCode = String(buyer.route?.code || order.route?.code || '');
    const routeName = String(buyer.route?.name || order.route?.name || '');
    const meta = resolveTerritoryMeta(custNo, routeCode, routeName, buyer.territory?.name || '');

    if (deliveredProducts.length === 0) {
      records.push({
        id: `live-del-${del.id}`,
        orderDate,
        cluster: 'Central',
        area: meta.area,
        territory: meta.territory,
        territoryCode: meta.territoryCode || 'T16',
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
        skutp: Number(del.amount || 0),
        orderQty: 1,
        orderValue: Number(del.amount || 0),
        orderCashDiscount: Number(del.discount || 0),
        deliveryDate,
        deliveryQty: 1,
        deliveryValue: Number(del.payable || del.amount || 0),
        deliveryCashDiscount: Number(del.discount || 0),
        deliveryValueAfterDiscount: Number(del.payable || del.amount || 0),
      });
    } else {
      deliveredProducts.forEach((pItem: any, pIdx: number) => {
        const prod = pItem.product || {};
        const base = prod.base_product || {};
        const price = Number(pItem.price || prod.mrp || 0);
        const qty = Number(pItem.qty || 1);
        const lineVal = price * qty;
        const disc = Number(pItem.custom_discount || pItem.promotion_discount || 0);

        records.push({
          id: `live-del-${del.id}-${pIdx}`,
          orderDate,
          cluster: 'Central',
          area: meta.area,
          territory: meta.territory,
          territoryCode: meta.territoryCode || 'T16',
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
          category: base.product_category_id ? `Category ${base.product_category_id}` : 'Confectionery',
          brand: base.product_brand_id ? `Brand ${base.product_brand_id}` : 'Perfetti',
          skuCode: String(base.sku || prod.id || ''),
          skuName: String(base.name || prod.full_name || 'PVM SKU'),
          deliveryUom: 'PCS',
          skutp: price,
          orderQty: qty,
          orderValue: lineVal,
          orderCashDiscount: disc,
          deliveryDate,
          deliveryQty: qty,
          deliveryValue: lineVal,
          deliveryCashDiscount: disc,
          deliveryValueAfterDiscount: Math.max(0, lineVal - disc),
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

    try {
      records = await fetchFromSokrio();
    } catch (apiErr) {
      console.warn('[BWIW] Live fetch failed, using sample excel:', (apiErr as any).message);
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
        const excelFallback = getExcelSampleData().filter(r => {
          const d = toStandardDate(r.orderDate);
          return d >= startDate && d <= endDate;
        });
        if (excelFallback.length > 0) {
          records = excelFallback;
          source = 'excel_fallback_range';
        } else if (startDate === endDate) {
          // If today has no new delivery yet, show latest available records
          source = 'live_latest_available';
        } else {
          records = [];
        }
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
