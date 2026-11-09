'use client';

import React from 'react';
import { CheckCircle, Copy, Phone, Landmark, Banknote } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopy';

interface OrderVoucherPaymentBoxProps {
  paymentMethod: 'transfer' | 'cash';
  totalAmount: number;
  expiresAt: string;
  bankAlias: string;
  bankCbu: string;
  bankName: string;
  bankHolder: string;
  phoneAlan: string;
  phoneYilda: string;
  whatsappUrlAlan: string;
  whatsappUrlYilda: string;
}

export default function OrderVoucherPaymentBox({
  paymentMethod,
  totalAmount,
  expiresAt,
  bankAlias,
  bankCbu,
  bankName,
  bankHolder,
  phoneAlan,
  phoneYilda,
  whatsappUrlAlan,
  whatsappUrlYilda,
}: OrderVoucherPaymentBoxProps) {
  const { copiedField, copyToClipboard } = useCopyToClipboard(2000);
  const copiedAlias = copiedField === 'alias';
  const copiedCbu = copiedField === 'cbu';

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-3">
      <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
        {paymentMethod === 'transfer' ? (
          <Landmark className="w-5 h-5 text-amber-600" />
        ) : (
          <Banknote className="w-5 h-5 text-amber-600" />
        )}
        <span>
          {paymentMethod === 'transfer'
            ? '¿Cómo abonar tu reserva por Transferencia?'
            : '¿Cómo abonar tu reserva en Efectivo?'}
        </span>
      </div>

      {paymentMethod === 'transfer' ? (
        <div className="space-y-1.5 text-slate-700">
          <p>
            Realizá la transferencia por <strong>{formatCurrency(totalAmount)}</strong> a la
            siguiente cuenta:
          </p>
          <div className="p-3 bg-surface rounded-xl border border-amber-200 space-y-2 font-mono text-xs">
            {bankAlias && (
              <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200/80">
                <div className="min-w-0">
                  <span className="font-sans font-semibold text-slate-500 block text-[11px]">
                    Alias para transferir:
                  </span>
                  <span className="text-brand-link font-bold text-sm block truncate">
                    {bankAlias}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankAlias, 'alias')}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold font-sans transition border shadow-sm ${
                    copiedAlias
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-surface hover:bg-slate-50 text-slate-800 border-slate-300'
                  }`}
                >
                  {copiedAlias ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                </button>
              </div>
            )}
            {bankCbu && (
              <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200/80">
                <div className="min-w-0">
                  <span className="font-sans font-semibold text-slate-500 block text-[11px]">
                    CBU / CVU:
                  </span>
                  <span className="text-slate-800 font-medium text-xs block truncate">
                    {bankCbu}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankCbu, 'cbu')}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold font-sans transition border shadow-sm ${
                    copiedCbu
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-surface hover:bg-slate-50 text-slate-800 border-slate-300'
                  }`}
                >
                  {copiedCbu ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                </button>
              </div>
            )}
            <div className="font-sans text-[11px] text-slate-600 pt-0.5 space-y-0.5">
              {bankName && (
                <p>
                  <strong>Banco / Billetera:</strong> {bankName}
                </p>
              )}
              {bankHolder && (
                <p>
                  <strong>Titular:</strong> {bankHolder}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-amber-900 pt-1">
            Una vez realizada la transferencia, envianos el comprobante por WhatsApp a cualquiera
            de los dos contactos para validar tu pago:
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 text-slate-700">
          <p>
            Elegiste abonar en <strong>Efectivo</strong>. Por favor comunicate con cualquiera de
            los administradores para coordinar la entrega de los{' '}
            <strong>{formatCurrency(totalAmount)}</strong>:
          </p>
          <p className="text-xs text-amber-900">
            Una vez que entregues el efectivo, los administradores marcarán tu reserva como{' '}
            <strong>PAGADA</strong> y este comprobante se actualizará automáticamente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <a
          href={whatsappUrlAlan}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow"
        >
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {paymentMethod === 'transfer'
              ? `Enviar comprobante a Alan (${phoneAlan})`
              : `Coordinar efectivo con Alan (${phoneAlan})`}
          </span>
        </a>

        <a
          href={whatsappUrlYilda}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow"
        >
          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {paymentMethod === 'transfer'
              ? `Enviar comprobante a Yilda (${phoneYilda})`
              : `Coordinar efectivo con Yilda (${phoneYilda})`}
          </span>
        </a>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Vencimiento de la reserva: {formatDate(expiresAt)}
      </p>
    </div>
  );
}
