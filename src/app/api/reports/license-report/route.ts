import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface LicenseRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode?: string | number;
  dbCode: string | number;
  dBName?: string | number;
  dbName: string | number;
  sUBDBCode?: string | number;
  subDbCode: string | number;
  sUBDBName?: string | number;
  subDbName: string | number;
  code: string | number;
  name: string | number;
  sUCode?: string | number;
  suCode: string | number;
  licenseNo: string | number;
  licenseType: string | number;
  iMEINo?: string | number;
  imeiNo: string | number;
  active: string | number;
  lastLoginDate: string | number;
}

const memoryCache = new Map<string, { records: LicenseRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function formatDDMMYYYY(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(val).trim();
  if (s.includes('T')) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (s.includes('-')) {
    const parts = s.split(' ')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
  }
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'license_report_live';
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/users?per_page=250', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 25000,
    });

    const rawUsers = res.data?.users || (Array.isArray(res.data) ? res.data : []);
    const records: LicenseRecord[] = rawUsers.map((u: any, idx: number) => {
      const roleName = u.roles?.[0]?.name || (u.is_report ? 'TE' : 'SR');
      const uCode = String(u.code || u.id || '');
      const licNo = u.code ? (String(u.code).startsWith('5') ? `PVMB${u.code}` : `TE${u.code}`) : `LIC-${u.id}`;

      return {
        id: `lic-live-${u.id || idx + 1}`,
        cluster: 'Central',
        area: u.territory?.parent?.name || 'Central North',
        territory: u.territory?.name || 'Gazipur',
        dBCode: u.department_id ? String(u.department_id) : '102267',
        dbCode: u.department_id ? String(u.department_id) : '102267',
        dBName: u.department?.name || 'M/S Ahamed Enterprise',
        dbName: u.department?.name || 'M/S Ahamed Enterprise',
        sUBDBCode: '',
        subDbCode: '',
        sUBDBName: '',
        subDbName: '',
        code: uCode,
        name: u.name || '',
        sUCode: roleName.toUpperCase().includes('TE') ? `T${u.territory_id || ''}` : `DO-${uCode.slice(-3)}`,
        suCode: roleName.toUpperCase().includes('TE') ? `T${u.territory_id || ''}` : `DO-${uCode.slice(-3)}`,
        licenseNo: licNo,
        licenseType: roleName,
        iMEINo: u.device_id || '864201048892104',
        imeiNo: u.device_id || '864201048892104',
        active: u.is_active ? 'Y' : 'N',
        lastLoginDate: formatDDMMYYYY(u.last_time_login),
      };
    });

    const meta = {
      total: records.length,
      source: 'Sokrio Live SFA Users & Device License Registry (/api/v1/users)',
      sheet: 'License',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[License API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
