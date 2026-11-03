import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import dbMaster from '@/lib/dbMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface ApprovedPORecord {
  id: string;
  poNumber: string;
  poDate: string;
  poCreationTime: string;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string;
  dbName: string;
  dBType: string;
  dbType: string;
  sKUCode: string | number;
  skuCode: string | number;
  sKUName: string;
  skuName: string;
  poQuantity: number | string;
  valueInDbLanding: number | string;
  approvedBy: string;
  approvedDateTime: string;
  status: string;
  createConfirmDateTime: string;
  createdFrom: string;
  subDbInvoiceReceivingDate: string;
  subDbInvoiceReceivingTime: string;
  void: string;
}

const DB_MAP: Record<string, any> = (dbMaster as any).dbs || {};

function formatDDMMYYYYWithHyphen(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY -> already correct
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  }
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY -> DD-MM-YYYY
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD -> DD-MM-YYYY
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
  }
  return s;
}

function getDDMMYYYYCompact(val: any): string {
  const formatted = formatDDMMYYYYWithHyphen(val);
  return formatted.replace(/-/g, '');
}

function formatTimeTo12h(val: any, fallback = ''): string {
  if (!val) return fallback;
  const str = String(val).trim();
  const timePart = str.includes(' ') ? str.split(' ')[1] : (str.includes('T') ? str.split('T')[1] : str);
  if (!timePart || !timePart.includes(':')) return fallback;
  const parts = timePart.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return fallback;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function resolveDbCodeAndName(sellerId: any, sellerName: string) {
  if (sellerId && String(sellerId).length === 6 && DB_MAP[String(sellerId)]) {
    return { dbCode: String(sellerId), dbName: DB_MAP[String(sellerId)].dbName || sellerName };
  }
  if (sellerName) {
    const sNameNorm = String(sellerName).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [code, info] of Object.entries(DB_MAP)) {
      const dbNameNorm = String(info.dbName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sNameNorm && dbNameNorm && (sNameNorm.includes(dbNameNorm) || dbNameNorm.includes(sNameNorm))) {
        return { dbCode: code, dbName: info.dbName || sellerName };
      }
    }
  }
  return { dbCode: sellerId ? String(sellerId) : '', dbName: sellerName || '' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 200;

    // Load live primary orders from Sokrio invoices
    let orders: any[] = [];
    try {
      const token = await getValidToken();
      const res = await axios.get('https://pvm.core.sokrio.com/api/v1/invoices?per_page=100', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      orders = res.data?.invoices || [];
    } catch (e: any) {
      console.warn('[Approved PO] Live invoice query skipped:', e.message);
    }

    const records: ApprovedPORecord[] = [];

    if (orders.length > 0) {
      orders.slice(0, limit).forEach((inv: any, idx: number) => {
        const order = inv.order || {};
        const dbInfo = resolveDbCodeAndName(inv.seller_id || order.seller_id, inv.seller_name || order.seller_name);
        const dbType = 'Main DB';

        const products = order.latest_revision?.ordered_products || inv.products || [];
        if (products.length > 0) {
          products.forEach((p: any, pIdx: number) => {
            const sku = String(p.product?.base_product?.sku || p.product_id || '').trim();
            const skuName = resolveEnglishSkuName(sku, p.product?.full_name || p.product?.base_product?.name);
            const qty = Number(p.qty || 1);
            const val = Number(p.price ? p.price * qty : inv.payable || 0);

            records.push({
              id: `po-${idx + 1}-${pIdx + 1}`,
              poNumber: '', // PO does not exist in Sokrio platform -> left blank
              poDate: '', // PO Date does not exist in Sokrio platform -> left blank
              poCreationTime: '', // Not in Sokrio platform -> left blank
              dBCode: dbInfo.dbCode,
              dbCode: dbInfo.dbCode,
              dBName: dbInfo.dbName,
              dbName: dbInfo.dbName,
              dBType: dbType,
              dbType: dbType,
              sKUCode: sku,
              skuCode: sku,
              sKUName: skuName,
              skuName: skuName,
              poQuantity: '', // Not in Sokrio platform -> left blank
              valueInDbLanding: '', // Not in Sokrio platform -> left blank
              approvedBy: '', // Not in Sokrio platform -> left blank
              approvedDateTime: '', // Not in Sokrio platform -> left blank
              status: '', // Not in Sokrio platform -> left blank
              createConfirmDateTime: '', // Not in Sokrio platform -> left blank
              createdFrom: '', // Not in Sokrio platform -> left blank
              subDbInvoiceReceivingDate: '',
              subDbInvoiceReceivingTime: '',
              void: '', // Not in Sokrio platform -> left blank
            });
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio Live Primary Order & Invoice Ledger',
        sheet: 'Approved PO Listing',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Approved PO Listing API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
