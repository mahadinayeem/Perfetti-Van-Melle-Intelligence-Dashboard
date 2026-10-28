import { NextRequest, NextResponse } from 'next/server';
import geoTagData from '@/lib/geoTagSample.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const records = (geoTagData as any[]).map((obj, idx) => ({
      id: `geo-${idx + 1}`,
      cluster: String(obj['Cluster'] || 'Cluster-1'),
      areaName: String(obj['AreaName'] || 'North'),
      area: String(obj['Area'] || 'A23'),
      territoryName: String(obj['TerritoryName'] || 'Dinajpur'),
      territory: String(obj['Territory'] || 'T55'),
      distributorPosition: String(obj['DistributorPosition'] || 'MD17264'),
      distributorID: String(obj['DistributorID'] || '101951'),
      distributorId: String(obj['DistributorID'] || '101951'),
      distributorName: String(obj['DistributorName'] || 'M/S Raisha Traders'),
      dBType: String(obj['DBType'] || 'Main DB'),
      dbType: String(obj['DBType'] || 'Main DB'),
      subDistributorPositionCode: String(obj['SubDistributorPositionCode'] || ''),
      subDistributorId: String(obj['SubDistributorId'] || ''),
      subDistributorName: String(obj['SubDistributorName'] || ''),
      sRPostionCode: String(obj['SRPostionCode'] || 'BOG-029'),
      srPostionCode: String(obj['SRPostionCode'] || 'BOG-029'),
      sRCode: String(obj['SRCode'] || '53124'),
      srCode: String(obj['SRCode'] || '53124'),
      sRName: String(obj['SRName'] || 'MD AL MARUF'),
      srName: String(obj['SRName'] || 'MD AL MARUF'),
      routeCode: String(obj['RouteCode'] || 'T99R00067423240296'),
      routeType: String(obj['RouteType'] || 'Existing'),
      routeName: String(obj['RouteName'] || 'Shibgonj'),
      latitude: String(obj['Latitude'] || '26.038354874'),
      longitude: String(obj['Longitude'] || '88.443153381'),
      outletcreationdate: String(obj['Outletcreationdate'] || '10/10/2026'),
      outletCode: String(obj['OutletCode'] || 'T99-20003403533'),
      outletNameEnglish: String(obj['OutletNameEnglish'] || 'Mannan Store'),
      outletNameBangla: String(obj['OutletAddressBangla'] || obj['OutletNameEnglish'] || 'Mannan Store'),
      channel: String(obj['Channel'] || 'CH002'),
      subChannel: String(obj['SubChannel'] || 'GS'),
      outletOwnerName: String(obj['OutletOwnerName'] || 'মান্নান স্টোর'),
      outletAddressEnglish: String(obj['OutletAddressEnglish'] || 'মাদারগঞ্জ মোড়'),
      outletAddressBangla: String(obj['OutletAddressBangla'] || 'মাদারগঞ্জ মোড়'),
      outletOwnerContactNumber: String(obj['OutletOwnerContactNumber'] || '01941712805'),
      schoolProximityOutlet: String(obj['SchoolProximityOutlet'] || 'No'),
      binNo: String(obj['BinNo'] || ''),
      visitDate: String(obj['VisitDate'] || '10/10/2026'),
      isActive: String(obj['IsActive'] || 'Y'),
      outletinactiveDate: String(obj['OutletinactiveDate'] || ''),
      newoutlet: String(obj['Newoutlet'] || 'N'),
      informationUpdated: String(obj['InformationUpdated'] || 'Y'),
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio SFA Geolocation & GPS Field Audit Registry',
        sheet: 'Geo Tag',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Geo Tag API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
