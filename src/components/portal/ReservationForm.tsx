'use client';

import React from 'react';
import { AlertTriangle, Landmark, Banknote, Copy, Check, X } from 'lucide-react';
import { RaffleSettings } from '@/lib/types';
import { formatTicketNumber, formatCurrency } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopy';

interface ReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: number[];
  unitPrice: number;
  settings: RaffleSettings | null;
  buyerName: string;
  setBuyerName: (val: string) => void;
  buyerPhone: string;
  setBuyerPhone: (val: string) => void;
  paymentMethod: 'transfer' | 'cash';
  setPaymentMethod: (val: 'transfer' | 'cash') => void;
  submitting: boolean;
  errorMessage: string | null;
  conflictNumbers: number[];
  onRemoveConflictNumbers: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ReservationForm({
  isOpen,
  onClose,
  selectedNumbers,
  unitPrice,
  settings,
  buyerName,
  setBuyerName,
  buyerPhone,
  setBuyerPhone,
  paymentMethod,
  setPaymentMethod,
  submitting,
  errorMessage,
  conflictNumbers,
  onRemoveConflictNumbers,
  onSubmit,
}: ReservationFormProps) {
  const { copiedField, copyToClipboard } = useCopyToClipboard(2000);

  if (!isOpen) return null;

  const totalCartAmount = selectedNumbers.length * unitPrice;
  const copiedAlias = copiedField === 'alias';
  const copiedCbu = copiedField === 'cbu';

  return (
    <div className="fixed inset-0 bg-night-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-1">Confirmar Solicitud de Reserva</h3>
        <p className="text-xs text-slate-500 mb-4">
          Completá tus datos para apartar tus números. Al confirmar recibirás tu enlace privado.
        </p>

        {/* Alerta de Error o Conflicto */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {conflictNumbers.length > 0 && (
              <button
                type="button"
                onClick={onRemoveConflictNumbers}
                className="self-end text-xs font-bold text-red-800 underline hover:text-red-950"
              >
                Quitar números en conflicto y continuar
              </button>
            )}
          </div>
        )}

        {/* Resumen de números seleccionados */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 text-xs space-y-1.5 max-h-32 overflow-y-auto">
          <span className="font-semibold text-slate-700 block">
            Números a reservar ({selectedNumbers.length}):
          </span>
          <div className="flex flex-wrap gap-1 font-mono text-brand-link font-bold">
            {selectedNumbers.map((n) => (
              <span key={n} className="bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                {formatTicketNumber(n)}
              </span>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
            <span>Total a pagar:</span>
            <span className="text-brand-link">{formatCurrency(totalCartAmount)}</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre y Apellido *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Celular (sin 54, directo con característica local) *
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono font-bold text-slate-600 select-none">
                +54
              </span>
              <input
                type="tel"
                required
                placeholder="Ej: 3884123456"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Ingresá directamente tu número sin el 54 (ej: 3884123456).
            </span>
          </div>

          {/* Medio de pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Medio de Pago *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-medium transition ${
                  paymentMethod === 'transfer'
                    ? 'border-brand-600 bg-brand-50 text-slate-900'
                    : 'border-slate-200 bg-surface text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                  className="accent-brand-600"
                />
                <Landmark className="w-4 h-4 text-brand-link" />
                <span>Transferencia</span>
              </label>

              <label
                className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-medium transition ${
                  paymentMethod === 'cash'
                    ? 'border-brand-600 bg-brand-50 text-slate-900'
                    : 'border-slate-200 bg-surface text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="accent-brand-600"
                />
                <Banknote className="w-4 h-4 text-brand-link" />
                <span>Efectivo</span>
              </label>
            </div>
          </div>

          {/* Datos Bancarios Informativos con Copia en 1 Clic */}
          {paymentMethod === 'transfer' && settings?.bank_alias && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
              <p className="font-semibold text-slate-900">Datos para la transferencia:</p>

              <div className="flex items-center justify-between gap-2 p-1.5 bg-surface rounded-lg border border-slate-200 shadow-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                    Alias
                  </span>
                  <span className="font-mono text-brand-link font-bold text-xs truncate block">
                    {settings.bank_alias}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.bank_alias, 'alias')}
                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold transition border ${
                    copiedAlias
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {copiedAlias ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                </button>
              </div>

              {settings.bank_cbu && (
                <div className="flex items-center justify-between gap-2 p-1.5 bg-surface rounded-lg border border-slate-200 shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                      CBU / CVU
                    </span>
                    <span className="font-mono text-slate-800 font-medium text-xs truncate block">
                      {settings.bank_cbu}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.bank_cbu, 'cbu')}
                    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold transition border ${
                      copiedCbu
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {copiedCbu ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                  </button>
                </div>
              )}

              <div className="text-[11px] text-slate-500 pt-0.5 space-y-0.5">
                {settings.bank_name && (
                  <p>
                    <strong>Banco:</strong> {settings.bank_name}
                  </p>
                )}
                {settings.bank_holder && (
                  <p>
                    <strong>Titular:</strong> {settings.bank_holder}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow disabled:opacity-50"
            >
              {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
