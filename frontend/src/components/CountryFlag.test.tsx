import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CountryFlag } from './CountryFlag';

describe('CountryFlag', () => {
  it('uses the flag-icons class for current ISO codes, including Czechia', () => {
    const html = renderToStaticMarkup(<CountryFlag countryCode="cz" />);
    expect(html).toContain('fi-cz');
    expect(html).not.toContain('🏳️');
  });

  it('renders nothing when the code is missing', () => {
    expect(renderToStaticMarkup(<CountryFlag countryCode="" />)).toBe('');
  });
});
