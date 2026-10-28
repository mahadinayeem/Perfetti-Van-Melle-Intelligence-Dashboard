const fs = require('fs');

const pageTsx = fs.readFileSync('src/app/page.tsx', 'utf8');

const returnIdx = pageTsx.indexOf('  return (\n    <div style={{ minHeight: \'100vh\'');
if (returnIdx === -1) {
  console.error('Could not find return statement');
  process.exit(1);
}

const kpisMemoCode = `
  // Dynamic Tailored KPIs for all 35 Reports
  const currentKpis = useMemo(() => {
    const records: any[] = filteredAndSortedRecords || [];
    switch (activeTab) {
      case 'bwiw':
        return [
          { title: 'Total Invoices', val: (metaInfo?.uniqueInvoices ?? new Set(records.map(r => r.invoiceNo).filter(Boolean)).size).toLocaleString(), sub: 'Distinct Sales Memos', color: 'blue', icon: FileSpreadsheet },
          { title: 'Delivery Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.deliveryValueAfterDiscount || r.deliveryValue) || 0), 0)).toLocaleString()}\`, sub: 'Delivered Value After Disc', color: 'purple', icon: CheckCircle2 },
          { title: 'SKU Lines Ordered', val: records.length.toLocaleString(), sub: 'Line-Item Order Details', color: 'amber', icon: Layers },
          { title: 'Active SKUs', val: new Set(records.map(r => r.skuCode).filter(Boolean)).size.toLocaleString(), sub: 'Unique Products Sold', color: 'green', icon: Boxes },
        ];
      case 'daily_sr':
        return [
          { title: 'Active SRs', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Sales Reps Reporting', color: 'blue', icon: Users },
          { title: 'Market Calls', val: Math.round(records.reduce((s, r) => s + (Number(r.totalCall) || 0), 0)).toLocaleString(), sub: 'Total Scheduled Calls', color: 'green', icon: Store },
          { title: 'Productive Calls (PC)', val: Math.round(records.reduce((s, r) => s + (Number(r.totalPC) || 0), 0)).toLocaleString(), sub: 'Orders Generated', color: 'purple', icon: CheckCircle2 },
          { title: 'Total Sales Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.totalValue) || 0), 0)).toLocaleString()}\`, sub: 'Gross Order Booking', color: 'amber', icon: DollarSign },
        ];
      case 'live_detail':
        return [
          { title: 'Visited Outlets', val: Math.round(records.reduce((s, r) => s + (Number(r.visitedOutlet) || 0), 0)).toLocaleString(), sub: "Today's Field Execution", color: 'blue', icon: Store },
          { title: 'Productive Calls', val: Math.round(records.reduce((s, r) => s + (Number(r.productiveCall) || 0), 0)).toLocaleString(), sub: 'Successful Orders', color: 'green', icon: CheckCircle2 },
          { title: 'Live Order Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}\`, sub: 'Real-Time Market Sales', color: 'purple', icon: DollarSign },
          { title: 'Avg Strike Rate', val: \`\${records.length > 0 ? (records.reduce((s, r) => s + (parseFloat(String(r.strikeRate).replace('%', '')) || 0), 0) / records.length).toFixed(1) : '0.0'}%\`, sub: 'Market Productivity %', color: 'amber', icon: Target },
        ];
      case 'live_order_update':
        return [
          { title: 'Total Orders', val: new Set(records.map(r => r.orderNo).filter(Boolean)).size.toLocaleString(), sub: 'Live Orders Received', color: 'blue', icon: ShoppingBag },
          { title: 'Gross Order Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}\`, sub: 'Value Before Discount', color: 'green', icon: DollarSign },
          { title: 'Total Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Total SKU Pieces', color: 'purple', icon: Boxes },
          { title: 'Net Booking Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.valueAfterDiscount || r.orderValue) || 0), 0)).toLocaleString()}\`, sub: 'Net Value After Disc', color: 'amber', icon: CheckCircle2 },
        ];
      case 'stock':
        return [
          { title: 'Active Distributors', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'Warehouses / Points', color: 'blue', icon: Store },
          { title: 'Billable Stock (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.billableStock) || 0), 0)).toLocaleString(), sub: 'Ready For Dispatch', color: 'green', icon: Boxes },
          { title: 'Pending Delivery', val: Math.round(records.reduce((s, r) => s + (Number(r.pendingDelivery) || 0), 0)).toLocaleString(), sub: 'In-Transit to Market', color: 'amber', icon: Truck },
          { title: 'Stock Value (Trade)', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.billableStockValueInTradePrice || r.billableStockValueInDbLanding) || 0), 0)).toLocaleString()}\`, sub: 'Trade Inventory Worth', color: 'purple', icon: DollarSign },
        ];
      case 'do_receiving':
        return [
          { title: 'Total POs', val: new Set(records.map(r => r.poNumber).filter(Boolean)).size.toLocaleString(), sub: 'Factory Supply Orders', color: 'blue', icon: FileCheck },
          { title: 'SAP Qty (CTN)', val: Math.round(records.reduce((s, r) => s + (Number(r.sapQuantityInCtn) || 0), 0)).toLocaleString(), sub: 'Invoiced Cartons', color: 'green', icon: Boxes },
          { title: 'DB Received (CTN)', val: Math.round(records.reduce((s, r) => s + (Number(r.dbReceivedQuantityInCtn) || 0), 0)).toLocaleString(), sub: 'Physical CTNs Received', color: 'purple', icon: PackageCheck },
          { title: 'Total SAP Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.sapValueInDbLanding) || 0), 0)).toLocaleString()}\`, sub: 'DB Landing Value', color: 'amber', icon: DollarSign },
        ];
      case 'approved_po':
        return [
          { title: 'Approved POs', val: new Set(records.map(r => r.poNumber).filter(Boolean)).size.toLocaleString(), sub: 'Management Approved', color: 'blue', icon: CheckCircle2 },
          { title: 'Approved Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.poQuantity) || 0), 0)).toLocaleString(), sub: 'Total Approved Units', color: 'green', icon: Boxes },
          { title: 'DB Landing Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.valueInDbLanding) || 0), 0)).toLocaleString()}\`, sub: 'Total Invoiced Cost', color: 'purple', icon: DollarSign },
          { title: 'Unique SKUs', val: new Set(records.map(r => r.skuCode).filter(Boolean)).size.toLocaleString(), sub: 'Catalog Items', color: 'amber', icon: Layers },
        ];
      case 'memo_print':
        return [
          { title: 'Printed Memos', val: new Set(records.map(r => r.printingMemoNo).filter(Boolean)).size.toLocaleString(), sub: 'Handheld Print Slips', color: 'blue', icon: Printer },
          { title: 'Order Memos', val: new Set(records.map(r => r.orderMemoNo).filter(Boolean)).size.toLocaleString(), sub: 'Booked Market Memos', color: 'green', icon: FileText },
          { title: 'Active SRs', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Field Reps Printing', color: 'purple', icon: Users },
          { title: 'Active DBs', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'Distributor Coverage', color: 'amber', icon: Store },
        ];
      case 'po_crs':
        return [
          { title: 'Distributors', val: new Set(records.map(r => r.distributorId).filter(Boolean)).size.toLocaleString(), sub: 'CRS Recommended DBs', color: 'blue', icon: Store },
          { title: 'Suggested Qty', val: Math.round(records.reduce((s, r) => s + (Number(r.suggestedQty) || 0), 0)).toLocaleString(), sub: 'Auto Replenishment Units', color: 'green', icon: Boxes },
          { title: 'Suggested Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}\`, sub: 'Total Recommended Value', color: 'purple', icon: DollarSign },
          { title: 'CRS SKU Lines', val: records.length.toLocaleString(), sub: 'SKU Line Recommendations', color: 'amber', icon: Layers },
        ];
      case 'sr_login':
        return [
          { title: 'Attendance Logs', val: records.length.toLocaleString(), sub: 'Daily Punch Records', color: 'blue', icon: LogIn },
          { title: 'Unique SRs Logged', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Present in Field', color: 'green', icon: UserCheck },
          { title: 'Day End Completed', val: records.filter(r => r.dayEnd).length.toLocaleString(), sub: 'Market Closed Logs', color: 'purple', icon: Clock },
          { title: 'Covered DBs', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'Distribution Points', color: 'amber', icon: Store },
        ];
      case 'summary_print':
        return [
          { title: 'Printed Summaries', val: records.length.toLocaleString(), sub: 'Daily Day-End Prints', color: 'blue', icon: Printer },
          { title: 'Active SRs', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Field Reps Summarized', color: 'green', icon: Users },
          { title: 'Active DBs', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'Distributor Depots', color: 'purple', icon: Store },
          { title: 'Territories', val: new Set(records.map(r => r.territory).filter(Boolean)).size.toLocaleString(), sub: 'Market Coverage', color: 'amber', icon: MapPin },
        ];
      case 'te_attendance':
        return [
          { title: 'Attendance Records', val: records.length.toLocaleString(), sub: 'TE Field Time Logs', color: 'blue', icon: UserCheck },
          { title: 'Active TEs', val: new Set(records.map(r => r.teCode).filter(Boolean)).size.toLocaleString(), sub: 'Supervisors in Market', color: 'green', icon: Users },
          { title: 'Territories Covered', val: new Set(records.map(r => r.territoryName).filter(Boolean)).size.toLocaleString(), sub: 'Field Territories', color: 'purple', icon: MapPin },
          { title: 'Regions / Areas', val: new Set(records.map(r => r.areaName).filter(Boolean)).size.toLocaleString(), sub: 'Regional Footprint', color: 'amber', icon: Target },
        ];
      case 'te_visit':
        return [
          { title: 'Field Visits', val: records.length.toLocaleString(), sub: 'TE Supervisory Visits', color: 'blue', icon: Store },
          { title: 'Visited Outlets', val: Math.round(records.reduce((s, r) => s + (Number(r.visitedOl) || 0), 0)).toLocaleString(), sub: 'Retail Outlets Audited', color: 'green', icon: CheckCircle2 },
          { title: 'TEs in Market', val: new Set(records.map(r => r.teTsoCode).filter(Boolean)).size.toLocaleString(), sub: 'Executive Presence', color: 'purple', icon: Users },
          { title: 'Visited Hubs', val: new Set(records.map(r => r.distributorId).filter(Boolean)).size.toLocaleString(), sub: 'Distributors Monitored', color: 'amber', icon: Store },
        ];
      case 'super_sub_stock':
        return [
          { title: 'Transfer Records', val: records.length.toLocaleString(), sub: 'Super to Sub Movements', color: 'blue', icon: Truck },
          { title: 'Primary Qty (CTN)', val: Math.round(records.reduce((s, r) => s + (Number(r.primarySkuCtn) || 0), 0)).toLocaleString(), sub: 'Transfer Cartons', color: 'green', icon: Boxes },
          { title: 'Transfer Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.primarySkuValue) || 0), 0)).toLocaleString()}\`, sub: 'Stock Transfer Value', color: 'purple', icon: DollarSign },
          { title: 'Transfer Tonnage', val: \`\${records.reduce((s, r) => s + (Number(r.primarySkuQtyInTons) || 0), 0).toFixed(2)} Tons\`, sub: 'Gross Weight Shipped', color: 'amber', icon: PackageCheck },
        ];
      case 'stockist_secondary':
        return [
          { title: 'Secondary Sales Qty', val: Math.round(records.reduce((s, r) => s + (Number(r.secondarySales) || 0), 0)).toLocaleString(), sub: 'Outlets Secondary Offtake', color: 'blue', icon: ShoppingBag },
          { title: 'Sales Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.secondarySalesValue) || 0), 0)).toLocaleString()}\`, sub: 'Net Secondary Revenue', color: 'green', icon: DollarSign },
          { title: 'Closing Stock (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.closingStock) || 0), 0)).toLocaleString(), sub: 'Stockist Inventory Left', color: 'purple', icon: Boxes },
          { title: 'Secondary Volume', val: \`\${records.reduce((s, r) => s + (Number(r.secondarySalesTon) || 0), 0).toFixed(2)} Tons\`, sub: 'Tonnage Executed', color: 'amber', icon: FileBarChart },
        ];
      case 'invoice_list':
        return [
          { title: 'Total Invoices', val: new Set(records.map(r => r.invoiceNo).filter(Boolean)).size.toLocaleString(), sub: 'Generated Memos', color: 'blue', icon: Receipt },
          { title: 'Invoiced Units', val: Math.round(records.reduce((s, r) => s + (Number(r.quantity) || 0), 0)).toLocaleString(), sub: 'Total Pieces Invoiced', color: 'green', icon: Boxes },
          { title: 'Invoiced Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.totalAmt) || 0), 0)).toLocaleString()}\`, sub: 'Net Invoice Value', color: 'purple', icon: DollarSign },
          { title: 'Unique Outlets', val: new Set(records.map(r => r.custNo).filter(Boolean)).size.toLocaleString(), sub: 'Customers Billed', color: 'amber', icon: Store },
        ];
      case 'foc_claim':
        return [
          { title: 'FOC Claims', val: records.length.toLocaleString(), sub: 'Free Of Cost Entries', color: 'blue', icon: Tag },
          { title: 'FOC Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Promotional Units', color: 'green', icon: Boxes },
          { title: 'Total Claim Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.claimAmount) || 0), 0)).toLocaleString()}\`, sub: 'Claim Value Claimed', color: 'purple', icon: DollarSign },
          { title: 'Beneficiary Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Retailers Benefited', color: 'amber', icon: Store },
        ];
      case 'wholesale_claim':
        return [
          { title: 'Wholesale Claims', val: records.length.toLocaleString(), sub: 'WS Trade Claims', color: 'blue', icon: FileSpreadsheet },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Wholesale Units', color: 'green', icon: Boxes },
          { title: 'Claim Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.claimAmount) || 0), 0)).toLocaleString()}\`, sub: 'Reimbursement Value', color: 'purple', icon: DollarSign },
          { title: 'Wholesale Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'WS Customers Claiming', color: 'amber', icon: Store },
        ];
      case 'urban_retail_claim':
        return [
          { title: 'Urban Claims', val: records.length.toLocaleString(), sub: 'City Retail Scheme Claims', color: 'blue', icon: ShoppingBag },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Retail Promo Units', color: 'green', icon: Boxes },
          { title: 'Rebate Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}\`, sub: 'Urban Trade Scheme Rebate', color: 'purple', icon: DollarSign },
          { title: 'Urban Retailers', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Participating Stores', color: 'amber', icon: Store },
        ];
      case 'rural_retail_claim':
        return [
          { title: 'Rural Retail Claims', val: records.length.toLocaleString(), sub: 'Village / Rural Schemes', color: 'blue', icon: Store },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Rural Scheme Units', color: 'green', icon: Boxes },
          { title: 'Claim Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}\`, sub: 'Rural Incentive Payout', color: 'purple', icon: DollarSign },
          { title: 'Rural Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Claiming Rural Outlets', color: 'amber', icon: MapPin },
        ];
      case 'rural_ws_claim':
        return [
          { title: 'Rural WS Claims', val: records.length.toLocaleString(), sub: 'Rural WS Promotions', color: 'blue', icon: Truck },
          { title: 'Invoice Amount', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.totalInvoiceAmount) || 0), 0)).toLocaleString()}\`, sub: 'Gross WS Invoiced', color: 'green', icon: DollarSign },
          { title: 'Discount Settled', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.totalInvoiceDiscount) || 0), 0)).toLocaleString()}\`, sub: 'Trade Discount Total', color: 'purple', icon: CheckCircle2 },
          { title: 'Rural WS Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'WS Wholesale Points', color: 'amber', icon: Store },
        ];
      case 'freight_export':
        return [
          { title: 'Freight Shipments', val: records.length.toLocaleString(), sub: 'Dispatch Delivery Runs', color: 'blue', icon: Boxes },
          { title: 'Shipped CTNs', val: Math.round(records.reduce((s, r) => s + (Number(r.salesQtyInCtn) || 0), 0)).toLocaleString(), sub: 'Total Master Cartons', color: 'green', icon: PackageCheck },
          { title: 'Freight Sales Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}\`, sub: 'Net Delivery Value', color: 'purple', icon: DollarSign },
          { title: 'Receiving Hubs', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'DB & Sub-DB Depots', color: 'amber', icon: Store },
        ];
      case 'user_info':
        return [
          { title: 'Total System Users', val: records.length.toLocaleString(), sub: 'Registered Accounts', color: 'blue', icon: Users },
          { title: 'Field SRs', val: records.filter(r => String(r.userType).toUpperCase().includes('SR')).length.toLocaleString(), sub: 'Sales Representatives', color: 'green', icon: UserCheck },
          { title: 'Territory Execs (TE)', val: records.filter(r => String(r.userType).toUpperCase().includes('TE')).length.toLocaleString(), sub: 'Market Supervisors', color: 'purple', icon: Target },
          { title: 'Territories Covered', val: new Set(records.map(r => r.territory || r.areaName).filter(Boolean)).size.toLocaleString(), sub: 'Geographic Foothold', color: 'amber', icon: MapPin },
        ];
      case 'license_report':
        return [
          { title: 'Total Licenses', val: records.length.toLocaleString(), sub: 'Issued Handheld Licenses', color: 'blue', icon: ShieldCheck },
          { title: 'Active Mobile Devices', val: records.filter(r => String(r.active).toLowerCase().includes('act')).length.toLocaleString(), sub: 'Authorized Devices', color: 'green', icon: Smartphone },
          { title: 'TE Mobile Licenses', val: records.filter(r => String(r.licenseType).toUpperCase().includes('TE')).length.toLocaleString(), sub: 'Supervisor Tier', color: 'purple', icon: Users },
          { title: 'SR SFA Licenses', val: records.filter(r => String(r.licenseType).toUpperCase().includes('SR')).length.toLocaleString(), sub: 'Field Representative Tier', color: 'amber', icon: UserCheck },
        ];
      case 'leave_detail':
        return [
          { title: 'Leave Applications', val: records.length.toLocaleString(), sub: 'Formal Requests', color: 'blue', icon: CalendarCheck },
          { title: 'Total Leave Days', val: Math.round(records.reduce((s, r) => s + (Number(r.noOfDaysLeave) || 0), 0)).toLocaleString(), sub: 'Cumulative Duty Off Days', color: 'green', icon: Clock },
          { title: 'Casual Leaves', val: records.filter(r => String(r.leaveType).toUpperCase().includes('CASUAL')).length.toLocaleString(), sub: 'Personal Emergency Off', color: 'purple', icon: Users },
          { title: 'Sick Leaves', val: records.filter(r => String(r.leaveType).toUpperCase().includes('SICK')).length.toLocaleString(), sub: 'Medical Excuses', color: 'amber', icon: CalendarOff },
        ];
      case 'non_bill_outlet':
        return [
          { title: 'Non-Bill Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Unproductive Outlets', color: 'blue', icon: MapPinOff },
          { title: 'Unproductive Visits', val: records.length.toLocaleString(), sub: 'Visits with 0 Orders', color: 'green', icon: Store },
          { title: 'Affected Routes', val: new Set(records.map(r => r.routeCode).filter(Boolean)).size.toLocaleString(), sub: 'Low Offtake Beats', color: 'purple', icon: MapPin },
          { title: 'Field SRs Audited', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Assigned Representatives', color: 'amber', icon: Users },
        ];
      case 'te_version_list':
        return [
          { title: 'Registered TEs', val: new Set(records.map(r => r.teCode).filter(Boolean)).size.toLocaleString(), sub: 'Territory Executives', color: 'blue', icon: Smartphone },
          { title: 'Latest TE Build', val: String(records[0]?.versionNo || '5.1.2.70.39'), sub: 'Sokrio Production Version', color: 'green', icon: ShieldCheck },
          { title: 'Sales Regions', val: new Set(records.map(r => r.salesRegion).filter(Boolean)).size.toLocaleString(), sub: 'Macro Operating Zones', color: 'purple', icon: MapPin },
          { title: 'Territories', val: new Set(records.map(r => r.territoryName).filter(Boolean)).size.toLocaleString(), sub: 'Executive Beats', color: 'amber', icon: Target },
        ];
      case 'sr_version_list':
        return [
          { title: 'Registered SRs', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Field Force Footprint', color: 'blue', icon: Smartphone },
          { title: 'Active Builds', val: new Set(records.map(r => r.versionNo).filter(Boolean)).size.toLocaleString(), sub: 'App Versions in Market', color: 'green', icon: ShieldCheck },
          { title: 'Distributor Hubs', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'DB Base Stations', color: 'purple', icon: Store },
          { title: 'Active Territories', val: new Set(records.map(r => r.territoryName).filter(Boolean)).size.toLocaleString(), sub: 'Operated Territories', color: 'amber', icon: MapPin },
        ];
      case 'geo_tag':
        return [
          { title: 'Geo-Tagged Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'GPS Pinned Outlets', color: 'blue', icon: Navigation },
          { title: 'Active Locations', val: records.filter(r => r.isActive === 'Y').length.toLocaleString(), sub: 'Verified Coordinates', color: 'green', icon: CheckCircle2 },
          { title: 'Tagged Routes', val: new Set(records.map(r => r.routeCode).filter(Boolean)).size.toLocaleString(), sub: 'Digital PJP Paths', color: 'purple', icon: MapPin },
          { title: 'Distributor Hubs', val: new Set(records.map(r => r.distributorId).filter(Boolean)).size.toLocaleString(), sub: 'Linked DB Bases', color: 'amber', icon: Store },
        ];
      case 'delivery_confirmation':
        return [
          { title: 'Delivered Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.deliveredValue) || 0), 0)).toLocaleString()}\`, sub: 'Fulfilled Secondary Value', color: 'blue', icon: DollarSign },
          { title: 'Delivered Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.deliveredQty) || 0), 0)).toLocaleString(), sub: 'Total Delivered Pieces', color: 'green', icon: CheckCircle2 },
          { title: 'Returned Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.returnedValue) || 0), 0)).toLocaleString()}\`, sub: 'Market Damage / Returns', color: 'purple', icon: Clock },
          { title: 'Delivered Outlets (PC)', val: Math.round(records.reduce((s, r) => s + (Number(r.deliveredPc) || 0), 0)).toLocaleString(), sub: 'Fulfilled Drops', color: 'amber', icon: Store },
        ];
      case 'sr_wise_sku':
        return [
          { title: 'SKU Line Items', val: records.length.toLocaleString(), sub: 'Distinct SKU Audits', color: 'blue', icon: Boxes },
          { title: 'Ordered Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.orderedQty) || 0), 0)).toLocaleString(), sub: 'Gross Order Quantity', color: 'green', icon: ShoppingBag },
          { title: 'Delivered Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.totalAmountDeliver) || 0), 0)).toLocaleString()}\`, sub: 'Gross Fulfilled Amount', color: 'purple', icon: DollarSign },
          { title: 'Net Realized Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.netAmount) || 0), 0)).toLocaleString()}\`, sub: 'Net After Trade Discount', color: 'amber', icon: CheckCircle2 },
        ];
      case 'void_order':
        return [
          { title: 'Void Orders', val: new Set(records.map(r => r.orderno).filter(Boolean)).size.toLocaleString(), sub: 'Cancelled Transactions', color: 'blue', icon: XCircle },
          { title: 'Void Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.skuQuantity) || 0), 0)).toLocaleString(), sub: 'Total Cancelled Pieces', color: 'green', icon: Boxes },
          { title: 'Void Order Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}\`, sub: 'Cancelled Revenue', color: 'purple', icon: DollarSign },
          { title: 'Affected Outlets', val: new Set(records.map(r => r.outlet).filter(Boolean)).size.toLocaleString(), sub: 'Outlets with Voids', color: 'amber', icon: Store },
        ];
      case 'void_order_tracker':
        return [
          { title: 'Tracked Voids', val: new Set(records.map(r => r.orderno).filter(Boolean)).size.toLocaleString(), sub: 'Audit Trail Records', color: 'blue', icon: ClockAlert },
          { title: 'Total Void Value', val: \`৳ \${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}\`, sub: 'Void Financial Exposure', color: 'green', icon: DollarSign },
          { title: 'Void SKU Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.skuQuantity) || 0), 0)).toLocaleString(), sub: 'Cancelled Stock CTN/Units', color: 'purple', icon: Boxes },
          { title: 'Active SRs Audited', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Representatives Involved', color: 'amber', icon: Users },
        ];
      case 'mt_sku_update':
        return [
          { title: 'MT Store Audits', val: records.length.toLocaleString(), sub: 'Modern Trade Planograms', color: 'blue', icon: Layers },
          { title: 'Audited MT Chains', val: new Set(records.map(r => r.customerNo).filter(Boolean)).size.toLocaleString(), sub: 'Supermarket Outlets', color: 'green', icon: Store },
          { title: 'Brands Checked', val: new Set(records.map(r => r.brand).filter(Boolean)).size.toLocaleString(), sub: 'Key Modern Trade Brands', color: 'purple', icon: Tag },
          { title: 'Audited SKUs', val: new Set(records.map(r => r.skuCode).filter(Boolean)).size.toLocaleString(), sub: 'Shelf Space Articles', color: 'amber', icon: Boxes },
        ];
      case 'mt_visit':
        return [
          { title: 'MT Store Visits', val: records.length.toLocaleString(), sub: 'Modern Trade Visits', color: 'blue', icon: Store },
          { title: 'Completed Visits', val: records.filter(r => r.clockOutTime).length.toLocaleString(), sub: 'Logged Clock-Outs', color: 'green', icon: CheckCircle2 },
          { title: 'Supermarket Outlets', val: new Set(records.map(r => r.customerNo).filter(Boolean)).size.toLocaleString(), sub: 'Hyper / Super Stores', color: 'purple', icon: ShoppingBag },
          { title: 'Field Staff in MT', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'MT Merchandisers / SRs', color: 'amber', icon: Users },
        ];
      default:
        return [
          { title: 'Total Records', val: records.length.toLocaleString(), sub: 'Total Rows', color: 'blue', icon: FileSpreadsheet },
          { title: 'Active Entities', val: records.length.toLocaleString(), sub: 'Processed Items', color: 'green', icon: CheckCircle2 },
          { title: 'Data Source', val: 'Sokrio API', sub: 'Real-Time Sync', color: 'purple', icon: RefreshCw },
          { title: 'Status', val: 'Verified', sub: 'Production Ready', color: 'amber', icon: Target },
        ];
    }
  }, [activeTab, filteredAndSortedRecords, metaInfo]);
`;

