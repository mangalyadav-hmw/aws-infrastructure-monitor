interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  fetchedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export interface CachedResult<T> {
  data: T;
  fetchedAt: string;
  stale: boolean;
  fromCache: boolean;
}

export function getCached<T>(key: string): CachedResult<T> | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }
  const now = Date.now();
  return {
    data: entry.value,
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    stale: now >= entry.expiresAt,
    fromCache: true,
  };
}

export function setCached<T>(key: string, value: T, ttlSeconds: number): void {
  const now = Date.now();
  store.set(key, {
    value,
    fetchedAt: now,
    expiresAt: now + ttlSeconds * 1000,
  });
}

export function clearCacheForTests(): void {
  store.clear();
}
