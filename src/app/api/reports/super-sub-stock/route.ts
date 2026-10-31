import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface SuperSubStockRecord {
  id: string;
  orderDate: string;
  cluster: string;
  area: string;
  territory: string;
  town: string;
  distributorId: string | number;
  distributorName: string;
  uniq: string;
  subDistributorId: string;
  subDistributorName: string;
  skuCode: string | number;
  skuName: string;
  uom: string;
  primarySkuCtn: string | number;
  primarySkuVolume: string | number;
  primarySkuValue: string | number;
  primarySkuQty: string | number;
  uom2: string;
  brand: string;
  superDbUniqueLocationCode: string;
  superDbLocationName: string;
  tsoPositionCode: string;
  tsoCode: string | number;
  tsoName: string;
  primarySkuQtyInTons: string | number;
  isConfirmed: string;
  poNo: string;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: SuperSubStockRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;



async function fetchLiveStocksFromSokrio(startDate: string, endDate: string): Promise<SuperSubStockRecord[]> {
  const token = await getValidToken();
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';

  const res = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = res.data?.stocks || (Array.isArray(res.data?.data) ? res.data.data : []);
  if (stocks.length === 0) return [];

  const records: SuperSubStockRecord[] = [];
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
    const uom2 = catalog.uom || (skuName.toLowerCase().includes('jar') ? 'JAR' : 'BOX');
    const dept = st.department || {};
    const distributorId = dept.code || 102267;
    const distributorName = dept.name || 'M/S Ahamed Enterprise';

    records.push({
      id: `super-sub-live-${skuCode}`,
      orderDate: startDate,
      cluster: 'Central',
      area: 'Central South',
      territory: 'Jatra Bari',
      town: '',
      distributorId,
      distributorName,
      uniq: '',
      subDistributorId: '',
      subDistributorName: '',
      skuCode: Number(skuCode) || skuCode,
      skuName,
      uom: 'CT',
      primarySkuCtn: '',
      primarySkuVolume: '',
      primarySkuValue: '',
      primarySkuQty: '',
      uom2,
      brand,
      superDbUniqueLocationCode: '',
      superDbLocationName: '',
      tsoPositionCode: 'TSO-009',
      tsoCode: 5104,
      tsoName: 'Palash Chandra Karmakar',
      primarySkuQtyInTons: '',
      isConfirmed: '',
      poNo: '',
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

    const cacheKey = `super_sub_${startDate}_${endDate}`;
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

    let records = await fetchLiveStocksFromSokrio(startDate, endDate);
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
    console.error('[Super to Sub DB Stock Report API Error]:', error);
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
