import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  totalItems: number;
  pageSize?: number;
  initialPage?: number;
}

interface PaginationResult {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  offset: number;
  hasPrevious: boolean;
  hasNext: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  reset: () => void;
}

/**
 * Manages pagination state for list pages.
 *
 * @example
 * const { currentPage, totalPages, offset, nextPage, previousPage } =
 *   usePagination({ totalItems: data.count, pageSize: 20 });
 */
export function usePagination({
  totalItems,
  pageSize = 20,
  initialPage = 1,
}: PaginationOptions): PaginationResult {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.min(Math.max(1, page), totalPages));
    },
    [totalPages],
  );

  return {
    currentPage,
    totalPages,
    pageSize,
    offset: (currentPage - 1) * pageSize,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    previousPage: () => goToPage(currentPage - 1),
    reset: () => setCurrentPage(initialPage),
  };
}
