import { describe, expect, it } from 'vitest';
import { canonicalUrl, faqJsonLd, faqs, getRouteSeo, jsonLdGraph, SITE_URL } from './seo';

describe('getRouteSeo', () => {
  it('returns the public profile meta for user galleries', () => {
    const meta = getRouteSeo('/users/abc');
    expect(meta.title).toContain('Public Banknote Collection');
    expect(meta.path).toBe('/users/abc');
    expect(meta.noindex).toBeUndefined();
  });

  it('marks private routes noindex and falls back for unknown paths', () => {
    expect(getRouteSeo('/settings').noindex).toBe(true);
    expect(getRouteSeo('/your-banknotes').noindex).toBe(true);
    const unknown = getRouteSeo('/missing');
    expect(unknown.path).toBe('/missing');
    expect(unknown.title).toContain('NumisGallery');
  });
});

describe('canonicalUrl', () => {
  it('keeps a trailing slash only for the home page', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    expect(canonicalUrl('/community')).toBe(`${SITE_URL}/community`);
  });
});

describe('structured data', () => {
  it('describes the site and every FAQ', () => {
    const graph = jsonLdGraph();
    expect(graph['@graph'].map((node) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebApplication',
    ]);
    const faq = faqJsonLd();
    expect(faq.mainEntity).toHaveLength(faqs.length);
    expect(faq.mainEntity[0].name).toBe(faqs[0].question);
  });
});
