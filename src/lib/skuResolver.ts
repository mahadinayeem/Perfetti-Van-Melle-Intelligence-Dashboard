import skuCatalogData from './skuCatalog.json';

export const OFFICIAL_SKU_NAMES: Record<string, string> = {
  '650961': 'Alp Juzt Jelly ST 15JX180PX3.7g',
  '651060': 'ALP JUZT JELLY ST 15JARX180PX3.7G',
  '651091': 'Mentos Roll Mint 12BoxX24RollsX21.6g',
  '651092': 'Mentos Roll Orange 12BoxX24RollsX21.6g',
  '651135': 'ALP JUZT JELLY ST 32BOXx90Px3.7G',
  '651140': 'CTRFRESH SP STICKPK16BOXx24Px16.8G-6x2.8',
  '651163': 'CTR FRUIT ST - 15JARx200Px2.8G',
  '651164': 'CTR FRUIT ST - 32BOXx110Px2.8G',
  '651170': 'CTR FRUIT MAX ST-15JARX180PX3.2G',
  '651176': 'CTR FRESH SP 32BOXx110Px2.8G',
  '651177': 'CTR FRESH SP 32BOXx110Px2.8G',
  '651212': 'CTR FRUIT ST - 32BOXx110Px2.8G-T',
  '651232': 'MTS MINT-OR 32PCHx40Px2.7G',
  '651240': 'CC ROPE ST 24HNGx80Px4.5G',
  '651260': 'MTS AIR ACTION EU - 15JARx225Px2.3G',
  '651270': 'CC ROPE ST 60PCHx14Px4.5G',
  '651282': 'CTR FRESH SP 15JARX220P',
  '651284': 'CTR FRUIT ST - 15JARx200Px2.8G-T',
  '651285': 'CTR FRUIT ST 15JARx220P',
  '651286': 'CTR FRUIT ST - 32BOXx110Px2.8G-T',
  '651287': 'CC BITES MF TUBE S-O-A 12HNGx20PCHx19.8G',
  '651288': 'CC BITES MIX FRT 12BOX × 8PCH × 61.6G',
  '651289': 'CC TUBES ST-OR-GA 12BOX × 8PCH × 61.6G',
  '651293': 'ALP JUZT JELLY ST 12BOXx8PCHx103.6G',
  '651296': 'CC ROPE ST-GA-OR 24HNGx80Px4.5G',
  '651300': 'CTR FRUIT ST 32BOXx110P',
  '651301': 'CTR FRUIT ST 15JARx200P',
  '651302': 'CTR FRUIT ST 15JARx220P',
  '651303': 'ALP CHEWY CR-STB 4POCKET 18HNGx80P',
  '651305': 'ALP CHEWY CR-STB-12BOXx8PCHx67.5g',
  '651306': 'CTR FRESH SP 32BOXx110P',
  '651311': 'ALP CREAMFILLS CR 15JARX180P',
  '651314': 'MTS AIR ACTION EU - 15JARx225Px2.3G',
  '651315': 'CTR FRUIT ST 15JARx220P',
  '651316': 'ALP JUZT JELLY ST 15JARX180PX3.7G TP SC',
  '651318': 'CTR FRESH SP 15JARX220P',
  '651319': 'CTR FRESH SP 15JARX220P',
  '651332': 'CTR FRESH SP 15JARX200P',
  '651352': 'CC BITES MF TUBE SOA 12HNGx20PCHx19.8G3P',
  '651373': 'CC DUO WM 15BOXx80Px4.5G',
};

const SKU_CATALOG: Record<string, any> = skuCatalogData as any;

/**
 * Resolves any SKU code to its strictly English Perfetti brand name.
 * If not in catalog, checks Bengali dictionary and cleans up to English.
 */
export function resolveEnglishSkuName(skuCode: string | number, rawName?: string): string {
  const code = String(skuCode || '').trim();
  if (code && OFFICIAL_SKU_NAMES[code]) {
    return OFFICIAL_SKU_NAMES[code];
  }

  const catEntry = SKU_CATALOG[code];
  if (catEntry?.skuName) return catEntry.skuName;
  if (catEntry?.motherSkuName) return catEntry.motherSkuName;

  if (rawName && !/[\u0980-\u09FF]/.test(rawName)) {
    return rawName.trim();
  }

  if (!rawName) {
    return code ? `Perfetti SKU ${code}` : 'Perfetti Product';
  }

  // Convert Bengali Perfetti product terms
  let s = rawName
    .replace(/চুপা\s*চুপস/g, 'Chupa Chups')
    .replace(/রোপ/g, 'Rope')
    .replace(/বাইট/g, 'Bites')
    .replace(/টিউব/g, 'Tube')
    .replace(/মেন্তস/g, 'Mentos')
    .replace(/মেন্থস/g, 'Mentos')
    .replace(/রোল/g, 'Roll')
    .replace(/অরেঞ্জ/g, 'Orange')
    .replace(/মিন্ট/g, 'Mint')
    .replace(/সেন্টার\s*ফ্রেশ/g, 'Center Fresh')
    .replace(/স্পিয়ারমিন্ট/g, 'Spearmint')
    .replace(/সেন্টার\s*ফ্রুট/g, 'Center Fruit')
    .replace(/স্ট্রবেরি/g, 'Strawberry')
    .replace(/আলপেনলিবে/g, 'Alpenliebe')
    .replace(/জুজ্ট\s*জেলি/g, 'Juzt Jelly')
    .replace(/ক্রিমফিলস/g, 'Creamfills')
    .replace(/জার/g, 'Jar')
    .replace(/বক্স/g, 'Box')
    .replace(/পাউচ/g, 'Pch')
    .replace(/পিস/g, 'Pcs')
    .replace(/এসটি/g, 'ST')
    .replace(/জিএ/g, 'GA')
    .replace(/টি/g, 'T')
    .replace(/জি/g, 'G');

  if (/[\u0980-\u09FF]/.test(s)) {
    return code ? `Perfetti SKU ${code}` : 'Perfetti Product';
  }

  return s.trim();
}

