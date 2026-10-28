import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface TeVersionRecord {
  id: string;
  nation: string | number;
  salesRegion: string | number;
  territoryName: string | number;
  areaName: string | number;
  teCode: string | number;
  teName: string | number;
  territoryCode: string | number;
  licenseNo: string | number;
  versionNo: string | number;
}

const memoryCache = new Map<string, { records: TeVersionRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'te_version_live';
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
    const records: TeVersionRecord[] = [];

    for (const u of rawUsers) {
      const roleName = String(u.roles?.[0]?.name || '').toUpperCase();
      const isTE = roleName.includes('TE') || roleName.includes('EXECUTIVE') || u.is_report === 1;
      if (!isTE && rawUsers.length > 20) continue; // If many users, focus on TE/Supervisors

      const territoryName = u.territory?.name || 'Dhaka';

      records.push({
        id: `tev-${u.id}`,
        nation: 'Bangladesh',
        salesRegion: 'Bangladesh',
        territoryName,
        areaName: 'Central South',
        teCode: u.code || u.id,
        teName: u.name || '',
        territoryCode: u.territory?.code ? `T${u.territory.code}` : 'T01',
        licenseNo: u.device_id ? `TE-${String(u.code || u.id).slice(-3)}` : 'TE01',
        versionNo: u.app_version || '5.1.2.70.39',
      });
    }

    const meta = {
      total: records.length,
      source: 'Sokrio Live SFA TE App Version API (/api/v1/users)',
      sheet: 'TE Version List',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[TE Version API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
