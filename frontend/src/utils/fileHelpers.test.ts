import { describe, expect, it, vi } from 'vitest';

const getURL = vi.hoisted(() => vi.fn(() => 'https://pb.example/file.jpg'));

vi.mock('../lib/pocketbase', () => ({
  default: {
    files: { getURL },
  },
}));

import { dataUrlToFile, getImageUrl } from './fileHelpers';

describe('dataUrlToFile', () => {
  it('decodes the mime type and bytes', () => {
    const file = dataUrlToFile(`data:image/png;base64,${btoa('hi')}`, 'front.png');
    expect(file.name).toBe('front.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(2);
  });

  it('defaults to jpeg when the header has no mime', () => {
    const file = dataUrlToFile(`data:base64,${btoa('x')}`, 'scan.bin');
    expect(file.type).toBe('image/jpeg');
  });
});

describe('getImageUrl', () => {
  it('returns an empty string when the file or record is missing', () => {
    const record = { id: 'abc', collectionId: 'c', collectionName: 'banknotes' };
    expect(getImageUrl(record, '')).toBe('');
    expect(getImageUrl(record, null)).toBe('');
    expect(getImageUrl({ ...record, id: '' }, 'a.jpg')).toBe('');
  });

  it('asks PocketBase for a thumbnail when one is requested', () => {
    const record = { id: 'abc', collectionId: 'c', collectionName: 'banknotes' };
    expect(getImageUrl(record, 'front.jpg', '600x0')).toBe('https://pb.example/file.jpg');
    expect(getURL).toHaveBeenCalledWith(record, 'front.jpg', { thumb: '600x0' });
  });
});
