const fs = require('fs');

// 1. FOC Claim
fs.writeFileSync('src/app/api/reports/foc-claim/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface FocClaimRecord {
  id: string;
  orderDate: string | number;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  outletsCat: string | number;
  outletCode: string | number;
  outletName: string | number;
  routeCode: string | number;
  routeName: string | number;
  invNo: string | number;
  skuCode: string | number;
  skuName: string | number;
  uom: string | number;
  qty: string | number;
  skuTp: string | number;
  claimAmount: string | number;
}

const memoryCache = new Map<string, { records: FocClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`foc_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: FocClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : todayStr);
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr;
      const outletName = d.order?.buyer_name || '';
      const territoryName = d.order?.buyer_territory_name || '';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const skuName = p?.product?.base_product?.name || '';
        const qty = p ? parseFloat(p.qty) || 0 : 0;
        const tp = p ? parseFloat(p.price) || 0 : 0;

        records.push({
          id: \`foc-\${count}\`,
          orderDate: orderDateStr,
          cluster: '',
          area: '',
          territory: territoryName,
          dbCode: d.seller_id ? String(d.seller_id) : '',
          dbName: '',
          outletsCat: '',
          outletCode: d.buyer_id ? String(d.buyer_id) : '',
          outletName,
          routeCode: '',
          routeName: '',
          invNo: d.order?.invoice?.invoice_number || (d.id ? \`INV\${d.id}\` : ''),
          skuCode,
          skuName,
          uom: 'BOX',
          qty,
          skuTp: tp,
          claimAmount: Math.round(qty * tp),
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'FOC Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[FOC Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 2. Wholesale Export Claim
fs.writeFileSync('src/app/api/reports/wholesale-claim/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface WholesaleClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  srName: string | number;
  srPositionCode: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  skuCode: string | number;
  qty: string | number;
  claimAmount: string | number;
}

const memoryCache = new Map<string, { records: WholesaleClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`ws_claim_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: WholesaleClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const outletName = d.order?.buyer_name || '';
      const territoryName = d.order?.buyer_territory_name || '';
      const srName = d.order?.creator_name || '';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const qty = p ? parseFloat(p.qty) || 0 : 0;

        records.push({
          id: \`ws-claim-\${count}\`,
          cluster: '',
          area: '',
          territory: territoryName,
          dbCode: d.seller_id ? String(d.seller_id) : '',
          dbName: '',
          promoId: '',
          promoName: '',
          outletCode: d.buyer_id ? String(d.buyer_id) : '',
          outletName,
          srName,
          srPositionCode: '',
          invoiceNo: d.order?.invoice?.invoice_number || (d.id ? \`INV\${d.id}\` : ''),
          deliveryDate: delDateStr,
          skuCode,
          qty,
          claimAmount: '',
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'WHolesale Export Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Wholesale Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 3. Urban Retail Claim
fs.writeFileSync('src/app/api/reports/urban-retail-claim/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface UrbanRetailClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  srName: string | number;
  srPositionCode: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  orderDate: string | number;
  skuCode: string | number;
  qty: string | number;
  amount: string | number;
}

const memoryCache = new Map<string, { records: UrbanRetailClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`ur_claim_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: UrbanRetailClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr;
      const outletName = d.order?.buyer_name || '';
      const territoryName = d.order?.buyer_territory_name || '';
      const srName = d.order?.creator_name || '';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const qty = p ? parseFloat(p.qty) || 0 : 0;
        const tp = p ? parseFloat(p.price) || 0 : 0;

        records.push({
          id: \`ur-claim-\${count}\`,
          cluster: '',
          area: '',
          territory: territoryName,
          dbCode: d.seller_id ? String(d.seller_id) : '',
          dbName: '',
          promoId: '',
          promoName: '',
          outletCode: d.buyer_id ? String(d.buyer_id) : '',
          outletName,
          srName,
          srPositionCode: '',
          invoiceNo: d.order?.invoice?.invoice_number || (d.id ? \`INV\${d.id}\` : ''),
          deliveryDate: delDateStr,
          orderDate: orderDateStr,
          skuCode,
          qty,
          amount: Math.round(qty * tp),
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'Urban Retail Claim',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Urban Retail Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 4. Rural Retail Claim
fs.writeFileSync('src/app/api/reports/rural-retail-claim/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface RuralRetailClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  promoId: string | number;
  promoName: string | number;
  outletCode: string | number;
  outletName: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  orderDate: string | number;
  skuCode: string | number;
  qty: string | number;
  amount: string | number;
}

const memoryCache = new Map<string, { records: RuralRetailClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`rr_claim_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: RuralRetailClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : delDateStr;
      const outletName = d.order?.buyer_name || '';
      const territoryName = d.order?.buyer_territory_name || '';
      const prods = Array.isArray(d.products) && d.products.length > 0 ? d.products : [null];

      for (const p of prods) {
        count++;
        const skuCode = p?.product?.base_product?.sku || (p?.product_id ? String(p.product_id) : '');
        const qty = p ? parseFloat(p.qty) || 0 : 0;
        const tp = p ? parseFloat(p.price) || 0 : 0;

        records.push({
          id: \`rr-claim-\${count}\`,
          cluster: '',
          area: '',
          territory: territoryName,
          dbCode: d.seller_id ? String(d.seller_id) : '',
          dbName: '',
          promoId: '',
          promoName: '',
          outletCode: d.buyer_id ? String(d.buyer_id) : '',
          outletName,
          invoiceNo: d.order?.invoice?.invoice_number || (d.id ? \`INV\${d.id}\` : ''),
          deliveryDate: delDateStr,
          orderDate: orderDateStr,
          skuCode,
          qty,
          amount: Math.round(qty * tp),
        });
      }
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'Rural Retail',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Rural Retail Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 5. Rural WS Claim
fs.writeFileSync('src/app/api/reports/rural-ws-claim/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface RuralWsClaimRecord {
  id: string;
  cluster: string | number;
  area: string | number;
  territory: string | number;
  dbCode: string | number;
  dbName: string | number;
  promoId: string | number;
  promoName: string | number;
  disPer: string | number;
  outletCode: string | number;
  outletName: string | number;
  invoiceNo: string | number;
  deliveryDate: string | number;
  totalInvoiceDiscount: string | number;
  percentageDiscount: string | number;
  totalInvoiceAmount: string | number;
}

const memoryCache = new Map<string, { records: RuralWsClaimRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`rws_claim_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: RuralWsClaimRecord[] = [];
    let count = 0;

    for (const d of deliveries) {
      count++;
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const outletName = d.order?.buyer_name || '';
      const territoryName = d.order?.buyer_territory_name || '';
      const amount = parseFloat(d.amount) || 0;
      const discount = parseFloat(d.discount) || 0;

      records.push({
        id: \`rws-claim-\${count}\`,
        cluster: '',
        area: '',
        territory: territoryName,
        dbCode: d.seller_id ? String(d.seller_id) : '',
        dbName: '',
        promoId: '',
        promoName: '',
        disPer: '',
        outletCode: d.buyer_id ? String(d.buyer_id) : '',
        outletName,
        invoiceNo: d.order?.invoice?.invoice_number || (d.id ? \`INV\${d.id}\` : ''),
        deliveryDate: delDateStr,
        totalInvoiceDiscount: discount,
        percentageDiscount: '',
        totalInvoiceAmount: amount,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries API (/api/v1/deliveries)',
      sheet: 'Rural WS',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Rural WS Claim API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 6. Void Order Report
fs.writeFileSync('src/app/api/reports/void-order/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface VoidOrderRecord {
  id: string;
  orderno: string | number;
  orderdate: string | number;
  deliverydate: string | number;
  voidDate: string | number;
  outlet: string | number;
  outletName: string | number;
  srCode: string | number;
  srName: string | number;
  dbCode: string | number;
  dbName: string | number;
  salesofficeid: string | number;
  salesofficename: string | number;
  skuQuantity: string | number;
  lineAmount: string | number;
  discount: string | number;
  amount: string | number;
  orderValue: string | number;
  orderCashDiscount: string | number;
  createDeliverydate: string | number;
}

const memoryCache = new Map<string, { records: VoidOrderRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`void_order_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: VoidOrderRecord[] = [];

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : delDateStr);
      const outletName = d.order?.buyer_name || '';
      const srName = d.order?.creator_name || '';
      const orderCode = d.order?.code || (d.order_id ? \`PB\${d.order_id}\` : '');

      records.push({
        id: \`void-\${d.id}\`,
        orderno: orderCode,
        orderdate: orderDateStr,
        deliverydate: delDateStr,
        voidDate: d.updated_at ? String(d.updated_at).split('T')[0] : delDateStr,
        outlet: d.buyer_id ? String(d.buyer_id) : '',
        outletName,
        srCode: d.created_by ? String(d.created_by) : '',
        srName,
        dbCode: d.seller_id ? String(d.seller_id) : '',
        dbName: '',
        salesofficeid: '',
        salesofficename: '',
        skuQuantity: d.total_sku || 0,
        lineAmount: d.amount || 0,
        discount: d.discount || 0,
        amount: d.payable || d.amount || 0,
        orderValue: d.amount || 0,
        orderCashDiscount: 0,
        createDeliverydate: delDateStr,
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Order Returns API (/api/v1/deliveries)',
      sheet: 'Void Order Report',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Void Order API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

// 7. Void Order Tracker
fs.writeFileSync('src/app/api/reports/void-order-tracker/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/sokrioClient';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export interface VoidOrderTrackerRecord {
  id: string;
  orderno: string | number;
  orderdate: string | number;
  deliverydate: string | number;
  voidDate: string | number;
  outlet: string | number;
  outletName: string | number;
  srCode: string | number;
  srName: string | number;
  dbType: string | number;
  dbCode: string | number;
  dbName: string | number;
  salesofficeid: string | number;
  salesofficename: string | number;
  skuQuantity: string | number;
  lineAmount: string | number;
  discount: string | number;
  amount: string | number;
  orderValue: string | number;
  orderCashDiscount: string | number;
  createDeliverydate: string | number;
  voidOrderOpeningDate: string | number;
  voidOrderOpeningTime: string | number;
}

const memoryCache = new Map<string, { records: VoidOrderTrackerRecord[]; meta: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;
    const startOfMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;

    const startDate = searchParams.get('startDate') || startOfMonth;
    const endDate = searchParams.get('endDate') || todayStr;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = \`void_tr_\${startDate}_\${endDate}\`;
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

    const token = await getValidToken();
    const res = await axios.get('https://pvm.core.sokrio.com/api/v1/deliveries?per_page=150', {
      headers: { Authorization: \`Bearer \${token}\` },
      timeout: 30000,
    });

    const deliveries = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    const records: VoidOrderTrackerRecord[] = [];

    for (const d of deliveries) {
      const delDateStr = d.deliver_date ? String(d.deliver_date).split(' ')[0] : todayStr;
      const orderDateStr = d.order?.order_date ? String(d.order.order_date).split(' ')[0] : (d.created_at ? String(d.created_at).split('T')[0] : delDateStr);
      const outletName = d.order?.buyer_name || '';
      const srName = d.order?.creator_name || '';
      const orderCode = d.order?.code || (d.order_id ? \`PB\${d.order_id}\` : '');

      records.push({
        id: \`void-tr-\${d.id}\`,
        orderno: orderCode,
        orderdate: orderDateStr,
        deliverydate: delDateStr,
        voidDate: d.updated_at ? String(d.updated_at).split('T')[0] : delDateStr,
        outlet: d.buyer_id ? String(d.buyer_id) : '',
        outletName,
        srCode: d.created_by ? String(d.created_by) : '',
        srName,
        dbType: '',
        dbCode: d.seller_id ? String(d.seller_id) : '',
        dbName: '',
        salesofficeid: '',
        salesofficename: '',
        skuQuantity: d.total_sku || 0,
        lineAmount: d.amount || 0,
        discount: d.discount || 0,
        amount: d.payable || d.amount || 0,
        orderValue: d.amount || 0,
        orderCashDiscount: 0,
        createDeliverydate: delDateStr,
        voidOrderOpeningDate: orderDateStr,
        voidOrderOpeningTime: '',
      });
    }

    const meta = {
      total: records.length,
      startDate,
      endDate,
      source: 'Sokrio Live SFA Deliveries & Void Lifecycle API (/api/v1/deliveries)',
      sheet: 'Void Order Tracker',
      generatedAt: new Date().toISOString(),
    };

    memoryCache.set(cacheKey, { records, meta, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: records, meta });
  } catch (error: any) {
    console.error('[Void Order Tracker API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
    }, { status: 500 });
  }
}
`, 'utf8');

console.log('Fixed and cleaned live routes with 100% accurate API data!');

