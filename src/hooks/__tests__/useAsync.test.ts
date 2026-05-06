import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  it('starts in an idle state', () => {
    const { result } = renderHook(() => useAsync(async () => 'data'));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading to true while the async function is in flight', async () => {
    const slowFn = vi.fn(
      () =>
        new Promise<string>((r) => setTimeout(() => r('data'), 100)),
    );
    const { result } = renderHook(() => useAsync(slowFn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('stores the resolved data on success', async () => {
    const { result } = renderHook(() =>
      useAsync(async () => ({ id: 1, name: 'Test' })),
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual({ id: 1, name: 'Test' });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('stores the error on failure', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAsync(failFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('converts a non-Error rejection to an Error instance', async () => {
    const failFn = vi.fn().mockRejectedValue('plain string rejection');
    const { result } = renderHook(() => useAsync(failFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('resets all state back to idle', async () => {
    const { result } = renderHook(() => useAsync(async () => 'data'));

    await act(async () => {
      await result.current.execute();
    });

    act(() => result.current.reset());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('passes arguments through to the async function', async () => {
    const fn = vi.fn(async (a: number, b: number) => a + b);
    const { result } = renderHook(() => useAsync(fn));

    await act(async () => {
      await result.current.execute(2, 3);
    });

    expect(fn).toHaveBeenCalledWith(2, 3);
    expect(result.current.data).toBe(5);
  });
});
