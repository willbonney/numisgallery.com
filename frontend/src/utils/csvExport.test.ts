import { describe, expect, it } from 'vitest';
import { note } from '../test/banknoteFixture';
import { buildCollectionCsv, collectionExportFileName, escapeCSV } from './csvExport';

describe('escapeCSV', () => {
  it('quotes commas, quotes, and line breaks', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCSV('a\nb')).toBe('"a\nb"');
    expect(escapeCSV('a\rb')).toBe('"a\rb"');
  });

  it('neutralizes spreadsheet formulas', () => {
    expect(escapeCSV('=1+1')).toBe("'=1+1");
    expect(escapeCSV('+cmd')).toBe("'+cmd");
    expect(escapeCSV('-10')).toBe("'-10");
    expect(escapeCSV('@sum')).toBe("'@sum");
  });
});

describe('buildCollectionCsv', () => {
  it('writes headers, grades, and purchase columns only when asked', () => {
    const csv = buildCollectionCsv(
      [
        note({
          id: '1',
          country: 'France',
          watermark: 'woman, profile',
          serialNumber: '=HYPERLINK("http://evil")',
          isEpq: true,
          purchasePrice: 12,
          purchasePriceCurrency: 'EUR',
        }),
      ],
      true,
    );

    const [header, row] = csv.split('\n');
    expect(header.startsWith('Note Type,Country,Country Code')).toBe(true);
    expect(header.endsWith('Purchase Price,Purchase Price Currency,Date of Purchase')).toBe(true);
    expect(row).toContain('France');
    expect(row).toContain('"woman, profile"');
    expect(row).toContain('Yes');
    expect(row).toContain("'=HYPERLINK");
    expect(row.endsWith(',12,EUR,')).toBe(true);
  });

  it('omits purchase columns by default', () => {
    const csv = buildCollectionCsv([note({ id: '1' })]);
    expect(csv.split('\n')[0]).not.toContain('Purchase Price');
  });
});

describe('collectionExportFileName', () => {
  it('sanitizes the collector name and keeps the extension', () => {
    const csv = collectionExportFileName('Jane Doe!', 'csv');
    const pdf = collectionExportFileName(undefined, 'pdf');
    expect(csv).toMatch(/^Jane_Doe__collection_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(pdf).toMatch(/^banknote_collection_\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
