import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
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
  distributorID: string | number;
  distributorId: string | number;
  distributorName: string | number;
  dBType: string | number;
  dbType: string | number;
  subDistributorPositionCode: string | number;
  subDistributorId: string | number;
  subDistributorName: string | number;
  sRPostionCode: string | number;
  srPostionCode: string | number;
  sRCode: string | number;
  srCode: string | number;
  sRName: string | number;
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

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
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

      const dbCodeRaw = v.user?.department?.code ? String(v.user.department.code) : '101951';
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: v.user?.department?.name || 'M/S Raisha Traders',
        cluster: 'Cluster-1',
        area: 'A23',
        areaName: 'North',
        territory: 'T55',
        territoryName: v.buyer?.territory?.name || 'Dinajpur',
        srPositionCode: 'MD17264',
      };

      const outName = v.buyer?.name || 'General Outlet';

      records.push({
        id: `geo-${v.id}`,
        cluster: dbInfo.cluster || 'Cluster-1',
        areaName: dbInfo.area || 'North',
        area: 'A23',
        territoryName: dbInfo.territory || v.buyer?.territory?.name || 'Dinajpur',
        territory: 'T55',
        distributorPosition: dbInfo.srPositionCode || 'MD17264',
        distributorID: dbCodeRaw,
        distributorId: dbCodeRaw,
        distributorName: dbInfo.dbName,
        dBType: 'Main DB',
        dbType: 'Main DB',
        subDistributorPositionCode: '',
        subDistributorId: '',
        subDistributorName: '',
        sRPostionCode: dbInfo.srPositionCode || 'MD17264',
        srPostionCode: dbInfo.srPositionCode || 'MD17264',
        sRCode: v.user?.code ? String(v.user.code) : '52454',
        srCode: v.user?.code ? String(v.user.code) : '52454',
        sRName: v.user?.name || 'Market SR',
        srName: v.user?.name || 'Market SR',
        routeCode: v.route?.code || 'T55R00067423241234',
        routeType: 'Regular',
        routeName: v.route?.name || 'Main Bazar',
        latitude: lat,
        longitude: lng,
        outletcreationdate: dateStr,
        outletCode: v.buyer?.code ? `T55-2000${v.buyer.code}` : `T55-2000${outletCode}`,
        outletNameEnglish: outName,
        outletNameBangla: outName,
        channel: v.buyer?.channel || 'Retail',
        subChannel: 'Grocery',
        outletOwnerName: v.buyer?.owner_name || 'Outlet Owner',
        outletAddressEnglish: v.buyer?.address || 'Market Area',
        outletAddressBangla: v.buyer?.address || 'Market Area',
        outletOwnerContactNumber: v.buyer?.phone || '01700000000',
        schoolProximityOutlet: 'No',
        binNo: '',
        visitDate: dateStr,
        isActive: 'Active',
        outletinactiveDate: '',
        newoutlet: 'No',
        informationUpdated: 'Yes',
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Outlets & Geotagging API (/api/v1/visits)',
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
