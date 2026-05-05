/**
 * Client-side rate limiting using localStorage.
 * Not a security control — just a UX safeguard against accidental spam.
 */

export function checkRateLimit(key: string, maxCount: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const storageKey = `rl_${key}`;

  let entries: number[] = [];
  try {
    entries = JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    entries = [];
  }

  // Remove entries outside the window
  const recent = entries.filter((ts) => now - ts < windowMs);

  if (recent.length >= maxCount) {
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  try {
    localStorage.setItem(storageKey, JSON.stringify(recent));
  } catch {
    // Storage full — allow anyway
  }

  return { allowed: true, remaining: maxCount - recent.length };
}
