import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface SrWiseSkuRecord {
  id: string;
  itemNo: string | number;
  description: string | number;
  unitPriceTp: string | number;
  orderedQty: string | number;
  deliveryQty: string | number;
  returnQty: string | number;
  totalAmountOrder: string | number;
  totalAmountDeliver: string | number;
  totalAmountReturn: string | number;
  discountAmountOrder: string | number;
  discountAmountDelivery: string | number;
  netAmount: string | number;
}

const memoryCache = new Map<string, { records: SrWiseSkuRecord[]; meta: any; timestamp: number }>();
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

    const cacheKey = `sr_wise_sku_${startDate}_${endDate}`;
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

    let records: SrWiseSkuRecord[] = [];

    // Attempt live deliveries fetch to aggregate SKU level metrics
    try {
      const token = await getValidToken();
      const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000,
      });

      const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const skuMap = new Map<string, SrWiseSkuRecord>();

      for (const d of deliveries) {
        if (!Array.isArray(d.products)) continue;
        for (const p of d.products) {
          const itemNo = String(p.product?.base_product?.sku || p.product_id || '').trim();
          if (!itemNo) continue;

          const desc = ((skuCatalogData as any)[itemNo])?.motherSkuName || p.product?.base_product?.name || `SKU ${itemNo}`;
          const tp = parseFloat(p.price) || 0;
          const qty = parseFloat(p.qty) || 0;
          const disc = parseFloat(p.promotion_discount || p.custom_discount) || 0;

          if (!skuMap.has(itemNo)) {
            skuMap.set(itemNo, {
              id: `sr-sku-live-${itemNo}`,
              itemNo,
              description: desc,
              unitPriceTp: tp,
              orderedQty: 0,
              deliveryQty: 0,
              returnQty: 0,
              totalAmountOrder: 0,
              totalAmountDeliver: 0,
              totalAmountReturn: 0,
              discountAmountOrder: 0,
              discountAmountDelivery: 0,
              netAmount: 0,
            });
          }

          const existing = skuMap.get(itemNo)!;
          existing.orderedQty = Number(existing.orderedQty) + qty;
          existing.deliveryQty = Number(existing.deliveryQty) + qty;
          existing.totalAmountOrder = Number(existing.totalAmountOrder) + (tp * qty);
          existing.totalAmountDeliver = Number(existing.totalAmountDeliver) + (tp * qty);
          existing.discountAmountDelivery = Number(existing.discountAmountDelivery) + disc;
          existing.netAmount = Number(existing.totalAmountDeliver) - Number(existing.discountAmountDelivery);
        }
      }

      if (skuMap.size > 0) {
        records = Array.from(skuMap.values());
      }
    } catch (apiErr) {
      console.warn('[SR Wise SKU] Live API fallback:', apiErr);
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & SKU Performance API (/api/v1/deliveries)',
      sheet: 'SR wise SKU Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[SR Wise SKU API Error]:', error);
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        total: 0,
        source: 'sokrio_live_api',
        error: error.message,
      },
    });
  }
}

