import { getCountryCode } from '../data/countries';
import type { BanknoteFormData, Currency, PmgGrade } from '../types/banknote';
import { CURRENCIES, GRADES, PMG_GRADES } from '../types/banknote';

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
 * Parse CSV file and return array of rows
 */
export function parseCSV(csvText: string): NumistaCSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: NumistaCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row: Partial<NumistaCSVRow> = {};
    headers.forEach((header, index) => {
      row[header as keyof NumistaCSVRow] = values[index] || '';
    });
    rows.push(row as NumistaCSVRow);
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

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
      const faceValue = parseFloat(row['Face value'].replace(/[^\d.]/g, ''));
      if (!isNaN(faceValue)) {
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
      // Check if it's a PMG grade (numeric)
      if (PMG_GRADES.includes(grade as PmgGrade)) {
        data.grade = grade as PmgGrade;
      } else if (GRADES.includes(grade as typeof GRADES[number])) {
        // For non-PMG grades, we'll use 'Not Listed' as fallback since grade field is PmgGrade | Grade
        // The user can manually change it if needed
        data.grade = 'Not Listed';
      } else {
        // Try to map common grades - but since grade field is PmgGrade | Grade, use Not Listed
        // User can manually update if needed
        data.grade = 'Not Listed';
      }
    }

    // Purchase Price - find any "Buying price" column and extract currency from parentheses
    const buyingPriceKey = Object.keys(row).find(key => 
      key.toLowerCase().startsWith('buying price')
    );
    
    if (buyingPriceKey) {
      const priceValue = row[buyingPriceKey];
      if (priceValue) {
        const price = parseFloat(priceValue.replace(/[^\d.]/g, ''));
        if (!isNaN(price)) {
          data.purchasePrice = price;
          
          // Extract currency from column name: "Buying price (BRL)" -> "BRL"
          const currencyMatch = buyingPriceKey.match(/\(([A-Z]{3})\)/i);
          if (currencyMatch) {
            const currency = currencyMatch[1].toUpperCase();
            // Validate it's a known currency code
            if (CURRENCIES.includes(currency as Currency)) {
              data.purchasePriceCurrency = currency as Currency;
            } else {
              data.purchasePriceCurrency = 'USD'; // Default fallback
            }
          } else {
            data.purchasePriceCurrency = 'USD'; // Default if no currency found
          }
        }
      }
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

