const fs = require('fs');

const pageTsx = fs.readFileSync('src/app/page.tsx', 'utf8');

const arrayStart = pageTsx.indexOf('const TAB_CONFIGS:');
const arrayEnd = pageTsx.indexOf('];\n\nexport default function DashboardPage()');

if (arrayStart === -1 || arrayEnd === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const headerPart = pageTsx.substring(arrayStart, pageTsx.indexOf('[\n  {\n    id:', arrayStart) + 2);
const configsSection = pageTsx.substring(arrayStart, arrayEnd);

// Extract each config block
const configBlocks = [];
const regex = /  \{\s*\n\s*id:\s*'([a-z_]+)',[\s\S]*?  \},/g;
let m;
while ((m = regex.exec(configsSection)) !== null) {
  configBlocks.push({ id: m[1], block: m[0] });
}

const blockMap = new Map();
configBlocks.forEach(b => blockMap.set(b.id, b.block));

// Desired order matching Report Sample.xlsx exactly:
const desiredOrder = [
  'bwiw',
  'daily_sr',
  'live_detail',
  'live_order_update',
  'stock',
  'do_receiving',
  'approved_po',
  'memo_print',
  'po_crs',
  'sr_login',
  'summary_print',
  'te_attendance',
  'te_visit',
  'super_sub_stock',
  'stockist_secondary',
  'invoice_list',
  'foc_claim',
  'wholesale_claim',
  'urban_retail_claim',
  'rural_retail_claim',
  'rural_ws_claim',
  'freight_export',
  'user_info',
  'license_report',
  'non_bill_outlet',
  'te_version_list',
  'sr_version_list',
  'geo_tag',
  'delivery_confirmation',
  'void_order',
  'void_order_tracker',
  'mt_sku_update',
  'mt_visit'
];

const reorderedConfigs = desiredOrder.map(id => blockMap.get(id)).join('\n');

const newConfigsSection = headerPart + reorderedConfigs + '\n';

const updatedPageTsx = pageTsx.substring(0, arrayStart) + newConfigsSection + pageTsx.substring(arrayEnd);

fs.writeFileSync('src/app/page.tsx', updatedPageTsx, 'utf8');
console.log('src/app/page.tsx successfully reordered to match Report Sample.xlsx 100%!');
