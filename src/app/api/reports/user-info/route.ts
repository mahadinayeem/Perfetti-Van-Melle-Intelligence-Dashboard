import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface UserInfoRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  areaName: string | number;
  territory: string | number;
  name: string | number;
  userId: string | number;
  password: string | number;
  positionCode: string | number;
  userType: string | number;
}

const memoryCache = new Map<string, { records: UserInfoRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'user_info_live';
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
    const records: UserInfoRecord[] = [];

    for (const u of rawUsers) {
      const roleName = u.roles?.[0]?.name || (u.is_report ? 'TE' : 'SR');
      const territoryName = u.territory?.name || 'Bangladesh';
      
      records.push({
        id: `user-${u.id}`,
        cluster: 'Central',
        area: u.territory?.code ? `A${u.territory.code}` : 'Central North',
        areaName: territoryName,
        territory: u.territory_id ? `T${u.territory_id}` : 'Gazipur',
        name: u.name || '',
        userId: u.code || u.id,
        password: '', // Kept blank for security reasons
        positionCode: u.device_id || `P-${u.code || u.id}`,
        userType: roleName,
      });
    }

    const meta = {
      total: records.length,
      source: 'Sokrio Live SFA Users API (/api/v1/users)',
      sheet: 'User Information Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[User Info API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
