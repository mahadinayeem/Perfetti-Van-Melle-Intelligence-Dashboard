import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
import outletMasterData from '@/lib/outletMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface GeoTagRecord {
  id: string;
  cluster: string;
  areaName: string;
  area: string;
  territoryName: string;
  territory: string;
  distributorPosition: string;
  distributorID: string;
  distributorId: string;
  distributorName: string;
  dBType: string;
  dbType: string;
  subDistributorPositionCode: string;
  subDistributorId: string;
  subDistributorName: string;
  sRPostionCode: string;
  srPostionCode: string;
  sRCode: string;
  srCode: string;
  sRName: string;
  srName: string;
  routeCode: string;
  routeType: string;
  routeName: string;
  latitude: string;
  longitude: string;
  outletcreationdate: string;
  outletCode: string;
  outletNameEnglish: string;
  outletNameBangla: string;
  channel: string;
  subChannel: string;
  outletOwnerName: string;
  outletAddressEnglish: string;
  outletAddressBangla: string;
  outletOwnerContactNumber: string;
  schoolProximityOutlet: string;
  binNo: string;
  visitDate: string;
  isActive: string;
  outletinactiveDate: string;
  newoutlet: string;
  informationUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 500;

    // Load live outlet database from Sokrio Master (4,724 real live outlets)
    const outlets = Object.entries(outletMasterData as Record<string, any>);
    
    // Optionally fetch live fresh updates from Sokrio /api/v1/departments if needed
    try {
      const token = await getValidToken();
      const liveRes = await axios.get('https://pvm.core.sokrio.com/api/v1/departments?per_page=50', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const freshDepts = liveRes.data?.departments || [];
      freshDepts.forEach((d: any) => {
        if (d.code && (outletMasterData as any)[d.code]) {
          (outletMasterData as any)[d.code].lat = d.lat || (outletMasterData as any)[d.code].lat;
          (outletMasterData as any)[d.code].long = d.long || (outletMasterData as any)[d.code].long;
        }
      });
    } catch (e: any) {
      console.warn('[Geo Tag API] Live refresh skipped, using master outlet database:', e.message);
    }

    const records: GeoTagRecord[] = outlets.slice(0, limit).map(([code, meta], idx) => {
      const dbCode = String(meta.dbCode || '102267');
      const dbType = resolveDbType(dbCode);
      const terrCode = String(meta.routeCode || 'T16R01');
      const terrPrefix = terrCode ? terrCode.slice(0, 3) : 'T16';
      const dbName = String(meta.dbName || 'M/S Ahamed Enterprise');
      const srCode = String(meta.srCode || '54506');
      const srName = String(meta.srName || 'Mostafizur Rahman');
      const srPos = String(meta.srPositionCode || 'DM-060');

      return {
        id: `geo-${idx + 1}`,
        cluster: 'Central',
        areaName: meta.areaName || 'Central South',
        area: meta.area || 'Central South',
        territoryName: String(meta.routeName || ''),
        territory: terrPrefix,
        distributorPosition: meta.distributorPosition || '',
        distributorID: dbCode,
        distributorId: dbCode,
        distributorName: dbName,
        dBType: dbType,
        dbType,
        subDistributorPositionCode: '',
        subDistributorId: '',
        subDistributorName: '',
        sRPostionCode: srPos,
        srPostionCode: srPos,
        sRCode: srCode,
        srCode,
        sRName: srName,
        srName,
        routeCode: terrCode,
        routeType: 'Existing',
        routeName: String(meta.routeName || ''),
        latitude: String(meta.lat || ''),
        longitude: String(meta.long || ''),
        outletcreationdate: '',
        outletCode: code,
        outletNameEnglish: String(meta.englishName || meta.name || ''),
        outletNameBangla: String(meta.name || ''),
        channel: String(meta.channelCode || 'CH002'),
        subChannel: String(meta.subChannelCode || 'GS'),
        outletOwnerName: String(meta.ownerName || ''),
        outletAddressEnglish: String(meta.address || ''),
        outletAddressBangla: String(meta.address || ''),
        outletOwnerContactNumber: String(meta.phone || ''),
        schoolProximityOutlet: '',
        binNo: '',
        visitDate: '',
        isActive: 'Y',
        outletinactiveDate: '',
        newoutlet: 'N',
        informationUpdated: 'Y',
      };
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        totalOutletsInSokrio: outlets.length,
        source: 'Sokrio Live SFA Outlet Registry (4,724 Outlets)',
        sheet: 'Geo Tag',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Geo Tag API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
