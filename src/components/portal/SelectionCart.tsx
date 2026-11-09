'use client';

import React from 'react';
import { ShoppingCart, ArrowRight, X } from 'lucide-react';
import { formatTicketNumber, formatCurrency } from '@/lib/utils';

interface SelectionCartProps {
  selectedNumbers: number[];
  unitPrice: number;
  onRemoveNumber: (num: number) => void;
  onClearAll: () => void;
  onOpenModal: () => void;
}

export default function SelectionCart({
  selectedNumbers,
  unitPrice,
  onRemoveNumber,
  onClearAll,
  onOpenModal,
}: SelectionCartProps) {
  if (selectedNumbers.length === 0) return null;

  const totalCartAmount = selectedNumbers.length * unitPrice;

  return (
    <aside className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3 sm:p-4 z-40 animate-slide-up space-y-2">
      {/* Bandeja de chips interactivos de números elegidos con descarte en 1 toque */}
      <div className="max-w-5xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap shrink-0 pr-1">
          Tus boletos:
        </span>
        {selectedNumbers.slice(0, 60).map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1 bg-brand-50 text-brand-link border border-brand-200 font-mono font-bold text-xs px-2 py-0.5 rounded-lg shrink-0 shadow-xs"
          >
            <span>{formatTicketNumber(n)}</span>
            <button
              type="button"
              onClick={() => onRemoveNumber(n)}
              title={`Quitar boleto ${formatTicketNumber(n)}`}
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-brand-200 text-brand-700 transition"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {selectedNumbers.length > 60 && (
          <span className="text-[11px] font-semibold text-slate-500 shrink-0 pl-1">
            +{selectedNumbers.length - 60} más
          </span>
        )}
      </div>

      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-100 text-brand-link rounded-lg shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                {selectedNumbers.length}{' '}
                {selectedNumbers.length === 1 ? 'número seleccionado' : 'números seleccionados'}
              </span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                Total: {formatCurrency(totalCartAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={onClearAll}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 underline ml-2 font-medium"
          >
            Limpiar todo
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenModal}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
          >
            Solicitar Reserva ({selectedNumbers.length})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
