'use client';

import { useState, useEffect, useCallback } from 'react';
import { NumberItem } from '@/lib/types';
import {
  TOTAL_NUMBERS,
  PUBLIC_GRID_PAGE_SIZE,
  DEFAULT_MAX_NUMBERS_PER_ORDER,
} from '@/lib/constants';

export interface UseNumbersOptions {
  maxNumbersPerOrder?: number;
  onSelectionChange?: () => void;
}

export function useNumbers(options: UseNumbersOptions = {}) {
  const maxNumbersPerOrder = options.maxNumbersPerOrder || DEFAULT_MAX_NUMBERS_PER_ORDER;
  const onSelectionChange = options.onSelectionChange;

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [gridFilter, setGridFilter] = useState<'all' | 'available'>('all');
  const [availableNumbers, setAvailableNumbers] = useState<NumberItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  // Paginación por cursor para filter=available
  const [availableCursor, setAvailableCursor] = useState(0);
  const [nextAvailableCursor, setNextAvailableCursor] = useState<number | null>(null);
  const [hasMoreAvailable, setHasMoreAvailable] = useState(true);
  const [cursorHistory, setCursorHistory] = useState<number[]>([]);

  // Búsqueda puntual
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<NumberItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Salto directo ("Ir al nro")
  const [jumpNumberInput, setJumpNumberInput] = useState('');
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);

  const loadPageNumbers = useCallback(
    async (
      pageNum: number,
      filterMode: 'all' | 'available' = gridFilter,
      cursorVal: number = availableCursor
    ) => {
      try {
        setLoadingNumbers(true);
        const url =
          filterMode === 'available'
            ? `/api/numbers?page=${pageNum}&limit=${PUBLIC_GRID_PAGE_SIZE}&filter=available&cursor=${cursorVal}`
            : `/api/numbers?page=${pageNum}&limit=${PUBLIC_GRID_PAGE_SIZE}&filter=all`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setAvailableNumbers(data.numbers || []);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            if (filterMode === 'available') {
              setNextAvailableCursor(data.pagination.nextCursor ?? null);
              setHasMoreAvailable(Boolean(data.pagination.hasMore));
            }
          }
        }
      } catch (err) {
        console.error('Error cargando números:', err);
      } finally {
        setLoadingNumbers(false);
      }
    },
    [gridFilter, availableCursor]
  );

  useEffect(() => {
    loadPageNumbers(page, gridFilter, availableCursor);
  }, [page, gridFilter, availableCursor, loadPageNumbers]);

  const handleFilterChange = (newFilter: 'all' | 'available') => {
    setGridFilter(newFilter);
    setPage(1);
    setAvailableCursor(0);
    setCursorHistory([]);
  };

  const handleNextPage = () => {
    if (gridFilter === 'available') {
      if (!hasMoreAvailable || nextAvailableCursor === null) return;
      setCursorHistory((prev) => [...prev, availableCursor]);
      setAvailableCursor(nextAvailableCursor);
      setPage((p) => Math.min(totalPages, p + 1));
    } else {
      setPage((p) => Math.min(totalPages, p + 1));
    }
  };

  const handlePrevPage = () => {
    if (gridFilter === 'available') {
      if (cursorHistory.length > 0) {
        const prevCursor = cursorHistory[cursorHistory.length - 1];
        setCursorHistory((prev) => prev.slice(0, -1));
        setAvailableCursor(prevCursor);
        setPage((p) => Math.max(1, p - 1));
      } else if (availableCursor > 0) {
        const prevCursor = Math.max(0, availableCursor - PUBLIC_GRID_PAGE_SIZE);
        setAvailableCursor(prevCursor);
        setPage(Math.floor(prevCursor / PUBLIC_GRID_PAGE_SIZE) + 1);
      }
    } else {
      setPage((p) => Math.max(1, p - 1));
    }
  };

  const handleJumpToNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpNumberInput.trim(), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > TOTAL_NUMBERS) {
      alert('Por favor ingresá un número válido entre 1 y 100.000.');
      return;
    }

    const targetPage = Math.floor((parsed - 1) / PUBLIC_GRID_PAGE_SIZE) + 1;
    if (gridFilter === 'available') {
      setCursorHistory([]);
      setAvailableCursor(parsed - 1);
      setPage(targetPage);
    } else {
      setPage(targetPage);
    }
    setHighlightedNumber(parsed);

    setTimeout(() => {
      setHighlightedNumber(null);
    }, 4000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch(`/api/numbers?search=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.numbers || []);
      }
    } catch (err) {
      console.error('Error buscando números:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const toggleSelectNumber = (num: number, status: string) => {
    if (status !== 'available' && !selectedNumbers.includes(num)) {
      return;
    }
    onSelectionChange?.();
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= maxNumbersPerOrder) {
        alert(`Podés seleccionar hasta un máximo de ${maxNumbersPerOrder} números por solicitud.`);
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const addAvailableNumbersToCart = (numsToAdd: number[]) => {
    if (numsToAdd.length === 0) return;
    onSelectionChange?.();
    setSelectedNumbers((prev) => {
      const combined = Array.from(new Set([...prev, ...numsToAdd])).sort((a, b) => a - b);
      return combined.slice(0, maxNumbersPerOrder);
    });
  };

  const handleRandomSelect = async (count: number) => {
    const cleanCount = Math.max(1, Math.min(maxNumbersPerOrder, Math.floor(count)));
    try {
      setLoadingNumbers(true);
      const res = await fetch(`/api/numbers?random=${cleanCount}`);
      if (res.ok) {
        const data = await res.json();
        const randNums = (data.numbers || []).map((n: NumberItem) => n.number);
        addAvailableNumbersToCart(randNums);
      }
    } catch (err) {
      console.error('Error seleccionando al azar:', err);
    } finally {
      setLoadingNumbers(false);
    }
  };

  return {
    selectedNumbers,
    setSelectedNumbers,
    page,
    gridFilter,
    availableNumbers,
    totalPages,
    loadingNumbers,
    availableCursor,
    hasMoreAvailable,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    jumpNumberInput,
    setJumpNumberInput,
    highlightedNumber,
    handleFilterChange,
    handleNextPage,
    handlePrevPage,
    handleJumpToNumber,
    handleSearch,
    clearSearch,
    toggleSelectNumber,
    addAvailableNumbersToCart,
    handleRandomSelect,
    reloadGrid: () => loadPageNumbers(page, gridFilter, availableCursor),
  };
}

export default useNumbers;
