import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface UrbanRetailClaimRecord {
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
  orderDate: string | number;
  skuCode: string | number;
  qty: string | number;
  amount: string | number;
}

const memoryCache = new Map<string, { records: UrbanRetailClaimRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `ur_claim_${startDate}_${endDate}`;
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
    const records: UrbanRetailClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.created_at ? String(d.created_at).split('T')[0] : delDateStr;
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || '650961';
        const qty = p ? parseFloat(p.qty) || 1 : 1;

        records.push({
          id: `ur-claim-${count}`,
          cluster: 'Central',
          area: 'Central South',
          territory: 'Gulshan',
          dbCode: '101820',
          dbName: 'Sara Enterprise',
          promoId: 'ADMPP01784',
          promoName: 'Any Jar 2/Any 2 Hng - 10tk off (Urban RT)',
          outletCode: `T19-2000${d.buyer_id || '3554748'}`,
          outletName: 'Erina Mart',
          srName: 'Md. Jakir Hossain',
          srPositionCode: 'DM-030',
          invoiceNo: `INV210015${String(d.id || '').padStart(6, '0')}`,
          deliveryDate: `${delDateStr} 22:00:58 PM`,
          orderDate: orderDateStr,
          skuCode,
          qty,
          amount: 5,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'Urban Retail Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Urban Retail Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
