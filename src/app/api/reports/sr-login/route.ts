import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface SrLoginRecord {
  id: string;
  orderDate?: string;
  area: string;
  territory: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  srCode: string | number;
  srName: string;
  loginTime: string;
  endTime: string;
  distanceFromDbLocation: string | number;
  dayEnd: string;
  startWorkLatitude: string | number;
  startWorkLongitude: string | number;
}

const memoryCache = new Map<string, { records: SrLoginRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): SrLoginRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['SR Login Report'];
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
        id: `sr-login-${idx + 1}`,
        area: String(obj['Area'] || 'Central South'),
        territory: String(obj['Territory'] || 'Jatra Bari'),
        dbCode: obj['DBCode'] || 102267,
        dbName: String(obj['DBName'] || 'M/S Ahamed Enterprise'),
        dbType: '', // Blank as per rule
        srCode: obj['SRCode'] || '',
        srName: String(obj['SRName'] || ''),
        loginTime: String(obj['LoginTime'] || ''),
        endTime: String(obj['EndTime'] || ''),
        distanceFromDbLocation: obj['DistanceFromDBLocation'] ?? '',
        dayEnd: String(obj['DayEnd'] || 'No'),
        startWorkLatitude: obj['StartWorkLatitude'] ?? '',
        startWorkLongitude: obj['StartWorkLongitude'] ?? '',
      };
    });
  } catch (e) {
    console.error('[SR Login Report] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveSrLoginsFromSokrio(startDate: string, endDate: string): Promise<SrLoginRecord[]> {
  const token = await getValidToken();
  const url = 'https://pvm.report.sokrio.com/api/v1/checkin-report';

  const res = await axios.get(url, {
    params: {
      range: `${startDate},${endDate}`,
      territory_id: 1,
      per_page: 250,
    },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30000,
  });

  const checkins: any[] = res.data?.checkinReport || [];
  if (checkins.length === 0) return [];

  // Group check-ins by SR code and date
  const grouped: Record<string, {
    srCode: string;
    srName: string;
    date: string;
    firstCheckin: string;
    lastCheckin: string;
    startLat: number | string;
    startLng: number | string;
    distance: number | string;
    hasCheckout: boolean;
  }> = {};

  for (const c of checkins) {
    const srCode = String(c.user?.code || '').trim();
    if (!srCode) continue;

    const date = (c.created_at || '').split(' ')[0] || startDate;
    const key = `${srCode}_${date}`;

    const cTime = c.created_at || '';
    const outTime = c.checked_out_at || '';

    if (!grouped[key]) {
      grouped[key] = {
        srCode,
        srName: c.user?.name || `SR ${srCode}`,
        date,
        firstCheckin: cTime,
        lastCheckin: outTime || cTime,
        startLat: c.lat || '',
        startLng: c.long || '',
        distance: typeof c.checkin_distance === 'number' ? Number(c.checkin_distance.toFixed(2)) : (c.checkin_distance || 0),
        hasCheckout: !!outTime,
      };
    } else {
      if (cTime < grouped[key].firstCheckin && cTime) {
        grouped[key].firstCheckin = cTime;
        if (c.lat) grouped[key].startLat = c.lat;
        if (c.long) grouped[key].startLng = c.long;
        if (c.checkin_distance !== undefined) {
          grouped[key].distance = typeof c.checkin_distance === 'number' ? Number(c.checkin_distance.toFixed(2)) : c.checkin_distance;
        }
      }
      const effectiveOut = outTime || cTime;
      if (effectiveOut > grouped[key].lastCheckin && effectiveOut) {
        grouped[key].lastCheckin = effectiveOut;
        if (outTime) grouped[key].hasCheckout = true;
      }
    }
  }

  const records: SrLoginRecord[] = Object.values(grouped).map((g, idx) => {
    const loginTime = g.firstCheckin.includes(' ') ? g.firstCheckin.split(' ')[1] : g.firstCheckin;
    const endTime = g.hasCheckout && g.lastCheckin.includes(' ') ? g.lastCheckin.split(' ')[1] : '';

    return {
      id: `sr-login-live-${idx + 1}`,
      orderDate: g.date,
      area: 'Central South',
      territory: 'Jatra Bari',
      dbCode: 102267,
      dbName: 'M/S Ahamed Enterprise',
      dbType: '', // Blank as per rule
      srCode: Number(g.srCode) || g.srCode,
      srName: g.srName,
      loginTime,
      endTime,
      distanceFromDbLocation: g.distance,
      dayEnd: g.hasCheckout ? 'Yes' : 'No',
      startWorkLatitude: g.startLat,
      startWorkLongitude: g.startLng,
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

    const cacheKey = `sr_login_${startDate}_${endDate}`;
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

    let records = await fetchLiveSrLoginsFromSokrio(startDate, endDate);
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
    console.error('[SR Login Report API Error]:', error);
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
