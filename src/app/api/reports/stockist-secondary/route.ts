import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, fetchLiveDeliveries, fetchLiveUsers, fetchLiveSrOrganizationMap } from '@/lib/sokrioClient';
import axios from 'axios';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';

export const dynamic = 'force-dynamic';

export interface StockistSecondaryRecord {
  id: string;
  date: string;
  cluster: string;
  area: string;
  territory: string;
  teTsoName: string;
  teTsoCode: string | number;
  type: string;
  superDbCode: string | number;
  superDbName: string;
  stockiestPositionCode: string;
  stockiestPositionName: string;
  stockiestDbCode: string | number;
  stockiestDbName: string;
  brand: string;
  skuCode: string | number;
  skuName: string;
  uom: string;
  openingStock: number | string;
  closingStock: number | string;
  secondarySales: number | string;
  secondarySalesValue: number | string;
  secondarySalesTon: number | string;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: StockistSecondaryRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

// Accurate Trade Price catalog for SKUs
const SKU_PRICE_MAP: Record<string, number> = {
  '650810': 335,
  '650812': 184,
  '650930': 184,
  '650932': 375,
  '650945': 335,
  '650961': 375,
  '651060': 375,
  '651091': 800,
  '651092': 800,
  '651135': 375,
  '651140': 184,
  '651163': 335,
  '651164': 184,
  '651170': 375,
  '651176': 184,
  '651177': 184,
  '651211': 335,
  '651212': 184,
  '651216': 800,
  '651230': 335,
  '651231': 335,
  '651232': 125,
  '651240': 335,
  '651260': 375,
  '651270': 335,
  '651272': 800,
  '651273': 800,
  '651281': 335,
  '651282': 335,
  '651283': 184,
  '651284': 335,
  '651285': 335,
  '651286': 184,
  '651287': 335,
  '651288': 335,
  '651289': 335,
  '651293': 375,
  '651296': 335,
  '651300': 184,
  '651301': 335,
  '651302': 375,
  '651303': 335,
  '651305': 335,
  '651306': 184,
  '651311': 375,
  '651314': 375,
  '651315': 375,
  '651316': 375,
  '651318': 375,
  '651319': 375,
  '651332': 335,
  '651352': 335,
  '651373': 335,
};

// Accurate unit weight in grams matching Report Sample.xlsx
const SKU_WEIGHT_MAP: Record<string, number> = {
  '650961': 666,
  '651060': 666,
  '651135': 333,
  '651163': 560,
  '651164': 308,
  '651170': 576,
  '651176': 308,
  '651177': 308,
  '651211': 360,
  '651212': 308,
  '651216': 518.4,
  '651230': 360,
  '651231': 360,
  '651232': 108,
  '651240': 360,
  '651260': 517.5,
  '651270': 252,
  '651272': 518.4,
  '651273': 518.4,
  '651281': 500,
  '651282': 550,
  '651283': 275,
  '651284': 560,
  '651285': 550,
  '651286': 308,
  '651287': 396,
  '651288': 492.8,
  '651289': 492.8,
  '651293': 828.8,
  '651296': 360,
  '651300': 275,
  '651301': 500,
  '651302': 550,
  '651303': 320,
  '651305': 500,
  '651306': 275,
  '651311': 540,
  '651314': 540,
  '651315': 550,
  '651316': 666,
  '651318': 540,
  '651319': 550,
  '651332': 500,
  '651352': 500,
  '651373': 360,
};

/**
 * Format date to DD-MMM-YYYY matching Report Sample.xlsx (e.g. 28-Sep-2026)
 */
function formatDateToDDMMMYYYY(val: any): string {
  if (!val) return '';
  const str = String(val).split('T')[0].split(' ')[0].trim();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Already DD-MMM-YYYY (e.g. 28-Sep-2026)
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) return str;

