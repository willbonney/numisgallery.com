import { getCountryCode } from '../data/countries';
import type { BanknoteFormData, Currency, PmgGrade } from '../types/banknote';
import { CURRENCIES, GRADES, PMG_GRADES } from '../types/banknote';

/**
 * Parse a catalog number that may use US thousands (1,000.50)
 * or European thousands / decimal comma (1.000,50 / 10,50).
 */
export function parseLocalizedNumber(raw: string): number {
  const s = raw.trim().replace(/\s/g, '');
  const match = s.match(
    /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/,
  );
  if (!match) return NaN;
  const token = match[0];
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token)) {
    return parseFloat(token.replace(/,/g, ''));
  }
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(token)) {
    return parseFloat(token.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+,\d+$/.test(token)) {
    return parseFloat(token.replace(',', '.'));
  }
  return parseFloat(token);
}

interface NumistaCSVRow {
  Country: string;
  Issuer: string;
  'Ruling authority': string;
  Currency: string;
  'Face value': string;
  Reference: string;
  Title: string;
  'Year range': string;
  Year: string;
  'Gregorian year': string;
  Mintmark: string;
  Marks: string;
  References: string;
  Comment: string;
  Grade: string;
  'Buying price (USD)': string;
  'Buying price (BRL)': string;
  'Estimate (USD)': string;
  [key: string]: string; // Allow dynamic keys for "Buying price (XXX)" columns
  'Acquisition date': string;
  'Serial number': string;
  'Third-party grading': string;
  Details: string;
  'Slab number': string;
  'CAC sticker': string;
}

/**
 * Parse CSV text into rows. Quoted fields may contain commas and newlines.
 */
export function parseCSV(csvText: string): NumistaCSVRow[] {
  const records = parseCSVRecords(csvText.replace(/^\uFEFF/, ''));
  if (records.length < 2) return [];

  const headers = records[0];
  const rows: NumistaCSVRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (values.every((value) => value === '')) continue;

    const row: Partial<NumistaCSVRow> = {};
    headers.forEach((header, index) => {
      row[header as keyof NumistaCSVRow] = values[index] || '';
    });
    rows.push(row as NumistaCSVRow);
  }

  return rows;
}

/** Split CSV text into records, keeping newlines that sit inside quotes. */
export function parseCSVRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(current.trim());
      current = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim());
      if (row.some((value) => value !== '')) records.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((value) => value !== '')) records.push(row);
  }

  return records;
}

const GRADE_ALIASES: Record<string, (typeof GRADES)[number]> = {
  'ABOUT UNCIRCULATED': 'AU',
  UNCIRCULATED: 'UNC',
  'EXTREMELY FINE': 'XF',
  'VERY FINE': 'VF',
  FINE: 'F',
  'VERY GOOD': 'VG',
  GOOD: 'G',
};

/**
 * Convert Numista CSV row to BanknoteFormData
 */
