import { NextRequest, NextResponse } from 'next/server';
import { fetchWithAuth, getValidToken } from '@/lib/sokrioClient';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as XLSX from 'xlsx';
import axios from 'axios';
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
  orderCashDiscount: number | string;
  deliveryConfirmationDate?: string;
  deliveryDate: string;
  deliveryQty: number;
  deliveryVol?: string | number;
  deliveryValue: number;
  deliveryCashDiscount: number | string;
  freeQuantity?: number | string;
  deliveryValueAfterDiscount: number;
  wsCashDiscount?: number | string;
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
        dbType: String(row['DBType'] || ''),
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

// Precise metadata map for all SRs present in PVM Sokrio
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

// Helper to get all 8,007 records from Sokrio Delivery Summary combined with Order Summary
function getDeliverySummaryData(): BWIWRecord[] {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'data', 'deliverySummary.json');
    if (!fs.existsSync(jsonPath)) return [];
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Load order summary mapping (Tracking ID -> Order Date, Order Qty, Order Value)
    let orderMap: Record<string, any> = {};
    const orderMapPath = path.join(process.cwd(), 'src', 'data', 'orderSummaryMap.json');
    if (fs.existsSync(orderMapPath)) {
      try {
        orderMap = JSON.parse(fs.readFileSync(orderMapPath, 'utf8'));
      } catch (err) {
        console.warn('Failed to parse orderSummaryMap.json:', err);
      }
    }

    return raw.map((r: any, idx: number) => {
      const custCode = String(r['Buyer Department Code'] || '');
      const rawTerritoryCode = String(r['Buyer Territory Code'] || '');
      const routeName = String(r['Buyer Territory Name'] || '');
      const meta = resolveTerritoryMeta(custCode, rawTerritoryCode, routeName, routeName);

      const srCode = String(r['Order Creator Code'] || '');
      const srMeta = SR_METADATA_MAP[srCode];

      const dbCode = String(r['Seller Department Code'] || srMeta?.dbCode || meta.dbCode || '102267');
      const sellerDeptName = String(r['Seller Department Name'] || '');
      const dbName = (sellerDeptName && sellerDeptName !== 'Super Admin') ? sellerDeptName : (srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise');
      const srName = String(r['Order Creator Name'] || srMeta?.srName || 'Mostafizur Rahman');
      const srPositionCode = srMeta?.srPositionCode || meta.srPositionCode || 'DM-057';
      const territory = srMeta?.territory || meta.territory || 'Jatra Bari';
      const territoryCode = srMeta?.territoryCode || meta.territoryCode || (rawTerritoryCode ? rawTerritoryCode.substring(0, 3) : 'T16');

      const trackingId = String(r['Tracking ID'] || '');
      const skuCode = String(r['Product SKU'] || '');
      const orderEntry = orderMap[trackingId];
      const orderItem = orderEntry?.items ? orderEntry.items[skuCode] : null;

      // Extract accurate Order Date from Order Summary (matching client's demand: order date must be order date)
      const orderDate = toStandardDate(orderEntry?.orderDate || r['Delivery Date']);
      const delDate = toStandardDate(r['Delivery Date']);
      const qty = Number(r['Delivery Quantity'] || 0);
      const unitPrice = Number(r['Unit Price'] || 0);
      const val = Number(r['Amount'] || r['Subtotal'] || (qty * unitPrice));
      const invNo = trackingId ? `INV-${trackingId}` : `INV-${1000 + idx}`;

      const orderQty = Number(orderItem?.orderQty ?? qty);
      const orderVal = Number(orderItem?.orderValue ?? val);

      return {
        id: `del-sum-${idx + 1}`,
        orderDate,
        cluster: 'Central',
        area: meta.area || 'Central South',
        territory,
        territoryCode,
        town: territory,
        dbCode,
        dbName,
        dbType: 'DB',
        srCode,
        srName,
        srPositionCode,
        routeCode: rawTerritoryCode || meta.routeCode || '',
        routeName: routeName || meta.routeName || '',
        customerCode: custCode,
        customerName: String(r['Buyer Department Name'] || ''),
        channel: 'Retail',
        subChannel: 'Retail Store',
        invoiceNo: invNo,
        category: ((skuCatalogData as any)[skuCode])?.category || String(r['Product Category'] || 'Confectionery'),
        brand: ((skuCatalogData as any)[skuCode])?.brand || String(r['Product Brand'] || 'Center Fruit'),
        skuCode,
        skuName: String(r['Product Name'] || ''),
        deliveryUom: ((skuCatalogData as any)[skuCode])?.uom || 'PCS',
        noofSKUinCTN: ((skuCatalogData as any)[skuCode])?.piecesPerCtn || 15,
        weightperSKUgm: ((skuCatalogData as any)[skuCode])?.weightGram || 360,
        skutp: unitPrice,
        orderQty,
        orderVol: (((skuCatalogData as any)[skuCode])?.weightGram ? (orderQty * ((skuCatalogData as any)[skuCode])?.weightGram / 1000000) : (orderQty * 0.00036)).toFixed(6),
        orderValue: orderVal,
        orderCashDiscount: 0,
        deliveryConfirmationDate: delDate,
        deliveryDate: delDate,
        deliveryQty: qty,
        deliveryVol: (((skuCatalogData as any)[skuCode])?.weightGram ? (qty * ((skuCatalogData as any)[skuCode])?.weightGram / 1000000) : (qty * 0.00036)).toFixed(6),
        deliveryValue: val,
        deliveryCashDiscount: 0,
        freeQuantity: 0,
        deliveryValueAfterDiscount: val,
        wsCashDiscount: 0,
        motherSkuCode: ((skuCatalogData as any)[skuCode])?.motherSkuCode || 'MSKU0072',
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

// Fetch live deliveries directly from Sokrio API and map to BWIW structure
async function fetchFromSokrio(): Promise<BWIWRecord[]> {
  const baseUrl = process.env.SOKRIO_BASE_URL || 'https://pvm.core.sokrio.com';
  const res = await fetchWithAuth(`${baseUrl}/api/v1/deliveries`, { per_page: 50 });
  const list: any[] = res?.data || [];

  if (!list.length) return [];

  const records: BWIWRecord[] = [];

  list.forEach((del: any) => {
    const order = del.order || {};
    const buyer = del.buyer || order.buyer || {};
    const orderedBy = del.ordered_by || {};
    const products = del.products || del.delivered_products || order.ordered_products || [];

    const srCode = String(orderedBy.code || '');
    const srMeta = SR_METADATA_MAP[srCode];

    const orderDate = toStandardDate(order.order_date || del.deliver_date || order.created_at || del.created_at);
    const deliveryDate = toStandardDate(del.deliver_date || orderDate);
    const custNo = String(order.buyer_id ? `T16-${order.buyer_id}` : (buyer.code || `CUST-${del.buyer_id || ''}`));
    const custName = String(order.buyer_name || buyer.name || `Outlet #${del.buyer_id || ''}`);
    const routeCode = String(buyer.route?.code || order.route?.code || 'T16R01');
    const routeName = String(order.buyer_territory_name || buyer.route?.name || order.route?.name || 'Jatra Bari');
    const meta = resolveTerritoryMeta(custNo, routeCode, routeName, routeName);

    const dbCode = String(srMeta?.dbCode || meta.dbCode || '102267');
    const dbName = String(srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise');
    const srName = String(orderedBy.name || srMeta?.srName || 'Mostafizur Rahman');
    const srPositionCode = String(srMeta?.srPositionCode || meta.srPositionCode || 'DM-060');
    const territory = String(srMeta?.territory || meta.territory || 'Jatra Bari');
    const territoryCode = String(srMeta?.territoryCode || meta.territoryCode || 'T16');
    const invoiceNo = String(order.code || `INV-${del.id}`);

    if (products.length === 0) {
      records.push({
        id: `live-del-${del.id}`,
        orderDate,
        cluster: 'Central',
        area: meta.area || 'Central South',
        territory,
        territoryCode,
        town: '',
        dbCode,
        dbName,
        dbType: '',
        srCode,
        srName,
        srPositionCode,
        routeCode,
        routeName,
        customerCode: custNo,
        customerName: custName,
        channel: 'Retail',
        subChannel: '',
        invoiceNo,
        category: 'Confectionery',
        brand: 'Perfetti Van Melle',
        skuCode: 'SKU-001',
        skuName: 'PVM Product Line',
        deliveryUom: 'PCS',
        noofSKUinCTN: '',
        weightperSKUgm: '',
        skutp: Number(del.amount || 0),
        orderQty: 1,
        orderVol: '',
        orderValue: Number(del.amount || 0),
        orderCashDiscount: Number(del.discount || 0) > 0 ? Number(del.discount) : '',
        deliveryConfirmationDate: deliveryDate,
        deliveryDate,
        deliveryQty: 1,
        deliveryVol: '',
        deliveryValue: Number(del.payable || del.amount || 0),
        deliveryCashDiscount: Number(del.discount || 0) > 0 ? Number(del.discount) : '',
        freeQuantity: '',
        deliveryValueAfterDiscount: Number(del.payable || del.amount || 0),
        wsCashDiscount: '',
        motherSkuCode: '',
        createDeliveryDate: deliveryDate,
      });
    } else {
      products.forEach((pItem: any, pIdx: number) => {
        const prod = pItem.product || {};
        const base = prod.base_product || {};
        const price = Number(pItem.price || prod.mrp || 0);
        const qty = Number(pItem.quantity || pItem.qty || pItem.pivot?.quantity || 1);
        const lineVal = price * qty;
        const disc = Number(pItem.custom_discount || pItem.promotion_discount || 0);

        const skuCode = String(base.sku || prod.id || `SKU-${pIdx + 1}`);
        const skuInfo = (skuCatalogData as any)[skuCode] || {};
        const skuName = String(base.usp || base.name || prod.full_name || 'PVM SKU');
        const brandName = (base.product_brand && base.product_brand.name) || resolveBrandName(skuName, base.product_brand_id);
        const catName = (base.product_category && base.product_category.name) || resolveCategoryName(skuName, base.product_category_id);

        records.push({
          id: `live-del-${del.id}-${pIdx}`,
          orderDate,
          cluster: 'Central',
          area: meta.area || 'Central South',
          territory,
          territoryCode,
          town: territory,
          dbCode,
          dbName,
          dbType: 'DB',
          srCode,
          srName,
          srPositionCode,
          routeCode,
          routeName,
          customerCode: custNo,
          customerName: custName,
          channel: 'Retail',
          subChannel: 'Retail Store',
          invoiceNo,
          category: catName,
          brand: brandName,
          skuCode,
          skuName,
          deliveryUom: skuInfo.uom || 'PCS',
          noofSKUinCTN: skuInfo.piecesPerCtn || 15,
          weightperSKUgm: skuInfo.weightGram || 360,
          skutp: price,
          orderQty: qty,
          orderVol: (skuInfo.weightGram ? (qty * skuInfo.weightGram / 1000000) : (qty * 0.00036)).toFixed(6),
          orderValue: lineVal,
          orderCashDiscount: disc,
          deliveryConfirmationDate: deliveryDate,
          deliveryDate,
          deliveryQty: qty,
          deliveryVol: (skuInfo.weightGram ? (qty * skuInfo.weightGram / 1000000) : (qty * 0.00036)).toFixed(6),
          deliveryValue: lineVal,
          deliveryCashDiscount: disc,
          freeQuantity: Number(pItem.free_with || 0),
          deliveryValueAfterDiscount: Math.max(0, lineVal - disc),
          wsCashDiscount: 0,
          motherSkuCode: skuInfo.motherSkuCode || (base.mother_product_id ? `MSKU00${base.mother_product_id}` : 'MSKU0072'),
          createDeliveryDate: deliveryDate,
        });
      });
    }
  });

  return records;
}

// Fetch live deliveries and orders directly in parallel from Sokrio Export APIs
async function fetchLiveBWIWFromSokrio(startDate: string, endDate: string): Promise<BWIWRecord[]> {
  const token = await getValidToken();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const start = startDate || startOfMonth;
  const end = endDate || todayStr;

  const deliveryUrl = `https://pvm.report.sokrio.com/api/v3/delivery-summary-export?range=${start}%2C${end}&territory_id=2&download&type=xlsx`;
  const orderUrl = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${start}%2C${end}&territory_id=1&download&type=xlsx`;

  const [delRes, orderRes] = await Promise.all([
    axios.get(deliveryUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 60000,
    }),
    axios.get(orderUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 60000,
    }),
  ]);

  const wbOrder = XLSX.read(orderRes.data, { type: 'buffer' });
  const orderRows = XLSX.utils.sheet_to_json<any[]>(wbOrder.Sheets[wbOrder.SheetNames[0]], { header: 1 }) || [];
  const orderHeader = orderRows[3] || [];
  const trackIdx = orderHeader.indexOf(' Tracking ID') !== -1 ? orderHeader.indexOf(' Tracking ID') : orderHeader.indexOf('Tracking ID');
  const dateIdx = orderHeader.indexOf('Order Date');
  const skuIdx = orderHeader.indexOf('Product SKU');
  const qtyIdx = orderHeader.indexOf('Order Quantity');
  const priceIdx = orderHeader.indexOf('Unit Price');
  const amountIdx = orderHeader.indexOf('Amount');

  const orderMap: Record<string, { orderDate: string; items: Record<string, any> }> = {};
  for (let i = 4; i < orderRows.length; i++) {
    const r = orderRows[i];
    const tid = String(r[trackIdx] || '').trim();
    const dt = String(r[dateIdx] || '').trim();
    const sku = String(r[skuIdx] || '').trim();
    const qty = Number(r[qtyIdx] || 0);
    const price = Number(r[priceIdx] || 0);
    const amount = Number(r[amountIdx] || (qty * price));

    if (tid) {
      if (!orderMap[tid]) {
        orderMap[tid] = { orderDate: dt, items: {} };
      }
      orderMap[tid].items[sku] = { orderDate: dt, orderQty: qty, unitPrice: price, orderValue: amount };
    }
  }

  // Parse delivery summary
  const wbDel = XLSX.read(delRes.data, { type: 'buffer' });
  const delRows = XLSX.utils.sheet_to_json<any[]>(wbDel.Sheets[wbDel.SheetNames[0]], { header: 1 }) || [];
  const delHeader = delRows[3] || [];
  const delTrackIdx = delHeader.indexOf(' Tracking ID') !== -1 ? delHeader.indexOf(' Tracking ID') : delHeader.indexOf('Tracking ID');
  const delDateIdx = delHeader.indexOf('Delivery Date');
  const delSkuIdx = delHeader.indexOf('Product SKU');
  const delQtyIdx = delHeader.indexOf('Delivery Quantity');
  const delPriceIdx = delHeader.indexOf('Unit Price');
  const delAmountIdx = delHeader.indexOf('Amount');
  const delCreatorCodeIdx = delHeader.indexOf('Order Creator Code');
  const delCreatorNameIdx = delHeader.indexOf('Order Creator Name');
  const delBuyerCodeIdx = delHeader.indexOf('Buyer Department Code');
  const delBuyerNameIdx = delHeader.indexOf('Buyer Department Name');
  const delTerritoryCodeIdx = delHeader.indexOf('Buyer Territory Code');
  const delTerritoryNameIdx = delHeader.indexOf('Buyer Territory Name');
  const delCatIdx = delHeader.indexOf('Product Category');
  const delBrandIdx = delHeader.indexOf('Product Brand');
  const delNameIdx = delHeader.indexOf('Product Name');

  const records: BWIWRecord[] = [];
  for (let idx = 0; idx < delRows.length - 4; idx++) {
    const r = delRows[idx + 4];
    const trackingId = String(r[delTrackIdx] || '').trim();
    const skuCode = String(r[delSkuIdx] || '').trim();
    const custCode = String(r[delBuyerCodeIdx] || '');
    const rawTerritoryCode = String(r[delTerritoryCodeIdx] || '');
    const routeName = String(r[delTerritoryNameIdx] || '');
    const meta = resolveTerritoryMeta(custCode, rawTerritoryCode, routeName, routeName);

    const srCode = String(r[delCreatorCodeIdx] || '');
    const srMeta = SR_METADATA_MAP[srCode];

    const dbCode = String(srMeta?.dbCode || meta.dbCode || '102267');
    const dbName = String(srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise');
    const srName = String(r[delCreatorNameIdx] || srMeta?.srName || 'Mostafizur Rahman');
    const srPositionCode = srMeta?.srPositionCode || meta.srPositionCode || 'DM-057';
    const territory = srMeta?.territory || meta.territory || 'Jatra Bari';
    const territoryCode = srMeta?.territoryCode || meta.territoryCode || (rawTerritoryCode ? rawTerritoryCode.substring(0, 3) : 'T16');

    const orderEntry = orderMap[trackingId];
    const orderItem = orderEntry?.items ? orderEntry.items[skuCode] : null;

    const delDate = toStandardDate(r[delDateIdx]);
    const orderDate = toStandardDate(orderEntry?.orderDate || delDate);
    const qty = Number(r[delQtyIdx] || 0);
    const unitPrice = Number(r[delPriceIdx] || 0);
    const val = Number(r[delAmountIdx] || (qty * unitPrice));
    const invNo = trackingId ? `INV-${trackingId}` : `INV-${1000 + idx}`;

    const orderQty = Number(orderItem?.orderQty ?? qty);
    const orderVal = Number(orderItem?.orderValue ?? val);

    records.push({
      id: `live-bwiw-${idx + 1}`,
      orderDate,
      cluster: 'Central',
      area: meta.area || 'Central South',
      territory,
      territoryCode,
      town: territory,
      dbCode,
      dbName,
      dbType: 'DB',
      srCode,
      srName,
      srPositionCode,
      routeCode: rawTerritoryCode || meta.routeCode || '',
      routeName: routeName || meta.routeName || '',
      customerCode: custCode,
      customerName: String(r[delBuyerNameIdx] || ''),
      channel: 'Retail',
      subChannel: 'Retail Store',
      invoiceNo: invNo,
      category: ((skuCatalogData as any)[skuCode])?.category || String(r[delCatIdx] || 'Confectionery'),
      brand: ((skuCatalogData as any)[skuCode])?.brand || String(r[delBrandIdx] || 'Center Fruit'),
      skuCode,
      skuName: String(r[delNameIdx] || ''),
      deliveryUom: ((skuCatalogData as any)[skuCode])?.uom || 'PCS',
      noofSKUinCTN: ((skuCatalogData as any)[skuCode])?.piecesPerCtn || 15,
      weightperSKUgm: ((skuCatalogData as any)[skuCode])?.weightGram || 360,
      skutp: unitPrice,
      orderQty,
      orderVol: (((skuCatalogData as any)[skuCode])?.weightGram ? (orderQty * ((skuCatalogData as any)[skuCode])?.weightGram / 1000000) : (orderQty * 0.00036)).toFixed(6),
      orderValue: orderVal,
      orderCashDiscount: 0,
      deliveryConfirmationDate: delDate,
      deliveryDate: delDate,
      deliveryQty: qty,
      deliveryVol: (((skuCatalogData as any)[skuCode])?.weightGram ? (qty * ((skuCatalogData as any)[skuCode])?.weightGram / 1000000) : (qty * 0.00036)).toFixed(6),
      deliveryValue: val,
      deliveryCashDiscount: 0,
      freeQuantity: 0,
      deliveryValueAfterDiscount: val,
      wsCashDiscount: 0,
      motherSkuCode: ((skuCatalogData as any)[skuCode])?.motherSkuCode || 'MSKU0072',
      createDeliveryDate: delDate,
    });
  }

  return records;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const cacheKey = `bwiw_${startDate}_${endDate}`;
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          data: cached.records,
          meta: cached.meta,
        });
      }
    }

    let records: BWIWRecord[] = [];
    let source = 'live_sokrio_api';

    // Prioritize direct live API fetch from Sokrio
    try {
      records = await fetchLiveBWIWFromSokrio(startDate, endDate);
      source = 'live_sokrio_api';
    } catch (liveErr: any) {
      console.warn('[BWIW] Live fetch failed, using fallback delivery summary:', liveErr.message);
      const deliverySummary = getDeliverySummaryData();
      if (deliverySummary && deliverySummary.length > 0) {
        records = deliverySummary;
        source = 'sokrio_delivery_summary';
      }
    }

    if (!records || records.length === 0) {
      records = getExcelSampleData();
      source = 'excel_fallback';
    }

    // Filter strictly by date range if provided
    if (startDate && endDate) {
      records = records.filter(r => {
        if (!r.orderDate) return false;
        const d = toStandardDate(r.orderDate);
        return d >= startDate && d <= endDate;
      });
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
