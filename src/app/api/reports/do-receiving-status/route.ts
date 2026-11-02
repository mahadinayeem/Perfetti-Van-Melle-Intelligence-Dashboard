import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
import { resolveEnglishSkuName } from '@/lib/skuResolver';
import skuCatalogData from '@/lib/skuCatalog.json';
import territoriesMasterData from '@/lib/territoriesMaster.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const SR_METADATA_MAP: Record<string, { srPositionCode: string; srName: string; territory: string; territoryCode: string; dbCode: string; dbName: string }> = {
  '54506': {
    srPositionCode: 'DM-060',
    srName: 'Mostafizur Rahman',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '53995': {
    srPositionCode: 'DM-057',
    srName: 'Chaon Khandker',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '54233': {
    srPositionCode: 'DM-059',
    srName: 'Md. Asebur Rahman Ashik',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '51639': {
    srPositionCode: 'DM-217',
    srName: 'Md. Shawkat Hossen',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '54725': {
    srPositionCode: 'DM-061',
    srName: 'Tarapada Saha',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
  },
  '51608': {
    srPositionCode: 'DM-027',
    srName: 'Rafiqul Islam',
    territory: 'Gulshan',
    territoryCode: 'T19',
    dbCode: '101820',
    dbName: 'Sara Enterprise',
  },
};

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
    area: 'Central South',
    territory: 'Jatra Bari',
    territoryCode: 'T16',
    dbCode: '102267',
    dbName: 'M/S Ahamed Enterprise',
    srPositionCode: 'DM-060',
  };
}

/**
 * Formats ISO or SQL timestamps into the exact sample Excel format:
 * "DD/MM/YYYY HH:mm:ss AM/PM" (e.g. "08/09/2026 13:32:01 PM")
 * If no timestamp exists in live data, returns empty string "" per user guidelines.
 */
function formatToSampleDateTime(dateVal?: string | null): string {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (!str) return '';

  const parts = str.includes('T') ? str.split('T') : str.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] ? parts[1].replace('Z', '').slice(0, 8) : '';

  const dateSub = datePart.split('-');
  if (dateSub.length !== 3) return str;
  const [yyyy, mm, dd] = dateSub;
  if (!dd || !mm || !yyyy || isNaN(Number(yyyy))) return str;

  const formattedDate = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  if (!timePart) return formattedDate;

  const timeSub = timePart.split(':');
  const hour = parseInt(timeSub[0] || '0', 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';

  return `${formattedDate} ${timePart} ${ampm}`;
}

export interface DOReceivingRecord {
  id: string;
  cluster: string;
  area: string;
  territory: string;
  dBCode: string | number;
  dbCode: string | number;
  dBName: string;
  dbName: string;
  dBType: string;
  dbType: string;
  poDateTime: string;
  poNumber: string;
  invoiceNo: string;
  invoiceDateTime: string;
  docType: string;
  doReceivingDateTime: string;
  brand: string;
  sKUCode: string | number;
  skuCode: string | number;
  sKUName: string;
  skuName: string;
  uOM: string;
  uom: string;
  sapQtyCtn: number | string;
  sapQtyPcs: number | string;
  sapValueDBLanding: number | string;
  sapTon: number | string;
  dbReceivedQtyCtn: number | string;
  dbReceivedQtyPcs: number | string;
  dbReceivedValueDBLanding: number | string;
  dbReceivedTon: number | string;
  doReceivingStatus: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 200;
    const startDate = searchParams.get('startDate') || searchParams.get('start') || '';
    const endDate = searchParams.get('endDate') || searchParams.get('end') || '';

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: DOReceivingRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      if (count >= limit) break;
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : '');
      const delTimeStr = d.created_at ? (String(d.created_at).includes('T') ? String(d.created_at).split('T')[1].slice(0, 8) : String(d.created_at).split(' ')[1] || '') : '';

      // Date range filtering
      if (startDate && endDate && delDateStr) {
        if (delDateStr < startDate || delDateStr > endDate) {
          continue;
        }
      }

      const order = d.order || {};
      const buyer = d.buyer || order.buyer || {};
      const orderedBy = d.ordered_by || {};
      const srCode = String(orderedBy.code || d.created_by?.code || d.created_by || '');
      const srMeta = SR_METADATA_MAP[srCode];

      const custNo = String(order.buyer_id ? `T16-${order.buyer_id}` : (buyer.code || `CUST-${d.buyer_id || ''}`));
      const routeCode = String(buyer.route?.code || order.route?.code || '');
      const routeName = String(order.buyer_territory_name || buyer.route?.name || order.route?.name || '');
      const meta = resolveTerritoryMeta(custNo, routeCode, routeName, routeName);

      const dbCode = String(srMeta?.dbCode || meta.dbCode || '102267');
      const dbName = String(order.invoice?.seller_name || srMeta?.dbName || meta.dbName || 'M/S Ahamed Enterprise');
      const dbType = 'Main DB';
      const territory = String(srMeta?.territory || meta.territory || 'Jatra Bari');
      const area = String(meta.area || 'Central South');
      const cluster = 'Central';

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
          dBCode: dbCode,
          dbCode,
          dBName: dbName,
          dbName,
          dBType: dbType,
          dbType,
          poDateTime,
          poNumber: '', // SAP PO does not exist in Sokrio platform -> left blank per user rule
          invoiceNo: '', // SAP Invoice does not exist in Sokrio platform -> left blank per user rule
          invoiceDateTime,
          docType: '', // SAP Document Type does not exist in Sokrio platform -> left blank per user rule
          doReceivingDateTime,
          brand,
          sKUCode: skuCode,
          skuCode,
          sKUName: skuName,
          skuName,
          uOM: uom,
          uom,
          sapQtyCtn: '', // SAP CTN quantity does not exist in Sokrio platform -> left blank per user rule
          sapQtyPcs: '', // SAP PCs quantity does not exist in Sokrio platform -> left blank per user rule
          sapValueDBLanding: '', // SAP Landing Value does not exist in Sokrio platform -> left blank per user rule
          sapTon: '', // SAP Ton does not exist in Sokrio platform -> left blank per user rule
          dbReceivedQtyCtn: '', // DB Received CTN does not exist in Sokrio platform -> left blank per user rule
          dbReceivedQtyPcs: '', // DB Received PCs does not exist in Sokrio platform -> left blank per user rule
          dbReceivedValueDBLanding: '', // DB Received Value does not exist in Sokrio platform -> left blank per user rule
          dbReceivedTon: '', // DB Received Ton does not exist in Sokrio platform -> left blank per user rule
          doReceivingStatus: 'Received',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio Live SFA Deliveries & Receiving Pipeline',
        sheet: 'DO Receiving Status Report',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[DO Receiving Status API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
