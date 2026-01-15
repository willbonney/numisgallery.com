export const PMG_GRADES = [
  '70', '69', '68', '67', '66', '65', '64', '63', '62', '61', '60',
  '58', '55', '53', '50', '45', '40', '35', '30', '25', '20', '15',
  '12', '10', '8', '6', '4'
] as const;

export const GRADES = [
  'UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G'] as const;

// Combined grades (PMG_GRADES first, then GRADES)
export const ALL_GRADES = [...PMG_GRADES, ...GRADES, 'Not Listed'] as const;

export type PmgGrade = typeof PMG_GRADES[number];
export type Grade = typeof GRADES[number] | 'Not Listed';

export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'MXN',
  'BRL', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'RUB'
] as const;

export type Currency = typeof CURRENCIES[number];

export const NOTE_TYPES = ['world', 'us'] as const;
export type NoteType = typeof NOTE_TYPES[number];

export interface Banknote {
  id: string;
  collectionId: string;
  collectionName: string;
  userId: string;
  
  // Note type
  noteType: NoteType; // 'world' for world notes (Pick#), 'us' for US notes (Fr#)
  
  // Core details
  country: string; // For world notes: country name. For US notes: unused (use authority instead)
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., 'us', 'de', 'jp') - always 'us' for US notes
  authority?: string; // For US notes: issuing authority (e.g., "Federal Reserve", "United States")
  city?: string; // For US Federal Reserve Notes: city name (e.g., "Kansas City")
  region?: string; // 3 char (optional)
  pickNumber: string; // Pick# for world notes, Fr# for US notes
  faceValue: number;
  currency: string;
  currencyCode?: string; // ISO 4217 (optional)
  
  // Year of issue
  yearOfIssueSingle?: number;
  isRangeOfYearOfIssue: boolean;
  yearOfIssueStart?: number;
  yearOfIssueEnd?: number;
  
  // PMG Certification
  pmgCert: string;
  grade: PmgGrade | Grade;
  pmgComments: string;
  isEpq: boolean;
  
  // Additional details
  isSpecimen: boolean;
  serialNumber: string;
  watermark: string;
  
  // Purchase info
  purchasePriceCurrency: Currency;
  purchasePrice: number;
  dateOfPurchase: string;
  
  // Visibility & Display
  isVisibleInCollection: boolean;
  isFeatured: boolean;
  
  // Images (file fields in PocketBase)
  obverseImage: string; // File field - PocketBase returns filename
  reverseImage: string; // File field - PocketBase returns filename
  obverseImageSize?: number; // File size in bytes (for storage tracking)
  reverseImageSize?: number; // File size in bytes (for storage tracking)
  
  // Metadata
  created?: string;
  updated?: string;
}

export type BanknoteFormData = Omit<Banknote, 'id' | 'collectionId' | 'collectionName' | 'userId' | 'created' | 'updated' | 'obverseImage' | 'reverseImage' | 'obverseImageSize' | 'reverseImageSize'>;

