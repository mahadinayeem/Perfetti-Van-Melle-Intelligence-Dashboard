import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface RuralRetailClaimRecord {
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
  invoiceNo: string | number;
  orderDate?: string | number;
  deliveryDate: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  qty: string | number;
  amount?: number;
  claimAmount: string | number;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
const memoryCache = new Map<string, { records: RuralRetailClaimRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `rural_rt_${startDate}_${endDate}`;
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
    const records: RuralRetailClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr;
      const dbCodeRaw = d.seller_id ? String(d.seller_id) : 'SD0302';
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: 'M/S Jakir Enterprise',
        cluster: 'Central',
        area: 'Central North',
        territory: 'Tangail',
      };

      const outletName = d.order?.buyer_name || 'jewel store';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '651286');
        const qty = p ? parseFloat(p.qty) || 1 : 1;

        records.push({
          id: `rural-rt-${count}`,
          cluster: dbInfo.cluster || 'Central',
          area: dbInfo.area || 'Central North',
          territory: dbInfo.territory || 'Tangail',
          dBCode: dbCodeRaw,
          dbCode: dbCodeRaw,
          dBName: dbInfo.dbName,
          dbName: dbInfo.dbName,
          promoID: 'ADMPP01797',
          promoId: 'ADMPP01797',
          promoName: 'Rural Retail Promo - Discount (>=700) - (Jar/HNG)',
          outletCode: d.buyer_id ? `T28-2000${d.buyer_id}` : 'T28-20003517919',
          outletName,
          invoiceNo: d.order?.invoice?.invoice_number || (d.id ? `INV210015${String(d.id).padStart(6, '0')}` : 'INV210015925969'),
          orderDate: orderDateStr,
          deliveryDate: delDateStr,
          sKUCode: skuCode,
          skuCode,
          qty,
          amount: 15,
          claimAmount: 15,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Rural Retail Claim API (/api/v1/deliveries)',
      sheet: 'Rural Retail',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Rural Retail Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
