import { describe, expect, it } from 'vitest';
import { convertCSVRowToBanknote, parseCSV, parseLocalizedNumber } from './csvImport';

describe('parseLocalizedNumber', () => {
  it('reads thousands separators and decimal commas', () => {
    expect(parseLocalizedNumber('1,000')).toBe(1000);
    expect(parseLocalizedNumber('1,000.50')).toBe(1000.5);
    expect(parseLocalizedNumber('1.000,50')).toBe(1000.5);
    expect(parseLocalizedNumber('10,50')).toBe(10.5);
    expect(parseLocalizedNumber('500 Francs')).toBe(500);
  });
});

describe('parseCSV', () => {
  it('keeps commas and newlines inside quotes and strips a BOM', () => {
    const csv = '\uFEFFCountry,Comment,Grade\r\nFrance,"line1\nline2, still",XF\r\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Country).toBe('France');
    expect(rows[0].Comment).toBe('line1\nline2, still');
    expect(rows[0].Grade).toBe('XF');
  });

  it('unescapes doubled quotes', () => {
    const rows = parseCSV('Country,Comment\nFrance,"say ""hi"""\n');
    expect(rows[0].Comment).toBe('say "hi"');
  });
});

describe('convertCSVRowToBanknote', () => {
  const base = {
    Country: 'France',
    Issuer: 'Banque de France',
    'Ruling authority': '',
    Currency: 'Franc',
    'Face value': '1,000',
    Reference: 'P# 111',
    Title: '',
    'Year range': '1956-1960',
    Year: '',
    'Gregorian year': '',
    Mintmark: '',
    Marks: '',
    References: '',
    Comment: 'nice note',
    Grade: 'XF',
    'Buying price (USD)': '',
    'Buying price (BRL)': '25.5',
    'Estimate (USD)': '',
    'Acquisition date': '2020-01-02',
    'Serial number': 'AB12',
    'Third-party grading': '',
    Details: '',
    'Slab number': '',
    'CAC sticker': '',
  };

  it('maps letter grades, ranges, pick numbers, and the first non-empty price', () => {
    const note = convertCSVRowToBanknote(base);
    expect(note?.country).toBe('France');
    expect(note?.countryCode).toBe('fr');
    expect(note?.authority).toBe('Banque de France');
    expect(note?.pickNumber).toBe('111');
    expect(note?.faceValue).toBe(1000);
    expect(note?.grade).toBe('XF');
    expect(note?.isRangeOfYearOfIssue).toBe(true);
    expect(note?.yearOfIssueStart).toBe(1956);
    expect(note?.yearOfIssueEnd).toBe(1960);
    expect(note?.purchasePrice).toBe(25.5);
    expect(note?.purchasePriceCurrency).toBe('BRL');
    expect(note?.serialNumber).toBe('AB12');
    expect(note?.pmgComments).toBe('nice note');
  });

  it('keeps numeric PMG grades and spelled-out grades', () => {
    expect(convertCSVRowToBanknote({ ...base, Grade: '67' })?.grade).toBe('67');
    expect(convertCSVRowToBanknote({ ...base, Grade: 'About Uncirculated' })?.grade).toBe('AU');
    expect(convertCSVRowToBanknote({ ...base, Grade: 'mystery' })?.grade).toBe('Not Listed');
  });

  it('uses a single year when Year is set', () => {
    const note = convertCSVRowToBanknote({ ...base, Year: '1998', 'Year range': '' });
    expect(note?.isRangeOfYearOfIssue).toBe(false);
    expect(note?.yearOfIssueSingle).toBe(1998);
  });
});
