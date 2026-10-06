import { describe, expect, it } from 'vitest';
import type { Subscription } from './useSubscription';
import { getEffectiveTier, tierLimits } from './useSubscription';

function subscription(partial: Partial<Subscription>): Subscription {
  return {
    id: 'sub',
    userId: 'user-1',
    tier: 'free',
    status: 'active',
    cancelAtPeriodEnd: false,
    created: '2026-01-01',
    updated: '2026-01-01',
    ...partial,
  };
}

describe('getEffectiveTier', () => {
  it('keeps pro only while billing is active or trialing', () => {
    expect(getEffectiveTier(null)).toBe('free');
    expect(getEffectiveTier(subscription({ tier: 'free' }))).toBe('free');
    expect(getEffectiveTier(subscription({ tier: 'pro', status: 'active' }))).toBe('pro');
    expect(getEffectiveTier(subscription({ tier: 'pro', status: 'trialing' }))).toBe('pro');
    expect(getEffectiveTier(subscription({ tier: 'pro', status: 'past_due' }))).toBe('free');
    expect(getEffectiveTier(subscription({ tier: 'pro', status: 'canceled' }))).toBe('free');
  });

  it('treats a missing status as active, matching the server hooks', () => {
    const record = subscription({ tier: 'pro' });
    delete (record as { status?: string }).status;
    expect(getEffectiveTier(record)).toBe('pro');
  });
});

describe('tierLimits', () => {
  it('matches the free and pro plans', () => {
    const free = tierLimits('free');
    expect(free.maxBanknotes).toBe(50);
    expect(free.maxFeatured).toBe(15);
    expect(free.pmgFetches).toBe(5);
    expect(free.aiExtractions).toBe(5);
    expect(free.storage.limit).toBe(250 * 1024 * 1024);

    const pro = tierLimits('pro');
    expect(pro.maxBanknotes).toBe(Infinity);
    expect(pro.pmgFetches).toBe(50);
    expect(pro.storage.limit).toBe(2 * 1024 * 1024 * 1024);
  });
});
