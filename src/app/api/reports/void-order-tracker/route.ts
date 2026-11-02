import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveDeliveries, resolveDbType } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';

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

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};

export interface VoidOrderTrackerRecord {
  id: string;
  orderNo?: string | number;
  orderno: string | number;
  orderDate?: string | number;
  orderdate: string | number;
  deliveryDate?: string | number;
  deliverydate: string | number;
  voidDate: string | number;
  outlet: string | number;
  outletName: string | number;
  sRCode?: string | number;
  srCode: string | number;
  sRName?: string | number;
  srName: string | number;
  dBType?: string;
  dbType: string;
  dBCode?: string | number;
  dbCode: string | number;
  dBName?: string;
  dbName: string;
  salesOfficeID?: string | number;
  salesofficeid: string | number;
  salesOfficeName?: string;
  salesofficename: string;
  sKUQuantity?: string | number;
  skuQuantity: string | number;
  lineAmount: string | number;
  discount: string | number;
  amount: string | number;
  orderValue: string | number;
  orderCashDiscount: string | number;
  createDeliveryDate?: string | number;
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

    const deliveries = await fetchLiveDeliveries(forceRefresh);
    const records: VoidOrderTrackerRecord[] = [];

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : '';
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : '');
      const outletName = d.order?.buyer_name || d.buyer_name || '';
      const srName = d.order?.creator_name || d.creator_name || '';
      const orderCode = d.order?.code || d.code || (d.id ? `PB${d.id}` : '');
      const dbCodeRaw = d.seller_id ? String(d.seller_id) : (d.seller?.code ? String(d.seller.code) : '');
      const dbInfo = DB_MAP[dbCodeRaw] || {};
      const dbNameResolved = d.seller_name || d.order?.seller_name || dbInfo.dbName || '';
      const dbType = resolveDbType(dbCodeRaw);
      const salesOffice = dbInfo.area || '';
      const voidDate = d.updated_at ? String(d.updated_at).split('T')[0] : delDateStr;
      const outlet = d.buyer_id ? String(d.buyer_id) : (d.buyer?.code ? String(d.buyer.code) : '');
      const srCode = d.created_by ? String(d.created_by) : (d.order?.creator_code ? String(d.order.creator_code) : '');
      const openTime = d.created_at ? (String(d.created_at).includes('T') ? String(d.created_at).split('T')[1].slice(0, 8) : String(d.created_at).split(' ')[1] || '') : '';

      records.push({
        id: `void-tr-${d.id}`,
        orderNo: orderCode,
        orderno: orderCode,
        orderDate: formatDDMMYYYY(orderDateStr),
        orderdate: formatDDMMYYYY(orderDateStr),
        deliveryDate: formatDDMMYYYY(delDateStr),
        deliverydate: formatDDMMYYYY(delDateStr),
        voidDate: formatDDMMYYYY(voidDate),
        outlet,
        outletName,
        sRCode: srCode,
        srCode,
        sRName: srName,
        srName,
        dBType: dbType,
        dbType,
        dBCode: dbCodeRaw,
        dbCode: dbCodeRaw,
        dBName: dbNameResolved,
        dbName: dbNameResolved,
        salesOfficeID: dbCodeRaw,
        salesofficeid: dbCodeRaw,
        salesOfficeName: salesOffice,
        salesofficename: salesOffice,
        sKUQuantity: d.total_sku || (Array.isArray(d.products) ? d.products.length : 1),
        skuQuantity: d.total_sku || (Array.isArray(d.products) ? d.products.length : 1),
        lineAmount: d.amount || 300,
        discount: d.discount || 0,
        amount: d.payable || d.amount || 300,
        orderValue: d.amount || 300,
        orderCashDiscount: 0,
        createDeliveryDate: formatDDMMYYYY(delDateStr),
        createDeliverydate: formatDDMMYYYY(delDateStr),
        voidOrderOpeningDate: formatDDMMYYYY(orderDateStr),
        voidOrderOpeningTime: openTime,
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
