'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatTicketNumber } from '@/lib/utils';

export interface DeletableOrder {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  total_amount: number;
  numbers_count: number;
  numbers?: number[];
}

interface DeleteOrderModalProps {
  order: DeletableOrder | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteOrderModal({
  order,
  deleting,
  onCancel,
  onConfirm,
}: DeleteOrderModalProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-red-200 animate-pop space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              ¿Confirmar eliminación definitiva?
            </h3>
            <p className="text-xs text-slate-500">
              Esta acción liberará de inmediato los números asignados.
            </p>
          </div>
        </div>

        <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 space-y-2 text-xs">
          <div className="flex justify-between border-b border-red-100/60 pb-1.5">
            <span className="text-slate-500 font-medium">Código de orden:</span>
            <span className="font-mono font-bold text-slate-900">{order.code}</span>
          </div>
          <div className="flex justify-between border-b border-red-100/60 pb-1.5">
            <span className="text-slate-500 font-medium">Comprador:</span>
            <span className="font-bold text-slate-900">
              {order.buyer_name} ({order.buyer_phone})
            </span>
          </div>
          <div className="flex justify-between border-b border-red-100/60 pb-1.5">
            <span className="text-slate-500 font-medium">Monto:</span>
            <span className="font-bold text-slate-900">{formatCurrency(order.total_amount)}</span>
          </div>

          <div className="pt-1">
            <span className="text-slate-600 font-semibold block mb-1.5">
              Números que serán liberados ({order.numbers?.length || order.numbers_count}):
            </span>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-red-100">
              {order.numbers && order.numbers.length > 0 ? (
                order.numbers.map((num) => (
                  <span
                    key={num}
                    className="font-mono text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-md font-bold border border-red-200"
                  >
                    {formatTicketNumber(num)}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic">Sin números detallados</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? 'Eliminando...' : 'Sí, eliminar pedido y liberar números'}
          </button>
        </div>
      </div>
    </div>
  );
}
