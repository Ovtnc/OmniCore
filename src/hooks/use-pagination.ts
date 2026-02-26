'use client';

import { useCallback, useState } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  skip: number;
  /** totalPages ile birlikte sonraki sayfa var mı */
  hasNext: (totalPages: number) => boolean;
  hasPrev: () => boolean;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialLimit = 20 } = options;
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const skip = (page - 1) * limit;

  const nextPage = useCallback(() => setPage((p) => Math.max(1, p + 1)), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const hasNext = useCallback((totalPages: number) => page < totalPages, [page]);
  const hasPrev = useCallback(() => page > 1, [page]);

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    skip,
    hasNext,
    hasPrev,
  };
}
