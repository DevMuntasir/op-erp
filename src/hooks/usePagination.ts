import { useState, useCallback, useMemo } from 'react';

interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook for managing pagination of large lists
 * Prevents rendering thousands of items at once
 */
export const usePagination = <T,>(
  items: T[],
  config: PaginationConfig = {}
) => {
  const { pageSize = 25, initialPage = 1 } = config;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  // Validate current page
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  if (validPage !== currentPage) {
    setCurrentPage(validPage);
  }

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const goToPage = useCallback((page: number) => {
    const validatedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validatedPage);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    goToPage(validPage + 1);
  }, [validPage, goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(validPage - 1);
  }, [validPage, goToPage]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const state: PaginationState = {
    currentPage: validPage,
    pageSize,
    totalPages,
    totalItems: items.length,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
  };

  return {
    paginatedItems,
    ...state,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
  };
};

/**
 * Hook for virtual scrolling - only render visible items
 * For very large lists (10K+ items), use this instead of pagination
 * Requires fixed item height for optimal performance
 */
export const useVirtualScroll = <T,>(
  items: T[],
  {
    itemHeight = 60,
    visibleCount = 10,
  }: {
    itemHeight?: number;
    visibleCount?: number;
  } = {}
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + visibleCount * itemHeight) / itemHeight) + 1
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    itemHeight,
    onScroll: setScrollTop,
  };
};
