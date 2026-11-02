import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
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

// Distributor DB GPS Coordinates for Haversine Distance Calculation (M/S Ahamed Enterprise - DB 102267)
const DB_LAT = 23.7102676;
const DB_LNG = 90.4895088;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTimeToHHMMSS(val: any): string {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const s = String(val).trim();
  const timePart = s.includes(' ') ? s.split(' ').slice(1).join(' ') : (s.includes('T') ? s.split('T')[1] : s);
  const ampmMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (ampmMatch) {
    let [_, hStr, mStr, sStr, ampm] = ampmMatch;
    let h = parseInt(hStr, 10);
    let m = mStr.padStart(2, '0');
    let sec = (sStr || '00').padStart(2, '0');
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${m}:${sec}`;
  }
  const isoMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (isoMatch) {
    let [_, hStr, mStr, sStr] = isoMatch;
    return `${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}:${(sStr || '00').padStart(2, '0')}`;
  }
  return s;
}

async function fetchLiveSrLoginsFromSokrio(startDate: string, endDate: string): Promise<SrLoginRecord[]> {
  let token = await getValidToken();

  const makeRequests = async (authToken: string) => {
    // Live Day In / Day Out Attendance Report (API v3)
    const attendanceUrl = `https://pvm.report.sokrio.com/api/v3/daily-attendance?range=${startDate}%2C${endDate}&territory_id=1&roles=7%2C6%2C5%2C4%2C3%2C2%2C1&download`;
    // Live Checkin Report (API v1)
    const checkinUrl = `https://pvm.report.sokrio.com/api/v1/checkin-report?range=${startDate}%2C${endDate}&roles=&type=xlsx&download`;

    return await Promise.all([
      axios.get(attendanceUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 35000,
      }),
      axios.get(checkinUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 35000,
      }),
    ]);
  };

  let attendanceRes: any;
  let checkinRes: any;

  try {
    [attendanceRes, checkinRes] = await makeRequests(token);
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      token = await getValidToken(true);
      [attendanceRes, checkinRes] = await makeRequests(token);
    } else {
      console.warn('[SR Login] Live attendance API error, proceeding:', err.message);
    }
  }

  const records: SrLoginRecord[] = [];
  const processedKeys = new Set<string>();
  let idx = 1;

  // 1. Primary Source: Parse live Day In / Day Out Report from API v3
  if (attendanceRes?.data) {
    try {
      const wb = XLSX.read(attendanceRes.data, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) || [];

      if (rows.length > 4) {
        const dataRows = rows.slice(4);
        dataRows.forEach((r) => {
          const orderDate = String(r[1] || '').trim();
          const srName = String(r[2] || '').trim();
          const srCode = String(r[3] || '').trim();
          const rawDayIn = String(r[4] || '').trim();
          const dayInLatLong = String(r[6] || '').trim();
          const rawDayOut = String(r[8] || '').trim();

          if (!srCode) return;

          const key = `${srCode}-${orderDate}`;
          if (processedKeys.has(key)) return;
          processedKeys.add(key);

          const loginTime = formatTimeToHHMMSS(rawDayIn);
          const endTime = rawDayOut && rawDayOut !== '-' ? formatTimeToHHMMSS(rawDayOut) : '';
          const dayEnd = endTime ? 'Yes' : 'No';

          let lat: number | string = '';
          let lng: number | string = '';
          let distance: number | string = '';

          if (dayInLatLong && dayInLatLong.includes(',')) {
            const parts = dayInLatLong.split(',');
            const pLat = parseFloat(parts[0]);
            const pLng = parseFloat(parts[1]);
            if (!isNaN(pLat) && !isNaN(pLng)) {
              lat = pLat;
              lng = pLng;
              distance = haversineMeters(DB_LAT, DB_LNG, pLat, pLng).toFixed(2);
            }
          }

          records.push({
            id: `sr-login-${idx++}`,
            orderDate,
            area: 'Central South',
            territory: 'Jatra Bari',
            dbCode: '102267',
            dbName: 'M/S Ahamed Enterprise',
            dbType: 'Main DB',
            srCode: Number(srCode) || srCode,
            srName,
            loginTime,
            endTime,
            distanceFromDbLocation: distance,
            dayEnd,
            startWorkLatitude: lat,
            startWorkLongitude: lng,
          });
        });
      }
    } catch (e: any) {
      console.warn('[SR Login] Error parsing attendance workbook:', e.message);
    }
  }

  // 2. Secondary Fallback Source: Parse live check-ins for any SRs who checked in to retail outlets
  if (checkinRes?.data) {
    try {
      const wb = XLSX.read(checkinRes.data, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]) || [];

      rows.forEach((c) => {
        const srCode = String(c['Employee Code'] || '').trim();
        const orderDate = String(c['Date'] || '').trim();
        if (!srCode) return;

        const key = `${srCode}-${orderDate}`;
        if (processedKeys.has(key)) return;
        processedKeys.add(key);

        const srName = String(c['Name'] || `SR ${srCode}`).trim();
        const rawCheckin = String(c['Check in Time '] || c['Time'] || '').trim();
        const rawCheckout = String(c['Check Out Time '] || '').trim();
        const loginTime = formatTimeToHHMMSS(rawCheckin);
        const endTime = rawCheckout && rawCheckout !== '-' ? formatTimeToHHMMSS(rawCheckout) : '';
        const dayEnd = endTime ? 'Yes' : 'No';

        const pLat = parseFloat(c['Latitude']);
        const pLng = parseFloat(c['Longitude']);
        let lat: number | string = '';
        let lng: number | string = '';
        let distance: number | string = '';

        if (!isNaN(pLat) && !isNaN(pLng)) {
          lat = pLat;
          lng = pLng;
          distance = haversineMeters(DB_LAT, DB_LNG, pLat, pLng).toFixed(2);
        }

        records.push({
          id: `sr-login-${idx++}`,
          orderDate,
          area: 'Central South',
          territory: 'Jatra Bari',
          dbCode: '102267',
          dbName: 'M/S Ahamed Enterprise',
          dbType: 'Main DB',
          srCode: Number(srCode) || srCode,
          srName,
          loginTime,
          endTime,
          distanceFromDbLocation: distance,
          dayEnd,
          startWorkLatitude: lat,
          startWorkLongitude: lng,
        });
      });
    } catch (e: any) {
      console.warn('[SR Login] Error parsing checkin workbook:', e.message);
    }
  }

  // No fake or dummy records fallback: return authentic live records
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
