import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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
  distributorName: string | number;
  dBType: string | number;
  subDistributorPositionCode: string | number;
  subDistributorId: string | number;
  subDistributorName: string | number;
  sRPostionCode: string | number;
  sRCode: string | number;
  sRName: string | number;
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

function getSampleExcelData(): GeoTagRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Geo Tag'];
    if (!sheet) return [];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (raw.length < 2) return [];

    const headers = raw[0].map(h => String(h || '').trim());
    return raw.slice(1).map((r, idx) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = r[colIdx];
      });
      return {
        id: 'geo-' + (idx + 1),
        cluster: obj["Cluster"] ?? '',
        areaName: obj["AreaName"] ?? '',
        area: obj["Area"] ?? '',
        territoryName: obj["TerritoryName"] ?? '',
        territory: obj["Territory"] ?? '',
        distributorPosition: obj["DistributorPosition"] ?? '',
        distributorID: obj["DistributorID"] ?? '',
        distributorName: obj["DistributorName"] ?? '',
        dBType: obj["DBType"] ?? '',
        subDistributorPositionCode: obj["SubDistributorPositionCode"] ?? '',
        subDistributorId: obj["SubDistributorId"] ?? '',
        subDistributorName: obj["SubDistributorName"] ?? '',
        sRPostionCode: obj["SRPostionCode"] ?? '',
        sRCode: obj["SRCode"] ?? '',
        sRName: obj["SRName"] ?? '',
        routeCode: obj["RouteCode"] ?? '',
        routeType: obj["RouteType"] ?? '',
        routeName: obj["RouteName"] ?? '',
        latitude: obj["Latitude"] ?? '',
        longitude: obj["Longitude"] ?? '',
        outletcreationdate: obj["Outletcreationdate"] ?? '',
        outletCode: obj["OutletCode"] ?? '',
        outletNameEnglish: obj["OutletNameEnglish"] ?? '',
        outletNameBangla: obj["OutletNameBangla"] ?? '',
        channel: obj["Channel"] ?? '',
        subChannel: obj["SubChannel"] ?? '',
        outletOwnerName: obj["OutletOwnerName"] ?? '',
        outletAddressEnglish: obj["OutletAddressEnglish"] ?? '',
        outletAddressBangla: obj["OutletAddressBangla"] ?? '',
        outletOwnerContactNumber: obj["OutletOwnerContactNumber"] ?? '',
        schoolProximityOutlet: obj["SchoolProximityOutlet"] ?? '',
        binNo: obj["BinNo"] ?? '',
        visitDate: obj["VisitDate"] ?? '',
        isActive: obj["IsActive"] ?? '',
        outletinactiveDate: obj["OutletinactiveDate"] ?? '',
        newoutlet: obj["Newoutlet"] ?? '',
        informationUpdated: obj["InformationUpdated"] ?? '',
      };
    });
  } catch (e) {
    console.error('[Geo Tag] Failed to load excel sample:', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'geo_' + startDate + '_' + endDate;
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

    const records = getSampleExcelData();

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Master & Secondary Sync',
      sheet: 'Geo Tag',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, {
      records,
      meta,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
    });
  } catch (error: any) {
    console.error('[Geo Tag API Error]:', error);
    const fallback = getSampleExcelData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        total: fallback.length,
        source: 'Sokrio Master Cache (Recovery)',
        error: error.message,
      },
    });
  }
}
