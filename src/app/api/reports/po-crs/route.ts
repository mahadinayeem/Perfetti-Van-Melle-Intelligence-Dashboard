import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface PoCrsRecord {
  id: string;
  distributorId: string | number;
  distributorName: string;
  skuCode: string | number;
  skuName: string;
  suggestedQty: string | number;
  amount: string | number;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: PoCrsRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;



async function fetchLiveStocksFromSokrio(): Promise<PoCrsRecord[]> {
  const token = await getValidToken();
  // Fetch live distributor inventory for department 3249 (M/S Ahamed Enterprise - DB Code 102267)
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?department_id=3249&per_page=250';

  const res = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = res.data?.stocks || (Array.isArray(res.data?.data) ? res.data.data : []);
  if (stocks.length === 0) return [];

  const records: PoCrsRecord[] = [];
  const processedSkus = new Set<string>();

  for (const st of stocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const skuName = resolveEnglishSkuName(skuCode, baseProd.name);
    const dept = st.department || {};
    // Ensure distributor ID & Name strictly map to Distributor (not Central Warehouse depot)
    const distributorId = (dept.code && String(dept.code) !== '101') ? String(dept.code) : '102267';
    const distributorName = (dept.name && dept.name !== 'Central Warehouse') ? dept.name : 'M/S Ahamed Enterprise';

    records.push({
      id: `crs-live-${skuCode}`,
      distributorId,
      distributorName,
      skuCode: Number(skuCode) || skuCode,
      skuName,
      suggestedQty: '', // SAP Continuous Replenishment System (CRS) algorithm is ERP-managed -> blank per rule
      amount: '',       // SAP CRS replenishment value is ERP-managed -> blank per rule
    });
  }

  return records;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = `po_crs_data`;
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

    let records = await fetchLiveStocksFromSokrio();
    let source = 'sokrio_live_api';

    const meta = {
      totalRecords: records.length,
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
    console.error('[PO CRS Report API Error]:', error);
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
