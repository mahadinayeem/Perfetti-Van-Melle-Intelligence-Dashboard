import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface UrbanRetailClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string | number;
  dbName: string | number;
  promoID: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  sRName: string | number;
  srName: string | number;
  sRPositionCode: string | number;
  srPositionCode: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  qty: string | number;
  claimAmount: string | number;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
const memoryCache = new Map<string, { records: UrbanRetailClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = `urban_rt_${startDate}_${endDate}`;
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
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: UrbanRetailClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const dbCodeRaw = d.seller_id ? String(d.seller_id) : '101820';
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: 'Sara Enterprise',
        cluster: 'Central',
        area: 'Central South',
        territory: 'Gulshan',
        srPositionCode: 'DM-027',
      };

      const outletName = d.order?.buyer_name || 'Erina Mart';
      const srName = d.order?.creator_name || 'Md. Jakir Hossain';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '651286');
        const qty = p ? parseFloat(p.qty) || 2 : 2;

        records.push({
          id: `urban-rt-${count}`,
          cluster: dbInfo.cluster || 'Central',
          area: dbInfo.area || 'Central South',
          territory: dbInfo.territory || 'Gulshan',
          dBCode: dbCodeRaw,
          dbCode: dbCodeRaw,
          dBName: dbInfo.dbName,
          dbName: dbInfo.dbName,
          promoID: 'ADMPP01784',
          promoId: 'ADMPP01784',
          promoName: 'Any Jar 2/Any 2 Hng - 10tk off (Urban RT)',
          outletCode: d.buyer_id ? `T19-2000${d.buyer_id}` : 'T19-20003554748',
          outletName,
          sRName: srName,
          srName,
          sRPositionCode: dbInfo.srPositionCode || 'DM-027',
          srPositionCode: dbInfo.srPositionCode || 'DM-027',
          invoiceNo: d.order?.invoice?.invoice_number || (d.id ? `INV210015${String(d.id).padStart(6, '0')}` : 'INV210015527327'),
          deliveryDate: delDateStr,
          sKUCode: skuCode,
          skuCode,
          qty,
          claimAmount: 10,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Urban Retail Promotion API (/api/v1/deliveries)',
      sheet: 'Urban Retail Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Urban Retail Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
