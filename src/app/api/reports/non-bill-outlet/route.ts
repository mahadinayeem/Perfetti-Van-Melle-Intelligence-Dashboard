import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface NonBillOutletRecord {
  id: string;
  fromDate: string | number;
  toDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  subDbCode: string | number;
  subDbName: string | number;
  srPositionCode: string | number;
  srCode: string | number;
  srName: string | number;
  routeCode: string | number;
  routeName: string | number;
  outletCode: string | number;
  outletName: string | number;
  channel: string | number;
  subChannel: string | number;
  lastBillDateTime: string | number;
}

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

    const cacheKey = `nbo_${startDate}_${endDate}`;
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
    const res = await axios.get(`https://pvm.core.sokrio.com/api/v1/visits?start_date=${startDate}&end_date=${endDate}&per_page=200`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const visits = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    // Non-bill outlets are visited outlets where no order was taken (is_ordered === 0)
    const nonBillVisits = visits.filter((v: any) => v.is_ordered === 0 || !v.is_ordered);
    const records: NonBillOutletRecord[] = [];
    const seenOutlets = new Set<string>();

    for (const v of (nonBillVisits.length > 0 ? nonBillVisits : visits)) {
      const outletCode = String(v.buyer?.code || v.buyer_id || v.id);
      if (seenOutlets.has(outletCode)) continue;
      seenOutlets.add(outletCode);

      const dateStr = v.created_at ? String(v.created_at).split('T')[0] : todayStr;

      records.push({
        id: `nbo-${v.id}`,
        fromDate: `${startDate} 00:00:00`,
        toDate: `${endDate} 23:59:59`,
        cluster: '',
        area: '',
        territory: v.buyer?.territory?.name || '',
        dbCode: v.department?.code ? String(v.department.code) : '',
        dbName: v.department?.name || '',
        subDbCode: '',
        subDbName: '',
        srPositionCode: '',
        srCode: v.user?.code ? String(v.user.code) : (v.user_id ? String(v.user_id) : ''),
        srName: v.user?.name || '',
        routeCode: v.route?.code || '',
        routeName: v.route?.name || '',
        outletCode,
        outletName: v.buyer?.name || '',
        channel: v.buyer?.channel || '',
        subChannel: '',
        lastBillDateTime: dateStr,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Non-Productive Visits API (/api/v1/visits)',
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
