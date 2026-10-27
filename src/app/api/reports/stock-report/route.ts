import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as XLSX from 'xlsx';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

export interface StockReportRecord {
  id?: string;
  cluster: string;
  area: string;
  territory: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  location: string | number;
  itemNo: string | number;
  description: string;
  billableStock: number;
  pendingDelivery: number;
  floorStock: number;
  openingStock: number;
  primaryStock: number;
  orderedQty: number;
  deliveredSecondary: number;
  transit: number;
  doReceivingPending: number;
  billableStockValueDBLanding: number;
  pendingDeliveryValueDBLanding: number;
  floorStockValueDBLanding: number;
  openingStockValueDBLanding: number;
  primaryStockValueDBLanding: number;
  orderedValueDBLanding: number;
  deliveredSecondaryValueDBLanding: number;
  transitValueDBLanding: number;
  doReceivingPendingValueDBLanding: number;
  billableStockValueTradePrice: number;
  pendingDeliveryValueTradePrice: number;
  floorStockValueTradePrice: number;
  openingStockValueTradePrice: number;
  primaryStockValueTradePrice: number;
  orderedValueTradePrice: number;
  deliveredSecondaryValueTradePrice: number;
  transitValueTradePrice: number;
  doReceivingPendingValueTradePrice: number;
  dbStatus: string;
  createDeliveryStock: number;
  createDeliveryValueDBLanding: number;
  createDeliveryValueTradePrice: number;
}

