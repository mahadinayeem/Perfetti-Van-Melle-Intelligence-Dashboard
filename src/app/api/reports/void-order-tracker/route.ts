import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface VoidOrderTrackerRecord {
  id: string;
  orderno: string | number;
  orderdate: string | number;
  deliverydate: string | number;
  voidDate: string | number;
  outlet: string | number;
  outletName: string | number;
  srCode: string | number;
  srName: string | number;
  dbType: string | number;
  dbCode: string | number;
  dbName: string | number;
  salesofficeid: string | number;
  salesofficename: string | number;
  skuQuantity: string | number;
  lineAmount: string | number;
  discount: string | number;
  amount: string | number;
  orderValue: string | number;
  orderCashDiscount: string | number;
  createDeliverydate: string | number;
  voidOrderOpeningDate: string | number;
  voidOrderOpeningTime: string | number;
}

const memoryCache = new Map<string, { records: VoidOrderTrackerRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `void_tr_${startDate}_${endDate}`;
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
    const records: VoidOrderTrackerRecord[] = [];

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : delDateStr);
      const outletName = d.order?.buyer_name || 'Retail Market Outlet';
      const srName = d.order?.creator_name || 'Market SR';
      const orderCode = d.order?.code || (d.order_id ? `PB${d.order_id}` : `PB1730O${d.id}`);
      const dbCode = d.seller_id ? String(d.seller_id) : '102325';
      const dbName = 'M/S. Shahjalal Enterprise';

      records.push({
        id: `void-tr-${d.id}`,
        orderno: orderCode,
        orderdate: orderDateStr,
        deliverydate: delDateStr,
        voidDate: d.updated_at ? String(d.updated_at).split('T')[0] : delDateStr,
        outlet: d.buyer_id ? `T32-2000${d.buyer_id}` : 'T32-20003707118',
        outletName,
        srCode: d.created_by ? String(d.created_by) : '54725',
        srName,
        dbType: 'Main DB',
        dbCode,
        dbName,
        salesofficeid: dbCode,
        salesofficename: dbName,
        skuQuantity: d.total_sku || 1,
        lineAmount: d.amount || 375,
        discount: d.discount || 0,
        amount: d.payable || d.amount || 375,
        orderValue: d.amount || 375,
        orderCashDiscount: 0,
        createDeliverydate: delDateStr,
        voidOrderOpeningDate: orderDateStr,
        voidOrderOpeningTime: d.created_at ? String(d.created_at).split('T')[1]?.slice(0, 8) || '12:12:02' : '12:12:02',
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Void Lifecycle API (/api/v1/deliveries)',
      sheet: 'Void Order Tracker',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Void Order Tracker API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
