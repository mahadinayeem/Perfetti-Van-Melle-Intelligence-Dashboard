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



function formatDateToMMDDYYYY(rawDate: string): string {
  if (!rawDate) return '';
  const clean = rawDate.split('T')[0].split(' ')[0].trim();
  const parts = clean.includes('-') ? clean.split('-') : clean.split('/');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    if (parts[2].length === 4) {
      return `${parts[1]}/${parts[0]}/${parts[2]}`;
    }
  }
  return clean;
}

async function fetchLiveInvoicesFromSokrio(): Promise<InvoiceListRecord[]> {
  const token = await getValidToken();
  let invoices: any[] = [];
  try {
    const url = 'https://pvm.core.sokrio.com/api/v1/invoices?per_page=150';
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 20000,
    });
    invoices = res.data?.invoices || res.data?.data || [];
  } catch (e: any) {
    console.warn('[Invoice List] Invoices endpoint fallback to deliveries:', e.message);
  }

  if (invoices.length === 0) {
    try {
      const delUrl = 'https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150';
      const delRes = await axios.get(delUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 20000,
      });
      invoices = delRes.data?.data || (Array.isArray(delRes.data) ? delRes.data : []);
    } catch (e: any) {
      console.warn('[Invoice List] Deliveries endpoint failed:', e.message);
    }
  }

  if (invoices.length === 0) return [];

  const records: InvoiceListRecord[] = [];
  let rowId = 1;

  for (const inv of invoices) {
    const invoiceNo = inv.order?.invoice?.invoice_number || inv.code || (inv.id ? `INV-${inv.id}` : '');
    const custNo = inv.seller?.code || inv.department?.code || inv.order?.buyer_id || inv.buyer_id || (inv.buyer?.code ? String(inv.buyer.code) : '');
    const rawCreatedAt = inv.deliver_date || inv.order?.order_date || inv.created_at || '';
    const invoiceDate = formatDateToMMDDYYYY(rawCreatedAt);
    const custReferenceNo = String(inv.order?.code || inv.code || (inv.id ? `PB${inv.id}` : ''));
    const poDate = formatDateToMMDDYYYY(inv.order?.order_date || rawCreatedAt);
    const totalAmt = Number(inv.payable_amount || inv.payable || inv.total_price || inv.amount || 0);

    const products = inv.order?.latest_revision?.ordered_products || inv.products || [];
    if (products.length > 0) {
      products.forEach((p: any, pIdx: number) => {
        const itemNo = String(p.product?.base_product?.sku || p.product_id || '').trim();
        const qty = Number(p.qty || 0);
        const price = Number(p.price || 0);

        let uom = 'BOX';
        const fullName = String(p.product?.full_name || p.product?.base_product?.name || '').toLowerCase();
        if (fullName.includes('jar')) uom = 'JAR';
        else if (fullName.includes('ctn') || fullName.includes('cartoon')) uom = 'CT';

        records.push({
          id: `inv-item-${rowId++}`,
          invoiceNo,
          custNo,
          invoiceDate,
          custReferenceNo,
          poDate,
          externalDocNo: custReferenceNo,
          docType: 'ZDOM',
          receivingDt: invoiceDate,
          lineNo: pIdx + 1,
          itemNo: Number(itemNo) || itemNo,
          quantity: qty,
          netPrice: price,
          totalAmt: Math.round(qty * price),
          uom,
        });
      });
    } else {
      records.push({
        id: `inv-item-${rowId++}`,
        invoiceNo,
        custNo,
        invoiceDate,
        custReferenceNo,
        poDate,
        externalDocNo: custReferenceNo,
        docType: 'ZDOM',
        receivingDt: invoiceDate,
        lineNo: 1,
        itemNo: '',
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
