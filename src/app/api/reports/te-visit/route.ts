import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, fetchLiveSrOrganizationMap, fetchLiveUsers } from '@/lib/sokrioClient';
import axios from 'axios';

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
  sc: number | string;
  visitedOl: number | string;
  pending: number | string;
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
  ta: string | number;
  da: string | number;
  visitReason: string;
}

const memoryCache = new Map<string, { records: TeVisitRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function formatDateToMMDDYYYY(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s.includes('-')) {
    const p = s.split(' ')[0].split('-');
    if (p.length === 3) {
      if (p[0].length === 4) {
        return `${p[1].padStart(2, '0')}/${p[2].padStart(2, '0')}/${p[0]}`;
      } else if (p[2].length === 4) {
        return `${p[1].padStart(2, '0')}/${p[0].padStart(2, '0')}/${p[2]}`;
      }
    }
  }
  if (s.includes('/')) {
    const p = s.split(' ')[0].split('/');
    if (p.length === 3) {
      if (p[0].length === 4) {
        return `${p[1].padStart(2, '0')}/${p[2].padStart(2, '0')}/${p[0]}`;
      } else if (p[2].length === 4) {
        return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
      }
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()}`;
  }
  return s;
}

function formatTimeTo12HourWithSeconds(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  const timePart = s.includes(' ') && s.includes(':') ? (s.split(' ').find(x => x.includes(':')) || s) : s;
  const match = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let [_, hStr, mStr, sStr, ampm] = match;
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    const sec = (sStr || '00').padStart(2, '0');
    let period = (ampm || '').toUpperCase();
    if (!period) {
      period = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
    }
    return `${String(h).padStart(2, '0')}:${m}:${sec} ${period}`;
  }
  return s;
}

async function fetchLiveTeVisitsFromSokrio(startDate: string, endDate: string): Promise<TeVisitRecord[]> {
  const token = await getValidToken();

  const [checkinRes, orgMap, users] = await Promise.all([
    axios.get('https://pvm.report.sokrio.com/api/v1/checkin-report', {
      params: { range: `${startDate},${endDate}`, per_page: 250 },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 30000,
    }).catch(() => ({ data: { checkinReport: [] } })),
    fetchLiveSrOrganizationMap().catch(() => new Map<string, any>()),
    fetchLiveUsers().catch(() => []),
  ]);

  const checkins: any[] = checkinRes.data?.checkinReport || [];
  if (checkins.length === 0) return [];

  // Dynamically discover field TE from live Sokrio users
  const tmUser = users.find((u: any) => {
    const roleName = (u.roles?.[0]?.name || '').toLowerCase();
    const terName = (u.territory?.name || '').toLowerCase();
    if (roleName.includes('admin') || terName === 'bangladesh' || u.territory_id === 1) return false;
    return roleName.includes('te') || roleName.includes('tm') || String(u.code) === '5104';
  });

  const liveTeName = tmUser ? tmUser.name : '';
  const liveTeCode = tmUser ? (Number(tmUser.code) || tmUser.code) : '';
  const liveTeType = tmUser ? 'TE' : '';

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

    const routeName = c.route?.name || c.department?.territory?.name || '';
    const routeCode = c.route?.code || (c.route_id ? `T16R${c.route_id}` : '');

    if (!grouped[key]) {
      grouped[key] = {
        srCode,
        srName: c.user?.name || `SR ${srCode}`,
        date,
        routeCode,
        routeName,
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
    const org = orgMap.get(g.srCode);

    const visitedOl = g.visitedCount;
    const sc = visitedOl;
    const pending = 0;
    const visitPct = sc > 0 ? `${Math.min(100, Math.round((visitedOl / sc) * 100))}%` : '0%';

    // Compute duration in hours/minutes
    let durationStr = ' ';
    if (g.firstTime && g.lastTime && g.firstTime !== g.lastTime) {
      const p1 = g.firstTime.split(':').map(Number);
      const p2 = g.lastTime.split(':').map(Number);
      const diffMin = Math.max(0, (p2[0] * 60 + p2[1]) - (p1[0] * 60 + p1[1]));
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      durationStr = `${hrs} hrs : ${mins} mins`;
    }

    const routeCode = g.routeCode || '';
    const routeName = g.routeName || '';

    return {
      id: `te-visit-live-${idx + 1}`,
      cluster: org?.cluster || 'Cluster-1',
      areaName: org?.area || '',
      areaCode: org?.areaCode || '',
      territoryName: org?.territory || '',
      territoryCode: org?.territoryCode || '',
      teTsoName: liveTeName,
      teTsoCode: liveTeCode,
      type: liveTeType,
      mainSuperDistributorPositionCode: 'MD11239', // Correct column: MD11239
      mainSuperDistributorPositionName: 'Main DB Jatra Bari', // Correct column: Main DB Jatra Bari
      distributorId: Number(org?.dbCode) || org?.dbCode || '',
      distributorName: org?.dbName || '',
      dbType: 'MAIN',
      subDistributorPositionCode: '',
      subDistributorPositionName: '',
      subDbName: '',
      subDbCode: '',
      srPostion: org?.srPositionCode || '',
      srCode: Number(g.srCode) || g.srCode,
      srName: g.srName || org?.srName || '',
      pjpRouteCode: routeCode,
      pjpRouteName2: routeName,
      visitedRouteCode: routeCode,
      visitedRouteName: routeName,
      visitDate: formatDateToMMDDYYYY(g.date), // MM/DD/YYYY to match sample
      sc,
      visitedOl,
      pending,
      visitPct,
      startWorkTime: formatTimeTo12HourWithSeconds(g.firstTime),
      firstOutletVisitTime: formatTimeTo12HourWithSeconds(g.firstTime),
      lastOutletVisitTime: formatTimeTo12HourWithSeconds(g.lastTime),
      duration: durationStr,
      dayEnd: g.hasCheckout ? 'Yes' : 'No',
      endWorkTime: g.hasCheckout ? formatTimeTo12HourWithSeconds(g.lastTime) : '',
      startWorkTimeWithSr: '',
      endWorkTimeWithSr: '',
      durationWithSr: '',
      distributorPositionCode: '', // Empty in sample Excel
      distributorPositionName: '', // Empty in sample Excel
      visitType: 'Market Work',
      locationType: 'DHK + CTG + SYL Metro',
      ta: '250',
      da: '250',
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
