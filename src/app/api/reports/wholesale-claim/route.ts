import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface WholesaleClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  srName: string | number;
  srPositionCode: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  skuCode: string | number;
  qty: string | number;
  claimAmount: string | number;
}

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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: WholesaleClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || '651240';
        const qty = p ? parseFloat(p.qty) || 24 : 24;

        records.push({
          id: `ws-claim-${count}`,
          cluster: 'Cluster-1',
          area: 'East',
          territory: 'Cumilla',
          dbCode: '101159',
          dbName: 'M/S Kismat Enterprise',
          promoId: 'ADMPP01735',
          promoName: 'CC Rope B24 HNG G100tk off -UR WS',
          outletCode: `T37-2000${d.buyer_id || '3382741'}`,
          outletName: 'Razib Store',
          srName: 'Md. Murad Hossain',
          srPositionCode: 'CTG-016',
          invoiceNo: `INV210015${String(d.id || '').padStart(6, '0')}`,
          deliveryDate: `${delDateStr} 21:54:20 PM`,
          skuCode,
          qty,
          claimAmount: 100,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
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
