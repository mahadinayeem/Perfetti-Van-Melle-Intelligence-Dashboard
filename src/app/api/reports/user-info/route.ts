import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveUsers } from '@/lib/sokrioClient';

export const dynamic = 'force-dynamic';

export interface UserInfoRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  areaName: string | number;
  territory: string | number;
  name: string | number;
  userID: string | number;
  userId: string | number;
  password: string | number;
  positionCode: string | number;
  userType: string | number;
}

const memoryCache = new Map<string, { records: UserInfoRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

const KNOWN_SR_POSITIONS: Record<string, string> = {
  '54506': 'DM-060',
  '53995': 'DM-057',
  '54233': 'DM-059',
  '51639': 'DM-217',
  '54801': 'DM-058',
  '20637': 'DM-061',
  '54912': 'DO-129',
};

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

    const rawUsers = await fetchLiveUsers(forceRefresh);
    const records: UserInfoRecord[] = [];

    for (const u of rawUsers) {
      const roleName = u.roles?.[0]?.name || (u.is_report ? 'TE' : 'SR');
      const territoryName = u.territory?.name || 'Bangladesh';
      const codeStr = String(u.code || u.id || '').trim();
      const roleUpper = roleName.toUpperCase();

      let password = `PVMB${codeStr}@SR`;
      let positionCode = `DO-${codeStr.slice(-3)}`;

      if (codeStr.startsWith('ST') || codeStr.startsWith('SD')) {
        password = '1122';
        positionCode = codeStr;
      } else if (codeStr === '100001') {
        password = 'Modern@123456';
        positionCode = '100001';
      } else if (roleUpper.includes('DB') || codeStr.length === 6) {
        password = '1234';
        positionCode = codeStr;
      } else if (roleUpper.includes('TE') || u.is_report) {
        password = 'Per@12345678';
        positionCode = u.territory_id ? `T${u.territory_id}` : 'T115';
      } else {
        password = `PVMB${codeStr}@SR`;
        positionCode = KNOWN_SR_POSITIONS[codeStr] || `DO-${codeStr.slice(-3)}`;
      }
      
      records.push({
        id: `user-${u.id}`,
        cluster: 'Central',
        area: u.territory?.code ? `A${u.territory.code}` : 'Central North',
        areaName: territoryName,
        territory: u.territory_id ? `T${u.territory_id}` : 'Gazipur',
        name: u.name || '',
        userID: codeStr,
        userId: codeStr,
        password,
        positionCode,
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
