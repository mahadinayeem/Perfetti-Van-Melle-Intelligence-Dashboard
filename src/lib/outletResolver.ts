import outletMasterData from '@/lib/outletMaster.json';

export interface OutletMeta {
  name?: string;
  englishName?: string;
  channel?: string;
  channelCode?: string;
  subChannel?: string;
  subChannelCode?: string;
  categoryId?: number | null;
  typeId?: number | null;
  routeCode?: string;
  routeName?: string;
  dbCode?: string;
  dbName?: string;
  ownerName?: string;
  phone?: string;
  lat?: string;
  long?: string;
  address?: string;
}

const OUTLET_MAP = outletMasterData as Record<string, OutletMeta>;

const CATEGORY_MAP: Record<number, { code: string; name: string; subChannel: string }> = {
  1: { code: 'GR', name: 'Grocery Store', subChannel: 'Grocery Store' },
  2: { code: 'MT', name: 'Modern Trade Retail', subChannel: 'Modern Trade' },
  3: { code: 'OT', name: 'Others', subChannel: 'Others' },
  4: { code: 'TS', name: 'Tea Plus', subChannel: 'Tea Plus' },
  5: { code: 'GS', name: 'General Store', subChannel: 'General & Grocery Store' },
  6: { code: 'PH', name: 'Pharma Outlet', subChannel: 'Pharma Outlet' },
  7: { code: 'BWS', name: 'Bazar Wholesale', subChannel: 'Bazar Wholesale' },
  8: { code: 'RWS', name: 'Route Wholesale', subChannel: 'Route Wholesale' },
  9: { code: 'SAS', name: 'Stand Alone Stores', subChannel: 'Stand Alone Stores' },
  10: { code: 'CH', name: 'Chemist Store', subChannel: 'Chemist Store' },
  11: { code: 'MT', name: 'Modern Trade', subChannel: 'Modern Trade' },
  12: { code: 'INS', name: 'Institution', subChannel: 'Institution' },
  13: { code: 'STC', name: 'Stockist', subChannel: 'Stockist' },
  14: { code: 'GS', name: 'General & Grocery Store', subChannel: 'General & Grocery Store' },
  15: { code: 'PR', name: 'Premium Outlet', subChannel: 'Premium Outlet' },
};

/**
 * Retrieve complete metadata for an outlet by code from Sokrio Master
 */
export function getOutletMeta(code?: string): OutletMeta | null {
  if (!code) return null;
  const cleanCode = String(code).trim();
  return OUTLET_MAP[cleanCode] || null;
}

/**
 * Resolve authentic Sub Channel name (e.g. 'General & Grocery Store', 'Tea Plus', 'Bazar Wholesale', 'Route Wholesale')
 */
export function resolveSubChannel(code?: string, categoryId?: number | null, fallback = 'General & Grocery Store'): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.subChannel) return meta.subChannel;
  }
  if (categoryId && CATEGORY_MAP[categoryId]) {
    return CATEGORY_MAP[categoryId].subChannel;
  }
  return fallback;
}

/**
 * Resolve authentic Sub Channel short code (e.g. 'GS', 'TS', 'BWS', 'RWS', 'CH')
 */
export function resolveSubChannelCode(code?: string, categoryId?: number | null, fallback = 'GS'): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.subChannelCode) return meta.subChannelCode;
  }
  if (categoryId && CATEGORY_MAP[categoryId]) {
    return CATEGORY_MAP[categoryId].code;
  }
  return fallback;
}

/**
 * Resolve authentic Channel name (e.g. 'Retail', 'Wholesale')
 */
export function resolveChannel(code?: string, typeId?: number | null, fallback = 'Retail'): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.channel) return meta.channel;
  }
  if (typeId === 3) return 'Wholesale';
  if (typeId === 2) return 'Retail';
  return fallback;
}

/**
 * Resolve authentic Channel code (e.g. 'CH002', 'CH003')
 */
export function resolveChannelCode(code?: string, typeId?: number | null, fallback = 'CH002'): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.channelCode) return meta.channelCode;
  }
  if (typeId === 3) return 'CH003';
  return fallback;
}

/**
 * Resolve English outlet name from master
 */
export function resolveOutletEnglishName(code?: string, fallbackBanglaName?: string): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.englishName) return meta.englishName;
  }
  return fallbackBanglaName || 'Retail Outlet';
}

