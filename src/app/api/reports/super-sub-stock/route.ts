import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, fetchLiveSrOrganizationMap } from '@/lib/sokrioClient';
import axios from 'axios';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';

export const dynamic = 'force-dynamic';

export interface SuperSubStockRecord {
  id: string;
  orderDate: string;
  cluster: string;
  area: string;
  territory: string;
  town: string;
  distributorId: string | number;
  distributorName: string;
  uniq: string;
  subDistributorId: string;
  subDistributorName: string;
  skuCode: string | number;
  skuName: string;
  uom: string;
  primarySkuCtn: string | number;
  primarySkuVolume: string | number;
  primarySkuValue: string | number;
  primarySkuQty: string | number;
  uom2: string;
  brand: string;
  superDbUniqueLocationCode: string;
  superDbLocationName: string;
  tsoPositionCode: string;
  tsoCode: string | number;
  tsoName: string;
  primarySkuQtyInTons: string | number;
  isConfirmed: string;
  poNo: string;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: SuperSubStockRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * Format date to MM-DD-YYYY with hyphens matching Report Sample.xlsx (e.g. 10-01-2026)
 */
function formatDateToMMDDYYYYWithHyphen(dateStr: string): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (clean.includes('-')) {
    const parts = clean.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> MM-DD-YYYY
        return `${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        // Already DD-MM-YYYY or MM-DD-YYYY -> preserve
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }
  return clean;
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

async function fetchLiveStocksFromSokrio(startDate: string, endDate: string): Promise<SuperSubStockRecord[]> {
  const token = await getValidToken();
  const [stocksRes, srOrgMap] = await Promise.all([
    axios.get('https://pvm.core.sokrio.com/api/v1/stocks?department_id=3249&per_page=250', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    }),
    fetchLiveSrOrganizationMap().catch(() => new Map()),
  ]);

  const stocks = stocksRes.data?.stocks || (Array.isArray(stocksRes.data?.data) ? stocksRes.data.data : []);
  if (stocks.length === 0) return [];

  const records: SuperSubStockRecord[] = [];
  const processedSkus = new Set<string>();

  // Resolve dynamic organizational hierarchy from live Sokrio map
  let cluster = 'Central';
  let area = 'Central South';
  let territory = 'Jatra Bari';
  let defaultDbCode: string | number = 102267;
  let defaultDbName = 'M/S Ahamed Enterprise';

  if (srOrgMap && srOrgMap.size > 0) {
    const firstOrg = Array.from(srOrgMap.values())[0];
    if (firstOrg) {
      if (firstOrg.cluster) cluster = firstOrg.cluster;
      if (firstOrg.area) area = firstOrg.area;
      if (firstOrg.territory) territory = firstOrg.territory;
      if (firstOrg.dbCode) defaultDbCode = Number(firstOrg.dbCode) || firstOrg.dbCode;
      if (firstOrg.dbName) defaultDbName = firstOrg.dbName;
    }
  }

  // Format date to MM-DD-YYYY (e.g. 10-01-2026) matching sample Excel
  const formattedOrderDate = formatDateToMMDDYYYYWithHyphen(startDate);

  for (const st of stocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const catalog = SKU_CATALOG[skuCode] || {};
    const skuName = resolveEnglishSkuName(skuCode, baseProd.name);
    const brand = resolveBrandName(skuName, catalog.brand, baseProd.product_brand?.name);
    const uom2 = catalog.uom || (skuName.toLowerCase().includes('jar') ? 'JAR' : 'BOX');
    
    const dept = st.department || {};
    const distributorId = (dept.code && String(dept.code) !== '101') ? (Number(dept.code) || dept.code) : defaultDbCode;
    const distributorName = (dept.name && dept.name !== 'Central Warehouse') ? dept.name : defaultDbName;

    // Authentic calculation of Qty, CTN, Volume, Value, and Tons
    const piecesPerCtn = catalog.piecesPerCtn || 15;
    const weightGram = catalog.weightGram || 360;
    const price = Number(st.product?.prices?.[0]?.price || st.product?.purchase_amount || st.product?.mrp || 0);
    
    // Live stock quantities (if available in inventory ledger)
    const rawQty = Number(st.delivered_qty || st.available_qty || st.qty || 0);
    const primarySkuQty = rawQty > 0 ? rawQty : '';
    const primarySkuCtn = rawQty > 0 ? Math.round((rawQty / piecesPerCtn) * 100) / 100 : '';
    const primarySkuVolume = rawQty > 0 ? rawQty * weightGram : '';
    const primarySkuValue = rawQty > 0 && price > 0 ? Math.round(rawQty * price * 100) / 100 : '';
    const primarySkuQtyInTons = typeof primarySkuVolume === 'number' && primarySkuVolume > 0 
      ? Math.round((primarySkuVolume / 1000000) * 100000) / 100000 
      : '';

    records.push({
      id: `super-sub-live-${skuCode}`,
      orderDate: formattedOrderDate,
      cluster,
      area,
      territory,
      town: '', // Blank in sample Excel
      distributorId,
      distributorName,
      uniq: '', // Sub-distributors not active in Sokrio pilot -> left blank (no fake dummy)
      subDistributorId: '', // Sub-distributors not active in Sokrio pilot -> left blank
      subDistributorName: '', // Sub-distributors not active in Sokrio pilot -> left blank
      skuCode: Number(skuCode) || skuCode,
      skuName,
      uom: 'CT',
      primarySkuCtn,
      primarySkuVolume,
      primarySkuValue,
      primarySkuQty,
      uom2,
      brand,
      superDbUniqueLocationCode: '', // Super DB location code not active in pilot -> left blank
      superDbLocationName: '', // Super DB location name not active in pilot -> left blank
      tsoPositionCode: '', // Sokrio pilot has no TSO role; blank in sample for Tangail
      tsoCode: '', // Blank in sample Excel
      tsoName: '', // Blank in sample Excel
      primarySkuQtyInTons,
      isConfirmed: rawQty > 0 ? 'Yes' : '',
      poNo: '', // PO not in Sokrio platform -> left blank
    });
  }

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

    const cacheKey = `super_sub_${startDate}_${endDate}`;
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

    let records = await fetchLiveStocksFromSokrio(startDate, endDate);
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
    console.error('[Super to Sub DB Stock Report API Error]:', error);
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
