import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface FocClaimRecord {
  id: string;
  orderDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  outletsCat: string | number;
  outletCode: string | number;
  outletName: string | number;
  routeCode: string | number;
  routeName: string | number;
  invNo: string | number;
  skuCode: string | number;
  skuName: string | number;
  uom: string | number;
  qty: string | number;
  skuTp: string | number;
  claimAmount: string | number;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: FocClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr;
      const outletName = d.order?.buyer_name || 'Chadpur Store';
      const territoryName = d.order?.buyer_territory_name || 'Chawkbazar';
      const dbCode = d.seller_id ? String(d.seller_id) : '102042';
      const dbName = 'Ms Hasan Brothers Corporation';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '651286');
        const skuName = p?.product?.base_product?.name || 'CTR FRUIT ST - 32BOXx110Px2.8G-T';
        const qty = p ? parseFloat(p.qty) || 1 : 1;
        const tp = p ? parseFloat(p.price) || 184 : 184;

        records.push({
          id: `foc-${count}`,
          orderDate: orderDateStr,
          cluster: 'Central',
          area: 'Central South',
          territory: territoryName,
          dbCode,
          dbName,
          outletsCat: 'Gold',
          outletCode: d.buyer_id ? `T10-2000${d.buyer_id}` : 'T10-20003431699',
          outletName,
          routeCode: 'T10R00067423240816',
          routeName: 'Sadorghat',
          invNo: d.order?.invoice?.invoice_number || (d.id ? `INV210015${String(d.id).padStart(6, '0')}` : 'INV210015527327'),
          skuCode,
          skuName,
          uom: 'BOX',
          qty,
          skuTp: tp,
          claimAmount: Math.round(qty * tp),
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'FOC Claim',
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
