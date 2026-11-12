'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Copy, Phone, ArrowRight } from 'lucide-react';
import { RaffleSettings } from '@/lib/types';
import { DEFAULT_CONTACT_PHONE, DEFAULT_CONTACT_PHONE_SECONDARY, DEFAULT_RESERVE_HOURS } from '@/lib/constants';
import { formatTicketNumber, formatCurrency, formatWhatsAppPhone } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopy';

export interface OrderSuccessData {
  code: string;
  private_token: string;
  numbers_count: number;
  numbers: number[];
  total_amount: number;
  payment_method: 'transfer' | 'cash';
  buyer_name: string;
  expires_at: string;
}

interface PaymentInstructionsProps {
  orderSuccess: OrderSuccessData;
  settings: RaffleSettings | null;
  onClose: () => void;
}

export default function PaymentInstructions({
  orderSuccess,
  settings,
  onClose,
}: PaymentInstructionsProps) {
  const { copiedField, copyToClipboard } = useCopyToClipboard(3000);

  const privateUrl = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/pedido/${orderSuccess.private_token}`;

  const phoneAlan = settings?.contact_phone || DEFAULT_CONTACT_PHONE;
  const phoneYilda = settings?.contact_phone_secondary || DEFAULT_CONTACT_PHONE_SECONDARY;
  const formattedSuccessNums = orderSuccess.numbers.map(formatTicketNumber).join(', ');

  const raffleTitle = settings?.raffle_name || 'Gran Rifa de Fin de Año';

  const msg =
    orderSuccess.payment_method === 'cash'
      ? `¡Hola! Soy *${orderSuccess.buyer_name}*.\n\n` +
        `★ Acabo de hacer una reserva en la *${raffleTitle}*:\n` +
        `• *Código:* ${orderSuccess.code}\n` +
        `• *Números (${orderSuccess.numbers_count}):* ${formattedSuccessNums}\n` +
        `• *Total:* ${formatCurrency(orderSuccess.total_amount)}\n` +
        `• *Método de pago:* En efectivo\n\n` +
        `► Me comunico para coordinar la entrega del dinero. ¡Muchas gracias!`
      : `¡Hola! Soy *${orderSuccess.buyer_name}*.\n\n` +
        `★ Acabo de hacer una reserva en la *${raffleTitle}*:\n` +
        `• *Código:* ${orderSuccess.code}\n` +
        `• *Números (${orderSuccess.numbers_count}):* ${formattedSuccessNums}\n` +
        `• *Total:* ${formatCurrency(orderSuccess.total_amount)}\n` +
        `• *Método de pago:* Transferencia bancaria\n\n` +
        `► Te adjunto aquí el comprobante de la transferencia para que puedan validar mi pago. ¡Muchas gracias!`;

  return (
    <section className="max-w-3xl mx-auto px-4 my-6 w-full animate-fade-in">
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 text-slate-900 shadow-lg">
        <div className="flex items-center space-x-3 text-emerald-700">
          <CheckCircle className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-extrabold">
              {orderSuccess.payment_method === 'cash'
                ? '¡Reserva Registrada para Pago en Efectivo!'
                : '¡Solicitud de Reserva Registrada!'}
            </h3>
            <p className="text-sm text-emerald-800">
              Referencia de pedido: <strong>{orderSuccess.code}</strong> • Medio:{' '}
              <strong>
                {orderSuccess.payment_method === 'cash' ? 'Efectivo' : 'Transferencia Bancaria'}
              </strong>
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-surface rounded-xl border border-emerald-200 space-y-2 text-sm">
          <p>
            <strong>Números reservados ({orderSuccess.numbers_count}):</strong>{' '}
            <span className="font-mono text-emerald-700 font-semibold">
              {formattedSuccessNums}
            </span>
          </p>
          <p>
            <strong>Total a abonar:</strong>{' '}
            <span className="font-bold text-slate-900 text-base">
              {formatCurrency(orderSuccess.total_amount)}
            </span>
          </p>
          {orderSuccess.payment_method === 'cash' ? (
            <p className="text-xs text-slate-600">
              Tus números están reservados de forma segura. Tenés{' '}
              <strong>{settings?.reserve_hours || DEFAULT_RESERVE_HOURS} horas</strong> para
              coordinar y entregar el pago en efectivo a los administradores.
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Tus números están reservados de forma segura. Tenés{' '}
              <strong>{settings?.reserve_hours || DEFAULT_RESERVE_HOURS} horas</strong> para
              realizar la transferencia y enviar el comprobante de pago.
            </p>
          )}
        </div>

        {/* Enlace Privado Único */}
        <div className="mt-4 p-3 bg-emerald-100/70 rounded-xl border border-emerald-300">
          <span className="block text-xs font-semibold text-emerald-900 mb-1">
            Tu Enlace Privado de Consulta:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={privateUrl}
              className="w-full text-xs bg-surface px-3 py-2 rounded border border-emerald-300 text-slate-700 select-all font-mono"
            />
            <button
              onClick={() => copyToClipboard(privateUrl, 'private_url')}
              className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 rounded transition whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedField === 'private_url' ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-emerald-800 mt-1.5">
            Guardá este enlace en tus favoritos o WhatsApp. Te permitirá consultar el estado de tu
            pago cuando lo confirmemos.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href={`https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
          >
            <Phone className="w-4 h-4" />
            {orderSuccess.payment_method === 'cash'
              ? `Coordinar efectivo con Alan (${phoneAlan})`
              : `Enviar comprobante a Alan (${phoneAlan})`}
          </a>

          <a
            href={`https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
          >
            <Phone className="w-4 h-4" />
            {orderSuccess.payment_method === 'cash'
              ? `Coordinar efectivo con Yilda (${phoneYilda})`
              : `Enviar comprobante a Yilda (${phoneYilda})`}
          </a>

          <Link
            href={`/pedido/${orderSuccess.private_token}`}
            className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
          >
            Ver Mi Comprobante Digital
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2"
          >
            Cerrar este mensaje
          </button>
        </div>
      </div>
    </section>
  );
}
