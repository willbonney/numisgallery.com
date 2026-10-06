import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formValues } from '../test/banknoteFixture';

const api = vi.hoisted(() => ({
  getFullList: vi.fn(),
  getOne: vi.fn(),
  create: vi.fn(async (data: FormData) => data),
  update: vi.fn(async (_id: string, data: FormData) => data),
  delete: vi.fn(async () => true),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  auth: { record: { id: 'user-1' } as { id: string } | null },
}));

vi.mock('../lib/pocketbase', () => ({
  default: {
    authStore: api.auth,
    collection: () => api,
  },
}));

import { banknoteService } from './banknotes';

function entries(data: FormData): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of data.entries()) {
    const text = value instanceof File ? `file:${value.name}:${value.size}` : String(value);
    out[key] = [...(out[key] ?? []), text];
  }
  return out;
}

describe('banknoteService', () => {
  beforeEach(() => {
    api.auth.record = { id: 'user-1' };
    api.getFullList.mockReset();
    api.create.mockClear();
    api.update.mockClear();
  });

  it('escapes quotes in the owner filter', async () => {
    api.auth.record = { id: 'ab"c' };
    api.getFullList.mockResolvedValue([]);
    await banknoteService.getMyBanknotes();
    expect(api.getFullList).toHaveBeenCalledWith({
      filter: 'userId = "ab\\"c"',
      sort: '-id',
    });
  });

  it('refuses to list notes when signed out', async () => {
    api.auth.record = null;
    await expect(banknoteService.getMyBanknotes()).rejects.toThrow('Not authenticated');
  });

  it('sends cleared text, false flags, zero prices, and the signed-in user', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'front.jpg', { type: 'image/jpeg' });
    const scan = new File([new Uint8Array([4])], 'sig.png', { type: 'image/png' });
    const payload = await banknoteService.createBanknote({
      ...formValues({
        serialNumber: '',
        isEpq: false,
        purchasePrice: 0,
        printer: null,
        userId: 'someone-else',
      } as never),
      obverseImage: file,
      signatureScanFiles: [scan],
    });

    const saved = entries(payload as unknown as FormData);
    expect(saved.userId).toEqual(['user-1']);
    expect(saved.serialNumber).toEqual(['']);
    expect(saved.isEpq).toEqual(['false']);
    expect(saved.purchasePrice).toEqual(['0']);
    expect(saved.printer).toEqual(['null']);
    expect(saved.obverseImage).toEqual(['file:front.jpg:3']);
    expect(saved.obverseImageSize).toEqual(['3']);
    expect(saved.signatureScans).toEqual(['file:sig.png:1']);
  });

  it('records a replaced reverse image size on update', async () => {
    const file = new File([new Uint8Array(4)], 'back.jpg', { type: 'image/jpeg' });
    const payload = await banknoteService.updateBanknote('note-1', { reverseImage: file });
    const saved = entries(payload as unknown as FormData);
    expect(saved.reverseImageSize).toEqual(['4']);
    expect(saved.userId).toBeUndefined();
  });
});
