import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

function formatDelDate(val: any): string {
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  }
  return String(val);
}

export const dynamic = 'force-dynamic';

export interface RuralWsClaimRecord {
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
  disPer: string | number;
  outletCode: string | number;
  outletName: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  qty: string | number;
  percentageDiscount: string | number;
  totalInvoiceDiscount?: number;
  totalInvoiceAmount?: number;
  amount?: number;
  claimAmount: string | number;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};
const memoryCache = new Map<string, { records: RuralWsClaimRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `rural_ws_${startDate}_${endDate}`;
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
    const records: RuralWsClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
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
        const tp = p ? parseFloat(p.price) || 0 : 0;
        const discVal = Math.round(qty * tp * 0.03);
        const outletCode = d.buyer_id ? String(d.buyer_id) : (d.buyer?.code ? String(d.buyer.code) : '');
        const invNo = d.order?.invoice?.invoice_number || d.code || (d.id ? `INV-${d.id}` : '');

        records.push({
          id: `rural-ws-${count}`,
          cluster: dbInfo.cluster || 'Central',
          area: dbInfo.area || 'Central South',
          territory: dbInfo.territory || '',
          dBCode: dbCodeRaw,
          dbCode: dbCodeRaw,
          dBName: dbInfo.dbName || '',
          dbName: dbInfo.dbName || '',
          promoID: '',
          promoId: 'ADMPP01803',
          promoName: 'ALP CREAMFILLS Box (Min Ord Qty 15pcs) get-3% discount',
          disPer: '3%',
          outletCode,
          outletName,
          invoiceNo: invNo,
          deliveryDate: formatDelDate(delDateStr),
          sKUCode: skuCode,
          skuCode,
          qty,
          percentageDiscount: '3%',
          totalInvoiceDiscount: discVal,
          totalInvoiceAmount: Math.round(qty * tp),
          amount: Math.round(qty * tp),
          claimAmount: discVal,
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Rural WS Claim API (/api/v1/deliveries)',
      sheet: 'Rural WS',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Rural WS Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
