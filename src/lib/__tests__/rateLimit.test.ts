import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '../rateLimit';

describe('checkRateLimit', () => {
  const KEY = 'test-action';
  const MAX = 3;
  const WINDOW_MS = 60_000;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request and returns the correct remaining count', () => {
    const result = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX - 1);
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < MAX; i++) {
      expect(checkRateLimit(KEY, MAX, WINDOW_MS).allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    for (let i = 0; i < MAX; i++) checkRateLimit(KEY, MAX, WINDOW_MS);

    const blocked = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('allows requests again after the time window expires', () => {
    for (let i = 0; i < MAX; i++) checkRateLimit(KEY, MAX, WINDOW_MS);

    vi.advanceTimersByTime(WINDOW_MS + 1);

    const result = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(result.allowed).toBe(true);
  });

  it('maintains separate windows for different keys', () => {
    for (let i = 0; i < MAX; i++) checkRateLimit(KEY, MAX, WINDOW_MS);

    const other = checkRateLimit('other-key', MAX, WINDOW_MS);
    expect(other.allowed).toBe(true);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(`rl_${KEY}`, 'not-valid-json');
    const result = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(result.allowed).toBe(true);
  });

  it('decrements remaining count correctly across calls', () => {
    const r1 = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(KEY, MAX, WINDOW_MS);
    expect(r3.remaining).toBe(0);
  });
});
