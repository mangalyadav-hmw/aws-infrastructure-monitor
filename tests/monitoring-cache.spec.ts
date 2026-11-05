import { describe, expect, it } from 'vitest';
import { clearCacheForTests, getCached, setCached } from '@/lib/monitoring/cache';

describe('monitoring cache', () => {
  it('marks entries stale after ttl', () => {
    clearCacheForTests();
    setCached('key', { ok: true }, 0);
    const cached = getCached<{ ok: boolean }>('key');
    expect(cached?.stale).toBe(true);
    expect(cached?.data.ok).toBe(true);
  });
});
