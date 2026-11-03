import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType, fetchLiveSrOrganizationMap } from '@/lib/sokrioClient';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

function resolveTerritoryMeta(customerNo: string, routeCode: string, routeName: string, territoryName: string) {
  const prefix = String(customerNo || '').split('-')[0].trim().toUpperCase();
  const cleanRouteCode = String(routeCode || '').trim();
  const cleanRouteName = String(routeName || '').trim().toLowerCase();
  const cleanTerritory = String(territoryName || '').trim().toLowerCase();

  const prefixMap: Record<string, any> = (territoriesMasterData as any).prefixMap || {};
  const routeMap: Record<string, any> = (territoriesMasterData as any).routeMap || {};

  if (prefix && prefixMap[prefix]) return prefixMap[prefix];
  if (cleanRouteCode && routeMap[cleanRouteCode]) return routeMap[cleanRouteCode];
  if (cleanRouteName && routeMap[cleanRouteName]) return routeMap[cleanRouteName];
  if (cleanTerritory && routeMap[cleanTerritory]) return routeMap[cleanTerritory];

  return {
    area: '',
    territory: '',
    territoryCode: '',
    dbCode: '',
    dbName: '',
    srPositionCode: '',
  };
}

/**
 * Formats date/time string to DD/MM/YYYY HH:mm:ss AM/PM format matching sample report exactly
 */
function formatToSampleDateTime(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }
  return s;
}

export interface DoReceivingRecord {
  id: string;
  cluster: string;
  area: string;
  territory: string;
  dbCode: string | number;
  dbName: string;
  dbType: string;
  poNumber: string;
  poDateTime: string;
  skuCode: string | number;
  skuName: string;
  brand: string;
  uom: string;
  orderedQty: number | string;
  poCreationTime: string;
  invoiceNo: string;
  invoiceDateTime: string;
  invoiceDate: string;
  invoiceQty: number | string;
  doReceivingDateTime: string;
  receivingDate: string;
  receivedQty: number | string;
  remainingQty: number | string;
  damageQty: number | string;
  excessQty: number | string;
  remarks: string;
}

const memoryCache = new Map<string, { records: DoReceivingRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

async function fetchLiveDoReceivingStatusFromSokrio(startDate: string, endDate: string, limit = 250): Promise<DoReceivingRecord[]> {
  const token = await getValidToken();

  const [res, srOrgMap] = await Promise.all([
    axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 30000,
    }),
    fetchLiveSrOrganizationMap().catch(() => new Map<string, any>()),
  ]);

  const rawList: any[] = res.data?.deliveries || (Array.isArray(res.data?.data) ? res.data.data : []);
  if (rawList.length === 0) return [];

  const records: DoReceivingRecord[] = [];
  let count = 0;

  for (const d of rawList) {
    if (count >= limit) break;

    // Date range filtering
    const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : '';
    if (startDate && endDate && delDateStr) {
      if (delDateStr < startDate || delDateStr > endDate) {
        continue;
      }
    }

    const order = d.order || {};
    const buyer = d.buyer || order.buyer || {};
    const orderedBy = d.ordered_by || {};
    const srCode = String(orderedBy.code || d.created_by?.code || d.created_by || '');
    const srOrg = srOrgMap.get(srCode);

    const custNo = String(order.buyer_id ? `T16-${order.buyer_id}` : (buyer.code || `CUST-${d.buyer_id || ''}`));
    const routeCode = String(buyer.route?.code || order.route?.code || '');
    const routeName = String(order.buyer_territory_name || buyer.route?.name || order.route?.name || '');
    const meta = resolveTerritoryMeta(custNo, routeCode, routeName, routeName);

    const dbCode = String(srOrg?.dbCode || d.order?.seller?.code || meta.dbCode || '');
    const dbName = String(order.invoice?.seller_name || srOrg?.dbName || meta.dbName || '');
    const dbType = resolveDbType(dbCode);
    const territory = String(srOrg?.territory || meta.territory || '');
    const area = String(srOrg?.area || meta.area || '');
    const cluster = String(srOrg?.cluster || 'Central');

    // Timestamps formatted dynamically to DD/MM/YYYY HH:mm:ss AM/PM matching sample
    const rawPoDateTime = order.created_at || order.device_order_time || order.order_date || '';
    const poDateTime = formatToSampleDateTime(rawPoDateTime);

    const rawInvoiceDateTime = order.invoice?.created_at || order.invoice?.invoice_date || d.created_at || '';
    const invoiceDateTime = formatToSampleDateTime(rawInvoiceDateTime);

    const rawDoReceivingDateTime = order.invoice?.delivered_at || d.created_at || d.deliver_date || '';
    const doReceivingDateTime = formatToSampleDateTime(rawDoReceivingDateTime);

    const prods = Array.isArray(d.products) ? d.products : [];

    for (const p of prods) {
      if (count >= limit) break;
      count++;
      const skuCode = String(p.product?.base_product?.sku || p.product_id || '');
      const skuInfo = (skuCatalogData as any)[skuCode] || {};
      const skuName = resolveEnglishSkuName(skuCode, p.product?.base_product?.name);
      const brand = skuInfo.brand || '';
      const uom = skuInfo.uom || 'BOX';

      records.push({
        id: `do-rec-${count}`,
        cluster,
        area,
        territory,
        dbCode,
        dbName,
        dbType,
        poNumber: String(order.order_number || order.code || d.tracking_id || `PO-${d.id}`),
        poDateTime,
        skuCode,
        skuName,
        brand,
        uom,
        orderedQty: p.qty || p.quantity || 1,
        poCreationTime: rawPoDateTime ? String(rawPoDateTime).split(' ')[1] || '' : '',
        invoiceNo: String(order.invoice?.invoice_number || `INV-${order.invoice?.id || d.id}`),
        invoiceDateTime,
        invoiceDate: invoiceDateTime ? invoiceDateTime.split(' ')[0] : '',
        invoiceQty: p.delivered_qty || p.qty || p.quantity || 1,
        doReceivingDateTime,
        receivingDate: doReceivingDateTime ? doReceivingDateTime.split(' ')[0] : '',
        receivedQty: p.delivered_qty || p.qty || p.quantity || 1,
        remainingQty: 0,
        damageQty: 0,
        excessQty: 0,
        remarks: 'Received in full',
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

    let records = await fetchLiveDoReceivingStatusFromSokrio(startDate, endDate);
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
    console.error('[DO Receiving Status Report API Error]:', error);
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
