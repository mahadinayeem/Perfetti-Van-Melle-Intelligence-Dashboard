import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import axios from 'axios';

export interface DoReceivingStatusRecord {
  id?: string;
  cluster: string;
  area: string;
  territory: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  poDateTime: string;
  poNumber: string;
  invoiceNo: string;
  invoiceDateTime: string;
  docType: string;
  doReceivingDateTime: string;
  brand: string;
  skuCode: string | number;
  skuName: string;
  uom: string;
  sapQtyCtn: string | number;
  sapQtyPcs: string | number;
  sapValueDBLanding: string | number;
  sapTon: string | number;
  dbReceivedQtyCtn: string | number;
  dbReceivedQtyPcs: string | number;
  dbReceivedValueDBLanding: string | number;
  dbReceivedTon: string | number;
  doReceivingStatus: string;
}

interface CacheEntry {
  records: DoReceivingStatusRecord[];
  meta: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;
const SKU_CATALOG: Record<string, any> = skuCatalogData as any;

async function fetchLiveDoReceivingFromSokrio(startDate: string, endDate: string): Promise<DoReceivingStatusRecord[]> {
  const token = await getValidToken();

  // 1. Fetch live distributor stocks to get active SKUs & department details
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';
  const stocksRes = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30000,
  });

  const rawStocks: any[] = stocksRes.data?.stocks || [];
  const records: DoReceivingStatusRecord[] = [];
  const processedSkus = new Set<string>();

  for (const st of rawStocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const catalog = SKU_CATALOG[skuCode] || {};
    const skuName = String(baseProd.name || `SKU ${skuCode}`);
    const brand = catalog.brand || (skuName.split(' ')[0] || 'Perfetti');
    const uom = catalog.uom || (st.product?.full_name?.toLowerCase().includes('jar') ? 'JAR' : 'BOX');

    const dept = st.department || {};
    const dbCode = dept.code || 102267;
    const dbName = dept.name || 'M/S Ahamed Enterprise';

    // Columns present in live Sokrio API have real data.
    // Columns that belong to SAP Primary Sales (which are currently disconnected/unavailable in Sokrio)
    // are left blank as requested.
    records.push({
      id: `do-rec-${skuCode}`,
      cluster: 'Central',
      area: 'Central South',
      territory: 'Jatra Bari',
      dbCode,
      dbName,
      dbType: '',
      poDateTime: '',
      poNumber: '',
      invoiceNo: '',
      invoiceDateTime: '',
      docType: '',
      doReceivingDateTime: '',
      brand,
      skuCode: Number(skuCode) || skuCode,
      skuName,
      uom,
      sapQtyCtn: '',
      sapQtyPcs: '',
      sapValueDBLanding: '',
      sapTon: '',
      dbReceivedQtyCtn: '',
      dbReceivedQtyPcs: '',
      dbReceivedValueDBLanding: '',
      dbReceivedTon: '',
      doReceivingStatus: '',
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

    const cacheKey = `do_rec_${startDate}_${endDate}`;
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

    const records = await fetchLiveDoReceivingFromSokrio(startDate, endDate);

    const meta = {
      totalRecords: records.length,
      totalSkus: records.length,
      startDate,
      endDate,
      source: 'sokrio_live_api',
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
    console.error('[DO Receiving Status API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch DO receiving status from Sokrio API',
        data: [],
      },
      { status: 500 }
    );
  }
}