// Insert kpisMemoCode before return
const updatedWithMemo = pageTsx.substring(0, returnIdx) + kpisMemoCode + '\n' + pageTsx.substring(returnIdx);

// Now replace <section className="kpi-grid"> ... </section>
const kpiGridStart = updatedWithMemo.indexOf('<section className="kpi-grid"');
const kpiGridEnd = updatedWithMemo.indexOf('</section>', kpiGridStart);

const newKpiSection = `<section className="kpi-grid" aria-label="Key Performance Indicators">
          {currentKpis.map((kpi, idx) => (
            <div key={idx} className={\`kpi-card-premium kpi-card-\${kpi.color}\`}>
              <div className="kpi-top-row">
                <span className="kpi-title">{kpi.title}</span>
                <div className={\`kpi-icon-pill icon-\${kpi.color}\`}>
                  <kpi.icon size={20} />
                </div>
              </div>
              <div className="kpi-middle-row">
                <span className="kpi-main-val">{kpi.val}</span>
                <span className="kpi-subtext">{kpi.sub}</span>
              </div>
              <div className="kpi-progress-bar">
                <div className={\`kpi-progress-fill fill-\${kpi.color}\`} style={{ width: '100%' }}></div>
              </div>
            </div>
          ))}
        </section>`;

const finalPageTsx = updatedWithMemo.substring(0, kpiGridStart) + newKpiSection + updatedWithMemo.substring(kpiGridEnd + 10);

fs.writeFileSync('src/app/page.tsx', finalPageTsx, 'utf8');
console.log('Successfully injected dynamic tailored KPI system for all 35 reports!');
