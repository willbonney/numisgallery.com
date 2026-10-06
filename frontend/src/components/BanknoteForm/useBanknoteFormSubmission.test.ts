import { describe, expect, it } from 'vitest';
import { formValues } from '../../test/banknoteFixture';
import {
  formatStorageError,
  signaturesForSave,
  trimStringFields,
  validateAndTransformUSNote,
  validateAndTransformWorldNote,
} from './useBanknoteFormSubmission';

describe('validateAndTransformUSNote', () => {
  it('requires an authority and stores the country list label', () => {
    expect(() => validateAndTransformUSNote(formValues({ noteType: 'us', authority: '  ' }))).toThrow(
      /Authority is required/,
    );
    const saved = validateAndTransformUSNote(
      formValues({ noteType: 'us', authority: 'Federal Reserve', city: 'Kansas City' }),
    );
    expect(saved.country).toBe('United States');
    expect(saved.countryCode).toBe('us');
    expect(saved.city).toBe('Kansas City');
  });
});

describe('validateAndTransformWorldNote', () => {
  it('requires a country and drops the US-only city', () => {
    expect(() => validateAndTransformWorldNote(formValues({ country: '  ' }))).toThrow(/Country is required/);
    const saved = validateAndTransformWorldNote(
      formValues({ country: 'France', authority: 'Banque de France', city: 'Paris' }),
    );
    expect(saved.country).toBe('France');
    expect(saved.authority).toBe('Banque de France');
    expect('city' in saved).toBe(false);
  });
});

describe('signaturesForSave', () => {
  it('drops blank names and blank titles', () => {
    expect(
      signaturesForSave([
        { name: '  Jane Doe  ', title: '  ', signatureScan: 'jane.jpg' },
        { name: '   ', title: 'Governor' },
        { name: 'John Smith', title: ' Cashier ' },
      ]),
    ).toEqual([
      { name: 'Jane Doe', signatureScan: 'jane.jpg' },
      { name: 'John Smith', title: 'Cashier' },
    ]);
  });
});

describe('trimStringFields', () => {
  it('trims only the requested string fields', () => {
    const trimmed = trimStringFields({ pickNumber: ' 12 ', faceValue: 5 }, ['pickNumber']);
    expect(trimmed.pickNumber).toBe('12');
    expect(trimmed.faceValue).toBe(5);
  });
});

describe('formatStorageError', () => {
  it('states the used and allowed sizes without calling pro storage unlimited', () => {
    const message = formatStorageError({ currentSize: 260 * 1024 * 1024, limit: 250 * 1024 * 1024 });
    expect(message).toContain('260.0 MB');
    expect(message).toContain('250.0 MB');
    expect(message.toLowerCase()).not.toContain('unlimited storage');
  });
});
