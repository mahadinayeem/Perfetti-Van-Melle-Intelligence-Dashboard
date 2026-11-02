import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

function formatDDMMYYYY(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      if (parts[0].length === 4) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return s;
}

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
      const dbCodeRaw = (d.seller_id && String(d.seller_id) === '3249') ? '102267' : (d.seller?.code ? String(d.seller.code) : '102267');
      const dbInfo = DB_MAP[dbCodeRaw] || {
        dbCode: dbCodeRaw,
        dbName: d.seller_name || 'M/S Ahamed Enterprise',
        cluster: 'Central',
        area: 'Central South',
        territory: d.order?.buyer_territory_name || 'Jatra Bari',
      };

      const outletName = d.order?.buyer_name || d.buyer_name || '';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const qty = p ? parseFloat(p.qty) || 0 : 0;
        const outletCode = d.buyer_id ? String(d.buyer_id) : (d.buyer?.code ? String(d.buyer.code) : '');
        const invNo = d.order?.invoice?.invoice_number || d.code || (d.id ? `INV-${d.id}` : '');

        records.push({
          id: `rural-rt-${count}`,
          cluster: dbInfo.cluster || 'Central',
          area: dbInfo.area || 'Central North',
          territory: dbInfo.territory || '',
          dBCode: dbCodeRaw,
          dbCode: dbCodeRaw,
          dBName: dbInfo.dbName || '',
          dbName: dbInfo.dbName || '',
          promoID: 'ADMPP01797',
          promoId: 'ADMPP01797',
          promoName: 'Rural Retail Promo - Discount (>=700) - (Jar/HNG)',
          outletCode,
          outletName,
          invoiceNo: invNo,
          orderDate: orderDateStr ? formatDDMMYYYY(orderDateStr) : '',
          deliveryDate: delDateStr ? formatDDMMYYYY(delDateStr) : '',
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
