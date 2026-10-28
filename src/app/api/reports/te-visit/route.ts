import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface TeVisitRecord {
  id: string;
  cluster: string;
  areaName: string;
  areaCode: string;
  territoryName: string;
  territoryCode: string;
  teTsoName: string;
  teTsoCode: string | number;
  type: string;
  mainSuperDistributorPositionCode: string;
  mainSuperDistributorPositionName: string;
  distributorId: string | number;
  distributorName: string;
  dbType: string;
  subDistributorPositionCode: string;
  subDistributorPositionName: string;
  subDbName: string;
  subDbCode: string;
  srPostion: string;
  srCode: string | number;
  srName: string;
  pjpRouteCode: string;
  pjpRouteName2: string;
  visitedRouteCode: string;
  visitedRouteName: string;
  visitDate: string;
  sc: string | number;
  visitedOl: string | number;
  pending: string | number;
  visitPct: string;
  startWorkTime: string;
  firstOutletVisitTime: string;
  lastOutletVisitTime: string;
  duration: string;
  dayEnd: string;
  endWorkTime: string;
  startWorkTimeWithSr: string;
  endWorkTimeWithSr: string;
  durationWithSr: string;
  distributorPositionCode: string;
  distributorPositionName: string;
  visitType: string;
  locationType: string;
  ta: string;
  da: string;
  visitReason: string;
}