export function convertCSVRowToBanknote(row: NumistaCSVRow): Partial<BanknoteFormData> | null {
  try {
    const data: Partial<BanknoteFormData> = {
      noteType: 'world', // Default to world note
      isRangeOfYearOfIssue: false,
      purchasePriceCurrency: 'USD',
      purchasePrice: 0,
      dateOfPurchase: '',
      pmgCert: '',
      grade: 'Not Listed',
      pmgComments: '',
      isEpq: false,
      isSpecimen: false,
      serialNumber: '',
      watermark: '',
      isVisibleInCollection: true,
      isFeatured: false,
    };

    // Country - check Country first, then Issuer as fallback
    const countryName = row.Country || row.Issuer;
    if (countryName) {
      data.country = countryName.trim();
      const countryCode = getCountryCode(data.country);
      if (countryCode) {
        data.countryCode = countryCode;
      }
    }

    // Authority (text after comma in first line, or from Ruling authority)
    // Only use Issuer as authority if Country column exists and Issuer is different
    if (row['Ruling authority']) {
      data.authority = row['Ruling authority'].trim();
    } else if (row.Country && row.Issuer && row.Issuer !== row.Country) {
      data.authority = row.Issuer.trim();
    }

    // Pick Number (remove "P#" prefix)
    if (row.Reference) {
      let pickNumber = row.Reference.trim();
      // Remove P# or Pick# prefix
      pickNumber = pickNumber.replace(/^(P#|Pick#)\s*/i, '');
      data.pickNumber = pickNumber;
    }

    // Face Value
    if (row['Face value']) {
      const faceValue = parseLocalizedNumber(row['Face value']);
      if (Number.isFinite(faceValue)) {
        data.faceValue = faceValue;
      }
    } else if (row.Title) {
      // Try to extract from Title (e.g., "500 Francs" -> 500)
      const match = row.Title.match(/(\d+)/);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          data.faceValue = value;
        }
      }
    }

    // Currency (extract from Title or Currency field)
    if (row.Currency) {
      data.currency = row.Currency.trim();
    } else if (row.Title) {
      // Extract from Title (e.g., "500 Francs" -> "Francs")
      const titleParts = row.Title.split(/\s+/);
      if (titleParts.length > 1) {
        const currencyPart = titleParts.slice(1).join(' ');
        data.currency = currencyPart;
      }
    }

    // Year of Issue
    if (row.Year) {
      const year = parseInt(row.Year, 10);
      if (!isNaN(year)) {
        data.yearOfIssueSingle = year;
        data.isRangeOfYearOfIssue = false;
      }
    } else if (row['Year range']) {
      const range = row['Year range'].trim();
      const rangeMatch = range.match(/(\d{4})\s*[-–]\s*(\d{4})/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end)) {
          data.yearOfIssueStart = start;
          data.yearOfIssueEnd = end;
          data.isRangeOfYearOfIssue = true;
        }
      } else {
        // Try single year
        const year = parseInt(range, 10);
        if (!isNaN(year)) {
          data.yearOfIssueSingle = year;
          data.isRangeOfYearOfIssue = false;
        }
      }
    }

    // Grade (map to our grade system)
    if (row.Grade) {
      const grade = row.Grade.trim().toUpperCase();
      if (PMG_GRADES.includes(grade as PmgGrade)) {
        data.grade = grade as PmgGrade;
      } else if (GRADES.includes(grade as (typeof GRADES)[number])) {
        data.grade = grade as (typeof GRADES)[number];
      } else if (GRADE_ALIASES[grade]) {
        data.grade = GRADE_ALIASES[grade];
      } else {
        data.grade = 'Not Listed';
      }
    }

    // Purchase price: use the first Buying price column that actually has a value.
    // An empty "Buying price (USD)" must not hide "Buying price (BRL)".
    const buyingPriceKeys = Object.keys(row).filter((key) =>
      key.toLowerCase().startsWith('buying price'),
    );

    for (const buyingPriceKey of buyingPriceKeys) {
      const priceValue = row[buyingPriceKey];
      if (!priceValue || !priceValue.trim()) continue;
      const price = parseLocalizedNumber(priceValue);
      if (!Number.isFinite(price)) continue;

      data.purchasePrice = price;
      const currencyMatch = buyingPriceKey.match(/\(([A-Z]{3})\)/i);
      if (currencyMatch) {
        const currency = currencyMatch[1].toUpperCase();
        data.purchasePriceCurrency = CURRENCIES.includes(currency as Currency)
          ? (currency as Currency)
          : 'USD';
      } else {
        data.purchasePriceCurrency = 'USD';
      }
      break;
    }

    // Acquisition Date
    if (row['Acquisition date']) {
      data.dateOfPurchase = row['Acquisition date'].trim();
    }

    // Serial Number
    if (row['Serial number']) {
      data.serialNumber = row['Serial number'].trim();
    }

    // Comment -> PMG Comments
    if (row.Comment) {
      data.pmgComments = row.Comment.trim();
    }

    return data;
  } catch (error) {
    console.error('Error converting CSV row:', error);
    return null;
  }
}

/**
 * Import CSV file and return array of banknote data
 */
export async function importCSV(file: File): Promise<Partial<BanknoteFormData>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const rows = parseCSV(csvText);
        const banknotes: Partial<BanknoteFormData>[] = [];
        
        for (const row of rows) {
          const banknote = convertCSVRowToBanknote(row);
          if (banknote) {
            banknotes.push(banknote);
          }
        }
        
        resolve(banknotes);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
}

