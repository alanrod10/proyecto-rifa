'use client';

import React from 'react';
import { Search, Shuffle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { NumberItem } from '@/lib/types';
import { formatTicketNumber } from '@/lib/utils';

interface NumberGridProps {
  selectedNumbers: number[];
  page: number;
  totalPages: number;
  gridFilter: 'all' | 'available';
  availableNumbers: NumberItem[];
  loadingNumbers: boolean;
  availableCursor: number;
  hasMoreAvailable: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  searchResults: NumberItem[] | null;
  isSearching: boolean;
  jumpNumberInput: string;
  setJumpNumberInput: (val: string) => void;
  highlightedNumber: number | null;
  onFilterChange: (filter: 'all' | 'available') => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onJumpToNumber: (e: React.FormEvent) => void;
  onSearch: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  onToggleSelectNumber: (num: number, status: string) => void;
  onRandomSelect: (count: number) => void;
  extraControls?: React.ReactNode;
}

export default function NumberGrid({
  selectedNumbers,
  page,
  totalPages,
  gridFilter,
  availableNumbers,
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
  onFilterChange,
  onNextPage,
  onPrevPage,
  onJumpToNumber,
  onSearch,
  onClearSearch,
  onToggleSelectNumber,
  onRandomSelect,
  extraControls,
}: NumberGridProps) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Elegí tus Números</h3>
          <p className="text-sm text-slate-500">
            Podés buscar números de tu preferencia, elegir al azar o explorar los disponibles.
          </p>
        </div>

        {/* Botones de Azar Rápido */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Shuffle className="w-3.5 h-3.5" /> Al azar:
          </span>
          {[1, 3, 5, 10].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => onRandomSelect(cnt)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:text-brand-300 font-bold px-2.5 py-1.5 rounded-lg border border-brand-200 transition"
            >
              +{cnt}
            </button>
          ))}
        </div>
      </div>

      {extraControls}

      {/* Buscador de Números */}
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar un número específico (ej: 777, 12345 o varios: 10, 25, 999)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-surface border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition shadow-sm"
        >
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Resultados de Búsqueda si se realizó una */}
      {searchResults !== null && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Resultados de búsqueda ({searchResults.length}):
            </span>
            <button
              type="button"
              onClick={onClearSearch}
              className="text-xs text-amber-700 hover:underline"
            >
              Volver a la lista general
            </button>
          </div>

          {searchResults.length === 0 ? (
            <p className="text-xs text-amber-800">
              No se encontraron números que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {searchResults.map((item) => {
                const isSelected = selectedNumbers.includes(item.number);
                const isAvailable = item.status === 'available';

                return (
                  <button
                    key={item.number}
                    type="button"
                    disabled={!isAvailable && !isSelected}
                    onClick={() => onToggleSelectNumber(item.number, item.status)}
                    className={`p-2 rounded-xl text-center font-mono font-bold text-xs sm:text-sm border transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-700 ring-2 ring-brand-300 shadow'
                        : isAvailable
                        ? 'bg-surface hover:bg-brand-50 text-slate-800 border-slate-300 hover:border-brand-500'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>{formatTicketNumber(item.number)}</span>
                    <span className="text-[11px] font-sans font-normal mt-0.5">
                      {isSelected
                        ? '✓ Elegido'
                        : isAvailable
                        ? 'Disponible'
                        : item.status === 'reserved'
                        ? 'Reservado'
                        : 'Vendido'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grilla Paginada de Números */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Explorando números (Página {page} de {totalPages}):
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-surface p-0.5">
              <button
                type="button"
                onClick={() => onFilterChange('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  gridFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos (ver estados)
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('available')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  gridFilter === 'available'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Solo disponibles
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Control de salto directo a cualquier número del 1 al 100.000 */}
            <form
              onSubmit={onJumpToNumber}
              className="flex items-center gap-1.5 bg-surface border border-slate-300 rounded-xl px-2 py-1 shadow-sm"
            >
              <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                Ir al nro:
              </span>
              <input
                type="number"
                min="1"
                max="100000"
                placeholder="1 - 100000"
                value={jumpNumberInput}
                onChange={(e) => setJumpNumberInput(e.target.value)}
                className="w-24 px-1.5 py-0.5 text-base sm:text-xs border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-lg transition"
              >
                Ir
              </button>
            </form>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={
                  (gridFilter === 'available' ? availableCursor <= 0 : page <= 1) ||
                  loadingNumbers
                }
                className="p-1 rounded bg-surface border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">{page}</span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={
                  (gridFilter === 'available' ? !hasMoreAvailable : page >= totalPages) ||
                  loadingNumbers
                }
                className="p-1 rounded bg-surface border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loadingNumbers ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando números...</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2">
            {availableNumbers.map((item) => {
              const isSelected = selectedNumbers.includes(item.number);
              const isAvailable = item.status === 'available';
              const isHighlighted = highlightedNumber === item.number;

              return (
                <button
                  key={item.number}
                  type="button"
                  disabled={!isAvailable && !isSelected}
                  onClick={() => onToggleSelectNumber(item.number, item.status)}
                  title={
                    isAvailable
                      ? 'Disponible'
                      : item.status === 'reserved'
                      ? 'Reservado'
                      : 'Vendido'
                  }
                  className={`min-h-12 py-2 px-1 rounded-xl text-center font-mono font-bold text-xs sm:text-sm border transition flex flex-col items-center justify-center animate-cell ${
                    isHighlighted
                      ? 'ring-4 ring-amber-400 scale-105 shadow-xl animate-pulse z-10 bg-amber-50 text-amber-900 border-amber-300'
                      : isSelected
                      ? 'bg-brand-600 text-white border-brand-700 ring-2 ring-brand-300 shadow-md animate-pop'
                      : isAvailable
                      ? 'bg-surface hover:bg-brand-50 text-slate-800 border-slate-200 hover:border-brand-400'
                      : item.status === 'reserved'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed opacity-75'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60 line-through'
                  }`}
                >
                  <span>{formatTicketNumber(item.number)}</span>
                  {isSelected && (
                    <span className="text-[10px] font-sans font-semibold leading-none mt-0.5">
                      ✓ Elegido
                    </span>
                  )}
                  {!isAvailable && !isSelected && (
                    <span className="text-[10px] font-sans font-semibold no-underline">
                      {item.status === 'reserved' ? 'Reservado' : 'Vendido'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Paginación Inferior */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={
              (gridFilter === 'available' ? availableCursor <= 0 : page <= 1) || loadingNumbers
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-slate-300 text-slate-700 disabled:opacity-40 font-medium hover:bg-slate-50 transition"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={
              (gridFilter === 'available' ? !hasMoreAvailable : page >= totalPages) ||
              loadingNumbers
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-slate-300 text-slate-700 disabled:opacity-40 font-medium hover:bg-slate-50 transition"
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}
