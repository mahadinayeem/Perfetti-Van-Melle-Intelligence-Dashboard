import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
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

function getSampleExcelData(): PoCrsRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['PO CRS Report'];
    if (!sheet) return [];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (raw.length < 2) return [];

    const headers = raw[0].map(h => String(h || '').trim());
    return raw.slice(1).map((r, idx) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = r[colIdx];
      });
      return {
        id: `crs-${idx + 1}`,
        distributorId: obj['DistributorID'] || 102267,
        distributorName: String(obj['DistributorName'] || 'M/S Ahamed Enterprise'),
        skuCode: obj['SKU Code'] || '',
        skuName: String(obj['SKU Name'] || ''),
        suggestedQty: obj['SuggestedQty'] ?? '',
        amount: obj['Amount'] ?? '',
      };
    });
  } catch (e) {
    console.error('[PO CRS Report] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveStocksFromSokrio(): Promise<PoCrsRecord[]> {
  const token = await getValidToken();
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';

  const res = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = Array.isArray(res.data?.data) ? res.data.data : [];
  if (stocks.length === 0) return [];

  const records: PoCrsRecord[] = [];
  const processedSkus = new Set<string>();

  for (const st of stocks) {
    const baseProd = st.product?.base_product;
    if (!baseProd) continue;

    const skuCode = String(baseProd.sku || st.product_id || '').trim();
    if (!skuCode || processedSkus.has(skuCode)) continue;
    processedSkus.add(skuCode);

    const catalog = SKU_CATALOG[skuCode] || {};
    const skuName = String(baseProd.name || catalog.motherSkuName || `SKU ${skuCode}`);
    const dept = st.department || {};
    const distributorId = dept.code || 102267;
    const distributorName = dept.name || 'M/S Ahamed Enterprise';

    records.push({
      id: `crs-live-${skuCode}`,
      distributorId,
      distributorName,
      skuCode: Number(skuCode) || skuCode,
      skuName,
      suggestedQty: '', // SAP CRS suggested qty not in live API -> blank
      amount: '',       // SAP CRS suggested amount not in live API -> blank
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

    if (records.length === 0) {
      records = getSampleExcelData();
      source = 'sample_excel_fallback';
    }

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
    const fallback = getSampleExcelData();
    return NextResponse.json({
      success: true,
      data: fallback,
      meta: {
        totalRecords: fallback.length,
        source: 'sample_excel_error_fallback',
        error: error.message,
      },
      cached: false,
    });
  }
}
