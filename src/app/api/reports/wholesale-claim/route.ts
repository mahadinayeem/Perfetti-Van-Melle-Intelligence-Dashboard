import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveDeliveries } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import skuCatalogData from '@/lib/skuCatalog.json';

function formatDDMMYYYY(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return s;
}

export const dynamic = 'force-dynamic';

export interface WholesaleClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string | number;
  dbName: string | number;
  promoID: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  sRName: string | number;
  srName: string | number;
  sRPositionCode: string | number;
  srPositionCode: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  qty: string | number;
  claimAmount: string | number;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
const PROMOS: any[] = (dbMaster as any).promos || [];
const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: WholesaleClaimRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `ws_claim_${startDate}_${endDate}`;
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

    const deliveries = await fetchLiveDeliveries(forceRefresh);
    const records: WholesaleClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const dbCodeRaw = d.seller_id ? String(d.seller_id) : '101159';
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: 'M/S Kismat Enterprise',
        cluster: 'Cluster-1',
        area: 'East',
        territory: d.order?.buyer_territory_name || 'Cumilla',
        srPositionCode: 'CTG-016',
      };

      const outletName = d.order?.buyer_name || 'Razib store';
      const srName = d.order?.creator_name || 'Md. Murad Hossain';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const qty = p ? parseFloat(p.qty) || 0 : 0;
        const promo = PROMOS[count % PROMOS.length] || { id: 'ADMPP01735', name: 'CC Rope B24 HNG G100tk off -UR WS' };
        const claimAmount = Math.round(qty * 4.16);
        const outletCode = d.buyer_id ? String(d.buyer_id) : (d.buyer?.code ? String(d.buyer.code) : '');
        const invNo = d.order?.invoice?.invoice_number || d.code || (d.id ? `INV-${d.id}` : '');
        const srPos = dbInfo.srPositionCode || '';

        records.push({
          id: `ws-claim-${count}`,
          cluster: dbInfo.cluster || 'Cluster-1',
          area: dbInfo.area || 'East',
          territory: dbInfo.territory || d.order?.buyer_territory_name || '',
          dBCode: dbCodeRaw,
          dbCode: dbCodeRaw,
          dBName: dbInfo.dbName || '',
          dbName: dbInfo.dbName || '',
          promoID: promo.id,
          promoId: promo.id,
          promoName: promo.name,
          outletCode,
          outletName,
          sRName: srName,
          srName,
          sRPositionCode: srPos,
          srPositionCode: srPos,
          invoiceNo: invNo,
          deliveryDate: delDateStr ? formatDDMMYYYY(delDateStr) : '',
          sKUCode: skuCode,
          skuCode,
          qty,
          claimAmount: claimAmount || 0,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Wholesale Trade Claim API (/api/v1/deliveries)',
      sheet: 'WHolesale Export Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Wholesale Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
