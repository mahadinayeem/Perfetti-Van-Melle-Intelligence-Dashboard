'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Store,
  Clock,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  RotateCcw,
  Sparkles,
  LogOut,
  ShoppingBag,
  BarChart3,
  Radio,
  DollarSign,
  Layers,
  Activity,
  Target,
  Boxes,
  Truck,
  FileCheck,
  ClipboardCheck,
  LogIn,
  Printer,
  FileText,
  UserCheck,
  MapPin,
  Receipt,
  PackageCheck,
  FileBarChart,
  Tag,
  ShieldCheck,
  MapPinOff,
  Smartphone,
  Navigation,
  XCircle,
  ClockAlert,
  CalendarCheck,
  CalendarOff,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export type ActiveTab =
  | 'bwiw'
  | 'daily_sr'
  | 'live_detail'
  | 'live_order_update'
  | 'stock'
  | 'do_receiving'
  | 'mt_visit'
  | 'approved_po'
  | 'po_crs'
  | 'sr_login'
  | 'memo_print'
  | 'summary_print'
  | 'te_attendance'
  | 'te_visit'
  | 'super_sub_stock'
  | 'stockist_secondary'
  | 'invoice_list'
  | 'foc_claim'
  | 'wholesale_claim'
  | 'urban_retail_claim'
  | 'rural_retail_claim'
  | 'rural_ws_claim'
  | 'freight_export'
  | 'user_info'
  | 'license_report'
  | 'leave_detail'
  | 'non_bill_outlet'
  | 'te_version_list'
  | 'sr_version_list'
  | 'geo_tag'
  | 'delivery_confirmation'
  | 'sr_wise_sku'
  | 'void_order'
  | 'void_order_tracker'
  | 'mt_sku_update';

export interface ColumnDef {
  key: string;
  label: string;
  pillType?: 'bold' | 'route' | 'sr' | 'cust' | 'timeIn' | 'timeOut' | 'success' | 'warning' | 'currency' | 'number';
}

