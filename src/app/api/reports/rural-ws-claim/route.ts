import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveSrOrganizationMap, getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface RuralWsClaimRecord {
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
  disPer: string | number;
  outletCode: string;
  outletName: string;
  invoiceNo: string;
  deliveryDate: string;
  totalInvoiceDiscount: number;
  percentageDiscount: string | number;
  totalInvoiceAmount: number;
  claimAmount: number;
}

function formatDelDate(val: string): string {
  if (!val) return '';
  const clean = val.split('T')[0].split(' ')[0].trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const d = parseInt(parts[2]);
      const m = parseInt(parts[1]) - 1;
      return `${String(d).padStart(2,'0')}-${months[m]}-${parts[0]}`;
    }
  }
  return clean;
}

const memoryCache = new Map<string, { records: RuralWsClaimRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `rural_ws_${startDate}_${endDate}`;
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

    const records: RuralWsClaimRecord[] = [];
    let count = 0;
    // Track per-invoice aggregation (Rural WS shows invoice-level discount, not SKU-level)
    const seenInvoices = new Set<string>();

    for (const inv of invoices) {
      const dateRaw = inv.delivered_at || inv.created_at || inv.order?.order_date || '';
      const dateOnly = String(dateRaw).split('T')[0].split(' ')[0].trim();
      if (startDate && endDate && dateOnly) {
        if (dateOnly < startDate || dateOnly > endDate) continue;
      }

      const prods = Array.isArray(inv.latest_revision?.invoiced_products) ? inv.latest_revision.invoiced_products : [];
      
      // Rural WS: check if this invoice has any promo discount at invoice level
      const totalPromoDiscount = Number(inv.promotion_discount) || 0;
      const totalDiscount = Number(inv.discount) || 0;
      const hasPromo = prods.some((p: any) => p.promotion);
      
      if (!hasPromo && totalPromoDiscount === 0) continue;
      if (seenInvoices.has(inv.code)) continue;
      seenInvoices.add(inv.code);

      const srCode = String(inv.ordered_by?.code || inv.created_by || '').trim();
      const orgInfo = srOrgMap.get(srCode);

      const dbCode = inv.seller_id === 3249 ? '102267' : (inv.seller?.code || orgInfo?.dbCode || '102267');
      const dbName = inv.seller_name || orgInfo?.dbName || '';
      const territory = inv.order?.buyer_territory_name || orgInfo?.territory || '';
      const cluster = orgInfo?.cluster || 'Central';
      const area = orgInfo?.area || 'Central South';
      const outletName = inv.order?.buyer_name || inv.buyer_name || '';
      const outletCode = inv.buyer?.code || (inv.buyer_id ? String(inv.buyer_id) : '');
      const invNo = inv.order?.invoice?.invoice_number || inv.code || (inv.id ? `INV-${inv.id}` : '');

      // Get promo info from first promo product
      const promoProduct = prods.find((p: any) => p.promotion);
      const promoId = String(promoProduct?.promotion?.id || '');
      const promoName = promoProduct?.promotion?.title || '';
      
      // Calculate invoice totals
      const totalAmount = Number(inv.amount) || prods.reduce((s: number, p: any) => s + (Number(p.qty) * Number(p.price || 0)), 0);
      const discountAmt = totalPromoDiscount > 0 ? totalPromoDiscount : totalDiscount;
      const discountPct = totalAmount > 0 ? Math.round((discountAmt / totalAmount) * 100) : 0;

      count++;
      records.push({
        id: `rural-ws-${count}`,
        cluster,
        area,
        territory,
        dBCode: dbCode,
        dbCode,
        dBName: dbName,
        dbName,
        promoID: promoId,
        promoId,
        promoName,
        disPer: discountPct > 0 ? discountPct : 3,
        outletCode,
        outletName,
        invoiceNo: invNo,
        deliveryDate: formatDelDate(dateOnly),
        totalInvoiceDiscount: Math.round(discountAmt * 100) / 100,
        percentageDiscount: discountPct > 0 ? discountPct : 3,
        totalInvoiceAmount: Math.round(totalAmount * 100) / 100,
        claimAmount: Math.round(discountAmt * 100) / 100,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA API (/api/v1/invoices) — invoice-level wholesale discount aggregation',
      sheet: 'Rural WS',
      note: records.length === 0
        ? 'No rural WS promotional discounts found for this date range.'
        : `Found ${records.length} rural WS invoice-level discount claim(s) from live Sokrio data.`,
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });
    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Rural WS Claim API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
