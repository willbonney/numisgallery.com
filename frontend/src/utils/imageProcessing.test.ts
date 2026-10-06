import { describe, expect, it } from 'vitest';
import { adjustRgbChannel, isPocketBaseUrl } from './imageProcessing';
import { numistaDataUrlOrNull } from '../components/BanknoteForm/BanknoteForm.helpers';

describe('isPocketBaseUrl', () => {
  it('matches only the configured PocketBase origin', () => {
    expect(isPocketBaseUrl('http://localhost:8090/api/files/banknotes/a/front.jpg')).toBe(true);
    expect(isPocketBaseUrl('https://evil.example/api/files/banknotes/a/front.jpg')).toBe(false);
    expect(isPocketBaseUrl('not a url')).toBe(false);
  });
});

describe('adjustRgbChannel', () => {
  it('leaves a pixel unchanged at zero brightness and contrast', () => {
    expect(adjustRgbChannel(10, 0, 0)).toBe(10);
    expect(adjustRgbChannel(128, 0, 0)).toBe(128);
    expect(adjustRgbChannel(250, 0, 0)).toBe(250);
  });

  it('clamps to the byte range', () => {
    expect(adjustRgbChannel(0, 100, 0)).toBe(100);
    expect(adjustRgbChannel(200, 100, 0)).toBe(255);
    expect(adjustRgbChannel(20, -100, 0)).toBe(0);
  });
});

describe('numistaDataUrlOrNull', () => {
  it('accepts only image data URLs returned by the scraper', () => {
    expect(numistaDataUrlOrNull('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
    expect(numistaDataUrlOrNull(undefined, 'https://en.numista.com/a.jpg')).toBeNull();
    expect(numistaDataUrlOrNull('https://en.numista.com/a.jpg')).toBeNull();
  });
});