const TAB_CONFIGS: {
  id: ActiveTab;
  label: string;
  icon: any;
  endpoint: string;
  badge?: string;
  desc: string;
  columns: ColumnDef[];
}[] = [
  {
    id: 'bwiw',
    label: 'BWIW Report',
    icon: ShoppingBag,
    endpoint: '/api/reports/bwiw',
    badge: 'Line Level',
    desc: 'Brand-Wise Item-Wise Sales, Invoices & Delivery Details',
    columns: [
      { key: 'orderDate', label: 'OrderDate', pillType: 'bold' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'territoryCode', label: 'Territorycode' },
      { key: 'town', label: 'Town' },
      { key: 'dbCode', label: 'DBCode', pillType: 'route' },
      { key: 'dbName', label: 'DBName' },
      { key: 'dbType', label: 'DBType' },
      { key: 'srCode', label: 'SRCode' },
      { key: 'srName', label: 'SRName', pillType: 'bold' },
      { key: 'srPositionCode', label: 'SRPositionCode', pillType: 'sr' },
      { key: 'routeCode', label: 'RouteCode' },
      { key: 'routeName', label: 'RouteName' },
      { key: 'customerCode', label: 'CustomerCode', pillType: 'cust' },
      { key: 'customerName', label: 'CustomerName', pillType: 'bold' },
      { key: 'channel', label: 'Channel' },
      { key: 'subChannel', label: 'subChannel' },
      { key: 'invoiceNo', label: 'InvoiceNo', pillType: 'route' },
      { key: 'category', label: 'Category' },
      { key: 'brand', label: 'Brand', pillType: 'bold' },
      { key: 'skuCode', label: 'SKUCode' },
      { key: 'skuName', label: 'SKUName', pillType: 'bold' },
      { key: 'deliveryUom', label: 'DeliveryUOM' },
      { key: 'noofSKUinCTN', label: 'NoofSKUinCTN', pillType: 'number' },
      { key: 'weightperSKUgm', label: 'WeightperSKUgm', pillType: 'number' },
      { key: 'skutp', label: 'SKUTP', pillType: 'currency' },
      { key: 'orderQty', label: 'OrderQty', pillType: 'number' },
      { key: 'orderVol', label: 'OrderVol', pillType: 'number' },
      { key: 'orderValue', label: 'OrderValue', pillType: 'currency' },
      { key: 'orderCashDiscount', label: 'OrderCashDiscount', pillType: 'currency' },
      { key: 'deliveryConfirmationDate', label: 'DeliveryConfirmationDate' },
      { key: 'deliveryDate', label: 'DeliveryDate', pillType: 'bold' },
      { key: 'deliveryQty', label: 'DeliveryQty', pillType: 'number' },
      { key: 'deliveryVol', label: 'DeliveryVol', pillType: 'number' },
      { key: 'deliveryValue', label: 'DeliveryValue', pillType: 'currency' },
      { key: 'deliveryCashDiscount', label: 'DeliveryCashDiscount', pillType: 'currency' },
      { key: 'freeQuantity', label: 'FreeQuantity', pillType: 'number' },
      { key: 'deliveryValueAfterDiscount', label: 'DeliveryValueAfterDiscount', pillType: 'currency' },
      { key: 'wsCashDiscount', label: 'WSCashDiscount', pillType: 'currency' },
      { key: 'motherSkuCode', label: 'Mother SKU Code', pillType: 'bold' },
      { key: 'createDeliveryDate', label: 'Create Delivery Date' },
    ],
  },
  {
    id: 'daily_sr',
    label: 'Daily SR Performance',
    icon: BarChart3,
    endpoint: '/api/reports/daily-sr-performance',
    badge: 'EOD Summary',
    desc: 'Daily SR Performance, Strike Rate, Visits & Delivery Metrics',
    columns: [
      { key: 'orderDate', label: 'OrderDate', pillType: 'bold' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'town', label: 'Town' },
      { key: 'dbCode', label: 'DBCode', pillType: 'route' },
      { key: 'dbName', label: 'DBName' },
      { key: 'dbType', label: 'DBType' },
      { key: 'srCode', label: 'SRCode' },
      { key: 'srName', label: 'SRName', pillType: 'bold' },
      { key: 'srPositionCode', label: 'SRPositionCode', pillType: 'sr' },
      { key: 'routeCode', label: 'RouteCode' },
      { key: 'routeName', label: 'RouteName' },
      { key: 'routeDay', label: 'RouteDay' },
      { key: 'routeChannel', label: 'RouteChannel' },
      { key: 'logingStatus', label: 'LogingStatus', pillType: 'success' },
      { key: 'retailOutlet', label: 'RetailOutlet', pillType: 'number' },
      { key: 'wsOutlet', label: 'WSOutlet', pillType: 'number' },
      { key: 'totalOutlet', label: 'TotalOutlet', pillType: 'number' },
      { key: 'retailCall', label: 'RetailCall', pillType: 'number' },
      { key: 'wsCall', label: 'WSCall', pillType: 'number' },
      { key: 'totalCall', label: 'TotalCall', pillType: 'number' },
      { key: 'retailPC', label: 'RetailPC', pillType: 'success' },
      { key: 'wsPC', label: 'WSPC', pillType: 'number' },
      { key: 'totalPC', label: 'TotalPC', pillType: 'success' },
      { key: 'retailValue', label: 'RetailValue', pillType: 'currency' },
      { key: 'retailValueb4disc', label: 'RetailValueb4disc', pillType: 'currency' },
      { key: 'wsValue', label: 'WSValue', pillType: 'currency' },
      { key: 'wsValueb4disc', label: 'WSValueb4disc', pillType: 'currency' },
      { key: 'totalValue', label: 'TotalValue', pillType: 'currency' },
      { key: 'totalValueb4disc', label: 'TotalValueb4disc', pillType: 'currency' },
      { key: 'lpc', label: 'LPC', pillType: 'number' },
      { key: 'strikeRate', label: 'StrikeRate', pillType: 'bold' },
      { key: 'retailPCDelivery', label: 'RetailPCDelivery', pillType: 'number' },
      { key: 'wsPCDelivery', label: 'WSPCDelivery', pillType: 'number' },
      { key: 'totalPCDelivery', label: 'TotalPCDelivery', pillType: 'number' },
      { key: 'retailValueDelivery', label: 'RetailValueDelivery', pillType: 'currency' },
      { key: 'retailValueDeliveryb4Disc', label: 'RetailValueDeliveryb4Disc', pillType: 'currency' },
      { key: 'wsValueDelivery', label: 'WSValueDelivery', pillType: 'currency' },
      { key: 'wsValueDeliveryb4Disc', label: 'WSValueDeliveryb4Disc', pillType: 'currency' },
      { key: 'totalValueDelivery', label: 'TotalValueDelivery', pillType: 'currency' },
      { key: 'totalValueDeliveryb4Disc', label: 'TotalValueDeliveryb4Disc', pillType: 'currency' },
      { key: 'deliveryRate', label: 'DeliveryRate', pillType: 'success' },
      { key: 'deliveryLPC', label: 'DeliveryLPC', pillType: 'number' },
      { key: 'dropSize', label: 'DropSize', pillType: 'currency' },
      { key: 'noOfRetailScheme', label: 'NoOfRetailScheme', pillType: 'number' },
      { key: 'noOfWSScheme', label: 'NoOfWSScheme', pillType: 'number' },
      { key: 'locationAccuracy', label: 'LocationAccuracy' },
      { key: 'latitude', label: 'Latitude' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'firstCall', label: 'FirstCall', pillType: 'timeIn' },
      { key: 'lastCall', label: 'LastCall', pillType: 'timeOut' },
      { key: 'totalTimeWorked', label: 'TotalTimeWorked', pillType: 'bold' },
      { key: 'totalTimeinOutlet', label: 'TotalTimeinOutlet', pillType: 'timeIn' },
      { key: 'totalTrasitTime', label: 'TotalTrasitTime', pillType: 'timeOut' },
      { key: 'timePerOutlet', label: 'TimePerOutlet' },
      { key: 'twoLPCOrder', label: '2 LPC Order', pillType: 'number' },
      { key: 'twoLPCDelivery', label: '2 LPC Delivery', pillType: 'number' },
    ],
  },
  {
    id: 'live_detail',
    label: 'Live Detail Report',
    icon: Radio,
    endpoint: '/api/reports/live-detail',
    badge: 'LIVE',
    desc: "Today's Real-Time Field Force Monitoring & Market Execution",
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'srPositionCode', label: 'SR Position Code', pillType: 'sr' },
      { key: 'srCode', label: 'SR Code' },
      { key: 'srName', label: 'SR Name', pillType: 'bold' },
      { key: 'routeCode', label: 'Route Code', pillType: 'route' },
      { key: 'routeName', label: 'Route Name' },
      { key: 'routeChannel', label: 'Route Channel' },
      { key: 'scheduleCall', label: "Today's Schedule Call", pillType: 'number' },
      { key: 'visitedOutlet', label: 'Total Visited Outlet', pillType: 'number' },
      { key: 'strikeRate', label: 'Strike Rate', pillType: 'bold' },
      { key: 'productiveCall', label: 'Total Productive Call', pillType: 'success' },
      { key: 'productivityPct', label: 'Productivity %', pillType: 'success' },
      { key: 'todayTarget', label: "Today's RR Target", pillType: 'currency' },
      { key: 'orderValueWholesale', label: 'Order Value (Wholesale)', pillType: 'currency' },
      { key: 'orderValueRetail', label: 'Order Value (Retail)', pillType: 'currency' },
      { key: 'orderValue', label: 'Order Value', pillType: 'currency' },
      { key: 'successPct', label: 'Success%', pillType: 'bold' },
      { key: 'perPcValue', label: 'Per PC Value', pillType: 'currency' },
      { key: 'tls', label: 'TLS', pillType: 'number' },
      { key: 'lpc', label: 'LPC', pillType: 'number' },
      { key: 'brandHandle', label: 'Brand Handle', pillType: 'number' },
      { key: 'lastSyncTime', label: 'Last Sync Time', pillType: 'timeOut' },
      { key: 'startWorkTime', label: 'Start Work Time', pillType: 'timeIn' },
      { key: 'endWorkTime', label: 'End Work Time', pillType: 'timeOut' },
      { key: 'totalWorkingHours', label: 'Total Working Hours', pillType: 'bold' },
      { key: 'firstCall', label: 'First Call', pillType: 'timeIn' },
      { key: 'lastCall', label: 'Last Call', pillType: 'timeOut' },
      { key: 'totalMarketWork', label: 'Total Market Work(Hour)', pillType: 'bold' },
      { key: 'totalSpendTimeOrderTaking', label: 'Total Spend Time of Order Taking', pillType: 'timeIn' },
      { key: 'transitTime', label: 'Transit Time', pillType: 'timeOut' },
      { key: 'locationAccuracy', label: 'Location Accuracy', pillType: 'number' },
      { key: 'twoLpcOrder', label: '2 LPC Order', pillType: 'number' },
      { key: 'noOfJarOrderQty', label: 'No of Jar Order Qty', pillType: 'number' },
      { key: 'srLeave', label: 'SR Leave', pillType: 'warning' },
    ],
  },
  {
    id: 'live_order_update',
    label: 'Live Order Update Report',
    icon: ShoppingBag,
    endpoint: '/api/reports/live-order-update',
    badge: 'LIVE ORDERS',
    desc: 'Real-Time SKU-Wise & Outlet-Wise Live Order Booking Tracker',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'srPosition', label: 'SR Position', pillType: 'sr' },
      { key: 'srCode', label: 'SR Code' },
      { key: 'srName', label: 'SR Name', pillType: 'bold' },
      { key: 'orderDate', label: 'Order Date', pillType: 'bold' },
      { key: 'routeCode', label: 'Route Code', pillType: 'route' },
      { key: 'routeName', label: 'Route Name' },
      { key: 'customerNo', label: 'Customer No', pillType: 'cust' },
      { key: 'customerName', label: 'Customer Name', pillType: 'bold' },
      { key: 'orderNo', label: 'Order No', pillType: 'bold' },
      { key: 'category', label: 'Category' },
      { key: 'motherSkuCode', label: 'Mother SKU Code' },
      { key: 'motherSkuName', label: 'Mother SKU Name' },
      { key: 'brand', label: 'Brand', pillType: 'bold' },
      { key: 'skuCode', label: 'SKU Code', pillType: 'bold' },
      { key: 'skuName', label: 'SKU Name' },
      { key: 'qty', label: 'Qty', pillType: 'number' },
      { key: 'price', label: 'Price', pillType: 'currency' },
      { key: 'orderValue', label: 'Order Value', pillType: 'currency' },
      { key: 'discountValue', label: 'Discount Value', pillType: 'currency' },
      { key: 'cashDiscount', label: 'Cash Discount', pillType: 'currency' },
      { key: 'valueAfterDiscount', label: 'Value After Discount', pillType: 'currency' },
      { key: 'orderStatus', label: 'Order Status', pillType: 'success' },
      { key: 'uom', label: 'UOM', pillType: 'bold' },
      { key: 'channel', label: 'Channel' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock Report',
    icon: Boxes,
    endpoint: '/api/reports/stock-report',
    badge: 'INVENTORY',
    desc: 'Distributor Live Stock Ledger, Floor Stock, Billable Stock & Valuation',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DBCode', pillType: 'route' },
      { key: 'dbName', label: 'DBName', pillType: 'bold' },
      { key: 'dbType', label: 'DBType' },
      { key: 'location', label: 'Location' },
      { key: 'itemNo', label: 'ItemNo', pillType: 'bold' },
      { key: 'description', label: 'Description', pillType: 'bold' },
      { key: 'billableStock', label: 'Billable Stock', pillType: 'number' },
      { key: 'pendingDelivery', label: 'Pending Delivery', pillType: 'number' },
      { key: 'floorStock', label: 'Floor Stock', pillType: 'number' },
      { key: 'openingStock', label: 'Opening Stock', pillType: 'number' },
      { key: 'primaryStock', label: 'Primary Stock', pillType: 'number' },
      { key: 'orderedQty', label: 'Ordered Qty', pillType: 'number' },
      { key: 'deliveredSecondary', label: 'Delivered Secondary', pillType: 'number' },
      { key: 'transit', label: 'Transit', pillType: 'number' },
      { key: 'doReceivingPending', label: 'DO Receiving Pending', pillType: 'number' },
      { key: 'billableStockValueDBLanding', label: 'Billable Stock Value in DB Landing', pillType: 'currency' },
      { key: 'pendingDeliveryValueDBLanding', label: 'Pending Delivery Value in DB Landing', pillType: 'currency' },
      { key: 'floorStockValueDBLanding', label: 'Floor Stock Value in DB Landing', pillType: 'currency' },
      { key: 'openingStockValueDBLanding', label: 'Opening Stock Value in DB Landing', pillType: 'currency' },
      { key: 'primaryStockValueDBLanding', label: 'Primary Stock Value in DB Landing', pillType: 'currency' },
      { key: 'orderedValueDBLanding', label: 'Ordered Value in DB Landing', pillType: 'currency' },
      { key: 'deliveredSecondaryValueDBLanding', label: 'Delivered Secondary Value in DB Landing', pillType: 'currency' },
      { key: 'transitValueDBLanding', label: 'Transit Value in DB Landing', pillType: 'currency' },
      { key: 'doReceivingPendingValueDBLanding', label: 'DO receiving Pending Value in DB Landing', pillType: 'currency' },
      { key: 'billableStockValueTradePrice', label: 'Billable Stock Value in Trade price', pillType: 'currency' },
      { key: 'pendingDeliveryValueTradePrice', label: 'Pending Delivery Value in Trade price', pillType: 'currency' },
      { key: 'floorStockValueTradePrice', label: 'Floor Stock Value in Trade price', pillType: 'currency' },
      { key: 'openingStockValueTradePrice', label: 'Opening Stock Value in Trade price', pillType: 'currency' },
      { key: 'primaryStockValueTradePrice', label: 'Primary Stock Value in Trade price', pillType: 'currency' },
      { key: 'orderedValueTradePrice', label: 'Ordered Value in Trade price', pillType: 'currency' },
      { key: 'deliveredSecondaryValueTradePrice', label: 'Delivered Secondary Value Trade price', pillType: 'currency' },
      { key: 'transitValueTradePrice', label: 'Transit Value Trade price', pillType: 'currency' },
      { key: 'doReceivingPendingValueTradePrice', label: 'DO receiving Pending Value in Trade Price', pillType: 'currency' },
      { key: 'dbStatus', label: 'DB Status', pillType: 'success' },
      { key: 'createDeliveryStock', label: 'Create Delivery Stock', pillType: 'number' },
      { key: 'createDeliveryValueDBLanding', label: 'Create Delivery Value in DB Landing', pillType: 'currency' },
      { key: 'createDeliveryValueTradePrice', label: 'Create Delivery Value in Trade Price', pillType: 'currency' },
    ],
  },
  {
    id: 'do_receiving',
    label: 'DO Receiving Status Report',
    icon: Truck,
    endpoint: '/api/reports/do-receiving-status',
    badge: 'PRIMARY DO',
    desc: 'Distributor DO Receiving Status, SAP Billing, Invoice & Primary Gate-In Ledger',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'poDateTime', label: 'PO Date & Time' },
      { key: 'poNumber', label: 'PO Number' },
      { key: 'invoiceNo', label: 'Invoice No', pillType: 'bold' },
      { key: 'invoiceDateTime', label: 'Invoice Date & Time' },
      { key: 'docType', label: 'Doc Type' },
      { key: 'doReceivingDateTime', label: 'DO Receiving Date & Time' },
      { key: 'brand', label: 'Brand', pillType: 'bold' },
      { key: 'skuCode', label: 'SKU Code', pillType: 'bold' },
      { key: 'skuName', label: 'SKU Name' },
      { key: 'uom', label: 'UOM', pillType: 'bold' },
      { key: 'sapQtyCtn', label: 'SAP Quantity in CTN', pillType: 'number' },
      { key: 'sapQtyPcs', label: 'SAP Quantity in PCs', pillType: 'number' },
      { key: 'sapValueDBLanding', label: 'SAP Value in DB Landing', pillType: 'currency' },
      { key: 'sapTon', label: 'SAP Ton', pillType: 'number' },
      { key: 'dbReceivedQtyCtn', label: 'DB Received Quantity in CTN', pillType: 'number' },
      { key: 'dbReceivedQtyPcs', label: 'DB Received Quantity in PCs', pillType: 'number' },
      { key: 'dbReceivedValueDBLanding', label: 'DB Received Value in DB Landing', pillType: 'currency' },
      { key: 'dbReceivedTon', label: 'DB Received Ton', pillType: 'number' },
      { key: 'doReceivingStatus', label: 'DO Receiving Status', pillType: 'success' },
    ],
  },
  {
    id: 'approved_po',
    label: 'Approved PO Listing',
    icon: FileCheck,
    endpoint: '/api/reports/approved-po-listing',
    badge: 'Primary PO',
    desc: 'Approved Purchase Order (PO) Listing, DB Landing Value & Confirmation Status',
    columns: [
      { key: 'poNumber', label: 'PO Number', pillType: 'bold' },
      { key: 'poDate', label: 'PODate' },
      { key: 'poCreationTime', label: 'PO Creation Time' },
      { key: 'dbCode', label: 'DBCode', pillType: 'route' },
      { key: 'dbName', label: 'DBName' },
      { key: 'dbType', label: 'DBType' },
      { key: 'skuCode', label: 'SKU Code', pillType: 'bold' },
      { key: 'skuName', label: 'SKU Name' },
      { key: 'poQuantity', label: 'PO Quantity', pillType: 'number' },
      { key: 'valueInDbLanding', label: 'Value in DB Landing', pillType: 'currency' },
      { key: 'approvedBy', label: 'ApprovedBy' },
      { key: 'approvedDateTime', label: 'Approved Date & Time' },
      { key: 'status', label: 'Status' },
      { key: 'createConfirmDateTime', label: 'Create/Confirm Date & Time' },
      { key: 'createdFrom', label: 'Created From' },
      { key: 'subDbInvoiceReceivingDate', label: 'SUB DB Invoice Receiving Date' },
      { key: 'subDbInvoiceReceivingTime', label: 'SUB DB Invoice Receiving Time' },
      { key: 'void', label: 'Void' },
    ],
  },
  {
    id: 'memo_print',
    label: 'Memo Print Report',
    icon: Printer,
    endpoint: '/api/reports/memo-print',
    badge: 'Invoices',
    desc: 'Order Delivery Memo Generation & Printing Audit Logs',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCodeAutogenerated', label: 'DB Code(Unique Code) Autogenerated' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'printerType', label: 'Printer Type' },
      { key: 'srPositionCode', label: 'SR Position Code', pillType: 'sr' },
      { key: 'srCode', label: 'SR Code', pillType: 'bold' },
      { key: 'srName', label: 'SR Name' },
      { key: 'orderMemoNo', label: 'Order Memo No.', pillType: 'bold' },
      { key: 'printingMemoNo', label: 'Printing Memo No.', pillType: 'bold' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'printingDate', label: 'Printing Date', pillType: 'bold' },
      { key: 'printingTime', label: 'Printing Time' },
    ],
  },
  {
    id: 'po_crs',
    label: 'PO CRS Report',
    icon: ClipboardCheck,
    endpoint: '/api/reports/po-crs',
    badge: 'Suggested PO',
    desc: 'Continuous Replenishment System (CRS) Suggested Purchase Orders & Replenishment Plan',
    columns: [
      { key: 'distributorId', label: 'DistributorID', pillType: 'route' },
      { key: 'distributorName', label: 'DistributorName', pillType: 'bold' },
      { key: 'skuCode', label: 'SKU Code', pillType: 'bold' },
      { key: 'skuName', label: 'SKU Name' },
      { key: 'suggestedQty', label: 'SuggestedQty', pillType: 'number' },
      { key: 'amount', label: 'Amount', pillType: 'currency' },
    ],
  },
  {
    id: 'sr_login',
    label: 'SR Login Report',
    icon: LogIn,
    endpoint: '/api/reports/sr-login',
    badge: 'Live Geo',
    desc: 'SR Real-Time Login/Attendance, GPS Coordinates, DB Distance & Day End Status',
    columns: [
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DBCode', pillType: 'route' },
      { key: 'dbName', label: 'DBName' },
      { key: 'dbType', label: 'DBType' },
      { key: 'srCode', label: 'SRCode', pillType: 'bold' },
      { key: 'srName', label: 'SRName', pillType: 'bold' },
      { key: 'loginTime', label: 'LoginTime', pillType: 'timeIn' },
      { key: 'endTime', label: 'EndTime', pillType: 'timeOut' },
      { key: 'distanceFromDbLocation', label: 'DistanceFromDBLocation', pillType: 'number' },
      { key: 'dayEnd', label: 'DayEnd', pillType: 'success' },
      { key: 'startWorkLatitude', label: 'StartWorkLatitude' },
      { key: 'startWorkLongitude', label: 'StartWorkLongitude' },
    ],
  },
  {
    id: 'summary_print',
    label: 'Summary Print Report',
    icon: FileText,
    endpoint: '/api/reports/summary-print',
    badge: 'Daily Batch',
    desc: 'Daily SR-wise Summary Sheet Printing Audit Logs',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCodeAutogenerated', label: 'DB Code(Unique Code) Autogenerated' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'printerType', label: 'Printer Type' },
      { key: 'srPositionCode', label: 'SR Position Code', pillType: 'sr' },
      { key: 'srCode', label: 'SR Code', pillType: 'bold' },
      { key: 'srName', label: 'SR Name' },
      { key: 'orderDate', label: 'Order Date' },
      { key: 'printingDate', label: 'Printing Date', pillType: 'bold' },
      { key: 'printingTime', label: 'Printing Time' },
    ],
  },
  {
    id: 'te_attendance',
    label: 'TE Attandance Report',
    icon: UserCheck,
    endpoint: '/api/reports/te-attendance',
    badge: 'TM GPS',
    desc: 'Territory Manager (TE/TM) Field Attendance, Start Time, GPS Coordinates & DB Distance',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'areaName', label: 'AreaName' },
      { key: 'territoryName', label: 'TerritoryName' },
      { key: 'teCode', label: 'TE Code', pillType: 'bold' },
      { key: 'teName', label: 'TE Name', pillType: 'bold' },
      { key: 'visitType', label: 'Visit Type' },
      { key: 'startWorkDate', label: 'Start Work Date', pillType: 'bold' },
      { key: 'startWorkTime', label: 'Start Work Time', pillType: 'timeIn' },
      { key: 'distanceFromDbLocation', label: 'DistanceFromDBLocation', pillType: 'number' },
      { key: 'startWorkLatitude', label: 'StartWorkLatitude' },
      { key: 'startWorkLongitude', label: 'StartWorkLongitude' },
    ],
  },
  {
    id: 'te_visit',
    label: 'TE Visit Report',
    icon: MapPin,
    endpoint: '/api/reports/te-visit',
    badge: 'TM Field',
    desc: 'Territory Executive / TM Field Market Supervision, Route Execution & Outlet Metrics',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'areaName', label: 'Area Name' },
      { key: 'areaCode', label: 'Area Code' },
      { key: 'territoryName', label: 'Territory Name' },
      { key: 'territoryCode', label: 'Territory Code' },
      { key: 'teTsoName', label: 'TE / TSO Name', pillType: 'bold' },
      { key: 'teTsoCode', label: 'TE / TSO Code' },
      { key: 'type', label: 'Type' },
      { key: 'mainSuperDistributorPositionCode', label: 'Main/Super Distributor Position Code' },
      { key: 'mainSuperDistributorPositionName', label: 'Main/Super Distributor Position Name' },
      { key: 'distributorId', label: 'Distributor ID', pillType: 'route' },
      { key: 'distributorName', label: 'Distributor Name' },
      { key: 'dbType', label: 'DBType' },
      { key: 'subDistributorPositionCode', label: 'SUB Distributor Position Code' },
      { key: 'subDistributorPositionName', label: 'SUB Distributor Position Name' },
      { key: 'subDbName', label: 'Sub DB Name' },
      { key: 'subDbCode', label: 'Sub DB Code' },
      { key: 'srPostion', label: 'SRPostion', pillType: 'sr' },
      { key: 'srCode', label: 'SRCode', pillType: 'bold' },
      { key: 'srName', label: 'SRName', pillType: 'bold' },
      { key: 'pjpRouteCode', label: 'PJP Route Code' },
      { key: 'pjpRouteName2', label: 'PJP Route Name2' },
      { key: 'visitedRouteCode', label: 'Visited Route Code' },
      { key: 'visitedRouteName', label: 'Visited Route Name' },
      { key: 'visitDate', label: 'Visit Date', pillType: 'bold' },
      { key: 'sc', label: 'SC', pillType: 'number' },
      { key: 'visitedOl', label: 'Visited OL', pillType: 'number' },
      { key: 'pending', label: 'Pending', pillType: 'number' },
      { key: 'visitPct', label: 'Visit%', pillType: 'success' },
      { key: 'startWorkTime', label: 'Start WorkTime', pillType: 'timeIn' },
      { key: 'firstOutletVisitTime', label: 'First Outlet Visit Time' },
      { key: 'lastOutletVisitTime', label: 'Last Outlet Visit Time' },
      { key: 'duration', label: 'Duration' },
      { key: 'dayEnd', label: 'Day End', pillType: 'success' },
      { key: 'endWorkTime', label: 'End Work Time', pillType: 'timeOut' },
      { key: 'startWorkTimeWithSr', label: 'Start Work Time with SR' },
      { key: 'endWorkTimeWithSr', label: 'End Work Time with SR' },
      { key: 'durationWithSr', label: 'Duration' },
      { key: 'distributorPositionCode', label: 'Distributor Position Code' },
      { key: 'distributorPositionName', label: 'Distributor Position Name' },
      { key: 'visitType', label: 'Visit Type' },
      { key: 'locationType', label: 'Location Type' },
      { key: 'ta', label: 'TA' },
      { key: 'da', label: 'DA' },
      { key: 'visitReason', label: 'Visit Reason' },
    ],
  },
  {
    id: 'super_sub_stock',
    label: 'Stock Report Super to SUB DB CT',
    icon: PackageCheck,
    endpoint: '/api/reports/super-sub-stock',
    badge: 'Inter DB',
    desc: 'Super DB to Sub DB Cartons & Primary Transfer Stock Ledger',
    columns: [
      { key: 'orderDate', label: 'OrderDate', pillType: 'bold' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'town', label: 'Town' },
      { key: 'distributorId', label: 'DistributorID', pillType: 'route' },
      { key: 'distributorName', label: 'DistributorName' },
      { key: 'uniq', label: 'Uniq' },
      { key: 'subDistributorId', label: 'SubDistributorID' },
      { key: 'subDistributorName', label: 'SubDistributorName' },
      { key: 'skuCode', label: 'SKUCode', pillType: 'bold' },
      { key: 'skuName', label: 'SKUName' },
      { key: 'uom', label: 'UOM' },
      { key: 'primarySkuCtn', label: 'PrimarySKUCTN', pillType: 'number' },
      { key: 'primarySkuVolume', label: 'PrimarySKUVolume', pillType: 'number' },
      { key: 'primarySkuValue', label: 'PrimarySKUValue', pillType: 'currency' },
      { key: 'primarySkuQty', label: 'Primary SKU Qty', pillType: 'number' },
      { key: 'uom2', label: 'UOM2' },
      { key: 'brand', label: 'Brand', pillType: 'bold' },
      { key: 'superDbUniqueLocationCode', label: 'Super DB Unique Location Code (Base Corrected)' },
      { key: 'superDbLocationName', label: 'Super DB Location Name' },
      { key: 'tsoPositionCode', label: 'TSO Position Code', pillType: 'sr' },
      { key: 'tsoCode', label: 'TSO Code' },
      { key: 'tsoName', label: 'TSO Name' },
      { key: 'primarySkuQtyInTons', label: 'PrimarySKUQty in Tons', pillType: 'number' },
      { key: 'isConfirmed', label: 'IsConfirmed', pillType: 'success' },
      { key: 'poNo', label: 'PoNo' },
    ],
  },
  {
    id: 'stockist_secondary',
    label: 'Stockist Secondary Report',
    icon: FileBarChart,
    endpoint: '/api/reports/stockist-secondary',
    badge: 'Sales & Stock',
    desc: 'Distributor Point Opening/Closing Stock, Secondary Sales & Tonnage',
    columns: [
      { key: 'date', label: 'Date', pillType: 'bold' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'teTsoName', label: 'TE/TSO Name', pillType: 'bold' },
      { key: 'teTsoCode', label: 'TE/TSO Code' },
      { key: 'type', label: 'Type' },
      { key: 'superDbCode', label: 'Super DB Code' },
      { key: 'superDbName', label: 'Super DB Name' },
      { key: 'stockiestPositionCode', label: 'Stockiest Position Code' },
      { key: 'stockiestPositionName', label: 'Stockiest Position Name' },
      { key: 'stockiestDbCode', label: 'Stockiest DB Code', pillType: 'route' },
      { key: 'stockiestDbName', label: 'Stockiest DB Name' },
      { key: 'brand', label: 'Brand', pillType: 'bold' },
      { key: 'skuCode', label: 'SKU Code', pillType: 'bold' },
      { key: 'skuName', label: 'SKU Name' },
      { key: 'uom', label: 'UOM' },
      { key: 'openingStock', label: 'Opening Stock', pillType: 'number' },
      { key: 'closingStock', label: 'Closing Stock', pillType: 'number' },
      { key: 'secondarySales', label: 'Secondary Sales', pillType: 'number' },
      { key: 'secondarySalesValue', label: 'Secondary Sales Value', pillType: 'currency' },
      { key: 'secondarySalesTon', label: 'Secondary Sales Ton', pillType: 'number' },
    ],
  },
  {
    id: 'invoice_list',
    label: 'Invoice List',
    icon: Receipt,
    endpoint: '/api/reports/invoice-list',
    badge: '2.4K Invoices',
    desc: 'Real-Time Sales Memos, Invoices, Outlets, SKU Line Items & Quantities',
    columns: [
      { key: 'invoiceNo', label: 'InvoiceNo', pillType: 'bold' },
      { key: 'custNo', label: 'CustNo', pillType: 'cust' },
      { key: 'invoiceDate', label: 'InvoiceDate', pillType: 'bold' },
      { key: 'custReferenceNo', label: 'CustReferenceNo', pillType: 'route' },
      { key: 'poDate', label: 'PODate' },
      { key: 'externalDocNo', label: 'ExternalDocNo' },
      { key: 'docType', label: 'DocType' },
      { key: 'receivingDt', label: 'ReceivingDt' },
      { key: 'lineNo', label: 'LineNo', pillType: 'number' },
      { key: 'itemNo', label: 'ItemNo', pillType: 'bold' },
      { key: 'quantity', label: 'Quantity', pillType: 'number' },
      { key: 'netPrice', label: 'NetPrice', pillType: 'currency' },
      { key: 'totalAmt', label: 'TotalAmt', pillType: 'currency' },
      { key: 'uom', label: 'UOM' },
    ],
  },
  {
    id: 'foc_claim',
    label: 'FOC Claim',
    icon: Tag,
    endpoint: '/api/reports/foc-claim',
    badge: 'Claims',
    desc: 'Free of Cost (FOC) Outlet Trade Claim Records',
    columns: [
      { key: 'orderDate', label: "OrderDate", pillType: 'bold' },
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'outletsCat', label: "Outlets cat" },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'routeCode', label: "Route Code", pillType: 'route' },
      { key: 'routeName', label: "RouteName", pillType: 'bold' },
      { key: 'invNo', label: "InvNo", pillType: 'route' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'sKUName', label: "SKU Name", pillType: 'bold' },
      { key: 'uOM', label: "UOM" },
      { key: 'qty', label: "Qty", pillType: 'number' },
      { key: 'sKUTP', label: "SKU TP" },
      { key: 'claimAmount', label: "Claim Amount", pillType: 'currency' },
    ],
  },
  {
    id: 'wholesale_claim',
    label: 'WHolesale Export Claim',
    icon: FileSpreadsheet,
    endpoint: '/api/reports/wholesale-claim',
    badge: 'Claims',
    desc: 'Wholesale Trade Promotion & Special Export Claim',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'promoID', label: "PromoID" },
      { key: 'promoName', label: "PromoName", pillType: 'bold' },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'sRName', label: "SRName", pillType: 'bold' },
      { key: 'sRPositionCode', label: "SRPositionCode", pillType: 'route' },
      { key: 'invoiceNo', label: "Invoice No", pillType: 'route' },
      { key: 'deliveryDate', label: "Delivery Date", pillType: 'bold' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'qty', label: "Qty", pillType: 'number' },
      { key: 'claimAmount', label: "Claim Amount", pillType: 'currency' },
    ],
  },
  {
    id: 'urban_retail_claim',
    label: 'Urban Retail Claim',
    icon: ShoppingBag,
    endpoint: '/api/reports/urban-retail-claim',
    badge: 'Claims',
    desc: 'Urban Retail Trade Scheme & Claim Reimbursement',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'promoID', label: "PromoID" },
      { key: 'promoName', label: "PromoName", pillType: 'bold' },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'sRName', label: "SRName", pillType: 'bold' },
      { key: 'sRPositionCode', label: "SRPositionCode", pillType: 'route' },
      { key: 'invoiceNo', label: "Invoice No", pillType: 'route' },
      { key: 'deliveryDate', label: "Delivery Date", pillType: 'bold' },
      { key: 'orderDate', label: "Order Date", pillType: 'bold' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'qty', label: "Qty", pillType: 'number' },
      { key: 'amount', label: "Amount", pillType: 'currency' },
    ],
  },
  {
    id: 'rural_retail_claim',
    label: 'Rural Retail',
    icon: Store,
    endpoint: '/api/reports/rural-retail-claim',
    badge: 'Rural',
    desc: 'Rural Retail Trade Promotion & Secondary Claim Invoices',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'promoID', label: "PromoID" },
      { key: 'promoName', label: "PromoName", pillType: 'bold' },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'invoiceNo', label: "Invoice No", pillType: 'route' },
      { key: 'deliveryDate', label: "Delivery Date", pillType: 'bold' },
      { key: 'orderDate', label: "Order Date", pillType: 'bold' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'qty', label: "Qty", pillType: 'number' },
      { key: 'amount', label: "Amount", pillType: 'currency' },
    ],
  },
  {
    id: 'rural_ws_claim',
    label: 'Rural WS',
    icon: Truck,
    endpoint: '/api/reports/rural-ws-claim',
    badge: 'Rural',
    desc: 'Rural Wholesale Trade Discount & Invoice Settlement',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'promoID', label: "PromoID" },
      { key: 'promoName', label: "PromoName", pillType: 'bold' },
      { key: 'disPer', label: "DisPer" },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'invoiceNo', label: "Invoice No", pillType: 'route' },
      { key: 'deliveryDate', label: "Delivery Date", pillType: 'bold' },
      { key: 'totalInvoiceDiscount', label: "Total Invoice Discount", pillType: 'currency' },
      { key: 'percentageDiscount', label: "Percentage Discount", pillType: 'currency' },
      { key: 'totalInvoiceAmount', label: "Total Invoice Amount", pillType: 'currency' },
    ],
  },
  {
    id: 'freight_export',
    label: 'Freight Export',
    icon: Boxes,
    endpoint: '/api/reports/freight-export',
    badge: 'Export',
    desc: 'Freight, Delivery & Sub DB Sales Export Records',
    columns: [
      { key: 'date', label: "Date", pillType: 'bold' },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'sUBDBCode', label: "SUB DB Code", pillType: 'route' },
      { key: 'sUBDBName', label: "SUB DB Name", pillType: 'bold' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'sKUName', label: "SKU Name", pillType: 'bold' },
      { key: 'invoiceNo', label: "Invoice No", pillType: 'route' },
      { key: 'deliveryDate', label: "Delivery Date", pillType: 'bold' },
      { key: 'salesQtyLoose', label: "SalesQtyLoose", pillType: 'number' },
      { key: 'salesQtyInCTN', label: "Sales Qty in CTN", pillType: 'number' },
      { key: 'amount', label: "Amount", pillType: 'currency' },
      { key: 'isConfirmed', label: "IsConfirmed", pillType: 'success' },
      { key: 'pONo', label: "PONo", pillType: 'route' },
    ],
  },
  {
    id: 'user_info',
    label: 'User Information Report',
    icon: Users,
    endpoint: '/api/reports/user-info',
    badge: 'Master',
    desc: 'Field Force & System User Master Information',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'areaName', label: "AreaName", pillType: 'bold' },
      { key: 'territory', label: "Territory" },
      { key: 'name', label: "Name", pillType: 'bold' },
      { key: 'userID', label: "UserID" },
      { key: 'password', label: "Password" },
      { key: 'positionCode', label: "Position Code", pillType: 'route' },
      { key: 'userType', label: "User Type" },
    ],
  },
  {
    id: 'license_report',
    label: 'License',
    icon: ShieldCheck,
    endpoint: '/api/reports/license-report',
    badge: 'Master',
    desc: 'Distributor, Sub-DB & Device License Registry',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'sUBDBCode', label: "SUB DB Code", pillType: 'route' },
      { key: 'sUBDBName', label: "SUB DB Name", pillType: 'bold' },
      { key: 'code', label: "Code", pillType: 'route' },
      { key: 'name', label: "Name", pillType: 'bold' },
      { key: 'sUCode', label: "SU Code", pillType: 'route' },
      { key: 'licenseNo', label: "License No", pillType: 'route' },
      { key: 'licenseType', label: "License Type" },
      { key: 'iMEINo', label: "IMEI No", pillType: 'route' },
      { key: 'active', label: "Active", pillType: 'success' },
      { key: 'lastLoginDate', label: "Last Login Date", pillType: 'bold' },
    ],
  },

  {
    id: 'leave_detail',
    label: 'LeaveDetailReport',
    icon: CalendarCheck,
    endpoint: '/api/reports/leave-detail',
    badge: 'HR & Field',
    desc: 'SR & Field Force Leave Applications, Approval Status & Duration',
    columns: [
      { key: 'cluster', label: 'Cluster' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'dbType', label: 'DB Type' },
      { key: 'suCode', label: 'SU Code' },
      { key: 'srCode', label: 'SR Code' },
      { key: 'srName', label: 'SR Name', pillType: 'bold' },
      { key: 'leaveType', label: 'Leave Type', pillType: 'warning' },
      { key: 'appliedDate', label: 'Applied Date', pillType: 'bold' },
      { key: 'appliedTime', label: 'Applied Time' },
      { key: 'leaveStartDate', label: 'Leave Start Date', pillType: 'bold' },
      { key: 'leaveEndDate', label: 'Leave End Date', pillType: 'bold' },
      { key: 'noOfDaysLeave', label: 'No of Days Leave', pillType: 'number' },
      { key: 'approvedDateTime', label: 'Approved Date & Time', pillType: 'success' },
    ],
  },
  {
    id: 'non_bill_outlet',
    label: 'Non-Bill Outlet Report',
    icon: MapPinOff,
    endpoint: '/api/reports/non-bill-outlet',
    badge: 'Audit',
    desc: 'Unproductive Outlets with No Orders in Selected Window',
    columns: [
      { key: 'fromDate', label: "From Date", pillType: 'bold' },
      { key: 'toDate', label: "To Date", pillType: 'bold' },
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'sUBDBCode', label: "SUB DB Code", pillType: 'route' },
      { key: 'sUBDBName', label: "SUB DB Name", pillType: 'bold' },
      { key: 'sRPositionCode', label: "SR Position Code", pillType: 'route' },
      { key: 'sRCode', label: "SR Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'routeCode', label: "Route Code", pillType: 'route' },
      { key: 'routeName', label: "Route Name", pillType: 'bold' },
      { key: 'outletCode', label: "Outlet Code", pillType: 'route' },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'channel', label: "Channel" },
      { key: 'subChannel', label: "Sub Channel" },
      { key: 'lastBillDateTime', label: "Last Bill Date & Time", pillType: 'bold' },
    ],
  },
  {
    id: 'te_version_list',
    label: 'TE Version List',
    icon: Smartphone,
    endpoint: '/api/reports/te-version-list',
    badge: 'Device',
    desc: 'Territory Executive (TE) Mobile App Build Versions',
    columns: [
      { key: 'nation', label: "Nation" },
      { key: 'salesRegion', label: "SalesRegion" },
      { key: 'territoryName', label: "TerritoryName", pillType: 'bold' },
      { key: 'areaName', label: "AreaName", pillType: 'bold' },
      { key: 'tECode', label: "TE Code", pillType: 'route' },
      { key: 'tEName', label: "TE Name", pillType: 'bold' },
      { key: 'territoryCode', label: "Territory Code", pillType: 'route' },
      { key: 'licenseNo', label: "License No", pillType: 'route' },
      { key: 'versionNo', label: "Version No", pillType: 'route' },
    ],
  },
  {
    id: 'sr_version_list',
    label: 'SR Version List',
    icon: Smartphone,
    endpoint: '/api/reports/sr-version-list',
    badge: 'Device',
    desc: 'Sales Representative (SR) SFA App Build Versions',
    columns: [
      { key: 'nation', label: "Nation" },
      { key: 'salesRegion', label: "SalesRegion" },
      { key: 'territoryName', label: "TerritoryName", pillType: 'bold' },
      { key: 'areaName', label: "AreaName", pillType: 'bold' },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'sUBDBCode', label: "SUB DB Code", pillType: 'route' },
      { key: 'subDBName', label: "Sub DB Name", pillType: 'bold' },
      { key: 'sRCode', label: "SR Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'sUCode', label: "SU Code", pillType: 'route' },
      { key: 'licenseNo', label: "License No", pillType: 'route' },
      { key: 'versionNo', label: "Version No", pillType: 'route' },
    ],
  },
  {
    id: 'geo_tag',
    label: 'Geo Tag',
    icon: Navigation,
    endpoint: '/api/reports/geo-tag',
    badge: 'Location',
    desc: 'Distributor, Route & Outlet GPS Geolocation Audit',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'areaName', label: "AreaName", pillType: 'bold' },
      { key: 'area', label: "Area" },
      { key: 'territoryName', label: "TerritoryName", pillType: 'bold' },
      { key: 'territory', label: "Territory" },
      { key: 'distributorPosition', label: "DistributorPosition" },
      { key: 'distributorID', label: "DistributorID" },
      { key: 'distributorName', label: "DistributorName", pillType: 'bold' },
      { key: 'dBType', label: "DBType" },
      { key: 'subDistributorPositionCode', label: "SubDistributorPositionCode", pillType: 'route' },
      { key: 'subDistributorId', label: "SubDistributorId" },
      { key: 'subDistributorName', label: "SubDistributorName", pillType: 'bold' },
      { key: 'sRPostionCode', label: "SRPostionCode", pillType: 'route' },
      { key: 'sRCode', label: "SRCode", pillType: 'route' },
      { key: 'sRName', label: "SRName", pillType: 'bold' },
      { key: 'routeCode', label: "RouteCode", pillType: 'route' },
      { key: 'routeType', label: "RouteType" },
      { key: 'routeName', label: "RouteName", pillType: 'bold' },
      { key: 'latitude', label: "Latitude" },
      { key: 'longitude', label: "Longitude" },
      { key: 'outletcreationdate', label: "Outletcreationdate", pillType: 'bold' },
      { key: 'outletCode', label: "OutletCode", pillType: 'route' },
      { key: 'outletNameEnglish', label: "OutletNameEnglish", pillType: 'bold' },
      { key: 'outletNameBangla', label: "OutletNameBangla", pillType: 'bold' },
      { key: 'channel', label: "Channel" },
      { key: 'subChannel', label: "SubChannel" },
      { key: 'outletOwnerName', label: "OutletOwnerName", pillType: 'bold' },
      { key: 'outletAddressEnglish', label: "OutletAddressEnglish" },
      { key: 'outletAddressBangla', label: "OutletAddressBangla" },
      { key: 'outletOwnerContactNumber', label: "OutletOwnerContactNumber", pillType: 'route' },
      { key: 'schoolProximityOutlet', label: "SchoolProximityOutlet" },
      { key: 'binNo', label: "BinNo", pillType: 'route' },
      { key: 'visitDate', label: "VisitDate", pillType: 'bold' },
      { key: 'isActive', label: "IsActive", pillType: 'success' },
      { key: 'outletinactiveDate', label: "OutletinactiveDate", pillType: 'bold' },
      { key: 'newoutlet', label: "Newoutlet" },
      { key: 'informationUpdated', label: "InformationUpdated", pillType: 'bold' },
    ],
  },
  {
    id: 'delivery_confirmation',
    label: 'Delivery Confirmation Report',
    icon: CheckCircle2,
    endpoint: '/api/reports/delivery-confirmation',
    badge: 'Delivery',
    desc: 'Order vs Delivered PC, Quantity, Value & Returns',
    columns: [
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'uniqueLocationCode', label: "Unique Location Code", pillType: 'route' },
      { key: 'dBSUBDBCode', label: "DB/SUB DB Code", pillType: 'route' },
      { key: 'dBSUBDBName', label: "DB/SUB DB Name", pillType: 'bold' },
      { key: 'sRPositionCode', label: "SR Position Code", pillType: 'route' },
      { key: 'sRECCode', label: "SR EC Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'orderDate', label: "Order Date", pillType: 'bold' },
      { key: 'day', label: "Day" },
      { key: 'orderPC', label: "OrderPC", pillType: 'number' },
      { key: 'totalSKULineOrder', label: "Total SKU Line-Order", pillType: 'number' },
      { key: 'totalOrderQty', label: "TotalOrderQty", pillType: 'number' },
      { key: 'totalOrderValue', label: "TotalOrderValue", pillType: 'currency' },
      { key: 'deliveredDate', label: "Delivered Date", pillType: 'bold' },
      { key: 'deliveryDay', label: "Delivery Day" },
      { key: 'deliveredPC', label: "Delivered PC", pillType: 'number' },
      { key: 'totalSKULineDelivery', label: "Total SKU Line-Delivery", pillType: 'number' },
      { key: 'deliveredQty', label: "Delivered Qty", pillType: 'number' },
      { key: 'deliveredValue', label: "Delivered Value", pillType: 'currency' },
      { key: 'returnedValue', label: "Returned Value", pillType: 'currency' },
    ],
  },

  {
    id: 'sr_wise_sku',
    label: 'SR wise SKU Report',
    icon: PackageCheck,
    endpoint: '/api/reports/sr-wise-sku',
    badge: 'Line Sales',
    desc: 'SR-wise SKU Order, Delivery, Returns & Net Sales Reconciliation',
    columns: [
      { key: 'itemNo', label: 'Item No', pillType: 'route' },
      { key: 'description', label: 'Description', pillType: 'bold' },
      { key: 'unitPriceTp', label: 'Unit Price (TP)', pillType: 'currency' },
      { key: 'orderedQty', label: 'Ordered Qty', pillType: 'number' },
      { key: 'deliveryQty', label: 'Delivery Qty', pillType: 'number' },
      { key: 'returnQty', label: 'Return Qty', pillType: 'number' },
      { key: 'totalAmountOrder', label: 'Total Amount (Order)', pillType: 'currency' },
      { key: 'totalAmountDeliver', label: 'Total Amount (Deliver)', pillType: 'currency' },
      { key: 'totalAmountReturn', label: 'Total Amount (Return)', pillType: 'currency' },
      { key: 'discountAmountOrder', label: 'Discount Amount (Order)', pillType: 'currency' },
      { key: 'discountAmountDelivery', label: 'Discount Amount (Delivery)', pillType: 'currency' },
      { key: 'netAmount', label: 'Net Amount', pillType: 'currency' },
    ],
  },
  {
    id: 'void_order',
    label: 'Void Order Report',
    icon: XCircle,
    endpoint: '/api/reports/void-order',
    badge: 'Audit',
    desc: 'Cancelled & Void Order Transaction Audit Records',
    columns: [
      { key: 'orderNo', label: "OrderNo", pillType: 'route' },
      { key: 'orderDate', label: "OrderDate", pillType: 'bold' },
      { key: 'deliveryDate', label: "DeliveryDate", pillType: 'bold' },
      { key: 'voidDate', label: "Void Date", pillType: 'bold' },
      { key: 'outlet', label: "Outlet" },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'sRCode', label: "SR Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'salesOfficeID', label: "SalesOfficeID" },
      { key: 'salesOfficeName', label: "SalesOfficeName", pillType: 'bold' },
      { key: 'sKUQuantity', label: "SKU Quantity" },
      { key: 'lineAmount', label: "Line Amount", pillType: 'number' },
      { key: 'discount', label: "Discount", pillType: 'currency' },
      { key: 'amount', label: "Amount", pillType: 'currency' },
      { key: 'orderValue', label: "Order Value", pillType: 'currency' },
      { key: 'orderCashDiscount', label: "Order Cash Discount", pillType: 'currency' },
      { key: 'createDeliveryDate', label: "Create DeliveryDate", pillType: 'bold' },
    ],
  },
  {
    id: 'void_order_tracker',
    label: 'Void Order Tracker',
    icon: ClockAlert,
    endpoint: '/api/reports/void-order-tracker',
    badge: 'Audit',
    desc: 'Void Order Request & Approval Lifecycle Tracker',
    columns: [
      { key: 'orderNo', label: "OrderNo", pillType: 'route' },
      { key: 'orderDate', label: "OrderDate", pillType: 'bold' },
      { key: 'deliveryDate', label: "DeliveryDate", pillType: 'bold' },
      { key: 'voidDate', label: "Void Date", pillType: 'bold' },
      { key: 'outlet', label: "Outlet" },
      { key: 'outletName', label: "Outlet Name", pillType: 'bold' },
      { key: 'sRCode', label: "SR Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'dBType', label: "DB Type" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'salesOfficeID', label: "SalesOfficeID" },
      { key: 'salesOfficeName', label: "SalesOfficeName", pillType: 'bold' },
      { key: 'sKUQuantity', label: "SKU Quantity" },
      { key: 'lineAmount', label: "Line Amount", pillType: 'number' },
      { key: 'discount', label: "Discount", pillType: 'currency' },
      { key: 'amount', label: "Amount", pillType: 'currency' },
      { key: 'orderValue', label: "Order Value", pillType: 'currency' },
      { key: 'orderCashDiscount', label: "Order Cash Discount", pillType: 'currency' },
      { key: 'createDeliveryDate', label: "Create DeliveryDate", pillType: 'bold' },
      { key: 'voidOrderOpeningDate', label: "Void Order Opening Date", pillType: 'bold' },
      { key: 'voidOrderOpeningTime', label: "Void Order Opening Time", pillType: 'bold' },
    ],
  },
  {
    id: 'mt_sku_update',
    label: 'MT SKU Update',
    icon: Layers,
    endpoint: '/api/reports/mt-sku-update',
    badge: 'Modern Trade',
    desc: 'Modern Trade SKU Planogram, Shelf Category & Audit',
    columns: [
      { key: 'docDate', label: "DocDate", pillType: 'bold' },
      { key: 'docTime', label: "DocTime", pillType: 'bold' },
      { key: 'cluster', label: "Cluster" },
      { key: 'area', label: "Area" },
      { key: 'territory', label: "Territory" },
      { key: 'dBCode', label: "DB Code", pillType: 'route' },
      { key: 'dBName', label: "DB Name", pillType: 'bold' },
      { key: 'dBType', label: "DB Type" },
      { key: 'sRPositionCode', label: "SR Position Code", pillType: 'route' },
      { key: 'sRCode', label: "SR Code", pillType: 'route' },
      { key: 'sRName', label: "SR Name", pillType: 'bold' },
      { key: 'routeCode', label: "Route Code", pillType: 'route' },
      { key: 'routeName', label: "Route Name", pillType: 'bold' },
      { key: 'customerNo', label: "Customer No", pillType: 'route' },
      { key: 'customerName', label: "Customer Name", pillType: 'bold' },
      { key: 'brand', label: "Brand" },
      { key: 'motherSKUCode', label: "Mother SKU Code", pillType: 'route' },
      { key: 'motherSKUName', label: "Mother SKU Name", pillType: 'bold' },
      { key: 'sKUCode', label: "SKU Code", pillType: 'route' },
      { key: 'sKUName', label: "SKU Name", pillType: 'bold' },
      { key: 'documentNo', label: "Document No", pillType: 'route' },
      { key: 'checkOut', label: "CheckOut" },
      { key: 'categoryShelf', label: "CategoryShelf" },
      { key: 'comment', label: "Comment" },
    ],
  },
  {
    id: 'mt_visit',
    label: 'MT Visit Status',
    icon: Store,
    endpoint: '/api/reports/mt-visit-status',
    badge: 'Clock-In',
    desc: 'Modern Trade (MT) Visit Status & Real-Time Clock-In/Out Tracking',
    columns: [
      { key: 'date', label: 'Date', pillType: 'bold' },
      { key: 'area', label: 'Area' },
      { key: 'territory', label: 'Territory' },
      { key: 'dbCode', label: 'DB Code', pillType: 'route' },
      { key: 'dbName', label: 'DB Name' },
      { key: 'srPositionCode', label: 'SR Position Code', pillType: 'sr' },
      { key: 'srCode', label: 'SR Code', pillType: 'bold' },
      { key: 'srName', label: 'SR Name' },
      { key: 'routeCode', label: 'Route Code', pillType: 'route' },
      { key: 'routeName', label: 'Route Name' },
      { key: 'customerNo', label: 'Customer No', pillType: 'cust' },
      { key: 'customerName', label: 'Customer Name', pillType: 'bold' },
      { key: 'clockInTime', label: 'Clock In Time', pillType: 'timeIn' },
      { key: 'clockOutTime', label: 'Clock Out Time', pillType: 'timeOut' },
    ],
  },
];

