'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Landmark,
  Phone,
  Search,
  ExternalLink,
  X,
} from 'lucide-react';
import { DashboardMetrics, RecentOrder } from '@/lib/types';
import { formatCurrency, buildBuyerWhatsAppUrl, formatTicketNumber } from '@/lib/utils';

interface DashboardMetricsSectionProps {
  metrics: DashboardMetrics | null;
  quickSearch: string;
  setQuickSearch: (val: string) => void;
  quickResults: RecentOrder[] | null;
  setQuickResults: (val: RecentOrder[] | null) => void;
  quickSearching: boolean;
  quickActionLoading: number | null;
  onQuickSearch: (e: React.FormEvent) => void;
  onQuickConfirmPayment: (orderId: number) => void;
}

export default function DashboardMetricsSection({
  metrics,
  quickSearch,
  setQuickSearch,
  quickResults,
  setQuickResults,
  quickSearching,
  quickActionLoading,
  onQuickSearch,
  onQuickConfirmPayment,
}: DashboardMetricsSectionProps) {
  return (
    <>
      {/* BUSCADOR RÁPIDO EXPRÉS */}
      <div className="bg-surface rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={onQuickSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Consulta exprés: por código (RF-ABC), boleto (ej: 7 o 00007), nombre o celular..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            {quickSearch && (
              <button
                type="button"
                onClick={() => {
                  setQuickSearch('');
                  setQuickResults(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={quickSearching}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{quickSearching ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {quickResults !== null && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">
                Resultados encontrados ({quickResults.length}):
              </span>
              <button
                type="button"
                onClick={() => setQuickResults(null)}
                className="text-brand-link hover:underline text-[11px]"
              >
                Cerrar consulta
              </button>
            </div>

            {quickResults.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No se encontraron pedidos ni boletos asociados a &quot;{quickSearch}&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {quickResults.map((ord) => {
                  const isPaid = ord.payment_status === 'paid';
                  const waUrl = buildBuyerWhatsAppUrl({
                    buyerPhone: ord.buyer_phone,
                    buyerName: ord.buyer_name,
                    orderCode: ord.code,
                    numbers: ord.numbers || [],
                    totalAmount: ord.total_amount,
                    paymentStatus: ord.payment_status,
                    privateToken: ord.private_token || '',
                  });

                  return (
                    <div
                      key={ord.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900">{ord.code}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">
                          {ord.buyer_name}{' '}
                          <span className="font-mono text-slate-500 font-normal">
                            ({ord.buyer_phone})
                          </span>
                        </p>
                        <p className="text-slate-600">
                          <strong>{ord.numbers_count} número(s):</strong>{' '}
                          <span className="font-mono font-bold text-brand-link">
                            {ord.numbers
                              ?.slice(0, 5)
                              .map((n) => formatTicketNumber(n))
                              .join(', ')}
                            {ord.numbers && ord.numbers.length > 5
                              ? ` (+${ord.numbers.length - 5} más)`
                              : ''}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          <strong>Importe:</strong> {formatCurrency(ord.total_amount)} (
                          {ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'})
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                        {!isPaid && (
                          <button
                            type="button"
                            disabled={quickActionLoading === ord.id}
                            onClick={() => onQuickConfirmPayment(ord.id)}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-xs"
                          >
                            {quickActionLoading === ord.id ? 'Confirmando...' : 'Confirmar Pago'}
                          </button>
                        )}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-brand-link border border-slate-300 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                        <Link
                          href={`/pedido/${ord.private_token}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2 py-1 rounded-lg text-[11px] font-medium transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Comprobante</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerta de Reservas por vencer */}
      {metrics && metrics.expiring_soon_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Hay <strong>{metrics.expiring_soon_count} reserva(s)</strong> que vencen en las
              próximas 12 horas.
            </span>
          </div>
          <Link
            href="/admin/solicitudes?status=pending"
            className="underline font-bold text-amber-950"
          >
            Revisar solicitudes
          </Link>
        </div>
      )}

      {/* BLOQUE 1: RECAUDACIÓN Y DINERO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cobrado</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(metrics?.money_collected_total || 0)}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-600" />
              Efec: {formatCurrency(metrics?.money_collected_cash || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Landmark className="w-3 h-3 text-blue-600" />
              Transf: {formatCurrency(metrics?.money_collected_transfer || 0)}
            </span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dinero Pendiente</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {formatCurrency(metrics?.money_pending || 0)}
          </div>
          <p className="text-xs text-slate-400">
            Correspondiente a {metrics?.pending_orders || 0} pedido(s) en espera de pago.
          </p>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Potencial Restante</span>
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {formatCurrency(metrics?.remaining_potential || 0)}
          </div>
          <p className="text-xs text-slate-400">
            {metrics?.available_numbers?.toLocaleString('es-AR')} nros ×{' '}
            {formatCurrency(metrics?.current_ticket_price || 100)}
          </p>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pedidos</span>
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">{metrics?.total_orders || 0}</div>
          <p className="text-xs text-slate-400">
            {metrics?.paid_orders || 0} pagados • {metrics?.cancelled_orders || 0} cancelados
          </p>
        </div>
      </div>

      {/* BLOQUE 2: ESTADO DE LOS 100.000 NÚMEROS */}
      <div className="bg-surface rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Estado de los 100.000 Números</h3>
          <Link
            href="/admin/numeros"
            className="text-xs font-semibold text-brand-link hover:underline"
          >
            Explorar números →
          </Link>
        </div>

        {metrics && (
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${(metrics.sold_numbers / metrics.total_numbers) * 100}%` }}
                className="bg-brand-600 transition-all duration-500"
                title={`Vendidos: ${metrics.sold_numbers}`}
              />
              <div
                style={{ width: `${(metrics.reserved_numbers / metrics.total_numbers) * 100}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`Reservados: ${metrics.reserved_numbers}`}
              />
              <div
                style={{ width: `${(metrics.available_numbers / metrics.total_numbers) * 100}%` }}
                className="bg-slate-200 transition-all duration-500"
                title={`Disponibles: ${metrics.available_numbers}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="block text-xs text-emerald-800 font-semibold">Vendidos</span>
                <span className="text-lg font-black text-emerald-700">
                  {metrics.sold_numbers.toLocaleString('es-AR')}
                </span>
                <span className="text-[11px] text-emerald-600 block">
                  {((metrics.sold_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="block text-xs text-amber-800 font-semibold">Reservados</span>
                <span className="text-lg font-black text-amber-700">
                  {metrics.reserved_numbers.toLocaleString('es-AR')}
                </span>
                <span className="text-[11px] text-amber-600 block">
                  {((metrics.reserved_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-xs text-slate-600 font-semibold">Disponibles</span>
                <span className="text-lg font-black text-slate-800">
                  {metrics.available_numbers.toLocaleString('es-AR')}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {((metrics.available_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
