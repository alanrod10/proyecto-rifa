'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ShoppingCart, ArrowRight, Sparkles, X } from 'lucide-react';
import { NumberItem } from '@/lib/types';
import {
  parseNumbersAndRanges,
  formatTicketNumber,
  formatCurrency,
} from '@/lib/utils';

interface BulkPasteAndSummaryProps {
  selectedNumbers: number[];
  unitPrice: number;
  maxNumbersPerOrder: number;
  onAddAvailableNumbers: (nums: number[]) => void;
  onOpenModal: () => void;
}

export default function BulkPasteAndSummary({
  selectedNumbers,
  unitPrice,
  maxNumbersPerOrder,
  onAddAvailableNumbers,
  onOpenModal,
}: BulkPasteAndSummaryProps) {
  const [pasteInput, setPasteInput] = useState('');
  const [checkingPaste, setCheckingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteResult, setPasteResult] = useState<{
    addedCount: number;
    unavailableNumbers: number[];
  } | null>(null);

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    setPasteResult(null);

    const raw = pasteInput.trim();
    if (!raw) return;

    const parsed = parseNumbersAndRanges(raw, maxNumbersPerOrder);

    if (parsed.exceedsMax) {
      setPasteError(
        `Superaste el tope máximo permitido de ${maxNumbersPerOrder} números por pedido.`
      );
      return;
    }

    if (parsed.numbers.length === 0) {
      setPasteError(
        'Ingresá números válidos entre 1 y 100.000 o rangos como "100-250, 777, 1500-1510".'
      );
      return;
    }

    const remainingCapacity = maxNumbersPerOrder - selectedNumbers.length;
    if (remainingCapacity <= 0) {
      setPasteError(
        `Ya alcanzaste el tope de ${maxNumbersPerOrder} números seleccionados en tu carrito.`
      );
      return;
    }

    try {
      setCheckingPaste(true);
      // Consulta de disponibilidad en una sola llamada
      const res = await fetch(`/api/numbers?search=${encodeURIComponent(raw)}`);
      if (!res.ok) {
        setPasteError('No se pudo verificar la disponibilidad en este momento.');
        return;
      }

      const data = await res.json();
      const items: NumberItem[] = data.numbers || [];
      const statusMap = new Map<number, string>();
      for (const item of items) {
        statusMap.set(item.number, item.status);
      }

      const availableToAdd: number[] = [];
      const unavailable: number[] = [];

      for (const num of parsed.numbers) {
        const st = statusMap.get(num);
        if (st === 'available') {
          availableToAdd.push(num);
        } else {
          unavailable.push(num);
        }
      }

      const limitedToAdd = availableToAdd.slice(0, remainingCapacity);
      if (limitedToAdd.length > 0) {
        onAddAvailableNumbers(limitedToAdd);
      }

      setPasteResult({
        addedCount: limitedToAdd.length,
        unavailableNumbers: unavailable,
      });
      if (limitedToAdd.length > 0 && unavailable.length === 0) {
        setPasteInput('');
      }
    } catch {
      setPasteError('Error de red al verificar disponibilidad.');
    } finally {
      setCheckingPaste(false);
    }
  };

  const totalAmount = selectedNumbers.length * unitPrice;

  return (
    <div className="space-y-4">
      {/* Campo "Pegá tus números" (listas y rangos) */}
      <form
        onSubmit={handlePasteSubmit}
        className="bg-surface p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-link" />
            <span>Pegá tus números (listas o rangos)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Máx. {maxNumbersPerOrder.toLocaleString('es-AR')} números por pedido
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ej: 100-250, 777, 1500-1510"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              className="w-full px-3.5 py-2 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {pasteInput && (
              <button
                type="button"
                onClick={() => {
                  setPasteInput('');
                  setPasteError(null);
                  setPasteResult(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={checkingPaste}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm shrink-0 disabled:opacity-50"
          >
            {checkingPaste ? 'Verificando...' : 'Agregar disponibles'}
          </button>
        </div>

        {pasteError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{pasteError}</span>
          </div>
        )}

        {pasteResult && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            {pasteResult.addedCount > 0 && (
              <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  Se agregaron <strong>{pasteResult.addedCount}</strong> número(s) disponible(s) a
                  tu carrito.
                </span>
              </p>
            )}
            {pasteResult.unavailableNumbers.length > 0 && (
              <div className="text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    No disponibles ({pasteResult.unavailableNumbers.length}): ya están reservados o
                    vendidos:
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 font-mono text-[11px] max-h-24 overflow-y-auto pt-0.5">
                  {pasteResult.unavailableNumbers.map((n) => (
                    <span
                      key={n}
                      className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 font-bold"
                    >
                      {formatTicketNumber(n)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Resumen visible con cantidad y total antes de reservar (Mobile-first) */}
      {selectedNumbers.length > 0 && (
        <div className="bg-brand-50/80 border border-brand-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-600 text-white rounded-xl shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                Resumen de tu selección: {selectedNumbers.length}{' '}
                {selectedNumbers.length === 1 ? 'boleto' : 'boletos'}
              </span>
              <span className="text-slate-600">
                Total a abonar:{' '}
                <strong className="text-brand-link font-black text-sm">
                  {formatCurrency(totalAmount)}
                </strong>{' '}
                ({formatCurrency(unitPrice)} c/u)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenModal}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
          >
            <span>Reservar ahora ({selectedNumbers.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
