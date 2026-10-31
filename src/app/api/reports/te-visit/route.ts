import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
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
      dbType: resolveDbType(102267),
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
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalRecords: 0,
        source: 'sokrio_live_api',
        error: error.message,
      },
      cached: false,
    });
  }
}
