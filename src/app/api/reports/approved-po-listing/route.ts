import { NextRequest, NextResponse } from 'next/server';
import approvedPoData from '@/lib/approvedPoSample.json';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const records = (approvedPoData as any[]).map((obj, idx) => ({
      id: `po-${idx + 1}`,
      poNumber: String(obj['PO Number'] || `PO10_10042026_${String(idx + 1).padStart(4, '0')}`),
      poDate: String(obj['PODate'] || obj['PO Date'] || '10-04-2026'),
      poCreationTime: String(obj['PO Creation Time'] || '03:44 PM'),
      dBCode: obj['DBCode'] || obj['DB Code'] || 102267,
      dbCode: obj['DBCode'] || obj['DB Code'] || 102267,
      dBName: String(obj['DBName'] || obj['DB Name'] || 'M/S Ahamed Enterprise'),
      dbName: String(obj['DBName'] || obj['DB Name'] || 'M/S Ahamed Enterprise'),
      dBType: String(obj['DBType'] || obj['DB Type'] || 'Main DB'),
      dbType: String(obj['DBType'] || obj['DB Type'] || 'Main DB'),
      sKUCode: obj['SKU Code'] || '651287',
      skuCode: obj['SKU Code'] || '651287',
      sKUName: String(obj['SKU Name'] || ''),
      skuName: String(obj['SKU Name'] || ''),
      poQuantity: obj['PO Quantity'] ?? 24,
      valueInDbLanding: obj['Value in DB Landing'] ?? 7657.06,
      approvedBy: String(obj['ApprovedBy'] || obj['Approved By'] || '102267'),
      approvedDateTime: String(obj['Approved Date & Time'] || '10-04-2026  9:46 AM'),
      status: String(obj['Status'] || 'Approved'),
      createConfirmDateTime: String(obj['Create/Confirm Date & Time'] || '10-04-2026 03:45 PM'),
      createdFrom: String(obj['Created From'] || 'WEB'),
      subDbInvoiceReceivingDate: String(obj['SUB DB Invoice Receiving Date'] || ''),
      subDbInvoiceReceivingTime: String(obj['SUB DB Invoice Receiving Time'] || ''),
      void: String(obj['Void'] || 'Not Void'),
    }));

    return NextResponse.json({
      success: true,
      data: records,
      meta: {
        total: records.length,
        source: 'Perfetti Van Melle SAP Primary PO & Order Confirmation Ledger',
        sheet: 'Approved PO Listing',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Approved PO Listing API Error]:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
