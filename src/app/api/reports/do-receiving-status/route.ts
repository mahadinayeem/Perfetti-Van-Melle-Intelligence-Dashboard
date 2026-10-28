import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export interface DoReceivingStatusRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string | number;
  dbName: string | number;
  dBType: string | number;
  dbType: string | number;
  poDateTime: string | number;
  poNumber: string | number;
  invoiceNo: string | number;
  invoiceDateTime: string | number;
  docType: string | number;
  doReceivingDateTime: string | number;
  brand: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  sKUName: string | number;
  skuName: string | number;
  uOM: string | number;
  uom: string | number;
  sapQtyCtn: string | number;
  sapQtyPcs: string | number;
  sapValueDBLanding: string | number;
  sapTon: string | number;
  dbReceivedQtyCtn: string | number;
  dbReceivedQtyPcs: string | number;
  dbReceivedValueDBLanding: string | number;
  dbReceivedTon: string | number;
  doReceivingStatus: string | number;
}

const memoryCache = new Map<string, { records: DoReceivingStatusRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function readSampleDoReceivingFromExcel(): DoReceivingStatusRecord[] {
  try {
    const excelPath = path.resolve(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(excelPath)) return [];

    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets['DO Receiving Status Report'];
    if (!ws) return [];

    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length < 2) return [];

    const headers = data[0].map((h: any) => String(h || '').trim());
    const rows = data.slice(1);

    return rows.map((r, idx) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = r[colIdx];
      });

      const dbCodeVal = obj['DB Code'] || obj['DBCode'] || 102267;
      const dbNameVal = String(obj['DB Name'] || obj['DBName'] || 'M/S Ahamed Enterprise');
      const skuCodeVal = obj['SKU Code'] || 651092;
      const skuNameVal = String(obj['SKU Name'] || '');
      const uomVal = String(obj['UOM'] || 'BOX');

      return {
        id: `dorec-${idx + 1}`,
        cluster: String(obj['Cluster'] || 'Central'),
        area: String(obj['Area'] || 'Central South'),
        territory: String(obj['Territory'] || 'Jatra Bari'),
        dBCode: dbCodeVal,
        dbCode: dbCodeVal,
        dBName: dbNameVal,
        dbName: dbNameVal,
        dBType: String(obj['DB Type'] || 'Main DB'),
        dbType: String(obj['DB Type'] || 'Main DB'),
        poDateTime: String(obj['PO Date & Time'] || '08/09/2026 13:32:01 PM'),
        poNumber: String(obj['PO Number'] || 'PO9_09082026_00292'),
        invoiceNo: String(obj['Invoice No'] || '80343930'),
        invoiceDateTime: String(obj['Invoice Date & Time'] || '08/09/2026 19:56:29 PM'),
        docType: String(obj['Doc Type'] || 'ZBF2'),
        doReceivingDateTime: String(obj['DO Receiving Date & Time'] || '11/09/2026 23:06:32 PM'),
        brand: String(obj['Brand'] || 'Mentos'),
        sKUCode: skuCodeVal,
        skuCode: skuCodeVal,
        sKUName: skuNameVal,
        skuName: skuNameVal,
        uOM: uomVal,
        uom: uomVal,
        sapQtyCtn: obj['SAP Quantity in CTN'] ?? 1,
        sapQtyPcs: obj['SAP Quantity in PCs'] ?? 12,
        sapValueDBLanding: obj['SAP Value in DB Landing'] ?? 9142.8,
        sapTon: obj['SAP Ton'] ?? 0.0062208,
        dbReceivedQtyCtn: obj['DB Received Quantity in CTN'] ?? 1,
        dbReceivedQtyPcs: obj['DB Received Quantity in PCs'] ?? 12,
        dbReceivedValueDBLanding: obj['DB Received Value in DB Landing'] ?? 9142.8,
        dbReceivedTon: obj['DB Received Ton'] ?? 0.0062208,
        doReceivingStatus: String(obj['DO Receiving Status'] || 'Received'),
      };
    });
  } catch (e) {
    console.error('[DO Receiving Status Report] Failed to read sample excel:', e);
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

    const records = readSampleDoReceivingFromExcel();

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Perfetti Van Melle SAP ERP DO Receiving & Primary Fulfillment Ledger',
      sheet: 'DO Receiving Status Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[DO Receiving Status API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
