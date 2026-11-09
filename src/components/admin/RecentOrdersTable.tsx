'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, Trash2 } from 'lucide-react';
import { RecentOrder } from '@/lib/types';
import { formatCurrency, formatDate, buildBuyerWhatsAppUrl } from '@/lib/utils';

interface RecentOrdersTableProps {
  recentOrders: RecentOrder[];
  deletingId: number | null;
  onDeleteOrder: (ord: RecentOrder) => void;
}

export default function RecentOrdersTable({
  recentOrders,
  deletingId,
  onDeleteOrder,
}: RecentOrdersTableProps) {
  return (
    <div className="bg-surface rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Últimos Pedidos Registrados</h3>
          <p className="text-xs text-slate-400">Solicitudes web y ventas directas recientes</p>
        </div>
        <Link
          href="/admin/solicitudes"
          className="text-xs font-semibold text-brand-link hover:underline"
        >
          Ver todas las solicitudes →
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          Todavía no hay pedidos registrados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Comprador</th>
                <th className="py-2.5 px-3">Números</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Medio</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{ord.code}</td>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <span className="block">{ord.buyer_name}</span>
                    {ord.private_token ? (
                      <a
                        href={buildBuyerWhatsAppUrl({
                          buyerName: ord.buyer_name,
                          buyerPhone: ord.buyer_phone,
                          orderCode: ord.code,
                          numbers: ord.numbers || [],
                          totalAmount: ord.total_amount,
                          paymentStatus: ord.payment_status,
                          privateToken: ord.private_token,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar comprobante por WhatsApp"
                        className="inline-flex items-center gap-1 text-xs text-brand-link hover:underline font-mono"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{ord.buyer_phone}</span>
                      </a>
                    ) : (
                      <span className="block text-xs text-slate-400 font-mono">
                        {ord.buyer_phone}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {ord.numbers_count} nro(s)
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {formatCurrency(ord.total_amount)}
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-600">
                    {ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
                        ? 'Pagado'
                        : ord.payment_status === 'pending'
                        ? 'Pendiente'
                        : ord.payment_status === 'expired'
                        ? 'Vencido'
                        : 'Cancelado'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                        ord.is_direct_sale
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {ord.is_direct_sale ? 'Directa' : 'Web'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs">
                    {formatDate(ord.created_at)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onDeleteOrder(ord)}
                      disabled={deletingId === ord.id}
                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 hover:border-red-600 px-2 py-1 rounded-lg text-xs font-semibold transition"
                      title="Eliminar pedido definitivamente y liberar números"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
