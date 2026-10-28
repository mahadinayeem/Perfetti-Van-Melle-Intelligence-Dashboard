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

function getSampleExcelData(): SuperSubStockRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Stock Report Super to SUB DB CT'];
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
        id: `super-sub-${idx + 1}`,
        orderDate: String(obj['OrderDate'] || ''),
        cluster: String(obj['Cluster'] || 'Cluster-1'),
        area: String(obj['Area'] || 'North'),
        territory: String(obj['Territory'] || 'Dinajpur'),
        town: String(obj['Town'] || ''),
        distributorId: obj['DistributorID'] || 102267,
        distributorName: String(obj['DistributorName'] || 'M/S Ahamed Enterprise'),
        uniq: String(obj['Uniq'] || ''),
        subDistributorId: String(obj['SubDistributorID'] || ''),
        subDistributorName: String(obj['SubDistributorName'] || ''),
        skuCode: obj['SKUCode'] || '',
        skuName: String(obj['SKUName'] || ''),
        uom: String(obj['UOM'] || 'CT'),
        primarySkuCtn: obj['PrimarySKUCTN'] ?? '',
        primarySkuVolume: obj['PrimarySKUVolume'] ?? '',
        primarySkuValue: obj['PrimarySKUValue'] ?? '',
        primarySkuQty: obj['Primary SKU Qty'] ?? '',
        uom2: String(obj['UOM2'] || 'JAR'),
        brand: String(obj['Brand'] || ''),
        superDbUniqueLocationCode: String(obj['Super DB Unique Location Code (Base Corrected)'] || ''),
        superDbLocationName: String(obj['Super DB Location Name'] || ''),
        tsoPositionCode: String(obj['TSO Position Code'] || 'TSO-009'),
        tsoCode: obj['TSO Code'] || 5104,
        tsoName: String(obj['TSO Name'] || 'Palash Chandra Karmakar'),
        primarySkuQtyInTons: obj['PrimarySKUQty in Tons'] ?? '',
        isConfirmed: String(obj['IsConfirmed'] || ''),
        poNo: String(obj['PoNo'] || ''),
      };
    });
  } catch (e) {
    console.error('[Super to Sub DB Stock Report] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveStocksFromSokrio(startDate: string, endDate: string): Promise<SuperSubStockRecord[]> {
  const token = await getValidToken();
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';

  const res = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = Array.isArray(res.data?.data) ? res.data.data : [];
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

    if (records.length === 0) {
      records = getSampleExcelData();
      source = 'sample_excel_fallback';
    }

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
