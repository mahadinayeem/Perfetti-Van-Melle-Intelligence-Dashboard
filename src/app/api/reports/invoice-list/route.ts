import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface InvoiceListRecord {
  id: string;
  invoiceNo: string | number;
  custNo: string | number;
  invoiceDate: string;
  custReferenceNo: string;
  poDate: string;
  externalDocNo: string;
  docType: string;
  receivingDt: string;
  lineNo: number | string;
  itemNo: string | number;
  quantity: number | string;
  netPrice: number | string;
  totalAmt: number | string;
  uom: string;
}

const memoryCache = new Map<string, { records: InvoiceListRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function getSampleExcelData(): InvoiceListRecord[] {
  try {
    const filePath = path.join(process.cwd(), 'Report Sample.xlsx');
    if (!fs.existsSync(filePath)) return [];
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets['Invoice List'];
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
        id: `inv-list-${idx + 1}`,
        invoiceNo: obj['InvoiceNo'] || '',
        custNo: obj['CustNo'] || 102267,
        invoiceDate: String(obj['InvoiceDate'] || ''),
        custReferenceNo: String(obj['CustReferenceNo'] || ''),
        poDate: String(obj['PODate'] || ''),
        externalDocNo: '',
        docType: '',
        receivingDt: '',
        lineNo: obj['LineNo'] || (idx + 1),
        itemNo: obj['ItemNo'] || '',
        quantity: obj['Quantity'] ?? '',
        netPrice: obj['NetPrice'] ?? '',
        totalAmt: obj['TotalAmt'] ?? '',
        uom: String(obj['UOM'] || 'CT'),
      };
    });
  } catch (e) {
    console.error('[Invoice List Report] Failed to read sample excel:', e);
    return [];
  }
}

async function fetchLiveInvoicesFromSokrio(): Promise<InvoiceListRecord[]> {
  const token = await getValidToken();
  const url = 'https://pvm.core.sokrio.com/api/v1/invoices?per_page=150';

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30000,
  });

  const invoices: any[] = res.data?.invoices || res.data?.data || [];
  if (invoices.length === 0) return [];

  const records: InvoiceListRecord[] = [];
  let rowId = 1;

  for (const inv of invoices) {
    const invoiceNo = inv.id;
    const custNo = inv.order?.buyer_id || inv.buyer_id || 102267;
    const createdAt = inv.created_at || '';
    const invoiceDate = createdAt.includes(' ') ? createdAt.split(' ')[0] : createdAt;
    const custReferenceNo = String(inv.order?.code || inv.code || `ORD-${inv.order_id || inv.id}`);
    const poDate = String(inv.order?.order_date || invoiceDate);
    const totalAmt = Number(inv.payable || inv.amount || 0);

    const products = inv.order?.latest_revision?.ordered_products || inv.products || [];
    if (products.length > 0) {
      products.forEach((p: any, pIdx: number) => {
        const itemNo = String(p.product?.base_product?.sku || p.product_id || '').trim();
        const qty = Number(p.qty || 1);
        const price = Number(p.price || 0);

        let uom = 'BOX';
        const fullName = String(p.product?.full_name || '').toLowerCase();
        if (fullName.includes('jar')) uom = 'JAR';
        else if (fullName.includes('ctn') || fullName.includes('cartoon')) uom = 'CT';

        records.push({
          id: `inv-item-${rowId++}`,
          invoiceNo,
          custNo,
          invoiceDate,
          custReferenceNo,
          poDate,
          externalDocNo: '',
          docType: '',
          receivingDt: '',
          lineNo: pIdx + 1,
          itemNo: Number(itemNo) || itemNo,
          quantity: qty,
          netPrice: price,
          totalAmt: Math.round(totalAmt),
          uom,
        });
      });
    } else {
      // Single line invoice fallback
      records.push({
        id: `inv-item-${rowId++}`,
        invoiceNo,
        custNo,
        invoiceDate,
        custReferenceNo,
        poDate,
        externalDocNo: '',
        docType: '',
        receivingDt: '',
        lineNo: 1,
        itemNo: 651302,
        quantity: 1,
        netPrice: totalAmt,
        totalAmt: Math.round(totalAmt),
        uom: 'BOX',
      });
    }
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

    const cacheKey = `invoice_list_${startDate}_${endDate}`;
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

    let records = await fetchLiveInvoicesFromSokrio();
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
    console.error('[Invoice List Report API Error]:', error);
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
