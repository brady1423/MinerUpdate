import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  totalItems: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export function usePagination({
  totalItems,
  initialPageSize = 25,
  pageSizeOptions = [25, 50, 100],
}: UsePaginationOptions) {
  const [currentPage, setCurrentPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-clamp: if current page exceeds total pages, clamp down
  const clampedPage = Math.min(currentPage, totalPages);
  if (clampedPage !== currentPage) {
    setCurrentPageRaw(clampedPage);
  }

  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageRaw(Math.max(1, page));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPageRaw((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPageRaw((p) => Math.max(p - 1, 1));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setCurrentPageRaw(1);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPageRaw(1);
  }, []);

  return useMemo(
    () => ({
      currentPage: clampedPage,
      pageSize,
      totalPages,
      startIndex,
      endIndex,
      goToNextPage,
      goToPrevPage,
      setCurrentPage,
      setPageSize,
      resetPage,
      pageSizeOptions,
    }),
    [clampedPage, pageSize, totalPages, startIndex, endIndex, goToNextPage, goToPrevPage, setCurrentPage, setPageSize, resetPage, pageSizeOptions],
  );
}
