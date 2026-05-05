import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists a string value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', ''));
    act(() => result.current[1]('saved'));
    expect(result.current[0]).toBe('saved');
    expect(localStorage.getItem('key')).toBe('"saved"');
  });

  it('restores a previously stored value on mount', () => {
    localStorage.setItem('key', '"existing"');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('existing');
  });

  it('stores and restores an object value', () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ id: number }>('obj', { id: 0 }),
    );
    act(() => result.current[1]({ id: 42 }));
    expect(result.current[0]).toEqual({ id: 42 });
  });

  it('accepts a function updater (like setState)', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1]((prev) => prev + 10));
    expect(result.current[0]).toBe(10);
  });

  it('removeValue resets state to initialValue and clears localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    act(() => result.current[1]('saved'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('key', '%%%invalid json%%%');
    const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});
