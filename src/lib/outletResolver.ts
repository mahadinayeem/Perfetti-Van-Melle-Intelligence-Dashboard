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
  1: { code: 'GS', name: 'General & Grocery Store', subChannel: 'General & Grocery Store' },
  2: { code: 'MT', name: 'Modern Trade Retail', subChannel: 'Modern Trade' },
  3: { code: 'GS', name: 'General & Grocery Store', subChannel: 'General & Grocery Store' },
  4: { code: 'TS', name: 'Tea Plus', subChannel: 'Tea Plus' },
  5: { code: 'GS', name: 'General Store', subChannel: 'General & Grocery Store' },
  6: { code: 'PH', name: 'Pharma Outlet', subChannel: 'General & Grocery Store' },
  7: { code: 'BWS', name: 'Bazar Wholesale', subChannel: 'Bazar Wholesale' },
  8: { code: 'RWS', name: 'Route Wholesale', subChannel: 'Route Wholesale' },
  9: { code: 'GS', name: 'Stand Alone Stores', subChannel: 'General & Grocery Store' },
  10: { code: 'CH', name: 'Chemist Store', subChannel: 'General & Grocery Store' },
  11: { code: 'MT', name: 'Modern Trade', subChannel: 'Modern Trade' },
  12: { code: 'INS', name: 'Institution', subChannel: 'Institution' },
  13: { code: 'STC', name: 'Stockist', subChannel: 'Stockist' },
  14: { code: 'GS', name: 'General & Grocery Store', subChannel: 'General & Grocery Store' },
  15: { code: 'PR', name: 'Premium Outlet', subChannel: 'General & Grocery Store' },
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
    if (meta && meta.subChannel) {
      if (meta.subChannel.toLowerCase().includes('tea')) return 'Tea Plus';
      if (meta.subChannel.toLowerCase().includes('wholesale')) return meta.subChannel;
      return 'General & Grocery Store';
    }
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
 * Convert any Bengali outlet name to clean English
 */
export function sanitizeToEnglishOutlet(rawName: string, code?: string): string {
  if (!rawName) return code ? `Retail Outlet ${code}` : 'Retail Outlet';
  if (!/[\u0980-\u09FF]/.test(rawName)) return rawName.trim();

  let eng = rawName
    .replace(/মেসার্স/g, 'M/S')
    .replace(/স্টোর/g, 'Store')
    .replace(/ষ্টোর/g, 'Store')
    .replace(/ভ্যারাইটিজ/g, 'Varieties')
    .replace(/ভ্যারাইটিস/g, 'Varieties')
    .replace(/কনফেকশনারী/g, 'Confectionery')
    .replace(/ট্রেডার্স/g, 'Traders')
    .replace(/ট্রেডিং/g, 'Trading')
    .replace(/বেকারী/g, 'Bakery')
    .replace(/এন্টারপ্রাইজ/g, 'Enterprise')
    .replace(/টি স্টল/g, 'Tea Stall')
    .replace(/জেনারেল স্টোর/g, 'General Store')
    .replace(/হোটেল/g, 'Hotel')
    .replace(/ফার্মেসী/g, 'Pharmacy')
    .replace(/ডিপার্টমেন্টাল/g, 'Departmental')
    .replace(/ব্রাদার্স/g, 'Brothers')
    .replace(/সুপার শপ/g, 'Super Shop')
    .replace(/মার্ট/g, 'Mart');

  if (/[\u0980-\u09FF]/.test(eng)) {
    return code ? `Outlet ${code} Store` : 'Retail Store';
  }
  return eng.trim();
}

/**
 * Resolve English outlet name strictly with 0 Bengali characters
 */
export function resolveOutletEnglishName(code?: string, fallbackBanglaName?: string): string {
  if (code) {
    const meta = getOutletMeta(code);
    if (meta && meta.englishName && !/[\u0980-\u09FF]/.test(meta.englishName)) {
      return meta.englishName;
    }
  }
  return sanitizeToEnglishOutlet(fallbackBanglaName || '', code);
}

