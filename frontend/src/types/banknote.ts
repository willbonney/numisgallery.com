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

export const COMPOSITIONS = ['Paper', 'Polymer'] as const;
export type Composition = typeof COMPOSITIONS[number];

/** Signature metadata; signatureScan is a filename from signatureScans file field */
export interface BanknoteSignature {
  name: string;
  title?: string;
  /** PocketBase filename once uploaded into signatureScans */
  signatureScan?: string;
  /** Remote Numista URL (import only; not persisted as a PB file) */
  signatureScanUrl?: string;
}

export interface BanknotePrinter {
  authority: string;
  city?: string;
  country?: string;
}

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
  /** Short watermark label (Details section) */
  watermark: string;
  /** Full watermark description (e.g. from Numista) */
  watermarkDescription?: string;

  // Numista / extended catalog fields
  numistaId?: string;
  composition?: Composition;
  obvDescription?: string;
  revDescription?: string;
  obvEngraver?: string;
  obvDesigner?: string;
  revEngraver?: string;
  revDesigner?: string;
  printer?: BanknotePrinter | null;
  numIssued?: number;
  /** Inverse of Numista "Demonetized" */
  inCirculation?: boolean;
  signatures?: BanknoteSignature[];
  
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
  waterMarkImage?: string; // Optional watermark scan filename
  obverseImageSize?: number; // File size in bytes (for storage tracking)
  reverseImageSize?: number; // File size in bytes (for storage tracking)
  /** Multi-file signature scans; filenames paired via signatures[].signatureScan */
  signatureScans?: string[];
  
  // Metadata
  created?: string;
  updated?: string;
}

export type BanknoteFormData = Omit<
  Banknote,
  | 'id'
  | 'collectionId'
  | 'collectionName'
  | 'userId'
  | 'created'
  | 'updated'
  | 'obverseImage'
  | 'reverseImage'
  | 'waterMarkImage'
  | 'obverseImageSize'
  | 'reverseImageSize'
  | 'signatureScans'
>;

/** Extra files attached at submit time (not part of form field values) */
export type BanknoteSubmitFiles = {
  obverseImage?: File;
  reverseImage?: File;
  waterMarkImage?: File;
  /** Ordered to match signatures[]; empty slots omitted on upload */
  signatureScanFiles?: File[];
};



