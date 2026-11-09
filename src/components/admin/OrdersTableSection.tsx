'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Phone, Trash2, ArrowLeftRight } from 'lucide-react';
import { OrderItem } from '@/lib/types';
import {
  formatTicketNumber,
  formatCurrency,
  formatDate,
  buildBuyerWhatsAppUrl,
} from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/useCopy';

interface OrdersTableSectionProps {
  orders: OrderItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalOrders: number;
  actionLoading: number | null;
  onPageChange: (page: number) => void;
  onConfirmPayment: (orderId: number) => void;
  onCancelOrder: (ord: OrderItem) => void;
  onTogglePaymentMethod: (ord: OrderItem) => void;
  onDeleteOrder: (ord: OrderItem) => void;
  selectedOrderIds?: number[];
  onToggleSelectOrder?: (orderId: number) => void;
  onToggleSelectAllVisible?: () => void;
}

export default function OrdersTableSection({
  orders,
  loading,
  page,
  totalPages,
  totalOrders,
  actionLoading,
  onPageChange,
  onConfirmPayment,
  onCancelOrder,
  onTogglePaymentMethod,
  onDeleteOrder,
  selectedOrderIds = [],
  onToggleSelectOrder,
  onToggleSelectAllVisible,
}: OrdersTableSectionProps) {
  const { copiedField, copyToClipboard } = useCopyToClipboard(2500);

  const copyVoucherUrl = (token: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/pedido/${token}`;
    copyToClipboard(url, token);
  };

  const pendingVisibleOrders = orders.filter((o) => o.payment_status === 'pending');
  const allVisiblePendingSelected =
    pendingVisibleOrders.length > 0 &&
    pendingVisibleOrders.every((o) => selectedOrderIds.includes(o.id));

  return (
    <div className="bg-surface rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Cargando solicitudes...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          No se encontraron solicitudes con los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                {onToggleSelectOrder && (
                  <th className="py-3 px-3 w-8 text-center">
                    {pendingVisibleOrders.length > 0 && onToggleSelectAllVisible && (
                      <input
                        type="checkbox"
                        checked={allVisiblePendingSelected}
                        onChange={onToggleSelectAllVisible}
                        title="Seleccionar todos los visibles pendientes"
                        className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                      />
                    )}
                  </th>
                )}
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Comprador</th>
                <th className="py-3 px-4">Números Asignados</th>
                <th className="py-3 px-4">Importe</th>
                <th className="py-3 px-4">Medio</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => {
                const waVoucherUrl = buildBuyerWhatsAppUrl({
                  buyerName: ord.buyer_name,
                  buyerPhone: ord.buyer_phone,
                  orderCode: ord.code,
                  numbers: ord.numbers,
                  totalAmount: ord.total_amount,
                  paymentStatus: ord.payment_status,
                  privateToken: ord.private_token,
                });

                const isPending = ord.payment_status === 'pending';
                const isSelected = selectedOrderIds.includes(ord.id);

                return (
                  <tr
                    key={ord.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? 'bg-brand-50/40' : ''
                    }`}
                  >
                    {onToggleSelectOrder && (
                      <td className="py-3.5 px-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelectOrder(ord.id)}
                            title={`Seleccionar pedido ${ord.code}`}
                            className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {ord.code}
                      <span className="block text-[11px] font-sans font-normal text-slate-400">
                        {formatDate(ord.created_at)}
                      </span>
                      {isPending && ord.expires_at && (
                        <span className="block text-[10px] font-sans font-medium text-amber-700">
                          Vence: {formatDate(ord.expires_at)}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{ord.buyer_name}</span>
                      <div className="flex items-center flex-wrap gap-2 mt-0.5">
                        <a
                          href={waVoucherUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar comprobante por WhatsApp al comprador"
                          className="inline-flex items-center gap-1 text-brand-link hover:underline font-mono text-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{ord.buyer_phone}</span>
                        </a>
                        <Link
                          href={`/admin/compradores?search=${encodeURIComponent(ord.buyer_phone)}`}
                          className="text-[11px] bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-link border border-slate-200 px-1.5 py-0.5 rounded font-medium transition"
                          title="Ver todas las compras y el total de números de este celular"
                        >
                          Ver total →
                        </Link>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1 font-mono text-xs">
                        {ord.numbers.slice(0, 6).map((n) => (
                          <span
                            key={n}
                            className="bg-slate-100 text-slate-800 px-1 rounded border border-slate-200"
                          >
                            {formatTicketNumber(n)}
                          </span>
                        ))}
                        {ord.numbers.length > 6 && (
                          <span className="text-slate-400 text-[11px] self-center">
                            +{ord.numbers.length - 6} más
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Total: {ord.numbers_count} número(s)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(ord.total_amount)}
                    </td>

                    <td className="py-3.5 px-4 capitalize text-slate-600">
                      <button
                        type="button"
                        onClick={() => onTogglePaymentMethod(ord)}
                        disabled={actionLoading === ord.id}
                        title="Hacé clic para cambiar entre Efectivo y Transferencia"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-link border border-slate-200 hover:border-brand-300 text-xs font-medium transition"
                      >
                        <span>
                          {ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                        </span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          ord.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.payment_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.payment_status === 'expired'
                            ? 'bg-slate-100 text-slate-700'
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
                      {ord.confirmed_by_admin && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Por: @{ord.confirmed_by_admin}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      {ord.payment_status === 'pending' && (
                        <button
                          onClick={() => onConfirmPayment(ord.id)}
                          disabled={actionLoading === ord.id}
                          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-sm"
                        >
                          Confirmar Pago
                        </button>
                      )}

                      {(ord.payment_status === 'pending' || ord.payment_status === 'paid') && (
                        <button
                          onClick={() => onCancelOrder(ord)}
                          disabled={actionLoading === ord.id}
                          className="bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 px-2 py-1 rounded-lg text-xs transition"
                          title="Anular pedido y liberar números"
                        >
                          Cancelar
                        </button>
                      )}

                      <a
                        href={waVoucherUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition"
                        title="Enviar comprobante digital por WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => copyVoucherUrl(ord.private_token)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs transition"
                        title="Copiar enlace privado del comprobante"
                      >
                        <Copy className="w-3.5 h-3.5 inline" />
                        {copiedField === ord.private_token ? ' ¡Copiado!' : ''}
                      </button>

                      <Link
                        href={`/pedido/${ord.private_token}`}
                        target="_blank"
                        className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs transition"
                        title="Ver comprobante en nueva pestaña"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => onDeleteOrder(ord)}
                        disabled={actionLoading === ord.id}
                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 hover:border-red-600 px-2 py-1 rounded-lg text-xs font-semibold transition"
                        title="Eliminar registro definitivamente y liberar sus números"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Total: {totalOrders} solicitudes</span>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-2 py-1">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
