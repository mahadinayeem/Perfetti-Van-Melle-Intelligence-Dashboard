import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveSrOrganizationMap, getValidToken } from '@/lib/sokrioClient';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface WholesaleClaimRecord {
  id: string;
  cluster: string;
  area: string;
  territory: string;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string;
  dbName: string;
  promoID: string;
  promoId: string;
  promoName: string;
  outletCode: string;
  outletName: string;
  sRName: string;
  srName: string;
  sRPositionCode: string;
  srPositionCode: string;
  invoiceNo: string;
  deliveryDate: string;
  sKUCode: string | number;
  skuCode: string | number;
  qty: number;
  claimAmount: number;
}

function formatDateMMDDYYYY(val: string): string {
  if (!val) return '';
  const clean = val.split('T')[0].split(' ')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[1].padStart(2,'0')}/${parts[2].padStart(2,'0')}/${parts[0]}`;
  }
  return clean;
}

const memoryCache = new Map<string, { records: WholesaleClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = `ws_claim_${startDate}_${endDate}`;
    if (!forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, data: cached.records, meta: cached.meta, cached: true });
      }
    }

    const [srOrgMap, token] = await Promise.all([
      fetchLiveSrOrganizationMap(forceRefresh),
      getValidToken(),
    ]);

    const invRes = await axios.get('https://pvm.core.sokrio.com/api/v1/invoices?per_page=150', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 30000,
    });
    const invoices = invRes.data?.invoices || invRes.data?.data || [];

    const records: WholesaleClaimRecord[] = [];
    let count = 0;

    for (const inv of invoices) {
      const dateRaw = inv.delivered_at || inv.created_at || inv.order?.order_date || '';
      const dateOnly = String(dateRaw).split('T')[0].split(' ')[0].trim();
      if (startDate && endDate && dateOnly) {
        if (dateOnly < startDate || dateOnly > endDate) continue;
      }

      const srCode = String(inv.ordered_by?.code || inv.created_by || '').trim();
      const orgInfo = srOrgMap.get(srCode);

      const dbCode = inv.seller_id === 3249 ? '102267' : (inv.seller?.code || orgInfo?.dbCode || '102267');
      const dbName = inv.seller_name || orgInfo?.dbName || '';
      const territory = inv.order?.buyer_territory_name || orgInfo?.territory || '';
      const cluster = orgInfo?.cluster || 'Central';
      const area = orgInfo?.area || 'Central South';
      const srName = inv.ordered_by?.name || inv.creator_name || '';
      const srPositionCode = orgInfo?.positionCode || '';
      const outletName = inv.order?.buyer_name || inv.buyer_name || '';
      const outletCode = inv.buyer?.code || (inv.buyer_id ? String(inv.buyer_id) : '');
      const invNo = inv.order?.invoice?.invoice_number || inv.code || (inv.id ? `INV-${inv.id}` : '');

      const prods = Array.isArray(inv.latest_revision?.invoiced_products) ? inv.latest_revision.invoiced_products : [];

      for (const p of prods) {
        // Wholesale claims: products with any promotional discount (WS channel)
        if (!p.promotion) continue;

        count++;
        const skuCode = String(p.product?.base_product?.sku || p.product_id || '').trim();
        const qty = Number(p.qty) || 0;
        const promoDiscount = Number(p.promotion_discount) || 0;
        const claimAmount = promoDiscount > 0 ? promoDiscount : Math.round(qty * Number(p.price || 0) * 0.03);

        records.push({
          id: `ws-claim-${count}`,
          cluster,
          area,
          territory,
          dBCode: dbCode,
          dbCode,
          dBName: dbName,
          dbName,
          promoID: String(p.promotion?.id || ''),
          promoId: String(p.promotion?.id || ''),
          promoName: p.promotion?.title || '',
          outletCode,
          outletName,
          sRName: srName,
          srName,
          sRPositionCode: srPositionCode,
          srPositionCode,
          invoiceNo: invNo,
          deliveryDate: formatDateMMDDYYYY(dateOnly),
          sKUCode: skuCode,
          skuCode,
          qty,
          claimAmount,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA API (/api/v1/invoices) — promotion-tagged line items only',
      sheet: 'WHolesale Export Claim',
      note: records.length === 0
        ? 'No wholesale promotional claims found for this date range. Claims appear when invoices contain promotion-tagged line items with applicable discounts.'
        : `Found ${records.length} promotional claim line(s) from live Sokrio data.`,
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });
    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Wholesale Claim API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
