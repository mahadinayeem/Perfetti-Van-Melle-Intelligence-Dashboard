import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface LicenseRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  subDbCode: string | number;
  subDbName: string | number;
  code: string | number;
  name: string | number;
  suCode: string | number;
  licenseNo: string | number;
  licenseType: string | number;
  imeiNo: string | number;
  active: string | number;
  lastLoginDate: string | number;
}

const memoryCache = new Map<string, { records: LicenseRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

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
      timeout: 30000,
    });

    const rawUsers = res.data?.users || (Array.isArray(res.data) ? res.data : []);
    const records: LicenseRecord[] = [];

    for (const u of rawUsers) {
      const roleName = u.roles?.[0]?.name || (u.is_report ? 'TE' : 'SR');
      const territoryName = u.territory?.name || 'Bangladesh';

      records.push({
        id: `lic-${u.id}`,
        cluster: 'Central',
        area: 'Central North',
        territory: territoryName,
        dbCode: u.phone || '',
        dbName: 'Perfetti SFA Unit',
        subDbCode: '',
        subDbName: '',
        code: u.code || u.id,
        name: u.name || '',
        suCode: '',
        licenseNo: u.device_id ? `LIC-${String(u.code || u.id).slice(-4)}` : '',
        licenseType: roleName.toUpperCase().includes('TE') ? 'TE' : 'SR',
        imeiNo: u.device_id || '',
        active: u.active ? 'Active' : 'Inactive',
        lastLoginDate: u.last_time_login ? String(u.last_time_login).split(' ')[0] : '',
      });
    }

    const meta = {
      total: records.length,
      source: 'Sokrio Live SFA License & Device API (/api/v1/users)',
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
