import { NextRequest, NextResponse } from 'next/server';
import doReceivingData from '@/lib/doReceivingSample.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const records = (doReceivingData as any[]).map((obj, idx) => ({
      id: `dorec-${idx + 1}`,
      cluster: String(obj['Cluster'] || 'Central'),
      area: String(obj['Area'] || 'Central South'),
      territory: String(obj['Territory'] || 'Jatra Bari'),
      dBCode: obj['DB Code'] || obj['DBCode'] || 102267,
      dbCode: obj['DB Code'] || obj['DBCode'] || 102267,
      dBName: String(obj['DB Name'] || obj['DBName'] || 'M/S Ahamed Enterprise'),
      dbName: String(obj['DB Name'] || obj['DBName'] || 'M/S Ahamed Enterprise'),
      dBType: String(obj['DB Type'] || 'Main DB'),
      dbType: String(obj['DB Type'] || 'Main DB'),
      poDateTime: String(obj['PO Date & Time'] || '08/09/2026 13:32:01 PM'),
      poNumber: String(obj['PO Number'] || 'PO9_09082026_00292'),
      invoiceNo: String(obj['Invoice No'] || '80343930'),
      invoiceDateTime: String(obj['Invoice Date & Time'] || '08/09/2026 19:56:29 PM'),
      docType: String(obj['Doc Type'] || 'ZBF2'),
      doReceivingDateTime: String(obj['DO Receiving Date & Time'] || '11/09/2026 23:06:32 PM'),
      brand: String(obj['Brand'] || 'Mentos'),
      sKUCode: obj['SKU Code'] || 651092,
      skuCode: obj['SKU Code'] || 651092,
      sKUName: String(obj['SKU Name'] || ''),
      skuName: String(obj['SKU Name'] || ''),
      uOM: String(obj['UOM'] || 'BOX'),
      uom: String(obj['UOM'] || 'BOX'),
      sapQtyCtn: obj['SAP Quantity in CTN'] ?? 1,
      sapQtyPcs: obj['SAP Quantity in PCs'] ?? 12,
      sapValueDBLanding: obj['SAP Value in DB Landing'] ?? 9142.8,
      sapTon: obj['SAP Ton'] ?? 0.0062208,
      dbReceivedQtyCtn: obj['DB Received Quantity in CTN'] ?? 1,
      dbReceivedQtyPcs: obj['DB Received Quantity in PCs'] ?? 12,
      dbReceivedValueDBLanding: obj['DB Received Value in DB Landing'] ?? 9142.8,
      dbReceivedTon: obj['DB Received Ton'] ?? 0.0062208,
      doReceivingStatus: String(obj['DO Receiving Status'] || 'Received'),
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Perfetti Van Melle SAP ERP DO Receiving & Primary Fulfillment Ledger',
        sheet: 'DO Receiving Status Report',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[DO Receiving Status API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
