'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { OrderItem, BatchConfirmResultItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface BatchConfirmModalProps {
  isOpen: boolean;
  selectedOrders: OrderItem[];
  submitting: boolean;
  results: BatchConfirmResultItem[] | null;
  onClose: () => void;
  onConfirmBatch: () => void;
}

export default function BatchConfirmModal({
  isOpen,
  selectedOrders,
  submitting,
  results,
  onClose,
  onConfirmBatch,
}: BatchConfirmModalProps) {
  if (!isOpen) return null;

  const totalAmount = selectedOrders.reduce((acc, o) => acc + o.total_amount, 0);
  const totalNumbers = selectedOrders.reduce((acc, o) => acc + o.numbers_count, 0);

  const confirmedList = results ? results.filter((r) => r.status === 'confirmed') : [];
  const rejectedList = results ? results.filter((r) => r.status === 'rejected') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                {results
                  ? 'Resultado de Confirmación en Lote'
                  : `Confirmar pago de ${selectedOrders.length} pedido(s)`}
              </h3>
              <p className="text-xs text-slate-500">
                {results
                  ? 'Detalle individual por transacción procesada.'
                  : 'Cada pedido se procesará en su propia transacción pasando de pendiente a pagado.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!results ? (
          <>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Pedidos seleccionados:</span>
                <span className="font-bold text-slate-900">{selectedOrders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total de números que pasarán a VENDIDO:</span>
                <span className="font-bold text-slate-900">{totalNumbers} número(s)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-semibold">Importe total a acreditar:</span>
                <span className="font-black text-brand-600 text-sm">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl px-3 py-1 bg-surface text-xs">
              {selectedOrders.map((ord) => (
                <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{ord.code}</span>
                    <span className="text-slate-600 ml-2">{ord.buyer_name}</span>
                  </div>
                  <div className="text-right font-semibold text-slate-800">
                    {ord.numbers_count} nro(s) • {formatCurrency(ord.total_amount)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmBatch}
                disabled={submitting || selectedOrders.length === 0}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md"
              >
                {submitting
                  ? 'Procesando lote...'
                  : `Confirmar pago de ${selectedOrders.length} pedido(s)`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <span className="text-emerald-700 font-semibold block">Confirmados</span>
                <span className="text-2xl font-black text-emerald-900">
                  {confirmedList.length}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                <span className="text-amber-700 font-semibold block">Rechazados</span>
                <span className="text-2xl font-black text-amber-900">{rejectedList.length}</span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl px-3 py-1 bg-surface text-xs">
              {results.map((item) => (
                <div key={item.order_id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-slate-900">
                      {item.code || `#${item.order_id}`}
                    </span>
                    {item.buyer_name && (
                      <span className="text-slate-600 ml-2">{item.buyer_name}</span>
                    )}
                    {item.reason && (
                      <p className="text-[11px] text-amber-800 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{item.reason}</span>
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      item.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'confirmed' ? 'CONFIRMADO' : 'RECHAZADO'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
