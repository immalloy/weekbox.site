const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const requests = new Map<string, number[]>();

export function allowsRequest(key: string, now = Date.now()): boolean {
  const recent = (requests.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) { requests.set(key, recent); return false; }
  recent.push(now);
  requests.set(key, recent);
  return true;
}

export function resetRateLimitForTests() { requests.clear(); }
