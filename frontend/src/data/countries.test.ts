import { describe, expect, it } from 'vitest';
import { getCountryCode } from './countries';

describe('getCountryCode', () => {
  it('matches exact, case-insensitive, and comma-prefixed names', () => {
    expect(getCountryCode('France')).toBe('fr');
    expect(getCountryCode('france')).toBe('fr');
    expect(getCountryCode('Hong Kong, China')).toBe('hk');
    expect(getCountryCode('Czechoslovakia')).toBe('cz');
  });

  it('resolves names the form and catalogs use that are not list labels', () => {
    expect(getCountryCode('United States of America')).toBe('us');
    expect(getCountryCode('USA')).toBe('us');
    expect(getCountryCode('U.S.A.')).toBe('us');
    expect(getCountryCode('Myanmar')).toBe('mm');
    expect(getCountryCode('Czechia')).toBe('cz');
    expect(getCountryCode('UK')).toBe('gb');
  });

  it('returns an empty string for unknown names', () => {
    expect(getCountryCode('')).toBe('');
    expect(getCountryCode('Atlantis')).toBe('');
  });
});