const memoryCache = new Map<string, { records: TeVisitRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

const SR_METADATA: Record<string, { srPositionCode: string; territory: string; routeCode: string; routeName: string }> = {
  '54506': { srPositionCode: 'DM-060', territory: 'Jatra Bari', routeCode: 'T16R00067423245267', routeName: 'KATERPUL' },
  '51639': { srPositionCode: 'DM-217', territory: 'Jatra Bari', routeCode: 'T16R00067423245279', routeName: 'Nimalkasari' },
  '53995': { srPositionCode: 'DM-057', territory: 'Jatra Bari', routeCode: 'T16R00067423245244', routeName: 'Alamin Road' },
  '54233': { srPositionCode: 'DM-059', territory: 'Jatra Bari', routeCode: 'T16R00067423245255', routeName: 'Konapara' },
};

function getSampleExcelData(): TeVisitRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['TE Visit Report'];
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
        id: `te-visit-${idx + 1}`,
        cluster: String(obj['Cluster'] || 'Cluster-1'),
        areaName: String(obj['Area Name'] || 'East'),
        areaCode: String(obj['Area Code'] || 'A21'),
        territoryName: String(obj['Territory Name'] || 'Jatra Bari'),
        territoryCode: String(obj['Territory Code'] || 'T16'),
        teTsoName: String(obj['TE / TSO Name'] || 'Palash Chandra Karmakar'),
        teTsoCode: obj['TE / TSO Code'] || 5104,
        type: String(obj['Type'] || 'TE'),
        mainSuperDistributorPositionCode: String(obj['Main/Super Distributor Position Code'] || 'MD11239'),
        mainSuperDistributorPositionName: String(obj['Main/Super Distributor Position Name'] || 'Main DB Jatra Bari'),
        distributorId: obj['Distributor ID'] || 102267,
        distributorName: String(obj['Distributor Name'] || 'M/S Ahamed Enterprise'),
        dbType: '', // Blank as per rule
        subDistributorPositionCode: '',
        subDistributorPositionName: '',
        subDbName: '',
        subDbCode: '',
        srPostion: String(obj['SRPostion'] || 'DM-057'),
        srCode: obj['SRCode'] || '',
        srName: String(obj['SRName'] || ''),
        pjpRouteCode: String(obj['PJP Route Code'] || ''),
        pjpRouteName2: String(obj['PJP Route Name2'] || ''),
        visitedRouteCode: String(obj['Visited Route Code'] || ''),
        visitedRouteName: String(obj['Visited Route Name'] || ''),
        visitDate: String(obj['Visit Date'] || ''),
        sc: obj['SC'] ?? 48,
        visitedOl: obj['Visited OL'] ?? 0,
        pending: obj['Pending'] ?? 0,
        visitPct: String(obj['Visit%'] || '0%'),
        startWorkTime: String(obj['Start WorkTime'] || ''),
        firstOutletVisitTime: String(obj['First Outlet Visit Time'] || ''),
        lastOutletVisitTime: String(obj['Last Outlet Visit Time'] || ''),
        duration: String(obj['Duration'] || ''),
        dayEnd: String(obj['Day End'] || 'No'),
        endWorkTime: String(obj['End Work Time'] || ''),
        startWorkTimeWithSr: '',
        endWorkTimeWithSr: '',
        durationWithSr: '',
        distributorPositionCode: String(obj['Distributor Position Code'] || 'MD11239'),
        distributorPositionName: String(obj['Distributor Position Name'] || 'Main DB Jatra Bari'),
        visitType: String(obj['Visit Type'] || 'Market Work'),
        locationType: String(obj['Location Type'] || 'DHK Metro'),
        ta: '',
        da: '',
        visitReason: String(obj['Visit Reason'] || ''),
      };
    });
  } catch (e) {
    console.error('[TE Visit Report] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveTeVisitsFromSokrio(startDate: string, endDate: string): Promise<TeVisitRecord[]> {
  const token = await getValidToken();

  const checkinRes = await axios.get('https://pvm.report.sokrio.com/api/v1/checkin-report', {
    params: { range: `${startDate},${endDate}`, per_page: 250 },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30000,
  });

  const checkins: any[] = checkinRes.data?.checkinReport || [];
  if (checkins.length === 0) return [];

  // Group checkins by SR code and date
  const grouped: Record<string, {
    srCode: string;
    srName: string;
    date: string;
    routeCode: string;
    routeName: string;
    visitedCount: number;
    firstTime: string;
    lastTime: string;
    hasCheckout: boolean;
  }> = {};

  for (const c of checkins) {
    const srCode = String(c.user?.code || '').trim();
    if (!srCode) continue;

    const date = (c.created_at || '').split(' ')[0] || startDate;
    const key = `${srCode}_${date}`;

    const cTime = (c.created_at || '').split(' ')[1] || '';
    const outTime = (c.checked_out_at || '').split(' ')[1] || '';

    if (!grouped[key]) {
      grouped[key] = {
        srCode,
        srName: c.user?.name || `SR ${srCode}`,
        date,
        routeCode: c.route?.code || `T16R${c.route_id || '01'}`,
        routeName: c.route?.name || c.department?.territory?.name || 'General Route',
        visitedCount: 1,
        firstTime: cTime,
        lastTime: outTime || cTime,
        hasCheckout: !!c.checked_out_at,
      };
    } else {
      grouped[key].visitedCount++;
      if (cTime < grouped[key].firstTime && cTime) grouped[key].firstTime = cTime;
      const effectiveOut = outTime || cTime;
      if (effectiveOut > grouped[key].lastTime && effectiveOut) {
        grouped[key].lastTime = effectiveOut;
        if (outTime) grouped[key].hasCheckout = true;
      }
    }
  }

  const records: TeVisitRecord[] = Object.values(grouped).map((g, idx) => {
    const srMeta = SR_METADATA[g.srCode] || {
      srPositionCode: 'DM-057',
      territory: 'Jatra Bari',
      routeCode: g.routeCode,
      routeName: g.routeName,
    };

    const sc = 48; // Standard schedule call per SR per day
    const visitedOl = g.visitedCount;
    const pending = Math.max(0, sc - visitedOl);
    const visitPct = `${Math.min(100, Math.round((visitedOl / sc) * 100))}%`;

    // Compute duration in hours/minutes
    let durationStr = '8 hrs';
    if (g.firstTime && g.lastTime && g.firstTime !== g.lastTime) {
      const p1 = g.firstTime.split(':').map(Number);
      const p2 = g.lastTime.split(':').map(Number);
      const diffMin = Math.max(0, (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]));
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      durationStr = `${hrs} hrs : ${mins} mins`;
    }

    return {
      id: `te-visit-live-${idx + 1}`,
      cluster: 'Central',
      areaName: 'Central South',
      areaCode: 'A16',
      territoryName: 'Jatra Bari',
      territoryCode: 'T16',
      teTsoName: 'Palash Chandra Karmakar',
      teTsoCode: 5104,
      type: 'TE',
      mainSuperDistributorPositionCode: 'MD11239',
      mainSuperDistributorPositionName: 'Main DB Jatra Bari',
      distributorId: 102267,
      distributorName: 'M/S Ahamed Enterprise',
      dbType: '', // Blank
      subDistributorPositionCode: '',
      subDistributorPositionName: '',
      subDbName: '',
      subDbCode: '',
      srPostion: srMeta.srPositionCode,
      srCode: Number(g.srCode) || g.srCode,
      srName: g.srName,
      pjpRouteCode: srMeta.routeCode,
      pjpRouteName2: srMeta.routeName,
      visitedRouteCode: srMeta.routeCode,
      visitedRouteName: srMeta.routeName,
      visitDate: g.date,
      sc,
      visitedOl,
      pending,
      visitPct,
      startWorkTime: g.firstTime,
      firstOutletVisitTime: g.firstTime,
      lastOutletVisitTime: g.lastTime,
      duration: durationStr,
      dayEnd: g.hasCheckout ? 'Yes' : 'No',
      endWorkTime: g.hasCheckout ? g.lastTime : '',
      startWorkTimeWithSr: '',
      endWorkTimeWithSr: '',
      durationWithSr: '',
      distributorPositionCode: 'MD11239',
      distributorPositionName: 'Main DB Jatra Bari',
      visitType: 'Market Work',
      locationType: 'DHK Metro',
      ta: '',
      da: '',
      visitReason: '',
    };
  });

  return records;
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

    const cacheKey = `te_visit_${startDate}_${endDate}`;
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

    let records = await fetchLiveTeVisitsFromSokrio(startDate, endDate);
    let source = 'sokrio_live_api';

    if (records.length === 0) {
      records = getSampleExcelData();
      source = 'sample_excel_fallback';
    }

    const meta = {
      totalRecords: records.length,
      startDate,
      endDate,
      source,
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
      cached: false,
    });
  } catch (error: any) {
    console.error('[TE Visit Report API Error]:', error);
    const fallback = getSampleExcelData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        totalRecords: fallback.length,
        source: 'sample_excel_error_fallback',
        error: error.message,
      },
      cached: false,
    });
  }
}
