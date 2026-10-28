import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import skuCatalogData from '@/lib/skuCatalog.json';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface ApprovedPoListingRecord {
  id: string;
  poNumber: string;
  poDate: string;
  poCreationTime: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  skuCode: string | number;
  skuName: string;
  poQuantity: string | number;
  valueInDbLanding: string | number;
  approvedBy: string;
  approvedDateTime: string;
  status: string;
  createConfirmDateTime: string;
  createdFrom: string;
  subDbInvoiceReceivingDate: string;
  subDbInvoiceReceivingTime: string;
  void: string;
}

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;
const memoryCache = new Map<string, { records: ApprovedPoListingRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): ApprovedPoListingRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Approved PO Listing'];
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
        id: `po-${idx + 1}`,
        poNumber: String(obj['PO Number'] || ''),
        poDate: String(obj['PODate'] || ''),
        poCreationTime: String(obj['PO Creation Time'] || ''),
        dbCode: obj['DBCode'] || 102267,
        dbName: String(obj['DBName'] || 'M/S Ahamed Enterprise'),
        dbType: '', // Blank as per rule
        skuCode: obj['SKU Code'] || '',
        skuName: String(obj['SKU Name'] || ''),
        poQuantity: obj['PO Quantity'] ?? '',
        valueInDbLanding: obj['Value in DB Landing'] ?? '',
        approvedBy: String(obj['ApprovedBy'] || ''),
        approvedDateTime: String(obj['Approved Date & Time'] || ''),
        status: String(obj['Status'] || ''),
        createConfirmDateTime: String(obj['Create/Confirm Date & Time'] || ''),
        createdFrom: String(obj['Created From'] || ''),
        subDbInvoiceReceivingDate: String(obj['SUB DB Invoice Receiving Date'] || ''),
        subDbInvoiceReceivingTime: String(obj['SUB DB Invoice Receiving Time'] || ''),
        void: String(obj['Void'] || 'Not Void'),
      };
    });
  } catch (e) {
    console.error('[Approved PO Listing] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveStocksFromSokrio(): Promise<ApprovedPoListingRecord[]> {
  const token = await getValidToken();
  const stocksUrl = 'https://pvm.core.sokrio.com/api/v1/stocks?per_page=250';

  const res = await axios.get(stocksUrl, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const stocks = Array.isArray(res.data?.data) ? res.data.data : [];
  if (stocks.length === 0) return [];

  const records: ApprovedPoListingRecord[] = [];
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
    const dbCode = dept.code || 102267;
    const dbName = dept.name || 'M/S Ahamed Enterprise';

    // Columns present in live Sokrio API have real data.
    // SAP Primary PO transaction columns that are not in Sokrio are left blank.
    records.push({
      id: `po-live-${skuCode}`,
      poNumber: '',
      poDate: '',
      poCreationTime: '',
      dbCode,
      dbName,
      dbType: '', // Blank
      skuCode: Number(skuCode) || skuCode,
      skuName,
      poQuantity: '',
      valueInDbLanding: '',
      approvedBy: '',
      approvedDateTime: '',
      status: '',
      createConfirmDateTime: '',
      createdFrom: '',
      subDbInvoiceReceivingDate: '',
      subDbInvoiceReceivingTime: '',
      void: '',
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

    const cacheKey = `approved_po_${startDate}_${endDate}`;
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
    console.error('[Approved PO Listing API Error]:', error);
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
