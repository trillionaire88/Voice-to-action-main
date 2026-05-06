import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('initialises on page 1 with the correct total pages', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });

  it('calculates offset correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    expect(result.current.offset).toBe(0);
  });

  it('reports hasPrevious = false on the first page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    expect(result.current.hasPrevious).toBe(false);
  });

  it('reports hasNext = true when there are more pages', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    expect(result.current.hasNext).toBe(true);
  });

  it('navigates to the next page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
    expect(result.current.offset).toBe(20);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('navigates to the previous page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20, initialPage: 3 }),
    );
    act(() => result.current.previousPage());
    expect(result.current.currentPage).toBe(2);
  });

  it('does not go below page 1', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    act(() => result.current.previousPage());
    expect(result.current.currentPage).toBe(1);
  });

  it('does not exceed the total number of pages', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 40, pageSize: 20 }),
    );
    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasNext).toBe(false);
  });

  it('goToPage jumps to the specified page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 10 }),
    );
    act(() => result.current.goToPage(5));
    expect(result.current.currentPage).toBe(5);
  });

  it('reset returns to the initial page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 20 }),
    );
    act(() => result.current.goToPage(4));
    act(() => result.current.reset());
    expect(result.current.currentPage).toBe(1);
  });

  it('reports at least 1 total page for an empty list', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 0 }),
    );
    expect(result.current.totalPages).toBe(1);
  });

  it('uses 20 as the default page size', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100 }),
    );
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(5);
  });
});
