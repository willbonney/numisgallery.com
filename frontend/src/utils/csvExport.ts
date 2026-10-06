import type { Banknote } from '../types/banknote';

export function collectionExportFileName(userName: string | undefined, extension: 'csv' | 'pdf'): string {
  const date = new Date().toISOString().split('T')[0];
  if (!userName) return `banknote_collection_${date}.${extension}`;
  const safe = userName.replace(/[^a-z0-9]/gi, '_');
  return `${safe}_collection_${date}.${extension}`;
}

/** Quote fields that would break a row, and neutralize spreadsheet formulas. */
export function escapeCSV(value: string): string {
  let safe = value;
  if (/^[=+\-@]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildCollectionCsv(banknotes: Banknote[], includePurchaseInfo: boolean = false): string {
  // Define CSV headers
  const headers = [
    'Note Type',
    'Country',
    'Country Code',
    'Authority',
    'City',
    'Region',
    'Pick/Fr Number',
    'Face Value',
    'Currency',
    'Currency Code',
    'Year of Issue (Single)',
    'Year Range Start',
    'Year Range End',
    'PMG Cert',
    'Grade',
    'PMG Comments',
    'EPQ',
    'Specimen',
    'Serial Number',
    'Watermark',
    'Visible in Collection',
    'Featured',
  ];

  if (includePurchaseInfo) {
    headers.push('Purchase Price', 'Purchase Price Currency', 'Date of Purchase');
  }

  // Convert banknotes to CSV rows
  const rows = banknotes.map(banknote => {
    const row = [
      banknote.noteType || '',
      banknote.country || '',
      banknote.countryCode || '',
      banknote.authority || '',
      banknote.city || '',
      banknote.region || '',
      banknote.pickNumber || '',
      banknote.faceValue?.toString() || '',
      banknote.currency || '',
      banknote.currencyCode || '',
      banknote.yearOfIssueSingle?.toString() || '',
      banknote.yearOfIssueStart?.toString() || '',
      banknote.yearOfIssueEnd?.toString() || '',
      banknote.pmgCert || '',
      banknote.grade || '',
      banknote.pmgComments || '',
      banknote.isEpq ? 'Yes' : 'No',
      banknote.isSpecimen ? 'Yes' : 'No',
      banknote.serialNumber || '',
      banknote.watermark || '',
      banknote.isVisibleInCollection ? 'Yes' : 'No',
      banknote.isFeatured ? 'Yes' : 'No',
    ];

    if (includePurchaseInfo) {
      row.push(
        banknote.purchasePrice?.toString() || '',
        banknote.purchasePriceCurrency || '',
        banknote.dateOfPurchase || ''
      );
    }

    return row;
  });

  return [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
}

export function exportCollectionToCSV(banknotes: Banknote[], userName?: string, includePurchaseInfo: boolean = false) {
  const csvContent = buildCollectionCsv(banknotes, includePurchaseInfo);

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const fileName = collectionExportFileName(userName, 'csv');
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

