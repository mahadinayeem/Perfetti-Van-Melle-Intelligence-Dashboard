import skuCatalogData from './skuCatalog.json';

export const OFFICIAL_SKU_NAMES: Record<string, string> = {
  '650810': 'Mentos Roll Assorted Hanger 18Px3P',
  '650812': 'Juzt Jelly Assorted Snack Pack 12P',
  '650930': 'Juzt Jelly Snack Pack 50g',
  '650932': 'Alpenliebe Creamfills 15Jarx180P',
  '650945': 'Mentos Roll Assorted Hanger 3P',
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
  '651211': 'CC ROPE ST-GA 24HNGx80Px4.5G FAC',
  '651212': 'CTR FRUIT ST - 32BOXx110Px2.8G-T',
  '651216': 'Mentos Roll Orange 12Boxx24R-LE',
  '651230': 'CC ROPE ST-GA-BB 24HNGx80Px4.5G SAC',
  '651231': 'CC ROPE ST-GA-BB 24HNGx80Px4.5G 3P',
  '651232': 'MTS MINT-OR 32PCHx40Px2.7G',
  '651240': 'CC ROPE ST 24HNGx80Px4.5G',
  '651260': 'MTS AIR ACTION EU - 15JARx225Px2.3G',
  '651270': 'CC ROPE ST 60PCHx14Px4.5G',
  '651272': 'Mentos Roll Mint 12Boxx24R',
  '651273': 'Mentos Roll Orange 12Boxx24R',
  '651281': 'CTR FRESH SP 15JARX200P',
  '651282': 'CTR FRESH SP 15JARX220P',
  '651283': 'CTR FRESH SP 32BOXx110P',
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

  // Transliterate Bengali numerals to standard English digits
  let s = rawName;
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  bnDigits.forEach((d, idx) => {
    s = s.split(d).join(String(idx));
  });

  // Convert Bengali Perfetti product terms
  s = s
    .replace(/চুপা\s*চুপস/g, 'Chupa Chups')
    .replace(/মেন্টস|মেন্তস|মেন্থস/g, 'Mentos')
    .replace(/অ্যালপেনলিবে|আলপেনলিবে/g, 'Alpenliebe')
    .replace(/জাস্ট\s*জেলি|জুজ্ট\s*জেলি/g, 'Juzt Jelly')
    .replace(/ক্রিমফিলস/g, 'Creamfills')
    .replace(/চিউই/g, 'Chewy')
    .replace(/সেন্টার\s*ফ্রেশ/g, 'Center Fresh')
    .replace(/সেন্টার\s*ফ্রূট|সেন্টার\s*ফ্রুট/g, 'Center Fruit')
    .replace(/স্পিয়ারমিনট|স্পিয়ারমিন্ট|স্পিয়ারমিন্ট/g, 'Spearmint')
    .replace(/স্ট্রবেরি/g, 'Strawberry')
    .replace(/বাইট্‌স|বাইট/g, 'Bites')
    .replace(/মিক্স\s*ফ্রূট|মিক্স\s*ফ্রুট/g, 'Mix Fruit')
    .replace(/টিউব/g, 'Tube')
    .replace(/রোপ/g, 'Rope')
    .replace(/হেঙ্গার/g, 'Hanger')
    .replace(/জার/g, 'Jar')
    .replace(/বক্স/g, 'Box')
    .replace(/পাউচ/g, 'Pouch')
    .replace(/পিসেস|পিস/g, 'Pcs')
    .replace(/রোল/g, 'Roll')
    .replace(/অরেঞ্জ/g, 'Orange')
    .replace(/মিন্ট/g, 'Mint')
    .replace(/ম্যাক্স/g, 'Max')
    .replace(/অ্যাসোরটেড/g, 'Assorted')
    .replace(/স্ন্যাক\s*প্যাক/g, 'Snack Pack')
    .replace(/গ্রাম/g, 'g')
    .replace(/পকেট/g, 'Pocket')
    .replace(/এয়ার\s*অ্যাকশন/g, 'Air Action')
    .replace(/কফি/g, 'Coffee')
    .replace(/এসএএস/g, 'SAS')
    .replace(/এসটিবি/g, 'STB')
    .replace(/এসটি/g, 'ST')
    .replace(/জিএ/g, 'GA')
    .replace(/এফএসি/g, 'FAC')
    .replace(/টিপি/g, 'TP')
    .replace(/এসসি/g, 'SC')
    .replace(/এলইপি/g, 'LEP')
    .replace(/এলই/g, 'LE')
    .replace(/ডিআইএস/g, 'DIS')
    .replace(/৩পি|3পি/g, '3P')
    .replace(/পি/g, 'P')
    .replace(/জি/g, 'G')
    .replace(/টি/g, 'T')
    .replace(/সিআর/g, 'CR')
    .replace(/বিবি/g, 'BB')
    .replace(/সিএল/g, 'CL')
    .replace(/বিএসসিটি/g, 'BSCT')
    .replace(/ইস্পি|ইসপি/g, 'ISP')
    .replace(/[\u0980-\u09FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (s.length > 2) {
    return s;
  }

  return code ? `Perfetti SKU ${code}` : 'Perfetti Product';
}

