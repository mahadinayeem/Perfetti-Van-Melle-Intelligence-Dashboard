import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveDeliveries, fetchLiveSrOrganizationMap, getValidToken } from '@/lib/sokrioClient';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface FocClaimRecord {
  id: string;
  orderDate: string;
  cluster: string;
  area: string;
  territory: string;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string;
  dbName: string;
  outletsCat: string;
  outletCode: string;
  outletName: string;
  routeCode: string;
  routeName: string;
  invNo: string;
  sKUCode: string | number;
  skuCode: string | number;
  sKUName: string;
  skuName: string;
  uOM: string;
  uom: string;
  qty: number;
  sKUTP: number;
  skuTp: number;
  claimAmount: number;
}

// Master Trade Price (TP) lookup for FOC reimbursement claims
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
  '651296': 335,
  '651300': 375,
  '651301': 375,
  '651302': 375,
  '651310': 375,
  '651311': 375,
};

function formatDateToMMDDYYYY(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    const y = val.getFullYear();
    return `${m}/${d}/${y}`;
  }
  const s = String(val).trim().split('T')[0].split(' ')[0];
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      if (parts[0].length === 4) return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return s;
}

function isFocProduct(p: any): boolean {
  if (!p) return false;
  if (p.is_free === 1 || p.is_free === true) return true;
  if (p.free_with !== null && p.free_with !== undefined && String(p.free_with).trim() !== '') return true;
  if (p.free_with_product !== null && p.free_with_product !== undefined) return true;
  if (Number(p.price) === 0 && Number(p.qty) > 0) return true;
  if (p.promotion && (p.promotion.promotion_type === 'free_product' || p.promotion.promotion_type === 'foc')) return true;
  return false;
}

