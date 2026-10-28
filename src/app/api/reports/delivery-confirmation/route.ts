import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface DeliveryConfirmationRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  uniqueLocationCode: string | number;
  dbSubDbCode: string | number;
  dbSubDbName: string | number;
  srPositionCode: string | number;
  srEcCode: string | number;
  srName: string | number;
  orderDate: string | number;
  day: string | number;
  orderpc: string | number;
  totalSkuLineOrder: string | number;
  totalorderqty: string | number;
  totalordervalue: string | number;
  deliveredDate: string | number;
  deliveryDay: string | number;
  deliveredPc: string | number;
  totalSkuLineDelivery: string | number;
  deliveredQty: string | number;
  deliveredValue: string | number;
  returnedValue: string | number;
}

const memoryCache = new Map<string, { records: DeliveryConfirmationRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `del_conf_${startDate}_${endDate}`;
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
    const records: DeliveryConfirmationRecord[] = [];

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const dDate = new Date(delDateStr);
      const dayName = !isNaN(dDate.getTime()) ? DAYS[dDate.getDay()] : 'Monday';

      const totalDeliveredQty = Array.isArray(d.products)
        ? d.products.reduce((acc: number, p: any) => acc + (parseFloat(p.qty) || 0), 0)
        : (d.total_sku || 1);

      records.push({
        id: `del-conf-${d.id}`,
        cluster: '',
        area: '',
        territory: d.order?.buyer_territory_name || '',
        uniqueLocationCode: '',
        dbSubDbCode: d.seller_id ? String(d.seller_id) : '',
        dbSubDbName: '',
        srPositionCode: '',
        srEcCode: d.created_by ? String(d.created_by) : '',
        srName: d.order?.creator_name || '',
        orderDate: d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr,
        day: dayName,
        orderpc: d.total_sku || 0,
        totalSkuLineOrder: d.total_sku || 0,
        totalorderqty: totalDeliveredQty,
        totalordervalue: d.amount || 0,
        deliveredDate: delDateStr,
        deliveryDay: dayName,
        deliveredPc: d.total_sku || 0,
        totalSkuLineDelivery: d.total_sku || 0,
        deliveredQty: totalDeliveredQty,
        deliveredValue: d.payable || d.amount || 0,
        returnedValue: d.discount || 0,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'Delivery Confirmation Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Delivery Confirmation API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
