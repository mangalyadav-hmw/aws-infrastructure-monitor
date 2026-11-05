const inFlight = new Map<string, Promise<unknown>>();

export async function runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = task().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

export function clearInFlightForTests(): void {
  inFlight.clear();
}
