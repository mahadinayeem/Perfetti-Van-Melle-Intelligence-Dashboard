import { NextRequest, NextResponse } from 'next/server';
import mtSkuData from '@/lib/mtSkuUpdateSample.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const records = (mtSkuData as any[]).map((obj, idx) => ({
      id: `mt-sku-${idx + 1}`,
      docDate: '12/10/2026',
      docdate: '12/10/2026',
      docTime: '17:37:38',
      doctime: '17:37:38',
      cluster: String(obj['Cluster'] || 'Organized Trade'),
      area: String(obj['Area'] || 'Organized Trade'),
      territory: String(obj['Territory'] || 'Organized Trade'),
      dBCode: obj['DB Code'] || '100001',
      dbCode: obj['DB Code'] || '100001',
      dBName: String(obj['DB Name'] || 'Organized Trade'),
      dbName: String(obj['DB Name'] || 'Organized Trade'),
      dBType: String(obj['DB Type'] || 'Modern Trade'),
      dbType: String(obj['DB Type'] || 'Modern Trade'),
      sRPositionCode: String(obj['SR Position Code'] || 'MT-001'),
      srPositionCode: String(obj['SR Position Code'] || 'MT-001'),
      sRCode: String(obj['SR Code'] || '90012'),
      srCode: String(obj['SR Code'] || '90012'),
      sRName: String(obj['SR Name'] || 'Rafiqul Islam'),
      srName: String(obj['SR Name'] || 'Rafiqul Islam'),
      routeCode: String(obj['Route Code'] || 'OT03R00067423244633'),
      routeName: String(obj['Route Name'] || 'Uttara 9 to uttara 11'),
      customerNo: String(obj['Customer No'] || 'OT03_20003709358'),
      customerName: String(obj['Customer Name'] || 'shwapno Uttara 10(Road -12) Express outlet'),
      brand: String(obj['Brand'] || 'Chupa Chups Rope'),
      motherSKUCode: String(obj['Mother SKU Code'] || 'MSKU0078'),
      motherSkuCode: String(obj['Mother SKU Code'] || 'MSKU0078'),
      motherSKUName: String(obj['Mother SKU Name'] || 'CC ROPE 60PCHx14P'),
      motherSkuName: String(obj['Mother SKU Name'] || 'CC ROPE 60PCHx14P'),
      sKUCode: String(obj['SKU Code'] || '651270'),
      skuCode: String(obj['SKU Code'] || '651270'),
      sKUName: String(obj['SKU Name'] || 'CC ROPE ST 60PCHx14Px4.5G'),
      skuName: String(obj['SKU Name'] || 'CC ROPE ST 60PCHx14Px4.5G'),
      documentNo: String(obj['Document No'] || 'PVMB65420261012173738'),
      checkOut: obj['CheckOut'] ?? 0,
      checkout: obj['CheckOut'] ?? 0,
      categoryShelf: obj['CategoryShelf'] ?? 8,
      categoryshelf: obj['CategoryShelf'] ?? 8,
      comment: String(obj['Comment'] || ''),
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Sokrio SFA Modern Trade Execution & Shelf Planogram Audit',
        sheet: 'MT SKU Update',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[MT SKU Update API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
