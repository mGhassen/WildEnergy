"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

export function useClientPagination<T>(items: T[], initialPageSize = DEFAULT_PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetPage = () => setCurrentPage(1);

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    paginatedItems,
    currentPage: safePage,
    setCurrentPage,
    pageSize,
    setPageSize: changePageSize,
    totalPages,
    totalItems,
    resetPage,
    rangeStart: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, totalItems),
  };
}
