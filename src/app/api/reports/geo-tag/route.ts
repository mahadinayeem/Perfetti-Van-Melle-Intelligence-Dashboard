import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface GeoTagRecord {
  id: string;
  cluster: string | number;
  areaName: string | number;
  area: string | number;
  territoryName: string | number;
  territory: string | number;
  distributorPosition: string | number;
  distributorId: string | number;
  distributorName: string | number;
  dbType: string | number;
  subDistributorPositionCode: string | number;
  subDistributorId: string | number;
  subDistributorName: string | number;
  srPostionCode: string | number;
  srCode: string | number;
  srName: string | number;
  routeCode: string | number;
  routeType: string | number;
  routeName: string | number;
  latitude: string | number;
  longitude: string | number;
  outletcreationdate: string | number;
  outletCode: string | number;
  outletNameEnglish: string | number;
  outletNameBangla: string | number;
  channel: string | number;
  subChannel: string | number;
  outletOwnerName: string | number;
  outletAddressEnglish: string | number;
  outletAddressBangla: string | number;
  outletOwnerContactNumber: string | number;
  schoolProximityOutlet: string | number;
  binNo: string | number;
  visitDate: string | number;
  isActive: string | number;
  outletinactiveDate: string | number;
  newoutlet: string | number;
  informationUpdated: string | number;
}

const memoryCache = new Map<string, { records: GeoTagRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `geo_tag_${startDate}_${endDate}`;
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
    const records: GeoTagRecord[] = [];
    const seenOutlets = new Set<string>();

    for (const v of visits) {
      const outletCode = String(v.buyer?.code || v.buyer_id || v.id);
      if (seenOutlets.has(outletCode)) continue;
      seenOutlets.add(outletCode);

      const lat = v.lat || v.buyer?.lat || '23.8103';
      const lng = v.long || v.buyer?.long || '90.4125';
      const dateStr = v.created_at ? String(v.created_at).split('T')[0] : todayStr;

      records.push({
        id: `geo-${v.id}`,
        cluster: '',
        areaName: '',
        area: '',
        territoryName: v.buyer?.territory?.name || '',
        territory: '',
        distributorPosition: '',
        distributorId: v.department?.code ? String(v.department.code) : '',
        distributorName: v.department?.name || '',
        dbType: '',
        subDistributorPositionCode: '',
        subDistributorId: '',
        subDistributorName: '',
        srPostionCode: '',
        srCode: v.user?.code ? String(v.user.code) : (v.user_id ? String(v.user_id) : ''),
        srName: v.user?.name || '',
        routeCode: v.route?.code || '',
        routeType: '',
        routeName: v.route?.name || '',
        latitude: lat,
        longitude: lng,
        outletcreationdate: dateStr,
        outletCode,
        outletNameEnglish: v.buyer?.name || '',
        outletNameBangla: '',
        channel: v.buyer?.channel || '',
        subChannel: '',
        outletOwnerName: v.buyer?.contact_person || v.buyer?.name || '',
        outletAddressEnglish: v.buyer?.address || '',
        outletAddressBangla: '',
        outletOwnerContactNumber: v.buyer?.phone || '',
        schoolProximityOutlet: '',
        binNo: '',
        visitDate: dateStr,
        isActive: 'Y',
        outletinactiveDate: '',
        newoutlet: '',
        informationUpdated: '',
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Visits & GPS Coordinates API (/api/v1/visits)',
      sheet: 'Geo Tag',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Geo Tag API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
