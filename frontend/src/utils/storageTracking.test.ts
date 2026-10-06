import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFullList = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ record: { id: 'user-1' } as { id: string } | null }));

vi.mock('../lib/pocketbase', () => ({
  default: {
    authStore: auth,
    collection: () => ({ getFullList }),
  },
}));

import { checkStorageLimit, formatStorageSize } from './storageTracking';

const MB = 1024 * 1024;

describe('formatStorageSize', () => {
  it('picks a unit', () => {
    expect(formatStorageSize(0)).toBe('0 B');
    expect(formatStorageSize(512)).toBe('512 B');
    expect(formatStorageSize(1536)).toBe('1.5 KB');
    expect(formatStorageSize(250 * MB)).toBe('250.0 MB');
    expect(formatStorageSize(2 * 1024 * MB)).toBe('2.0 GB');
  });
});

describe('checkStorageLimit', () => {
  beforeEach(() => {
    auth.record = { id: 'user-1' };
    getFullList.mockReset();
  });

  it('requires a signed-in user', async () => {
    auth.record = null;
    await expect(checkStorageLimit(10)).rejects.toThrow('Not authenticated');
  });

  it('applies the free cap when no subscription row exists', async () => {
    getFullList.mockResolvedValue([]);
    const under = await checkStorageLimit(MB);
    expect(under.allowed).toBe(true);
    expect(under.limit).toBe(250 * MB);

    const over = await checkStorageLimit(251 * MB);
    expect(over.allowed).toBe(false);
  });

  it('gives active pro 2GB and treats past_due pro as free', async () => {
    getFullList.mockResolvedValueOnce([
      { tier: 'pro', status: 'active', totalStorageUsed: 300 * MB },
    ]);
    const pro = await checkStorageLimit(MB);
    expect(pro.allowed).toBe(true);
    expect(pro.limit).toBe(2 * 1024 * MB);

    getFullList.mockResolvedValueOnce([
      { tier: 'pro', status: 'past_due', totalStorageUsed: 300 * MB },
    ]);
    const downgraded = await checkStorageLimit(MB);
    expect(downgraded.allowed).toBe(false);
    expect(downgraded.limit).toBe(250 * MB);
  });

  it('fails closed when the subscription lookup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getFullList.mockRejectedValue(new Error('offline'));
    const result = await checkStorageLimit(10);
    expect(result.allowed).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to check storage limit:',
      expect.objectContaining({ message: 'offline' }),
    );
    errorSpy.mockRestore();
  });
});