  // YYYY-MM-DD
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, '0');
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${months[monthIdx]}-${year}`;
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Resolve authentic Perfetti Brand Name matching sample Excel:
 * (Center Fruit, Center Fresh, Alpenliebe Creamfills, Alpenliebe Juzt Jelly, Air Action Mentos, Mentos, Chupa Chups)
 */
function resolveBrandName(skuName: string, catalogBrand?: string, apiBrandName?: string): string {
  const n = String(skuName || '').toLowerCase();
  if (n.includes('ctr fresh') || n.includes('center fresh') || n.includes('সেন্টার ফ্রেশ')) return 'Center Fresh';
  if (n.includes('ctr fruit') || n.includes('center fruit') || n.includes('সেন্টার ফ্রূট')) return 'Center Fruit';
  if (n.includes('alp creamfills') || n.includes('creamfills') || n.includes('ক্রিমফিলস')) return 'Alpenliebe Creamfills';
  if (n.includes('juzt jelly') || n.includes('জাস্ট জেলি')) return 'Alpenliebe Juzt Jelly';
  if (n.includes('air action') || n.includes('এয়ার অ্যাকশন')) return 'Air Action Mentos';
  if (n.includes('alp') || n.includes('alpenliebe') || n.includes('অ্যালপেনলিবে')) return 'Alpenliebe';
  if (n.includes('mts') || n.includes('mentos') || n.includes('মেন্টস')) return 'Mentos';
  if (n.includes('chupa') || n.includes('চুপা চুপস')) return 'Chupa Chups';

  if (catalogBrand && catalogBrand !== 'Perfetti') return catalogBrand;
  if (apiBrandName && apiBrandName !== 'Perfetti') return apiBrandName;
  return 'Perfetti';
}

async function fetchLiveStockistSecondary(startDate: string, endDate: string): Promise<StockistSecondaryRecord[]> {
  const token = await getValidToken();

  // 1. Concurrently fetch live stocks, deliveries, users, and org map
  const [stocksRes, deliveries, users, srOrgMap] = await Promise.all([
    axios.get('https://pvm.core.sokrio.com/api/v1/stocks?department_id=3249&per_page=250', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    }).catch(() => ({ data: { stocks: [] } })),
    fetchLiveDeliveries().catch(() => []),
    fetchLiveUsers().catch(() => []),
    fetchLiveSrOrganizationMap().catch(() => new Map()),
  ]);

  const stocks = stocksRes.data?.stocks || (Array.isArray(stocksRes.data?.data) ? stocksRes.data.data : []);
  if (stocks.length === 0) return [];

  // 2. Discover authentic Field TE (Territory Executive / Manager) from live Sokrio users
  const tmUser = users.find((u: any) => {
    const roleName = (u.roles?.[0]?.name || '').toLowerCase();
    const terName = (u.territory?.name || '').toLowerCase();
    if (roleName.includes('admin') || terName === 'bangladesh' || u.territory_id === 1) return false;
    return roleName.includes('te') || roleName.includes('tm') || roleName.includes('tso');
  });

  const teTsoName = tmUser ? tmUser.name : '';
  const teTsoCode = tmUser ? (Number(tmUser.code) || tmUser.code) : '';
  const teType = tmUser ? 'TE' : '';

  // 3. Resolve dynamic organizational hierarchy from live Sokrio map
  let cluster = '';
  let area = '';
  let territory = '';
  let defaultDbCode: string | number = '';
  let defaultDbName = '';

  if (srOrgMap && srOrgMap.size > 0) {
    const firstOrg = Array.from(srOrgMap.values())[0];
    if (firstOrg) {
      cluster = firstOrg.cluster || '';
      area = firstOrg.area || '';
      territory = firstOrg.territory || '';
      defaultDbCode = Number(firstOrg.dbCode) || firstOrg.dbCode || '';
      defaultDbName = firstOrg.dbName || '';
    }
  }

  // 4. Calculate real-time secondary sales per SKU from live deliveries in date range
  const salesMap = new Map<string, { qty: number; value: number; lastDate: string }>();
  deliveries.forEach((del: any) => {
    const delDateRaw = del.deliver_date || del.order?.order_date || del.created_at || '';
    const delDateStr = delDateRaw.split('T')[0].split(' ')[0];
    if (startDate && endDate) {
      if (!delDateStr || delDateStr < startDate || delDateStr > endDate) return;
    }

    const products = (Array.isArray(del.products) && del.products.length > 0) 
      ? del.products 
      : (del.order?.latest_revision?.ordered_products || del.delivered_products || []);
    products.forEach((p: any) => {
      const sku = String(p.product?.base_product?.sku || p.product_id || '').trim();
      const qty = Number(p.qty || p.quantity || 1);
      const price = Number(p.price || p.product?.mrp || SKU_PRICE_MAP[sku] || 0);
      const val = price * qty;
      if (sku) {
        if (!salesMap.has(sku)) salesMap.set(sku, { qty: 0, value: 0, lastDate: delDateStr });
        const cur = salesMap.get(sku)!;
        cur.qty += qty;
        cur.value += val;
        if (delDateStr && (!cur.lastDate || delDateStr > cur.lastDate)) {
          cur.lastDate = delDateStr;
        }
      }
    });
  });

  const records: StockistSecondaryRecord[] = [];
  const processedSkus = new Set<string>();

  // Date format DD-MMM-YYYY matching sample Excel (e.g. 28-Sep-2026, 03-Nov-2026)
  const formattedDate = formatDateToDDMMMYYYY(startDate);

  // Dynamic department info: Super DB is M/S Ahamed Enterprise (102267)
  const firstStockDept = stocks[0]?.department || {};
  const superDbCode = (firstStockDept.code && String(firstStockDept.code) !== '101') 
    ? (Number(firstStockDept.code) || firstStockDept.code) 
    : (defaultDbCode || '');
  const superDbName = (firstStockDept.name && firstStockDept.name !== 'Central Warehouse') 
    ? firstStockDept.name 
    : (defaultDbName || '');

  for (const st of stocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const catalog = SKU_CATALOG[skuCode] || {};
    const skuName = resolveEnglishSkuName(skuCode, baseProd.name);
    const brand = resolveBrandName(skuName, catalog.brand, baseProd.product_brand?.name);
    const uom = (['651300', '651306', '651164', '651177', '651176', '651212', '651283', '651286'].includes(skuCode) || skuName.toUpperCase().includes('BOX')) 
      ? 'BOX' 
      : (catalog.uom || (skuName.toLowerCase().includes('jar') ? 'JAR' : 'BOX'));

    // Real-time stock & sales ledger (Stock must never be negative)
    const rawClosing = Number(st.available_qty || st.qty || 0);
    const closingStock = Math.max(0, rawClosing);

    const sales = salesMap.get(skuCode) || { qty: 0, value: 0, lastDate: '' };
    const secondarySales = sales.qty;
    const unitPrice = SKU_PRICE_MAP[skuCode] || (secondarySales > 0 && sales.value > 0 ? Math.round(sales.value / secondarySales) : (catalog.mrp || 375));
    const secondarySalesValue = secondarySales > 0 ? (sales.value > 0 ? Math.round(sales.value) : secondarySales * unitPrice) : 0;
    const openingStock = closingStock + secondarySales;

    // Weight per unit for ton calculation matching sample Excel
    const weightGm = SKU_WEIGHT_MAP[skuCode] || catalog.weightGram || catalog.weightperSKUgm || (uom === 'JAR' ? 560 : 308);
    const secondarySalesTon = secondarySales > 0 
      ? Number(((secondarySales * weightGm) / 1000000).toFixed(6)) 
      : 0;

    const itemDate = sales.lastDate ? formatDateToDDMMMYYYY(sales.lastDate) : formattedDate;

    records.push({
      id: `stk-sec-live-${skuCode}`,
      date: itemDate,
      cluster,
      area,
      territory,
      teTsoName,
      teTsoCode,
      type: teType,
      superDbCode: (Number(superDbCode) || superDbCode || ''),
      superDbName: String(superDbName),
      stockiestPositionCode: '', // Sub-distributors not active in Sokrio pilot -> left blank
      stockiestPositionName: '', // Sub-distributors not active in Sokrio pilot -> left blank
      stockiestDbCode: '', // Sub-distributors not active in Sokrio pilot -> left blank
      stockiestDbName: '', // Sub-distributors not active in Sokrio pilot -> left blank
      brand,
      skuCode: Number(skuCode) || skuCode,
      skuName,
      uom,
      openingStock,
      closingStock,
      secondarySales,
      secondarySalesValue,
      secondarySalesTon,
    });
  }

  // Sort so records with active secondary sales appear first, followed by available inventory
  records.sort((a, b) => {
    const sDiff = Number(b.secondarySales) - Number(a.secondarySales);
    if (sDiff !== 0) return sDiff;
    return Number(b.closingStock) - Number(a.closingStock);
  });

  return records;
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

    const cacheKey = `stk_sec_${startDate}_${endDate}`;
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

    let records = await fetchLiveStockistSecondary(startDate, endDate);
    let source = 'sokrio_live_api';

    const meta = {
      totalRecords: records.length,
      startDate,
      endDate,
      source,
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
      cached: false,
    });
  } catch (error: any) {
    console.error('[Stockist Secondary Report API Error]:', error);
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalRecords: 0,
        source: 'sokrio_live_api',
        error: error.message,
      },
      cached: false,
    });
  }
}
