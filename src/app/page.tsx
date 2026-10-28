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
  | 'invoice_list';

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
          {activeTab === 'bwiw' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Invoices</span>
                  <div className="kpi-icon-pill icon-blue">
                    <FileSpreadsheet size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.uniqueInvoices ?? new Set(filteredAndSortedRecords.map(r => r.invoiceNo)).size}
                  </span>
                  <span className="kpi-subtext">Distinct Sales Memos</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Delivery Value</span>
                  <div className="kpi-icon-pill icon-purple">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.deliveryValueAfterDiscount || r.deliveryValue) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Delivered Value After Disc</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">SKU Lines Ordered</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Layers size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.length.toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Line-Item Order Details</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'daily_sr' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Active Field SRs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.totalActiveSRs ?? new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">Representatives Logged</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Outlets Visited</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.totalCall) || 0), 0).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Physical Store Visits</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Productive Calls</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.totalPC) || 0), 0).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Orders Successfully Booked</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Avg Strike Rate</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.avgStrikeRate ?? '71.5%'}
                  </span>
                  <span className="kpi-subtext">
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.totalValue) || 0), 0)).toLocaleString()} Total
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'live_detail' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Field Force Today</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Radio size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.totalActiveSRs ?? filteredAndSortedRecords.filter(r => r.visitedOutlet > 0).length}
                  </span>
                  <span className="kpi-subtext" style={{ color: '#047857', fontWeight: 700 }}>
                    ● Real-Time Active
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Outlets Covered Today</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.visitedOutlet) || 0), 0)}
                  </span>
                  <span className="kpi-subtext">
                    of {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.scheduleCall) || 0), 0)} Scheduled
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Productive Orders</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.productiveCall) || 0), 0)}
                  </span>
                  <span className="kpi-subtext">
                    {metaInfo?.avgProductivity ?? '58.7%'} Productivity
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Today's Live Sales</span>
                  <div className="kpi-icon-pill icon-amber">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.orderValue) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Booked Orders Today</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'live_order_update' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Orders</span>
                  <div className="kpi-icon-pill icon-blue">
                    <FileSpreadsheet size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.totalOrders ?? new Set(filteredAndSortedRecords.map(r => r.orderNo)).size}
                  </span>
                  <span className="kpi-subtext">Distinct Invoices / Orders</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Outlets Ordered</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {metaInfo?.totalOutlets ?? new Set(filteredAndSortedRecords.map(r => r.customerNo)).size}
                  </span>
                  <span className="kpi-subtext">Productive Customer Stores</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Live Sales</span>
                  <div className="kpi-icon-pill icon-purple">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.valueAfterDiscount || r.orderValue) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Value After Discount</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">SKU Lines Booked</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Layers size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.length.toLocaleString()}
                  </span>
                  <span className="kpi-subtext">
                    Across {new Set(filteredAndSortedRecords.map(r => r.skuCode)).size} Unique SKUs
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'stock' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Active SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.length}
                  </span>
                  <span className="kpi-subtext">Distributor SKUs Managed</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Floor Stock Value (TP)</span>
                  <div className="kpi-icon-pill icon-green">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.floorStockValueTradePrice) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">In-Hand Warehouse Inventory</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Billable Stock (TP)</span>
                  <div className="kpi-icon-pill icon-purple">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.billableStockValueTradePrice) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Net Available for Billing</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Pending Delivery (TP)</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#b45309' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + Math.abs(Number(r.pendingDeliveryValueTradePrice) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Orders in Delivery Pipeline</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'mt_visit' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total MT Visits</span>
                  <div className="kpi-icon-pill icon-blue">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Verified Check-ins</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Unique Outlets</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.customerNo)).size}
                  </span>
                  <span className="kpi-subtext">Distinct Outlets Visited</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Active Field Force</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">MT Sales Representatives</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Average Time Spent</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {(() => {
                      const withTime = filteredAndSortedRecords.filter(r => r.clockInTime && r.clockOutTime);
                      if (!withTime.length) return '0 min';
                      let totalMin = 0;
                      withTime.forEach(r => {
                        const inT = new Date(r.clockInTime).getTime();
                        const outT = new Date(r.clockOutTime).getTime();
                        if (outT > inT) totalMin += (outT - inT) / 60000;
                      });
                      return `${Math.round(totalMin / withTime.length)} min`;
                    })()}
                  </span>
                  <span className="kpi-subtext">Per Completed Visit</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'do_receiving' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Active SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Catalog Products</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Active Brands</span>
                  <div className="kpi-icon-pill icon-green">
                    <Layers size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.brand).filter(Boolean)).size}
                  </span>
                  <span className="kpi-subtext">Product Brands</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Truck size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px' }}>
                    102267
                  </span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">SAP DO Integration</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px', color: '#b45309' }}>
                    Pending SAP Sync
                  </span>
                  <span className="kpi-subtext">Awaiting SAP ERP Connection</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'approved_po' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total PO SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <FileCheck size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Active Catalog Items</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor Point</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Territory</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">Jatra Bari</span>
                  <span className="kpi-subtext">Central South Cluster</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">SAP PO Status</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px', color: '#b45309' }}>
                    Live Master Active
                  </span>
                  <span className="kpi-subtext">Primary SAP PO Disconnected</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'po_crs' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total CRS SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <ClipboardCheck size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Catalog SKUs Analyzed</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Replenishment Plan</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px' }}>Continuous</span>
                  <span className="kpi-subtext">Automated CRS Pipeline</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">CRS Calculation</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px', color: '#b45309' }}>
                    SAP Algorithm
                  </span>
                  <span className="kpi-subtext">Suggested Qty via SAP Sync</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'sr_login' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Active Field Force</span>
                  <div className="kpi-icon-pill icon-blue">
                    <LogIn size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">SRs Logged In Today</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Day End Completed</span>
                  <div className="kpi-icon-pill icon-green">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.filter(r => r.dayEnd === 'Yes').length}
                  </span>
                  <span className="kpi-subtext">of {filteredAndSortedRecords.length} Active Shifts</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Territory</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">Jatra Bari</span>
                  <span className="kpi-subtext">Central South Area</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Avg Start Distance</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {(() => {
                      const dists = filteredAndSortedRecords.map(r => Number(r.distanceFromDbLocation) || 0).filter(d => d > 0);
                      if (!dists.length) return '0 m';
                      return `${Math.round(dists.reduce((a, b) => a + b, 0) / dists.length)} m`;
                    })()}
                  </span>
                  <span className="kpi-subtext">From Distributor Point</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'memo_print' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Memos Printed</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Printer size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Delivery Invoices Printed</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distinct SRs</span>
                  <div className="kpi-icon-pill icon-green">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">Sales Representatives</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor Point</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Printing Status</span>
                  <div className="kpi-icon-pill icon-amber">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    Web Generated
                  </span>
                  <span className="kpi-subtext">Invoice Dispatch Ready</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'summary_print' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Summary Batches</span>
                  <div className="kpi-icon-pill icon-blue">
                    <FileText size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Summary Print Batches</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Covered SRs</span>
                  <div className="kpi-icon-pill icon-green">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">Route Summary Sheets</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor Point</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Audit Status</span>
                  <div className="kpi-icon-pill icon-amber">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    Verified
                  </span>
                  <span className="kpi-subtext">Daily Dispatch Audit</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'te_attendance' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">TM Check-ins</span>
                  <div className="kpi-icon-pill icon-blue">
                    <UserCheck size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Verified TM Attendances</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Active TM</span>
                  <div className="kpi-icon-pill icon-green">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px' }}>
                    Palash Chandra
                  </span>
                  <span className="kpi-subtext">Code: 5104 (Jatra Bari)</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Territory</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">Jatra Bari</span>
                  <span className="kpi-subtext">Central South Area</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Visit Type</span>
                  <div className="kpi-icon-pill icon-amber">
                    <MapPin size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px', color: '#047857' }}>
                    Stockiest Visit
                  </span>
                  <span className="kpi-subtext">Distributor Point Supervision</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'te_visit' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Supervised Routes</span>
                  <div className="kpi-icon-pill icon-blue">
                    <MapPin size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Field Work Shifts</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Visited Outlets</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.visitedOl) || 0), 0)}
                  </span>
                  <span className="kpi-subtext">
                    of {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.sc) || 0), 0)} Scheduled
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Supervised SRs</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Users size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.srCode)).size}
                  </span>
                  <span className="kpi-subtext">Sales Representatives</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Coverage Rate</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Target size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    {(() => {
                      const totalSc = filteredAndSortedRecords.reduce((s, r) => s + (Number(r.sc) || 0), 0);
                      const totalVis = filteredAndSortedRecords.reduce((s, r) => s + (Number(r.visitedOl) || 0), 0);
                      return totalSc > 0 ? `${Math.round((totalVis / totalSc) * 100)}%` : '0%';
                    })()}
                  </span>
                  <span className="kpi-subtext">Average Route Execution</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'super_sub_stock' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Transfer SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <PackageCheck size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Catalog SKUs Tracked</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor</span>
                  <div className="kpi-icon-pill icon-green">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">DB Category</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px' }}>
                    Direct Main DB
                  </span>
                  <span className="kpi-subtext">Factory DO Recipient</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Sub DB Transfer</span>
                  <div className="kpi-icon-pill icon-amber">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ fontSize: '18px', color: '#b45309' }}>
                    Non-Sub Territory
                  </span>
                  <span className="kpi-subtext">Urban Direct Sales Model</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'stockist_secondary' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Active SKUs</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Catalog Items Managed</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Secondary Sales</span>
                  <div className="kpi-icon-pill icon-green">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.secondarySalesValue) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.secondarySales) || 0), 0)} Units Sold
                  </span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Closing Stock</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Boxes size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.closingStock) || 0), 0).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Units in Stock</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Sales Tonnage</span>
                  <div className="kpi-icon-pill icon-amber">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {filteredAndSortedRecords.reduce((s, r) => s + (Number(r.secondarySalesTon) || 0), 0).toFixed(3)} Ton
                  </span>
                  <span className="kpi-subtext">Dispatched Volume</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'invoice_list' && (
            <>
              <div className="kpi-card-premium kpi-card-blue">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Invoices</span>
                  <div className="kpi-icon-pill icon-blue">
                    <Receipt size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">{filteredAndSortedRecords.length}</span>
                  <span className="kpi-subtext">Distinct Invoiced Items</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-blue" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-green">
                <div className="kpi-top-row">
                  <span className="kpi-title">Total Invoiced Value</span>
                  <div className="kpi-icon-pill icon-green">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val" style={{ color: '#047857' }}>
                    ৳ {Math.round(filteredAndSortedRecords.reduce((s, r) => s + (Number(r.totalAmt) || 0), 0)).toLocaleString()}
                  </span>
                  <span className="kpi-subtext">Net Billed Revenue</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-green" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-purple">
                <div className="kpi-top-row">
                  <span className="kpi-title">Outlets Invoiced</span>
                  <div className="kpi-icon-pill icon-purple">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">
                    {new Set(filteredAndSortedRecords.map(r => r.custNo)).size}
                  </span>
                  <span className="kpi-subtext">Distinct Retailers</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-purple" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="kpi-card-premium kpi-card-amber">
                <div className="kpi-top-row">
                  <span className="kpi-title">Distributor Point</span>
                  <div className="kpi-icon-pill icon-amber">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div className="kpi-middle-row">
                  <span className="kpi-main-val">102267</span>
                  <span className="kpi-subtext">M/S Ahamed Enterprise</span>
                </div>
                <div className="kpi-progress-bar">
                  <div className="kpi-progress-fill fill-amber" style={{ width: '100%' }}></div>
                </div>
              </div>
            </>
          )}
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