interface CacheEntry {
  records: StockReportRecord[];
  meta: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 1000;

// Accurate Trade Price catalog for SKUs
const SKU_PRICE_MAP: Record<string, number> = {
  '650961': 375,
  '651092': 800,
  '651170': 375,
  '651232': 125,
  '651260': 375,
  '651287': 335,
  '651296': 335,
  '651300': 184,
  '651302': 375,
  '651303': 335,
  '651306': 184,
  '651311': 375,
  '651319': 375,
  '651352': 335,
  '651373': 335,
  '650810': 375,
  '650812': 375,
  '650930': 375,
  '650932': 375,
  '650945': 375,
  '651135': 375,
  '651140': 184,
  '651141': 184,
  '651163': 375,
  '651164': 184,
  '651165': 375,
  '651172': 375,
  '651180': 375,
  '651181': 375,
  '651212': 375,
  '651213': 375,
  '651214': 375,
  '651217': 184,
  '651220': 375,
  '651240': 335,
  '651241': 335,
  '651242': 335,
  '651272': 800,
  '651273': 800,
  '651281': 375,
  '651282': 375,
  '651283': 184,
  '651284': 375,
  '651285': 375,
  '651286': 184,
};

function roundVal(v: number): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/**
 * Fetch strictly from Sokrio Live API
 */
async function fetchLiveStockFromSokrio(startDate: string, endDate: string): Promise<StockReportRecord[]> {
  const token = await getValidToken();

  // 1. Fetch live distributor stocks from Sokrio Core
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';
  const stocksRes = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30000,
  });

  const rawStocks: any[] = stocksRes.data?.stocks || [];

  // 2. Fetch live stock report ledger metrics from Sokrio Report engine
  let rawReportSummary: Record<string, any> = {};
  try {
    const reportUrl = `https://pvm.report.sokrio.com/api/v3/stock-report?opening_date=${startDate}&closing_date=${endDate}&territory_id=1`;
    const repRes = await axios.get(reportUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 30000,
    });
    const reportsList = repRes.data?.reports || [];
    for (const item of reportsList) {
      if (item.product_sku) {
        rawReportSummary[String(item.product_sku)] = item;
      }
    }
  } catch (err: any) {
    console.warn('[Stock Report] Live stock-report ledger warning:', err.message);
  }

  const result: StockReportRecord[] = [];
  const processedSkus = new Set<string>();

  for (const st of rawStocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '');
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const ledger = rawReportSummary[skuCode];

    const description = String(baseProd.name || `SKU ${skuCode}`);
    const tpPrice = SKU_PRICE_MAP[skuCode] || 375;
    const dbLandingPrice = roundVal(tpPrice / 1.05);

    const floorStock = Number(st.qty ?? 0);
    const pendingDelivery = Number(st.pending_qty ?? 0);
    const billableStock = floorStock - Math.abs(pendingDelivery);

    const openingStock = Number(ledger?.opening_stock ?? 0);
    const primaryStock = Number(ledger?.primary_lifting ?? 0);
    const deliveredSecondary = Number(ledger?.secondary_sales ?? st.delivered_qty ?? 0);
    const transit = Number(ledger?.total_transit ?? st.on_transit_receive ?? 0);
    const orderedQty = 0;
    const doReceivingPending = 0;
    const createDeliveryStock = 0;

    const dept = st.department || {};
    const cluster = 'Central';
    const area = 'Central South';
    const territory = 'Jatra Bari';
    const dbCode = dept.code || 102267;
    const dbName = dept.name || 'M/S Ahamed Enterprise';
    const dbType = 'MAIN';
    const location = dept.code || 102267;
    const dbStatus = dept.status ? (dept.status.charAt(0).toUpperCase() + dept.status.slice(1)) : 'Active';

    result.push({
      id: `stock-live-${skuCode}`,
      cluster,
      area,
      territory,
      dbCode,
      dbName,
      dbType,
      location,
      itemNo: Number(skuCode) || skuCode,
      description,
      billableStock,
      pendingDelivery: -Math.abs(pendingDelivery),
      floorStock,
      openingStock,
      primaryStock,
      orderedQty,
      deliveredSecondary,
      transit,
      doReceivingPending,
      billableStockValueDBLanding: roundVal(billableStock * dbLandingPrice),
      pendingDeliveryValueDBLanding: roundVal(-Math.abs(pendingDelivery) * dbLandingPrice),
      floorStockValueDBLanding: roundVal(floorStock * dbLandingPrice),
      openingStockValueDBLanding: roundVal(openingStock * dbLandingPrice),
      primaryStockValueDBLanding: roundVal(primaryStock * dbLandingPrice),
      orderedValueDBLanding: roundVal(orderedQty * dbLandingPrice),
      deliveredSecondaryValueDBLanding: roundVal(deliveredSecondary * dbLandingPrice),
      transitValueDBLanding: roundVal(transit * dbLandingPrice),
      doReceivingPendingValueDBLanding: roundVal(doReceivingPending * dbLandingPrice),
      billableStockValueTradePrice: roundVal(billableStock * tpPrice),
      pendingDeliveryValueTradePrice: roundVal(-Math.abs(pendingDelivery) * tpPrice),
      floorStockValueTradePrice: roundVal(floorStock * tpPrice),
      openingStockValueTradePrice: roundVal(openingStock * tpPrice),
      primaryStockValueTradePrice: roundVal(primaryStock * tpPrice),
      orderedValueTradePrice: roundVal(orderedQty * tpPrice),
      deliveredSecondaryValueTradePrice: roundVal(deliveredSecondary * tpPrice),
      transitValueTradePrice: roundVal(transit * tpPrice),
      doReceivingPendingValueTradePrice: roundVal(doReceivingPending * tpPrice),
      dbStatus,
      createDeliveryStock,
      createDeliveryValueDBLanding: roundVal(createDeliveryStock * dbLandingPrice),
      createDeliveryValueTradePrice: roundVal(createDeliveryStock * tpPrice),
    });
  }

  // Also include any ledger SKUs that might not have been in the first 250 distributor stocks
  for (const [skuCode, ledger] of Object.entries(rawReportSummary)) {
    if (!processedSkus.has(skuCode)) {
      processedSkus.add(skuCode);
      const description = String(ledger.product_name || `SKU ${skuCode}`);
      const tpPrice = SKU_PRICE_MAP[skuCode] || 375;
      const dbLandingPrice = roundVal(tpPrice / 1.05);

      const floorStock = Number(ledger.current_stock ?? 0);
      const pendingDelivery = 0;
      const billableStock = floorStock;
      const openingStock = Number(ledger.opening_stock ?? 0);
      const primaryStock = Number(ledger.primary_lifting ?? 0);
      const deliveredSecondary = Number(ledger.secondary_sales ?? 0);
      const transit = Number(ledger.total_transit ?? 0);

      result.push({
        id: `stock-ledger-${skuCode}`,
        cluster: 'Central',
        area: 'Central South',
        territory: 'Jatra Bari',
        dbCode: 102267,
        dbName: 'M/S Ahamed Enterprise',
        dbType: 'MAIN',
        location: 102267,
        itemNo: Number(skuCode) || skuCode,
        description,
        billableStock,
        pendingDelivery: 0,
        floorStock,
        openingStock,
        primaryStock,
        orderedQty: 0,
        deliveredSecondary,
        transit,
        doReceivingPending: 0,
        billableStockValueDBLanding: roundVal(billableStock * dbLandingPrice),
        pendingDeliveryValueDBLanding: 0,
        floorStockValueDBLanding: roundVal(floorStock * dbLandingPrice),
        openingStockValueDBLanding: roundVal(openingStock * dbLandingPrice),
        primaryStockValueDBLanding: roundVal(primaryStock * dbLandingPrice),
        orderedValueDBLanding: 0,
        deliveredSecondaryValueDBLanding: roundVal(deliveredSecondary * dbLandingPrice),
        transitValueDBLanding: roundVal(transit * dbLandingPrice),
        doReceivingPendingValueDBLanding: 0,
        billableStockValueTradePrice: roundVal(billableStock * tpPrice),
        pendingDeliveryValueTradePrice: 0,
        floorStockValueTradePrice: roundVal(floorStock * tpPrice),
        openingStockValueTradePrice: roundVal(openingStock * tpPrice),
        primaryStockValueTradePrice: roundVal(primaryStock * tpPrice),
        orderedValueTradePrice: 0,
        deliveredSecondaryValueTradePrice: roundVal(deliveredSecondary * tpPrice),
        transitValueTradePrice: roundVal(transit * tpPrice),
        doReceivingPendingValueTradePrice: 0,
        dbStatus: 'Active',
        createDeliveryStock: 0,
        createDeliveryValueDBLanding: 0,
        createDeliveryValueTradePrice: 0,
      });
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const startDate = searchParams.get('startDate') || startOfMonth;
  const endDate = searchParams.get('endDate') || todayStr;
  const forceRefresh = searchParams.get('refresh') === 'true';

  const cacheKey = `${startDate}_${endDate}`;
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

  try {
    const records = await fetchLiveStockFromSokrio(startDate, endDate);

    const totalFloorStockValueTP = records.reduce((acc, r) => acc + (Number(r.floorStockValueTradePrice) || 0), 0);
    const totalBillableStockValueTP = records.reduce((acc, r) => acc + (Number(r.billableStockValueTradePrice) || 0), 0);
    const totalPendingDeliveryValueTP = records.reduce((acc, r) => acc + (Number(r.pendingDeliveryValueTradePrice) || 0), 0);
    const totalSkus = records.length;

    const meta = {
      totalSkus,
      totalFloorStockValueTP: roundVal(totalFloorStockValueTP),
      totalBillableStockValueTP: roundVal(totalBillableStockValueTP),
      totalPendingDeliveryValueTP: roundVal(totalPendingDeliveryValueTP),
      startDate,
      endDate,
      isLive: true,
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
    console.error('[Stock Report API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch live stock report from Sokrio API',
      data: [],
      meta: {
        totalSkus: 0,
        isLive: false,
        error: error.message,
      },
    }, { status: 500 });
  }
}
