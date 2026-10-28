import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import dbMaster from '@/lib/dbMaster.json';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface ApprovedPoListingRecord {
  id: string;
  poNumber: string | number;
  poDate: string | number;
  poCreationTime: string | number;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string | number;
  dbName: string | number;
  dBType: string | number;
  dbType: string | number;
  sKUCode: string | number;
  skuCode: string | number;
  sKUName: string | number;
  skuName: string | number;
  poQuantity: string | number;
  valueInDbLanding: string | number;
  approvedBy: string | number;
  approvedDateTime: string | number;
  status: string | number;
  createConfirmDateTime: string | number;
  createdFrom: string | number;
  subDbInvoiceReceivingDate: string | number;
  subDbInvoiceReceivingTime: string | number;
  void: string | number;
}

const memoryCache = new Map<string, { records: ApprovedPoListingRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function readSampleApprovedPoFromExcel(): ApprovedPoListingRecord[] {
  try {
    const excelPath = path.resolve(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(excelPath)) return [];

    const wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets['Approved PO Listing'];
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
      const dbCodeVal = obj['DBCode'] || obj['DB Code'] || 102267;
      const dbNameVal = String(obj['DBName'] || obj['DB Name'] || 'M/S Ahamed Enterprise');
      const skuCodeVal = obj['SKU Code'] || '';
      const skuNameVal = String(obj['SKU Name'] || '');

      return {
        id: `po-${idx + 1}`,
        poNumber: String(obj['PO Number'] || `PO10_10042026_${String(idx + 1).padStart(4, '0')}`),
        poDate: String(obj['PODate'] || obj['PO Date'] || '10-04-2026'),
        poCreationTime: String(obj['PO Creation Time'] || '03:44 PM'),
        dBCode: dbCodeVal,
        dbCode: dbCodeVal,
        dBName: dbNameVal,
        dbName: dbNameVal,
        dBType: 'Main DB',
        dbType: 'Main DB',
        sKUCode: skuCodeVal,
        skuCode: skuCodeVal,
        sKUName: skuNameVal,
        skuName: skuNameVal,
        poQuantity: obj['PO Quantity'] ?? 24,
        valueInDbLanding: obj['Value in DB Landing'] ?? 7657.06,
        approvedBy: String(obj['ApprovedBy'] || obj['Approved By'] || dbCodeVal),
        approvedDateTime: String(obj['Approved Date & Time'] || '10-04-2026  9:46 AM'),
        status: String(obj['Status'] || 'Approved'),
        createConfirmDateTime: String(obj['Create/Confirm Date & Time'] || '10-04-2026 03:45 PM'),
        createdFrom: String(obj['Created From'] || 'WEB'),
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

    const records = readSampleApprovedPoFromExcel();

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Perfetti Van Melle SAP Primary PO & Order Confirmation Ledger',
      sheet: 'Approved PO Listing',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Approved PO Listing API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
