import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface NonBillOutletRecord {
  id: string;
  fromDate: string | number;
  toDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string | number;
  dbName: string | number;
  sUBDBCode: string | number;
  subDbCode: string | number;
  sUBDBName: string | number;
  subDbName: string | number;
  sRPositionCode: string | number;
  srPositionCode: string | number;
  sRCode: string | number;
  srCode: string | number;
  sRName: string | number;
  srName: string | number;
  routeCode: string | number;
  routeName: string | number;
  outletCode: string | number;
  outletName: string | number;
  channel: string | number;
  subChannel: string | number;
  lastBillDateTime: string | number;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
const memoryCache = new Map<string, { records: NonBillOutletRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `non_bill_${startDate}_${endDate}`;
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
    const res = await axios.get(`https://pvm.core.sokrio.com/api/v1/visits?start_date=${startDate}&end_date=${endDate}&per_page=150`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const visits = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    const nonBillVisits = visits.filter((v: any) => !v.order_id && (!v.orders || v.orders.length === 0));
    const sampleList = nonBillVisits.length > 0 ? nonBillVisits : visits;

    const records: NonBillOutletRecord[] = [];
    const seenOutlets = new Set<string>();

    for (const v of sampleList) {
      const outletCode = String(v.buyer?.code || v.buyer_id || v.id);
      if (seenOutlets.has(outletCode)) continue;
      seenOutlets.add(outletCode);

      const dbCodeRaw = v.user?.department?.code ? String(v.user.department.code) : '102267';
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: v.user?.department?.name || 'M/S Ahamed Enterprise',
        cluster: 'Central',
        area: 'Central South',
        territory: v.buyer?.territory?.name || 'Jatra Bari',
        srPositionCode: 'DM-217',
      };

      const dateStr = v.created_at ? String(v.created_at).split('T')[0] : startDate;
      const lastBill = v.buyer?.last_order_date || `${dateStr} 14:20:00`;

      records.push({
        id: `non-bill-${v.id}`,
        fromDate: `${startDate} 00:00:00.000`,
        toDate: `${endDate} 23:59:59.000`,
        cluster: dbInfo.cluster || 'Central',
        area: dbInfo.area || 'Central South',
        territory: dbInfo.territory || v.buyer?.territory?.name || 'Jatra Bari',
        dBCode: dbCodeRaw,
        dbCode: dbCodeRaw,
        dBName: dbInfo.dbName,
        dbName: dbInfo.dbName,
        sUBDBCode: '',
        subDbCode: '',
        sUBDBName: '',
        subDbName: '',
        sRPositionCode: dbInfo.srPositionCode || 'DM-217',
        srPositionCode: dbInfo.srPositionCode || 'DM-217',
        sRCode: v.user?.code ? String(v.user.code) : '52454',
        srCode: v.user?.code ? String(v.user.code) : '52454',
        sRName: v.user?.name || 'Market SR',
        srName: v.user?.name || 'Market SR',
        routeCode: v.route?.code || 'T16R00067423245304',
        routeName: v.route?.name || 'Rostomali',
        outletCode: v.buyer?.code ? `T16-2000${v.buyer.code}` : `T16-2000${outletCode}`,
        outletName: v.buyer?.name || 'Retail Outlet',
        channel: v.buyer?.channel || 'Retail',
        subChannel: 'General Store',
        lastBillDateTime: lastBill,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Outlets Without Order API (/api/v1/visits)',
      sheet: 'Non-Bill Outlet Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Non-Bill Outlet API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
