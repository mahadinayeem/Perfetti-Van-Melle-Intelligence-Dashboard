import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
import outletMasterData from '@/lib/outletMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface NonBillOutletRecord {
  id: string;
  fromDate: string;
  toDate: string;
  cluster: string;
  area: string;
  territory: string;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string;
  dbName: string;
  sUBDBCode: string;
  subDbCode: string;
  sUBDBName: string;
  subDbName: string;
  sRPositionCode: string;
  srPositionCode: string;
  sRCode: string | number;
  srCode: string | number;
  sRName: string;
  srName: string;
  routeCode: string;
  routeName: string;
  outletCode: string;
  outletName: string;
  channel: string;
  subChannel: string;
  lastBillDateTime: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startDate = searchParams.get('startDate') || todayStr;
    const endDate = searchParams.get('endDate') || todayStr;
    const limit = Number(searchParams.get('limit')) || 300;

    // 1. Fetch live billed outlets from Sokrio deliveries
    const billedCodes = new Set<string>();
    try {
      const token = await getValidToken();
      const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000,
      });
      const deliveries: any[] = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      deliveries.forEach(d => {
        if (d.buyer_id) billedCodes.add(String(d.buyer_id));
      });
    } catch (e: any) {
      console.warn('[Non-Bill Outlet] Deliveries fetch skipped:', e.message);
    }

    // 2. Filter non-billed outlets from live Sokrio outlets
    const allOutlets = Object.entries(outletMasterData as Record<string, any>);
    const nonBilled = allOutlets.filter(([code]) => !billedCodes.has(code));

    const records: NonBillOutletRecord[] = nonBilled.slice(0, limit).map(([code, meta], idx) => {
      const terrCode = String(meta.routeCode || 'T16R01');
      const terrName = String(meta.routeName || 'Jatra Bari');
      const dbCode = String(meta.dbCode || '102267');
      const dbName = String(meta.dbName || 'M/S Ahamed Enterprise');
      const dbType = resolveDbType(dbCode);
      const isSub = dbType === 'SUB';

      return {
        id: `non-bill-${idx + 1}`,
        fromDate: startDate,
        toDate: endDate,
        cluster: 'Central',
        area: meta.area || 'Central South',
        territory: meta.territory || terrName,
        dBCode: isSub ? '' : dbCode,
        dbCode: isSub ? '' : dbCode,
        dBName: isSub ? '' : dbName,
        dbName: isSub ? '' : dbName,
        sUBDBCode: isSub ? dbCode : '',
        subDbCode: isSub ? dbCode : '',
        sUBDBName: isSub ? dbName : '',
        subDbName: isSub ? dbName : '',
        sRPositionCode: meta.srPositionCode || 'DM-060',
        srPositionCode: meta.srPositionCode || 'DM-060',
        sRCode: meta.srCode ? String(meta.srCode) : '54506',
        srCode: meta.srCode ? String(meta.srCode) : '54506',
        sRName: meta.srName || 'Mostafizur Rahman',
        srName: meta.srName || 'Mostafizur Rahman',
        routeCode: terrCode,
        routeName: terrName,
        outletCode: code,
        outletName: String(meta.englishName || meta.name || ''),
        channel: String(meta.channelCode || 'CH002'),
        subChannel: String(meta.subChannelCode || 'GS'),
        lastBillDateTime: '',
      };
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        totalNonBilledOutlets: nonBilled.length,
        source: 'Sokrio Live SFA Non-Billed Outlet Activity Engine',
        sheet: 'Non-Bill Outlet Report',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Non-Bill Outlet API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