const memoryCache = new Map<string, { records: FocClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = `foc_${startDate}_${endDate}`;
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

    const [deliveries, srOrgMap] = await Promise.all([
      fetchLiveDeliveries(forceRefresh),
      fetchLiveSrOrganizationMap(forceRefresh),
    ]);

    // Also fetch invoices for promotional / free items
    let invoices: any[] = [];
    try {
      const token = await getValidToken();
      const invRes = await axios.get('https://pvm.core.sokrio.com/api/v1/invoices?per_page=150', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 25000,
      });
      invoices = invRes.data?.invoices || invRes.data?.data || [];
    } catch (e: any) {
      console.warn('[FOC Claim] Live invoices query warning:', e.message);
    }

    const records: FocClaimRecord[] = [];
    let count = 0;
    const seenClaimKeys = new Set<string>();

    // 1. Process Deliveries for genuine Free-Of-Cost items
    for (const d of deliveries) {
      const delDateRaw = d.deliver_date || d.delivered_at || d.created_at || d.order?.order_date || '';
      const dateOnly = String(delDateRaw).split('T')[0].split(' ')[0].trim();
      if (startDate && endDate && dateOnly) {
        if (dateOnly < startDate || dateOnly > endDate) continue;
      }

      const srCode = String(d.created_by || d.order?.ordered_by || '').trim();
      const orgInfo = srOrgMap.get(srCode);

      const dbCode = (d.seller_id && String(d.seller_id) === '3249') ? '102267' : (d.seller?.code || orgInfo?.dbCode || '102267');
      const dbName = d.seller_name || d.seller?.name || orgInfo?.dbName || 'M/S Ahamed Enterprise';
      const territoryName = d.order?.buyer_territory_name || orgInfo?.territory || 'Jatra Bari';
      const clusterName = orgInfo?.cluster || 'Central';
      const areaName = orgInfo?.area || 'Central South';

      const outletName = d.order?.buyer_name || d.buyer_name || d.buyer?.name || '';
      const outletCode = d.buyer?.code || (d.buyer_id ? String(d.buyer_id) : '');
      const outletCat = d.buyer?.badge?.name || d.buyer?.category?.name || 'Gold';
      const routeCode = d.buyer?.route?.code || d.order?.route?.code || '';
      const routeName = d.buyer?.route?.name || d.order?.buyer_territory_name || '';
      const invNo = d.order?.invoice?.invoice_number || d.code || (d.id ? `INV-${d.id}` : '');

      const prods = Array.isArray(d.products) ? d.products : [];
      for (const p of prods) {
        if (!isFocProduct(p)) continue;

        count++;
        const skuCode = String(p?.product?.base_product?.sku || p?.product_id || '').trim();
        const skuName = resolveEnglishSkuName(skuCode, p?.product?.base_product?.name);
        const qty = Number(p.qty) || 0;
        const skuTp = SKU_PRICE_MAP[skuCode] || Number(p?.product?.purchase_amount) || Number(p?.product?.mrp) || 184;
        const claimAmount = Math.round(qty * skuTp);

        const claimKey = `${invNo}_${skuCode}_${qty}`;
        if (seenClaimKeys.has(claimKey)) continue;
        seenClaimKeys.add(claimKey);

        records.push({
          id: `foc-${count}`,
          orderDate: formatDateToMMDDYYYY(dateOnly),
          cluster: clusterName,
          area: areaName,
          territory: territoryName,
          dBCode: dbCode,
          dbCode,
          dBName: dbName,
          dbName,
          outletsCat: outletCat,
          outletCode,
          outletName,
          routeCode,
          routeName,
          invNo,
          sKUCode: skuCode,
          skuCode,
          sKUName: skuName,
          skuName,
          uOM: 'BOX',
          uom: 'BOX',
          qty,
          sKUTP: skuTp,
          skuTp,
          claimAmount,
        });
      }
    }

    // 2. Process Invoices for genuine Free-Of-Cost items
    for (const inv of invoices) {
      const invDateRaw = inv.delivered_at || inv.deliver_date || inv.created_at || inv.order?.order_date || '';
      const dateOnly = String(invDateRaw).split('T')[0].split(' ')[0].trim();
      if (startDate && endDate && dateOnly) {
        if (dateOnly < startDate || dateOnly > endDate) continue;
      }

      const srCode = String(inv.created_by || inv.ordered_by || inv.order?.ordered_by || '').trim();
      const orgInfo = srOrgMap.get(srCode);

      const dbCode = (inv.seller_id === 3249 || inv.seller?.code === '102267') ? '102267' : (inv.seller?.code || orgInfo?.dbCode || '102267');
      const dbName = inv.seller_name || inv.seller?.name || orgInfo?.dbName || 'M/S Ahamed Enterprise';
      const territoryName = inv.order?.buyer_territory_name || orgInfo?.territory || 'Jatra Bari';
      const clusterName = orgInfo?.cluster || 'Central';
      const areaName = orgInfo?.area || 'Central South';

      const outletName = inv.order?.buyer_name || inv.buyer_name || inv.buyer?.name || '';
      const outletCode = inv.buyer?.code || (inv.buyer_id ? String(inv.buyer_id) : '');
      const outletCat = inv.buyer?.badge?.name || inv.buyer?.category?.name || 'Gold';
      const routeCode = inv.buyer?.route?.code || inv.order?.route?.code || '';
      const routeName = inv.buyer?.route?.name || inv.order?.buyer_territory_name || '';
      const invNo = inv.order?.invoice?.invoice_number || inv.code || (inv.id ? `INV-${inv.id}` : '');

      const prods = Array.isArray(inv.latest_revision?.invoiced_products) ? inv.latest_revision.invoiced_products : [];
      for (const p of prods) {
        if (!isFocProduct(p)) continue;

        count++;
        const skuCode = String(p?.product?.base_product?.sku || p?.product_id || '').trim();
        const skuName = resolveEnglishSkuName(skuCode, p?.product?.base_product?.name);
        const qty = Number(p.qty) || 0;
        const skuTp = SKU_PRICE_MAP[skuCode] || Number(p?.product?.purchase_amount) || Number(p?.product?.mrp) || 184;
        const claimAmount = Math.round(qty * skuTp);

        const claimKey = `${invNo}_${skuCode}_${qty}`;
        if (seenClaimKeys.has(claimKey)) continue;
        seenClaimKeys.add(claimKey);

        records.push({
          id: `foc-${count}`,
          orderDate: formatDateToMMDDYYYY(dateOnly),
          cluster: clusterName,
          area: areaName,
          territory: territoryName,
          dBCode: dbCode,
          dbCode,
          dBName: dbName,
          dbName,
          outletsCat: outletCat,
          outletCode,
          outletName,
          routeCode,
          routeName,
          invNo,
          sKUCode: skuCode,
          skuCode,
          sKUName: skuName,
          skuName,
          uOM: 'BOX',
          uom: 'BOX',
          qty,
          sKUTP: skuTp,
          skuTp,
          claimAmount,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA API (/api/v1/invoices & /api/v1/deliveries)',
      sheet: 'FOC Claim',
      isFocClaimActiveInPilot: records.length > 0,
      note: records.length === 0
        ? 'No Free Of Cost (FOC) promotional claims have been logged in the live Sokrio pilot environment for this date range. As soon as an SR or distributor books a delivery with free items (is_free: 1 or promotional free goods), it will automatically appear here.'
        : `Found ${records.length} authentic FOC promotional claim record(s) from live Sokrio data.`,
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[FOC Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
