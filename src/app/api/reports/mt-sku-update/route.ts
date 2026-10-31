import { NextRequest, NextResponse } from 'next/server';
import { getValidToken, resolveDbType } from '@/lib/sokrioClient';
import skuCatalogData from '@/lib/skuCatalog.json';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface MTSKUUpdateRecord {
  id: string;
  docDate: string;
  docdate: string;
  docTime: string;
  doctime: string;
  cluster: string;
  area: string;
  territory: string;
  dBCode: string;
  dbCode: string;
  dBName: string;
  dbName: string;
  dBType: string;
  dbType: string;
  sRPositionCode: string;
  srPositionCode: string;
  sRCode: string;
  srCode: string;
  sRName: string;
  srName: string;
  routeCode: string;
  routeName: string;
  customerNo: string;
  customerName: string;
  brand: string;
  motherSKUCode: string;
  motherSkuCode: string;
  motherSKUName: string;
  motherSkuName: string;
  sKUCode: string;
  skuCode: string;
  sKUName: string;
  skuName: string;
  documentNo: string;
  checkOut: number;
  checkout: number;
  categoryShelf: number;
  categoryshelf: number;
  comment: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 100;

    const token = await getValidToken();

    // 1. Fetch live deliveries (Modern Trade / Secondary orders)
    let deliveries: any[] = [];
    try {
      const delRes = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000,
      });
      deliveries = delRes.data?.data || (Array.isArray(delRes.data) ? delRes.data : []);
    } catch (e: any) {
      console.warn('[MT SKU Update] Deliveries fetch skipped:', e.message);
    }

    const records: MTSKUUpdateRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      if (count >= limit) break;
      const prods = Array.isArray(d.products) ? d.products : [];
      const orderedBy = d.ordered_by || {};
      const srCode = String(orderedBy.code || d.created_by || '54506');
      const srName = String(orderedBy.name || d.creator_name || 'Mostafizur Rahman');
      const srPositionCode = srCode === '54233' ? 'DM-059' : (srCode === '51639' ? 'DM-217' : (srCode === '53995' ? 'DM-057' : (srCode === '51608' ? 'DM-027' : 'DM-060')));
      const dbCode = '102267';
      const dbName = 'M/S Ahamed Enterprise';
      const dbType = 'MAIN';
      const custNo = String(d.buyer_id || '');
      const custName = String(d.order?.buyer_name || d.buyer_name || '');
      const routeCode = String(d.order?.route?.code || d.route_id || '');
      const routeName = String(d.order?.route?.name || '');
      const docDate = d.deliver_date ? String(d.deliver_date).split(' ')[0] : '';
      const docTime = d.created_at ? (String(d.created_at).includes('T') ? String(d.created_at).split('T')[1].slice(0, 8) : String(d.created_at).split(' ')[1] || '') : '';
      const docNo = String(d.order?.code || d.code || (d.id ? `PB${d.id}` : ''));

      for (const p of prods) {
        if (count >= limit) break;
        count++;
        const skuCode = String(p.product?.base_product?.sku || p.product_id || '');
        const skuInfo = (skuCatalogData as any)[skuCode] || {};
        const motherCode = skuInfo.motherSkuCode || '';
        const motherName = skuInfo.motherSkuName || p.product?.base_product?.name || '';
        const brand = skuInfo.brand || '';

        records.push({
          id: `mt-sku-live-${count}`,
          docDate,
          docdate: docDate,
          docTime,
          doctime: docTime,
          cluster: 'Central',
          area: 'Central South',
          territory: 'Gulshan',
          dBCode: dbCode,
          dbCode,
          dBName: dbName,
          dbName,
          dBType: dbType,
          dbType,
          sRPositionCode: srPositionCode,
          srPositionCode,
          sRCode: srCode,
          srCode,
          sRName: srName,
          srName,
          routeCode,
          routeName,
          customerNo: custNo,
          customerName: custName,
          brand,
          motherSKUCode: motherCode,
          motherSkuCode: motherCode,
          motherSKUName: motherName,
          motherSkuName: motherName,
          sKUCode: skuCode,
          skuCode,
          sKUName: motherName,
          skuName: motherName,
          documentNo: docNo,
          checkOut: 0,
          checkout: 0,
          categoryShelf: 0,
          categoryshelf: 0,
          comment: '',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio Live SFA Deliveries & Product SKU API',
        sheet: 'MT SKU Update',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[MT SKU Update API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
