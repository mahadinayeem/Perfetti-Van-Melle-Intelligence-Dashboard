import { NextRequest, NextResponse } from 'next/server';
import nonBillData from '@/lib/nonBillOutletSample.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2026-10-08';
    const endDate = searchParams.get('endDate') || '2026-10-12';

    const records = (nonBillData as any[]).map((obj, idx) => ({
      id: `non-bill-${idx + 1}`,
      fromDate: String(obj['From Date'] || `${startDate} 00:00:00.000`),
      toDate: String(obj['To Date'] || `${endDate} 23:59:59.000`),
      cluster: String(obj['Cluster'] || 'Central'),
      area: String(obj['Area'] || 'Central South'),
      territory: String(obj['Territory'] || 'Jatra Bari'),
      dBCode: obj['DB Code'] || '102267',
      dbCode: obj['DB Code'] || '102267',
      dBName: String(obj['DB Name'] || 'M/S Ahamed Enterprise'),
      dbName: String(obj['DB Name'] || 'M/S Ahamed Enterprise'),
      sUBDBCode: String(obj['SUB DB Code'] || ''),
      subDbCode: String(obj['SUB DB Code'] || ''),
      sUBDBName: String(obj['SUB DB Name'] || ''),
      subDbName: String(obj['SUB DB Name'] || ''),
      sRPositionCode: String(obj['SR Position Code'] || 'DM-217'),
      srPositionCode: String(obj['SR Position Code'] || 'DM-217'),
      sRCode: String(obj['SR Code'] || '51639'),
      srCode: String(obj['SR Code'] || '51639'),
      sRName: String(obj['SR Name'] || 'Md. Shawkat Hossen'),
      srName: String(obj['SR Name'] || 'Md. Shawkat Hossen'),
      routeCode: String(obj['Route Code'] || 'T16R00067423245279'),
      routeName: String(obj['Route Name'] || 'Nimaikasari'),
      outletCode: String(obj['Outlet Code'] || `T16-2000366555${idx}`),
      outletName: String(obj['Outlet Name'] || 'Retail Outlet'),
      channel: String(obj['Channel'] || 'CH002'),
      subChannel: String(obj['Sub Channel'] || 'GS'),
      lastBillDateTime: String(obj['Last Bill Date & Time'] || '2026-10-06 14:20:00'),
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio SFA Non-Bill Outlet Activity & Market Call Audit',
        sheet: 'Non-Bill Outlet Report',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Non-Bill Outlet API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
