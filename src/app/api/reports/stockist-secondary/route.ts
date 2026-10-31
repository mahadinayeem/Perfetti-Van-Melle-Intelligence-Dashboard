import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface StockistSecondaryRecord {
  id: string;
  date: string;
  cluster: string;
  area: string;
  territory: string;
  teTsoName: string;
  teTsoCode: string | number;
  type: string;
  superDbCode: string;
  superDbName: string;
  stockiestPositionCode: string;
  stockiestPositionName: string;
  stockiestDbCode: string | number;
  stockiestDbName: string;
  brand: string;
  skuCode: string | number;
  skuName: string;
  uom: string;
  openingStock: number | string;
  closingStock: number | string;
  secondarySales: number | string;
  secondarySalesValue: number | string;
  secondarySalesTon: number | string;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: StockistSecondaryRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;



async function fetchLiveStockistSecondary(startDate: string, endDate: string): Promise<StockistSecondaryRecord[]> {
  const token = await getValidToken();

  // 1. Fetch live stock per SKU
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';
  const stocksRes = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = stocksRes.data?.stocks || (Array.isArray(stocksRes.data?.data) ? stocksRes.data.data : []);
  if (stocks.length === 0) return [];

  // 2. Fetch live secondary sales orders
  const salesMap = new Map<string, { qty: number; value: number }>();
  try {
    const orderUrl = `https://pvm.report.sokrio.com/api/v3/order-summary-export?range=${startDate}%2C${endDate}&territory_id=1&download&type=xlsx`;
    const orderRes = await axios.get(orderUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const wbOrder = XLSX.read(orderRes.data, { type: 'buffer' });
    const orderRaw: any[][] = XLSX.utils.sheet_to_json(wbOrder.Sheets[wbOrder.SheetNames[0]], { header: 1 }) || [];
    if (orderRaw.length > 4) {
      const headers = orderRaw[3] || [];
      const rows = orderRaw.slice(4);
      rows.forEach(r => {
        const skuIdx = headers.findIndex((h: any) => String(h || '').trim() === 'Product SKU');
        const qtyIdx = headers.findIndex((h: any) => String(h || '').trim() === 'Order Quantity');
        const amtIdx = headers.findIndex((h: any) => String(h || '').trim() === 'Amount');

        const sku = String(r[skuIdx] || '').trim();
        const qty = Number(r[qtyIdx] || 0);
        const amt = Number(r[amtIdx] || 0);

        if (sku) {
          if (!salesMap.has(sku)) salesMap.set(sku, { qty: 0, value: 0 });
          const curr = salesMap.get(sku)!;
          curr.qty += qty;
          curr.value += amt;
        }
      });
    }
  } catch (err) {
    console.warn('[Stockist Secondary] Could not fetch secondary order export:', err);
  }

  const records: StockistSecondaryRecord[] = [];
  const processedSkus = new Set<string>();

  for (const st of stocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const catalog = SKU_CATALOG[skuCode] || {};
    const skuName = String(baseProd.name || catalog.motherSkuName || `SKU ${skuCode}`);
    const brand = catalog.brand || (skuName.split(' ')[0] || 'Perfetti');
    const uom = catalog.uom || (skuName.toLowerCase().includes('jar') ? 'JAR' : 'BOX');

    const closingStock = Number(st.qty || 0);
    const sales = salesMap.get(skuCode) || { qty: 0, value: 0 };
    const secondarySales = sales.qty;
    const secondarySalesValue = Math.round(sales.value);
    const openingStock = closingStock + secondarySales;

    // Weight per unit for ton calculation
    const weightGm = catalog.weightperSKUgm || (uom === 'JAR' ? 560 : 350);
    const secondarySalesTon = Number(((secondarySales * weightGm) / 1000000).toFixed(5));

    records.push({
      id: `stk-sec-live-${skuCode}`,
      date: startDate,
      cluster: 'Central',
      area: 'Central South',
      territory: 'Jatra Bari',
      teTsoName: 'Palash Chandra Karmakar',
      teTsoCode: 5104,
      type: 'TE',
      superDbCode: '',
      superDbName: '',
      stockiestPositionCode: '',
      stockiestPositionName: '',
      stockiestDbCode: 102267,
      stockiestDbName: 'M/S Ahamed Enterprise',
      brand,
      skuCode: Number(skuCode) || skuCode,
      skuName,
      uom,
      openingStock,
      closingStock,
      secondarySales,
      secondarySalesValue,
      secondarySalesTon,
    });
  }

  return records;
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

    const cacheKey = `stk_sec_${startDate}_${endDate}`;
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

    let records = await fetchLiveStockistSecondary(startDate, endDate);
    let source = 'sokrio_live_api';

    const meta = {
      totalRecords: records.length,
      startDate,
      endDate,
      source,
    };

    memoryCache.set(cacheKey, {
      records,
      meta,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: records,
      meta,
      cached: false,
    });
  } catch (error: any) {
    console.error('[Stockist Secondary Report API Error]:', error);
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        totalRecords: 0,
        source: 'sokrio_live_api',
        error: error.message,
      },
      cached: false,
    });
  }
}