export default function DashboardPage() {
  const router = useRouter();

  // Auth Protection: Redirect to /login if unauthenticated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('pvm_auth');
      if (!auth) {
        router.push('/login');
      }
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pvm_auth');
      localStorage.removeItem('pvm_user');
    }
    router.push('/login');
  };

  // Helper to format date YYYY-MM-DD in local time
  const formatYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Active Tab State (Default: BWIW Report)
  const [activeTab, setActiveTab] = useState<ActiveTab>('bwiw');
  const activeTabConfig = useMemo(() => {
    return TAB_CONFIGS.find(t => t.id === activeTab) || TAB_CONFIGS[0];
  }, [activeTab]);

  // Data & Loading State
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<any>(null);

  // Date range filters (Default: MTD for BWIW Report on initial entry)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => formatYMD(new Date()));
  const [globalSearch, setGlobalSearch] = useState('');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column Filters State: { [columnKey]: Set of selected values }
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Active Open Filter Dropdown Column
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenFilterCol(null);
        setFilterSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track active fetch request sequence to ignore stale responses
  const reqIdRef = useRef(0);

  // Fetch report data directly from corresponding API endpoint
  const fetchData = async (tab = activeTab, start = startDate, end = endDate) => {
    const currentReqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const cfg = TAB_CONFIGS.find(t => t.id === tab) || TAB_CONFIGS[0];
      const separator = cfg.endpoint.includes('?') ? '&' : '?';
      const url = `${cfg.endpoint}${separator}startDate=${start}&endDate=${end}&start=${start}&end=${end}`;

      const res = await fetch(url);
      if (currentReqId !== reqIdRef.current) return; // Stale request, ignore

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server returned status ${res.status}`;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || errMsg;
        } catch {}
        setError(errMsg);
        return;
      }

      const json = await res.json();
      if (currentReqId !== reqIdRef.current) return; // Stale request, ignore

      if (json.success) {
        setRecords(json.data || []);
        setMetaInfo(json.meta || null);
        setCurrentPage(1);
      } else {
        setError(json.message || json.error || 'Failed to load report data');
      }
    } catch (err: any) {
      if (currentReqId !== reqIdRef.current) return;
      setError(err.message || 'Error connecting to report service');
    } finally {
      if (currentReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Synchronized tab change handler to avoid race conditions
  const handleTabChange = (newTab: ActiveTab) => {
    if (newTab === activeTab) return;
    const now = new Date();
    const todayStr = formatYMD(now);
    const startOfMonth = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));

    let newStart = startDate;
    let newEnd = endDate;

    if (newTab === 'bwiw' || newTab === 'stock' || newTab === 'do_receiving') {
      newStart = startOfMonth;
      newEnd = todayStr;
    } else if (newTab === 'live_detail') {
      newStart = todayStr;
      newEnd = todayStr;
    }

    setActiveTab(newTab);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  // Re-fetch whenever tab or dates change
  useEffect(() => {
    setColumnFilters({});
    setSortConfig(null);
    fetchData(activeTab, startDate, endDate);
  }, [activeTab, startDate, endDate]);

  // Quick preset helper (MTD, WTD, Today)
  const applyPreset = (preset: 'mtd' | 'wtd' | 'today') => {
    const now = new Date();
    const todayStr = formatYMD(now);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'mtd') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(startOfMonth));
      setEndDate(todayStr);
    } else if (preset === 'wtd') {
      const diffToSat = (now.getDay() + 1) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToSat);
      setStartDate(formatYMD(startOfWeek));
      setEndDate(todayStr);
    }
  };

  const activePreset = useMemo(() => {
    const now = new Date();
    const todayStr = formatYMD(now);
    const startOfMonth = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const diffToSat = (now.getDay() + 1) % 7;
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - diffToSat);
    const startOfWeek = formatYMD(startOfWeekDate);

    if (startDate === todayStr && endDate === todayStr) return 'today';
    if (startDate === startOfWeek && endDate === todayStr) return 'wtd';
    if (startDate === startOfMonth && endDate === todayStr) return 'mtd';
    return null;
  }, [startDate, endDate]);

  // Unique values for each column based on raw records
  const uniqueColumnValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    activeTabConfig.columns.forEach(({ key }) => {
      const distinct = new Set<string>();
      records.forEach((r) => {
        const val = String(r[key] ?? '').trim();
        if (val) distinct.add(val);
      });
      map[key] = Array.from(distinct).sort();
    });
    return map;
  }, [records, activeTabConfig]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let result = records.filter((r) => {
      // 1. Global Search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const matchesGlobal = activeTabConfig.columns.some(({ key }) =>
          String(r[key] ?? '').toLowerCase().includes(q)
        );
        if (!matchesGlobal) return false;
      }

      // 2. Column-level Excel Filters
      for (const [colKey, selectedValues] of Object.entries(columnFilters)) {
        if (selectedValues) {
          const allVals = uniqueColumnValues[colKey] || [];
          if (selectedValues.size < allVals.length) {
            const val = String(r[colKey] ?? '').trim();
            if (!selectedValues.has(val)) {
              return false;
            }
          }
        }
      }

      return true;
    });

    // 3. Sorting
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        const valA = String(a[key] ?? '');
        const valB = String(b[key] ?? '');
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [records, globalSearch, columnFilters, sortConfig, activeTabConfig]);

  // Pagination calculation
  const totalRecords = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Excel / CSV Export
  const exportData = (format: 'xlsx' | 'csv') => {
    const exportRows = filteredAndSortedRecords.map((r) => {
      const row: Record<string, any> = {};
      activeTabConfig.columns.forEach((col) => {
        row[col.label] = r[col.key] ?? '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTabConfig.label.slice(0, 31));

    const fileName = `PVM_${activeTabConfig.label.replace(/\s+/g, '_')}_${startDate}_to_${endDate}`;
    if (format === 'xlsx') {
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
    }
  };

  // Toggle filter value for a column
  const toggleFilterValue = (colKey: string, val: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      const currentSet = new Set(next[colKey] || uniqueColumnValues[colKey] || []);
      if (currentSet.has(val)) {
        currentSet.delete(val);
      } else {
        currentSet.add(val);
      }
      next[colKey] = currentSet;
      return next;
    });
  };

  // Select all or clear all for a column filter
  const selectAllFilter = (colKey: string, selectAll: boolean) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (selectAll) {
        next[colKey] = new Set(uniqueColumnValues[colKey] || []);
      } else {
        next[colKey] = new Set();
      }
      return next;
    });
  };

  // Clear filter for a single column
  const clearColumnFilter = (colKey: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  };

  // Reset all filters
  const resetAllFilters = () => {
    setColumnFilters({});
    setSortConfig(null);
    setGlobalSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    if (globalSearch.trim()) return true;
    for (const [colKey, s] of Object.entries(columnFilters)) {
      const total = uniqueColumnValues[colKey]?.length || 0;
      if (s && s.size < total) return true;
    }
    return false;
  }, [columnFilters, uniqueColumnValues, globalSearch]);

  // Render Cell Content with Branded Styling
  const renderCell = (col: ColumnDef, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'monospace' }}>-</span>;
    }

    if (col.pillType === 'currency') {
      const num = Number(val);
      const formatted = isNaN(num) ? val : num.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return <span style={{ fontWeight: 700, color: '#047857', fontFamily: 'monospace' }}>৳ {formatted}</span>;
    }

    if (col.pillType === 'number') {
      const num = Number(val);
      return <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{isNaN(num) ? val : num.toLocaleString()}</span>;
    }

    if (col.pillType === 'success') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: '#ecfdf5',
          color: '#047857',
          border: '1px solid #a7f3d0'
        }}>
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'warning') {
      const isYes = String(val).toLowerCase() === 'yes';
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          background: isYes ? '#fff7ed' : '#f1f5f9',
          color: isYes ? '#c2410c' : '#475569',
          border: `1px solid ${isYes ? '#fed7aa' : '#cbd5e1'}`
        }}>
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'route') {
      return (
        <span className="route-code-pill">
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'sr') {
      return (
        <span className="sr-code-pill">
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'cust') {
      return (
        <span className="customer-code-pill">
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'timeIn') {
      return (
        <span className="time-pill-in">
          <Clock size={12} />
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'timeOut') {
      return (
        <span className="time-pill-out">
          <Clock size={12} />
          {String(val)}
        </span>
      );
    }

    if (col.pillType === 'bold') {
      return <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{String(val)}</span>;
    }

    return <span>{String(val)}</span>;
  };


  // Dynamic Tailored KPIs for all 35 Reports
  const currentKpis = useMemo(() => {
    const records: any[] = filteredAndSortedRecords || [];
    switch (activeTab) {
      case 'bwiw':
        return [
          { title: 'Total Invoices', val: (metaInfo?.uniqueInvoices ?? new Set(records.map(r => r.invoiceNo).filter(Boolean)).size).toLocaleString(), sub: 'Distinct Sales Memos', color: 'blue', icon: FileSpreadsheet },
          { title: 'Delivery Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.deliveryValueAfterDiscount || r.deliveryValue) || 0), 0)).toLocaleString()}`, sub: 'Delivered Value After Disc', color: 'purple', icon: CheckCircle2 },
          { title: 'SKU Lines Ordered', val: records.length.toLocaleString(), sub: 'Line-Item Order Details', color: 'amber', icon: Layers },
          { title: 'Active SKUs', val: new Set(records.map(r => r.skuCode).filter(Boolean)).size.toLocaleString(), sub: 'Unique Products Sold', color: 'green', icon: Boxes },
        ];
      case 'daily_sr':
        return [
          { title: 'Active SRs', val: new Set(records.map(r => r.srCode).filter(Boolean)).size.toLocaleString(), sub: 'Sales Reps Reporting', color: 'blue', icon: Users },
          { title: 'Market Calls', val: Math.round(records.reduce((s, r) => s + (Number(r.totalCall) || 0), 0)).toLocaleString(), sub: 'Total Scheduled Calls', color: 'green', icon: Store },
          { title: 'Productive Calls (PC)', val: Math.round(records.reduce((s, r) => s + (Number(r.totalPC) || 0), 0)).toLocaleString(), sub: 'Orders Generated', color: 'purple', icon: CheckCircle2 },
          { title: 'Total Sales Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.totalValue) || 0), 0)).toLocaleString()}`, sub: 'Gross Order Booking', color: 'amber', icon: DollarSign },
        ];
      case 'live_detail':
        return [
          { title: 'Visited Outlets', val: Math.round(records.reduce((s, r) => s + (Number(r.visitedOutlet) || 0), 0)).toLocaleString(), sub: "Today's Field Execution", color: 'blue', icon: Store },
          { title: 'Productive Calls', val: Math.round(records.reduce((s, r) => s + (Number(r.productiveCall) || 0), 0)).toLocaleString(), sub: 'Successful Orders', color: 'green', icon: CheckCircle2 },
          { title: 'Live Order Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}`, sub: 'Real-Time Market Sales', color: 'purple', icon: DollarSign },
          { title: 'Avg Strike Rate', val: `${records.length > 0 ? (records.reduce((s, r) => s + (parseFloat(String(r.strikeRate).replace('%', '')) || 0), 0) / records.length).toFixed(1) : '0.0'}%`, sub: 'Market Productivity %', color: 'amber', icon: Target },
        ];
      case 'live_order_update':
        return [
          { title: 'Total Orders', val: new Set(records.map(r => r.orderNo).filter(Boolean)).size.toLocaleString(), sub: 'Live Orders Received', color: 'blue', icon: ShoppingBag },
          { title: 'Gross Order Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}`, sub: 'Value Before Discount', color: 'green', icon: DollarSign },
          { title: 'Total Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Total SKU Pieces', color: 'purple', icon: Boxes },
          { title: 'Net Booking Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.valueAfterDiscount || r.orderValue) || 0), 0)).toLocaleString()}`, sub: 'Net Value After Disc', color: 'amber', icon: CheckCircle2 },
        ];
      case 'stock':
        return [
          { title: 'Active Distributors', val: new Set(records.map(r => r.dbCode).filter(Boolean)).size.toLocaleString(), sub: 'Warehouses / Points', color: 'blue', icon: Store },
          { title: 'Billable Stock (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.billableStock) || 0), 0)).toLocaleString(), sub: 'Ready For Dispatch', color: 'green', icon: Boxes },
          { title: 'Pending Delivery', val: Math.round(records.reduce((s, r) => s + (Number(r.pendingDelivery) || 0), 0)).toLocaleString(), sub: 'In-Transit to Market', color: 'amber', icon: Truck },
          { title: 'Stock Value (Trade)', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.billableStockValueInTradePrice || r.billableStockValueInDbLanding) || 0), 0)).toLocaleString()}`, sub: 'Trade Inventory Worth', color: 'purple', icon: DollarSign },
        ];
      case 'do_receiving':
        return [
          { title: 'Total POs', val: new Set(records.map(r => r.poNumber).filter(Boolean)).size.toLocaleString(), sub: 'Factory Supply Orders', color: 'blue', icon: FileCheck },
          { title: 'SAP Qty (CTN)', val: Math.round(records.reduce((s, r) => s + (Number(r.sapQuantityInCtn) || 0), 0)).toLocaleString(), sub: 'Invoiced Cartons', color: 'green', icon: Boxes },
          { title: 'DB Received (CTN)', val: Math.round(records.reduce((s, r) => s + (Number(r.dbReceivedQuantityInCtn) || 0), 0)).toLocaleString(), sub: 'Physical CTNs Received', color: 'purple', icon: PackageCheck },
          { title: 'Total SAP Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.sapValueInDbLanding) || 0), 0)).toLocaleString()}`, sub: 'DB Landing Value', color: 'amber', icon: DollarSign },
        ];
      case 'approved_po':
        return [
          { title: 'Approved POs', val: new Set(records.map(r => r.poNumber).filter(Boolean)).size.toLocaleString(), sub: 'Management Approved', color: 'blue', icon: CheckCircle2 },
          { title: 'Approved Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.poQuantity) || 0), 0)).toLocaleString(), sub: 'Total Approved Units', color: 'green', icon: Boxes },
          { title: 'DB Landing Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.valueInDbLanding) || 0), 0)).toLocaleString()}`, sub: 'Total Invoiced Cost', color: 'purple', icon: DollarSign },
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
          { title: 'Suggested Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}`, sub: 'Total Recommended Value', color: 'purple', icon: DollarSign },
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
          { title: 'Transfer Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.primarySkuValue) || 0), 0)).toLocaleString()}`, sub: 'Stock Transfer Value', color: 'purple', icon: DollarSign },
          { title: 'Transfer Tonnage', val: `${records.reduce((s, r) => s + (Number(r.primarySkuQtyInTons) || 0), 0).toFixed(2)} Tons`, sub: 'Gross Weight Shipped', color: 'amber', icon: PackageCheck },
        ];
      case 'stockist_secondary':
        return [
          { title: 'Secondary Sales Qty', val: Math.round(records.reduce((s, r) => s + (Number(r.secondarySales) || 0), 0)).toLocaleString(), sub: 'Outlets Secondary Offtake', color: 'blue', icon: ShoppingBag },
          { title: 'Sales Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.secondarySalesValue) || 0), 0)).toLocaleString()}`, sub: 'Net Secondary Revenue', color: 'green', icon: DollarSign },
          { title: 'Closing Stock (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.closingStock) || 0), 0)).toLocaleString(), sub: 'Stockist Inventory Left', color: 'purple', icon: Boxes },
          { title: 'Secondary Volume', val: `${records.reduce((s, r) => s + (Number(r.secondarySalesTon) || 0), 0).toFixed(2)} Tons`, sub: 'Tonnage Executed', color: 'amber', icon: FileBarChart },
        ];
      case 'invoice_list':
        return [
          { title: 'Total Invoices', val: new Set(records.map(r => r.invoiceNo).filter(Boolean)).size.toLocaleString(), sub: 'Generated Memos', color: 'blue', icon: Receipt },
          { title: 'Invoiced Units', val: Math.round(records.reduce((s, r) => s + (Number(r.quantity) || 0), 0)).toLocaleString(), sub: 'Total Pieces Invoiced', color: 'green', icon: Boxes },
          { title: 'Invoiced Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.totalAmt) || 0), 0)).toLocaleString()}`, sub: 'Net Invoice Value', color: 'purple', icon: DollarSign },
          { title: 'Unique Outlets', val: new Set(records.map(r => r.custNo).filter(Boolean)).size.toLocaleString(), sub: 'Customers Billed', color: 'amber', icon: Store },
        ];
      case 'foc_claim':
        return [
          { title: 'FOC Claims', val: records.length.toLocaleString(), sub: 'Free Of Cost Entries', color: 'blue', icon: Tag },
          { title: 'FOC Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Promotional Units', color: 'green', icon: Boxes },
          { title: 'Total Claim Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.claimAmount) || 0), 0)).toLocaleString()}`, sub: 'Claim Value Claimed', color: 'purple', icon: DollarSign },
          { title: 'Beneficiary Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Retailers Benefited', color: 'amber', icon: Store },
        ];
      case 'wholesale_claim':
        return [
          { title: 'Wholesale Claims', val: records.length.toLocaleString(), sub: 'WS Trade Claims', color: 'blue', icon: FileSpreadsheet },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Wholesale Units', color: 'green', icon: Boxes },
          { title: 'Claim Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.claimAmount) || 0), 0)).toLocaleString()}`, sub: 'Reimbursement Value', color: 'purple', icon: DollarSign },
          { title: 'Wholesale Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'WS Customers Claiming', color: 'amber', icon: Store },
        ];
      case 'urban_retail_claim':
        return [
          { title: 'Urban Claims', val: records.length.toLocaleString(), sub: 'City Retail Scheme Claims', color: 'blue', icon: ShoppingBag },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Retail Promo Units', color: 'green', icon: Boxes },
          { title: 'Rebate Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}`, sub: 'Urban Trade Scheme Rebate', color: 'purple', icon: DollarSign },
          { title: 'Urban Retailers', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Participating Stores', color: 'amber', icon: Store },
        ];
      case 'rural_retail_claim':
        return [
          { title: 'Rural Retail Claims', val: records.length.toLocaleString(), sub: 'Village / Rural Schemes', color: 'blue', icon: Store },
          { title: 'Claimed Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.qty) || 0), 0)).toLocaleString(), sub: 'Rural Scheme Units', color: 'green', icon: Boxes },
          { title: 'Claim Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}`, sub: 'Rural Incentive Payout', color: 'purple', icon: DollarSign },
          { title: 'Rural Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'Claiming Rural Outlets', color: 'amber', icon: MapPin },
        ];
      case 'rural_ws_claim':
        return [
          { title: 'Rural WS Claims', val: records.length.toLocaleString(), sub: 'Rural WS Promotions', color: 'blue', icon: Truck },
          { title: 'Invoice Amount', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.totalInvoiceAmount) || 0), 0)).toLocaleString()}`, sub: 'Gross WS Invoiced', color: 'green', icon: DollarSign },
          { title: 'Discount Settled', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.totalInvoiceDiscount) || 0), 0)).toLocaleString()}`, sub: 'Trade Discount Total', color: 'purple', icon: CheckCircle2 },
          { title: 'Rural WS Outlets', val: new Set(records.map(r => r.outletCode).filter(Boolean)).size.toLocaleString(), sub: 'WS Wholesale Points', color: 'amber', icon: Store },
        ];
      case 'freight_export':
        return [
          { title: 'Freight Shipments', val: records.length.toLocaleString(), sub: 'Dispatch Delivery Runs', color: 'blue', icon: Boxes },
          { title: 'Shipped CTNs', val: Math.round(records.reduce((s, r) => s + (Number(r.salesQtyInCtn) || 0), 0)).toLocaleString(), sub: 'Total Master Cartons', color: 'green', icon: PackageCheck },
          { title: 'Freight Sales Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.amount) || 0), 0)).toLocaleString()}`, sub: 'Net Delivery Value', color: 'purple', icon: DollarSign },
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
          { title: 'Delivered Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.deliveredValue) || 0), 0)).toLocaleString()}`, sub: 'Fulfilled Secondary Value', color: 'blue', icon: DollarSign },
          { title: 'Delivered Quantity', val: Math.round(records.reduce((s, r) => s + (Number(r.deliveredQty) || 0), 0)).toLocaleString(), sub: 'Total Delivered Pieces', color: 'green', icon: CheckCircle2 },
          { title: 'Returned Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.returnedValue) || 0), 0)).toLocaleString()}`, sub: 'Market Damage / Returns', color: 'purple', icon: Clock },
          { title: 'Delivered Outlets (PC)', val: Math.round(records.reduce((s, r) => s + (Number(r.deliveredPc) || 0), 0)).toLocaleString(), sub: 'Fulfilled Drops', color: 'amber', icon: Store },
        ];
      case 'sr_wise_sku':
        return [
          { title: 'SKU Line Items', val: records.length.toLocaleString(), sub: 'Distinct SKU Audits', color: 'blue', icon: Boxes },
          { title: 'Ordered Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.orderedQty) || 0), 0)).toLocaleString(), sub: 'Gross Order Quantity', color: 'green', icon: ShoppingBag },
          { title: 'Delivered Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.totalAmountDeliver) || 0), 0)).toLocaleString()}`, sub: 'Gross Fulfilled Amount', color: 'purple', icon: DollarSign },
          { title: 'Net Realized Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.netAmount) || 0), 0)).toLocaleString()}`, sub: 'Net After Trade Discount', color: 'amber', icon: CheckCircle2 },
        ];
      case 'void_order':
        return [
          { title: 'Void Orders', val: new Set(records.map(r => r.orderno).filter(Boolean)).size.toLocaleString(), sub: 'Cancelled Transactions', color: 'blue', icon: XCircle },
          { title: 'Void Units (Qty)', val: Math.round(records.reduce((s, r) => s + (Number(r.skuQuantity) || 0), 0)).toLocaleString(), sub: 'Total Cancelled Pieces', color: 'green', icon: Boxes },
          { title: 'Void Order Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}`, sub: 'Cancelled Revenue', color: 'purple', icon: DollarSign },
          { title: 'Affected Outlets', val: new Set(records.map(r => r.outlet).filter(Boolean)).size.toLocaleString(), sub: 'Outlets with Voids', color: 'amber', icon: Store },
        ];
      case 'void_order_tracker':
        return [
          { title: 'Tracked Voids', val: new Set(records.map(r => r.orderno).filter(Boolean)).size.toLocaleString(), sub: 'Audit Trail Records', color: 'blue', icon: ClockAlert },
          { title: 'Total Void Value', val: `৳ ${Math.round(records.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}`, sub: 'Void Financial Exposure', color: 'green', icon: DollarSign },
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      {/* Top Animated Progress Glow Bar */}
      {loading && <div className="top-loader-bar" />}

      {/* 1. App Header */}
      <header className="app-header">
        <div className="header-container">
          {/* Brand Logo & Title */}
          <div className="brand-section">
            <div className="brand-logo-wrap">
              <span style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.04em', color: 'var(--primary)' }}>
                PVM
              </span>
            </div>
            <div className="brand-divider-line"></div>
            <div className="brand-info">
              <h1>
                Perfetti Van Melle
                <span className="tab-live-badge">SFA LIVE INTEL</span>
              </h1>
              <p>Commercial Distribution & Sales Force Automation Intelligence</p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="header-meta">
            <div className="status-badge" id="live-connection-badge">
              <span className="status-dot"></span>
              <span>Sokrio Live SFA API</span>
            </div>

            {/* User Profile & Logout */}
            <div className="user-profile-header">
              <div className="user-pill">
                <span className="user-avatar-circle">SA</span>
                <span>Super Admin</span>
              </div>
              <button
                id="btn-logout"
                className="btn-logout"
                onClick={handleLogout}
                title="Log out of PVM SFA Portal"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Multi-Sheet Tabs Bar (Clean & Real Excel-Style) */}
      <nav className="excel-tabs-bar" aria-label="Workbook Sheets">
        <div className="excel-tabs-container">
          {TAB_CONFIGS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                data-testid={`tab-${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`excel-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} style={{ color: isActive ? 'var(--excel-green)' : '#64748b' }} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="tab-live-badge">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Main Dashboard Body */}
      <main className="dashboard-main">
        {/* KPI Summary Cards */}
        <section className="kpi-grid" aria-label="Key Performance Indicators">
          {currentKpis.map((kpi, idx) => (
            <div key={idx} className={`kpi-card-premium kpi-card-${kpi.color}`}>
              <div className="kpi-top-row">
                <span className="kpi-title">{kpi.title}</span>
                <div className={`kpi-icon-pill icon-${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
              </div>
              <div className="kpi-middle-row">
                <span className="kpi-main-val">{kpi.val}</span>
                <span className="kpi-subtext">{kpi.sub}</span>
              </div>
              <div className="kpi-progress-bar">
                <div className={`kpi-progress-fill fill-${kpi.color}`} style={{ width: '100%' }}></div>
              </div>
            </div>
          ))}
        </section>

        {/* 4. Controls & Filter Bar */}
        <section className="control-panel">
          <div className="date-controls-group">
            {/* Quick Presets */}
            <div className="quick-presets-group" aria-label="Date Presets">
              <button
                id="preset-btn-today"
                type="button"
                className={`btn-preset ${activePreset === 'today' ? 'active' : ''} ${loading && activePreset === 'today' ? 'is-loading' : ''}`}
                onClick={() => applyPreset('today')}
                disabled={loading}
              >
                {loading && activePreset === 'today' && <RefreshCw size={11} className="animate-spin" />}
                <span>Today</span>
              </button>
              <button
                id="preset-btn-wtd"
                type="button"
                className={`btn-preset ${activePreset === 'wtd' ? 'active' : ''} ${loading && activePreset === 'wtd' ? 'is-loading' : ''}`}
                onClick={() => applyPreset('wtd')}
                disabled={loading}
              >
                {loading && activePreset === 'wtd' && <RefreshCw size={11} className="animate-spin" />}
                <span>WTD</span>
              </button>
              <button
                id="preset-btn-mtd"
                type="button"
                className={`btn-preset ${activePreset === 'mtd' ? 'active' : ''} ${loading && activePreset === 'mtd' ? 'is-loading' : ''}`}
                onClick={() => applyPreset('mtd')}
                disabled={loading}
              >
                {loading && activePreset === 'mtd' && <RefreshCw size={11} className="animate-spin" />}
                <span>MTD</span>
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="input-label" htmlFor="filter-start-date">
                <Calendar size={14} />
                <span>From:</span>
              </label>
              <input
                id="filter-start-date"
                type="date"
                className="custom-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="input-label" htmlFor="filter-end-date">
                <span>To:</span>
              </label>
              <input
                id="filter-end-date"
                type="date"
                className="custom-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              id="btn-refresh-data"
              type="button"
              className="btn btn-outline"
              onClick={() => fetchData(activeTab, startDate, endDate)}
              disabled={loading}
              title="Refresh Data from Sokrio"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="action-buttons">
            {/* Global Search */}
            <div className="search-box-wrap">
              <Search size={14} className="search-icon" />
              <input
                id="global-search-input"
                type="text"
                className="custom-input search-input"
                placeholder={`Search ${activeTabConfig.label}...`}
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                id="btn-reset-filters"
                type="button"
                className="btn-reset-filters"
                onClick={resetAllFilters}
                title="Clear all search queries & column filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Export Buttons */}
            <button
              id="btn-export-excel"
              type="button"
              className="btn btn-export-excel"
              onClick={() => exportData('xlsx')}
              title="Export filtered records to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>

            <button
              id="btn-export-csv"
              type="button"
              className="btn btn-outline"
              onClick={() => exportData('csv')}
              title="Export filtered records to CSV"
            >
              <Download size={15} />
              <span>CSV</span>
            </button>
          </div>
        </section>

        {/* Error Alert with Quick Retry */}
        {error && (
          <div style={{
            padding: '14px 20px',
            marginBottom: '18px',
            borderRadius: 'var(--radius-md)',
            background: '#fff1f2',
            color: '#be123c',
            border: '1px solid #fecdd3',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>Notice:</strong> {error}
            </div>
            <button
              type="button"
              onClick={() => fetchData(activeTab, startDate, endDate)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#be123c',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 5. Modern Data Table Card with Excel-Style Column Dropdown Filters */}
        <section className="table-card">
          <div className="table-header-bar">
            <div className="table-header-title">
              <FileSpreadsheet size={18} style={{ color: 'var(--excel-green)' }} />
              <span>{activeTabConfig.label}</span>
              {loading ? (
                <span className="live-loading-pill" title="Loading...">
                  <RefreshCw size={12} className="animate-spin" />
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({filteredAndSortedRecords.length} records shown)
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#e11d48',
                  background: '#ffe4e6',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  Active Filters Applied
                </span>
              </div>
            )}
          </div>

          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="excel-th" style={{ width: '40px', textAlign: 'center' }}>
                    #
                  </th>
                  {activeTabConfig.columns.map((col, colIdx) => {
                    const isSorted = sortConfig?.key === col.key;
                    const totalVals = uniqueColumnValues[col.key]?.length || 0;
                    const hasCustomFilter = columnFilters[col.key] !== undefined;
                    const selectedCount = hasCustomFilter ? columnFilters[col.key].size : totalVals;
                    const isFiltered = hasCustomFilter && selectedCount < totalVals;
                    const isOpen = openFilterCol === col.key;
                    const isAlignRight = colIdx > activeTabConfig.columns.length - 4;

                    const matchingVals = (uniqueColumnValues[col.key] || []).filter((val) =>
                      val.toLowerCase().includes(filterSearch.toLowerCase())
                    );

                    return (
                      <th key={col.key} className="excel-th">
                        <div className="excel-th-inner">
                          {/* Column Title & Sort */}
                          <div
                            onClick={() => {
                              setSortConfig((prev) => {
                                if (prev?.key === col.key) {
                                  return prev.direction === 'asc' ? { key: col.key, direction: 'desc' } : null;
                                }
                                return { key: col.key, direction: 'asc' };
                              });
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                            title={`Click to sort by ${col.label}`}
                          >
                            <span className="excel-th-title">{col.label}</span>
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp size={12} color="var(--primary)" />
                              ) : (
                                <ArrowDown size={12} color="var(--primary)" />
                              )
                            ) : (
                              <ArrowUpDown size={11} color="#94a3b8" />
                            )}
                          </div>

                          {/* Excel Dropdown Filter Button */}
                          <button
                            type="button"
                            className={`excel-filter-trigger ${isFiltered ? 'filtered' : ''} ${isOpen ? 'open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFilterCol(isOpen ? null : col.key);
                              setFilterSearch('');
                            }}
                            title={`Filter / Sort ${col.label}${isFiltered ? ' (Active filter)' : ''}`}
                          >
                            <Filter size={11} />
                            {isFiltered && <span className="excel-filter-dot" />}
                          </button>
                        </div>

                        {/* Excel Filter Modal */}
                        {isOpen && (
                          <div
                            ref={dropdownRef}
                            onClick={(e) => e.stopPropagation()}
                            className={`excel-filter-popup ${isAlignRight ? 'align-right' : 'align-left'}`}
                          >
                            {/* 1. Header */}
                            <div className="popup-header">
                              <div className="popup-header-title">
                                <Filter size={14} className="popup-header-icon" />
                                <span className="popup-col-name" title={col.label}>
                                  Filter: {col.label}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="popup-close-btn"
                                onClick={() => setOpenFilterCol(null)}
                                title="Close"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* 2. Quick Sort Options */}
                            <div className="popup-sort-section">
                              <button
                                type="button"
                                className={`popup-sort-btn ${isSorted && sortConfig?.direction === 'asc' ? 'active' : ''}`}
                                onClick={() => {
                                  setSortConfig({ key: col.key, direction: 'asc' });
                                }}
                              >
                                <ArrowUp size={12} />
                                <span>Sort A → Z</span>
                              </button>
                              <button
                                type="button"
                                className={`popup-sort-btn ${isSorted && sortConfig?.direction === 'desc' ? 'active' : ''}`}
                                onClick={() => {
                                  setSortConfig({ key: col.key, direction: 'desc' });
                                }}
                              >
                                <ArrowDown size={12} />
                                <span>Sort Z → A</span>
                              </button>
                            </div>

                            {/* 3. Search Bar */}
                            <div className="popup-search-box">
                              <Search size={13} className="popup-search-icon" />
                              <input
                                type="text"
                                className="popup-search-input"
                                placeholder={`Search in ${col.label}...`}
                                value={filterSearch}
                                onChange={(e) => setFilterSearch(e.target.value)}
                                autoFocus
                              />
                              {filterSearch && (
                                <button
                                  type="button"
                                  className="popup-search-clear"
                                  onClick={() => setFilterSearch('')}
                                  title="Clear search"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>

                            {/* 4. Selection Toolbar */}
                            <div className="popup-selection-toolbar">
                              <span className="popup-count-badge">
                                {selectedCount} of {totalVals} selected
                              </span>
                              <div className="popup-quick-links">
                                <button
                                  type="button"
                                  onClick={() => selectAllFilter(col.key, true)}
                                  className="popup-link-action select-all"
                                >
                                  Select All
                                </button>
                                <span className="popup-link-divider">|</span>
                                <button
                                  type="button"
                                  onClick={() => selectAllFilter(col.key, false)}
                                  className="popup-link-action clear-all"
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>

                            {/* 5. Scrollable Value List */}
                            <div className="popup-list-container">
                              {matchingVals.length === 0 ? (
                                <div className="popup-empty-state">
                                  No matching values found
                                </div>
                              ) : (
                                matchingVals.map((val) => {
                                  const isChecked = !columnFilters[col.key] || columnFilters[col.key].has(val);
                                  return (
                                    <label key={val} className="popup-list-item">
                                      <input
                                        type="checkbox"
                                        className="popup-checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleFilterValue(col.key, val)}
                                      />
                                      <span className="popup-item-label" title={val}>
                                        {val || '(Blank)'}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>

                            {/* 6. Footer Actions */}
                            <div className="popup-footer">
                              <button
                                type="button"
                                className="popup-reset-btn"
                                onClick={() => {
                                  clearColumnFilter(col.key);
                                }}
                                disabled={!isFiltered}
                                title={isFiltered ? "Reset filter for this column" : "No active filter"}
                              >
                                <RotateCcw size={12} />
                                <span>Reset</span>
                              </button>
                              <button
                                type="button"
                                className="popup-apply-btn"
                                onClick={() => setOpenFilterCol(null)}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeTabConfig.columns.length + 1}
                      style={{ textAlign: 'center', padding: '64px 24px', border: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={activeTabConfig.columns.length + 1} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                      <FileSpreadsheet size={32} style={{ margin: '0 auto 12px', color: 'var(--text-dim)' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        No records match the selected criteria
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        Try adjusting your date range or clearing column filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r, rowIdx) => {
                    const rowNumber = (currentPage - 1) * pageSize + rowIdx + 1;
                    return (
                      <tr key={r.id || `row-${rowNumber}`}>
                        <td className="excel-td" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'monospace' }}>
                          {rowNumber}
                        </td>
                        {activeTabConfig.columns.map((col) => (
                          <td key={col.key} className="excel-td">
                            {renderCell(col, r[col.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="pagination-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Show</span>
              <select
                className="custom-input"
                style={{ padding: '3px 8px', fontSize: '12px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>records per page</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 8px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer Branding */}
      <footer style={{ borderTop: '1px solid var(--border)', background: '#ffffff', padding: '16px 28px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1680px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div>
            <strong style={{ color: 'var(--primary)' }}>Perfetti Van Melle Bangladesh</strong> • Commercial Distribution & Sales Force Automation
          </div>
          <div>
            Powered by <strong>Sokrio Technologies Ltd.</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
