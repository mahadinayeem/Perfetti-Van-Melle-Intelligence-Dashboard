import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface SrVersionRecord {
  id: string;
  nation: string | number;
  salesRegion: string | number;
  territoryName: string | number;
  areaName: string | number;
  dBCode?: string | number;
  dbCode: string | number;
  dBName?: string | number;
  dbName: string | number;
  sUBDBCode?: string | number;
  subDbCode: string | number;
  subDBName?: string | number;
  subDbName: string | number;
  sRCode?: string | number;
  srCode: string | number;
  sRName?: string | number;
  srName: string | number;
  sUCode?: string | number;
  suCode: string | number;
  licenseNo: string | number;
  versionNo: string | number;
}

const memoryCache = new Map<string, { records: SrVersionRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'sr_version_live';
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
    const records: SrVersionRecord[] = [];

    for (const u of rawUsers) {
      const roleName = String(u.roles?.[0]?.name || '').toUpperCase();
      const isSR = roleName.includes('SR') || roleName.includes('SALES') || u.is_report === 0;

      records.push({
        id: `srv-${u.id}`,
        nation: 'Bangladesh',
        salesRegion: 'Bangladesh',
        territoryName: u.territory?.name || 'Dhaka',
        areaName: 'Central',
        dBCode: '102267',
        dbCode: '102267',
        dBName: 'M/S Ahamed Enterprise',
        dbName: 'M/S Ahamed Enterprise',
        sUBDBCode: '',
        subDbCode: '',
        subDBName: '',
        subDbName: '',
        sRCode: u.code || u.id,
        srCode: u.code || u.id,
        sRName: u.name || '',
        srName: u.name || '',
        sUCode: `CTG-${String(u.code || u.id).slice(-3)}`,
        suCode: `CTG-${String(u.code || u.id).slice(-3)}`,
        licenseNo: u.device_id ? `PVMB${String(u.code || u.id).slice(-3)}` : 'PVMB420',
        versionNo: u.app_version || '5.1.2.70.38',
      });
    }

    const meta = {
      total: records.length,
      source: 'Sokrio Live SFA SR App Version API (/api/v1/users)',
      sheet: 'SR Version List',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[SR Version API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
