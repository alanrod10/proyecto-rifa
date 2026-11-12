'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Phone,
  Ticket,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react';
import { BuyerItem, BuyerOrder } from '@/lib/types';
import {
  formatTicketNumber,
  formatCurrency,
  formatDate,
  formatWhatsAppPhone,
  buildBuyerWhatsAppUrl,
  buildBuyerSummaryWhatsAppUrl,
} from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopy';

interface BuyerCardProps {
  buyer: BuyerItem;
  isExpanded: boolean;
  actionLoading: boolean;
  onToggleExpand: () => void;
  onDeleteBuyer: (buyer: BuyerItem) => void;
  onDeleteOrder: (ord: BuyerOrder, buyerName: string) => void;
  onTogglePaymentMethod: (ord: BuyerOrder, buyerName: string) => void;
  onConfirmPayment: (ord: BuyerOrder, buyerName: string) => void;
}

export default function BuyerCard({
  buyer,
  isExpanded,
  actionLoading,
  onToggleExpand,
  onDeleteBuyer,
  onDeleteOrder,
  onTogglePaymentMethod,
  onConfirmPayment,
}: BuyerCardProps) {
  const { copiedField, copyToClipboard } = useCopyToClipboard(2500);

  const paidSet = new Set(buyer.paid_numbers || []);
  const pendingSet = new Set(buyer.pending_numbers || []);
  const allActiveNums = buyer.active_numbers || [];
  const allNames =
    buyer.all_names && buyer.all_names.length > 0 ? buyer.all_names : [buyer.name];

  const summaryWaUrl =
    buyer.orders && buyer.orders.length > 0
      ? buildBuyerSummaryWhatsAppUrl({
          buyerName: buyer.name,
          buyerPhone: buyer.phone,
          paidNumbers: buyer.paid_numbers || [],
          pendingNumbers: buyer.pending_numbers || [],
          totalPaidAmount: buyer.total_paid_amount || 0,
          totalPendingAmount: buyer.total_pending_amount || 0,
          orders: buyer.orders,
        })
      : `https://wa.me/${formatWhatsAppPhone(buyer.phone)}?text=${encodeURIComponent(
          `¡Hola ${buyer.name}! Te escribimos desde la administración de la *Gran Rifa de Fin de Año*.`
        )}`;

  const copyUrl = (token: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/pedido/${token}`;
    copyToClipboard(url, token);
  };

  return (
    <div className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-brand-100 text-brand-link rounded-xl flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <h4 className="font-bold text-slate-900 text-sm">{buyer.name}</h4>
              <a
                href={summaryWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Enviar resumen con el TOTAL de números que tiene este celular por WhatsApp"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-brand-100 font-mono text-xs font-bold transition"
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{buyer.phone}</span>
              </a>
            </div>

            {allNames.length > 1 && (
              <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Nombres en sus compras:</span>
                {allNames.map((alias, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
              <span>
                <strong>{buyer.total_orders}</strong> compra(s) registrada(s)
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">
                <strong>{buyer.total_numbers}</strong> número(s) en total
              </span>
              {(buyer.paid_numbers?.length || 0) > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {buyer.paid_numbers.length} pagado(s)
                </span>
              )}
              {(buyer.pending_numbers?.length || 0) > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {buyer.pending_numbers.length} pendiente(s)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end flex-wrap gap-2 w-full lg:w-auto">
          <div className="text-right mr-2">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">
              Total Pagado
            </span>
            <span className="text-sm font-bold text-brand-link">
              {formatCurrency(buyer.total_paid_amount)}
            </span>
            {buyer.total_pending_amount > 0 && (
              <span className="block text-xs font-semibold text-amber-700">
                Pendiente: {formatCurrency(buyer.total_pending_amount)}
              </span>
            )}
          </div>

          {buyer.orders && buyer.orders.length > 0 && (
            <a
              href={summaryWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
              title="Enviar mensaje por WhatsApp con el total acumulado de números de esta persona"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp Total ({buyer.total_numbers} nros)</span>
            </a>
          )}

          <button
            onClick={() => onDeleteBuyer(buyer)}
            disabled={actionLoading}
            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 hover:border-red-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
            title="Eliminar comprador y liberar todos sus números"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>

          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
            title={isExpanded ? 'Ocultar compras individuales' : 'Ver compras individuales'}
          >
            <span>
              {isExpanded ? 'Ocultar compras' : `Ver ${buyer.total_orders} compra(s)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Consolidado de TODOS los números que eligió este número de teléfono */}
      {allActiveNums.length > 0 && (
        <div className="mt-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Todos los números elegidos por el celular {buyer.phone} ({allActiveNums.length}):
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Pagado
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Pendiente de
                pago
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {allActiveNums.map((num) => {
              const isPaid = paidSet.has(num);
              const isPending = pendingSet.has(num);
              return (
                <span
                  key={num}
                  title={
                    isPaid
                      ? 'Número Pagado'
                      : isPending
                      ? 'Reserva Pendiente de Pago'
                      : ''
                  }
                  className={`px-2 py-0.5 rounded-lg font-bold border ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {formatTicketNumber(num)} {isPaid ? '✓' : '⏳'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalle Desplegable de Pedidos Individuales */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
            Detalle de cada compra individual ({buyer.orders.length}):
          </span>

          {buyer.orders.length === 0 ? (
            <p className="text-xs text-slate-400">Sin pedidos registrados.</p>
          ) : (
            <div className="space-y-2">
              {buyer.orders.map((ord) => {
                const waLink = buildBuyerWhatsAppUrl({
                  buyerName: ord.buyer_name || buyer.name,
                  buyerPhone: buyer.phone,
                  orderCode: ord.code,
                  numbers: ord.numbers,
                  totalAmount: ord.total_amount,
                  paymentStatus: ord.payment_status,
                  privateToken: ord.private_token,
                });

                return (
                  <div
                    key={ord.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-bold text-slate-800">{ord.code}</span>
                        <span className="bg-surface border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                          Anotado como: <strong>{ord.buyer_name || buyer.name}</strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            ord.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.payment_status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : ord.payment_status === 'expired'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ord.payment_status === 'paid'
                            ? 'PAGADO'
                            : ord.payment_status === 'pending'
                            ? 'PENDIENTE'
                            : ord.payment_status === 'expired'
                            ? 'VENCIDO'
                            : 'CANCELADO'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePaymentMethod(ord, ord.buyer_name || buyer.name)
                          }
                          disabled={actionLoading}
                          title="Cambiar entre Efectivo y Transferencia"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-slate-200 hover:border-brand-400 text-xs text-slate-700 font-medium transition"
                        >
                          <span>
                            {ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                          </span>
                          <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                        </button>
                        <span className="text-slate-400 text-xs">{formatDate(ord.created_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 font-mono text-xs text-slate-700">
                        <span>Números de esta compra:</span>
                        {ord.numbers.map((n) => (
                          <span
                            key={n}
                            className="bg-surface px-1 rounded border border-slate-200"
                          >
                            {formatTicketNumber(n)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 self-end md:self-center">
                      <span className="font-bold text-slate-900 mr-1">
                        {formatCurrency(ord.total_amount)}
                      </span>

                      {ord.payment_status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onConfirmPayment(ord, ord.buyer_name || buyer.name)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                          title="Confirmar el pago de este pedido inmediatamente"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Confirmar Pago</span>
                        </button>
                      )}

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                        title="Reenviar comprobante de esta compra puntual por WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Reenviar este</span>
                      </a>

                      <button
                        onClick={() => copyUrl(ord.private_token)}
                        className="bg-surface hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                        title="Copiar enlace privado"
                      >
                        <Copy className="w-3.5 h-3.5 inline mr-1" />
                        {copiedField === ord.private_token ? '¡Copiado!' : 'Copiar enlace'}
                      </button>

                      <Link
                        href={`/pedido/${ord.private_token}`}
                        target="_blank"
                        className="p-1.5 bg-surface hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition"
                        title="Abrir comprobante"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => onDeleteOrder(ord, ord.buyer_name || buyer.name)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 hover:border-red-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                        title="Eliminar este pedido y liberar sus números"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
