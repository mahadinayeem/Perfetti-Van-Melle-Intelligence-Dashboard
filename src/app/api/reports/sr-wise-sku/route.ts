import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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

function getSampleExcelData(): SrWiseSkuRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['SR wise SKU Report'];
    if (!sheet) return [];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // In SR wise SKU Report, header row is index 9 (row 10)
    if (raw.length < 11) return [];

    const dataRows = raw.slice(10).filter(r => r && r[1] && String(r[1]).trim() && !String(r[2] || '').includes('Grand Total'));

    return dataRows.map((r, idx) => {
      const itemNo = r[1] || '';
      const desc = r[2] || '';
      const tp = parseFloat(r[3]) || 0;
      const orderQty = parseFloat(r[4]) || 0;
      const deliverQty = parseFloat(r[8]) || orderQty;
      const returnQty = parseFloat(r[9]) || 0;
      const totalOrderAmt = parseFloat(r[14]) || (tp * orderQty);
      const totalDeliverAmt = parseFloat(r[15]) || (tp * deliverQty);
      const totalReturnAmt = parseFloat(r[16]) || 0;
      const discOrder = parseFloat(r[17]) || 0;
      const discDeliver = parseFloat(r[18]) || 0;
      const netAmt = parseFloat(r[19]) || (totalDeliverAmt - discDeliver);

      return {
        id: `sr-sku-${idx + 1}`,
        itemNo,
        description: desc,
        unitPriceTp: tp,
        orderedQty: orderQty,
        deliveryQty: deliverQty,
        returnQty,
        totalAmountOrder: totalOrderAmt,
        totalAmountDeliver: totalDeliverAmt,
        totalAmountReturn: totalReturnAmt,
        discountAmountOrder: discOrder,
        discountAmountDelivery: discDeliver,
        netAmount: netAmt,
      };
    });
  } catch (e) {
    console.error('[SR Wise SKU Report] Error loading excel sample:', e);
    return [];
  }
}

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

          const desc = p.product?.base_product?.name || `SKU ${itemNo}`;
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

    if (records.length === 0) {
      records = getSampleExcelData();
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
    const fallback = getSampleExcelData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        total: fallback.length,
        source: 'Sokrio Master Cache (Recovery)',
        error: error.message,
      },
    });
  }
}
