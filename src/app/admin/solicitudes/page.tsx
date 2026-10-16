'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Inbox, Search, CheckCircle, XCircle, Copy, ExternalLink, 
  Clock, AlertTriangle, Filter, RefreshCw, Phone, Trash2, ArrowLeftRight
} from 'lucide-react';
import { formatTicketNumber, formatCurrency, formatDate, buildBuyerWhatsAppUrl } from '@/lib/utils';

interface OrderItem {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: string;
  payment_status: string;
  unit_price: number;
  numbers_count: number;
  total_amount: number;
  numbers: number[];
  private_token: string;
  expires_at: string;
  paid_at: string | null;
  confirmed_by_admin: string | null;
  is_direct_sale: boolean;
  notes: string | null;
  created_at: string;
}

export default function AdminSolicitudesPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/orders?page=${page}&status=${statusFilter}&search=${encodeURIComponent(searchTerm.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalOrders(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleConfirmPayment = async (orderId: number) => {
    if (!confirm('¿Confirmás que recibiste y verificaste el pago de esta solicitud?')) return;

    try {
      setActionLoading(orderId);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', order_id: orderId })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Pago confirmado.');
        fetchOrders();
      } else {
        alert(data.error || 'Error al confirmar pago.');
      }
    } catch {
      alert('Error de red al confirmar pago.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (ord: OrderItem) => {
    const isPaid = ord.payment_status === 'paid';
    const promptMsg = isPaid
      ? `Esta orden (${ord.code}) ya figura como PAGADA. Ingresá el motivo de la anulación para liberar sus números:`
      : `Ingresá el motivo de la cancelación de ${ord.code} (los números serán liberados nuevamente):`;
    const reason = prompt(promptMsg);
    if (reason === null) return; // canceló el prompt

    try {
      setActionLoading(ord.id);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          order_id: ord.id,
          reason,
          force_cancel_paid: isPaid
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Orden cancelada y números liberados.');
        fetchOrders();
      } else {
        alert(data.error || 'Error al cancelar orden.');
      }
    } catch {
      alert('Error de red al cancelar orden.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePaymentMethod = async (ord: OrderItem) => {
    const nextMethod = ord.payment_method === 'cash' ? 'transfer' : 'cash';
    const nextLabel = nextMethod === 'cash' ? 'Efectivo' : 'Transferencia';
    if (!confirm(`¿Cambiar el medio de pago del pedido ${ord.code} (${ord.buyer_name}) a ${nextLabel}?`)) return;

    try {
      setActionLoading(ord.id);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_payment_method',
          order_id: ord.id,
          payment_method: nextMethod
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || `Medio de pago cambiado a ${nextLabel}.`);
        fetchOrders();
      } else {
        alert(data.error || 'Error al cambiar medio de pago.');
      }
    } catch {
      alert('Error de red al cambiar medio de pago.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteOrder = async (ord: OrderItem) => {
    if (
      !confirm(
        `¿Estás seguro de ELIMINAR definitivamente el registro ${ord.code} de "${ord.buyer_name}"?\n\n• Sus ${ord.numbers_count} número(s) volverán a estar disponibles.\n• El pedido se borrará por completo de la base de datos.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(ord.id);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          order_id: ord.id,
          reason: 'Eliminación manual desde Solicitudes'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Registro eliminado correctamente.');
        fetchOrders();
      } else {
        alert(data.error || 'Error al eliminar el registro.');
      }
    } catch {
      alert('Error de red al eliminar el registro.');
    } finally {
      setActionLoading(null);
    }
  };

  const copyVoucherUrl = (token: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/pedido/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Solicitudes y Pedidos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administrá reservas web, verificá comprobantes de transferencia y confirmá pagos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/compradores"
            className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-brand-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-2 rounded-xl transition shadow-sm"
          >
            <span>Agrupado por Celular</span>
          </Link>

          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-surface p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Selector de Estados */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'paid', label: 'Pagados' },
            { id: 'expired', label: 'Vencidos' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por código, nombre o celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-night-800 hover:bg-night-700 border border-night-700 text-white text-xs px-3 py-1.5 rounded-xl font-medium transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Listado de Pedidos */}
      <div className="bg-surface rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Cargando solicitudes...</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No se encontraron solicitudes con los filtros aplicados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
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

                  return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {ord.code}
                      <span className="block text-[10px] font-sans font-normal text-slate-400">
                        {formatDate(ord.created_at)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{ord.buyer_name}</span>
                      <div className="flex items-center flex-wrap gap-2 mt-0.5">
                        <a 
                          href={waVoucherUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Enviar comprobante por WhatsApp al comprador"
                          className="inline-flex items-center gap-1 text-brand-link hover:underline font-mono text-[11px]"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{ord.buyer_phone}</span>
                        </a>
                        <Link
                          href={`/admin/compradores?search=${encodeURIComponent(ord.buyer_phone)}`}
                          className="text-[10px] bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-link border border-slate-200 px-1.5 py-0.5 rounded font-medium transition"
                          title="Ver todas las compras y el total de números de este celular"
                        >
                          Ver total →
                        </Link>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                        {ord.numbers.slice(0, 6).map(n => (
                          <span key={n} className="bg-slate-100 text-slate-800 px-1 rounded border border-slate-200">
                            {formatTicketNumber(n)}
                          </span>
                        ))}
                        {ord.numbers.length > 6 && (
                          <span className="text-slate-400 text-[10px] self-center">
                            +{ord.numbers.length - 6} más
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Total: {ord.numbers_count} número(s)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(ord.total_amount)}
                    </td>

                    <td className="py-3.5 px-4 capitalize text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentMethod(ord)}
                        disabled={actionLoading === ord.id}
                        title="Hacé clic para cambiar entre Efectivo y Transferencia"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-link border border-slate-200 hover:border-brand-300 text-xs font-medium transition"
                      >
                        <span>{ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}</span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        ord.payment_status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : ord.payment_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : ord.payment_status === 'expired'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ord.payment_status === 'paid' ? 'PAGADO' : ord.payment_status === 'pending' ? 'PENDIENTE' : ord.payment_status === 'expired' ? 'VENCIDO' : 'CANCELADO'}
                      </span>
                      {ord.confirmed_by_admin && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Por: @{ord.confirmed_by_admin}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* Botón Confirmar Pago */}
                      {ord.payment_status === 'pending' && (
                        <button
                          onClick={() => handleConfirmPayment(ord.id)}
                          disabled={actionLoading === ord.id}
                          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-sm"
                        >
                          Confirmar Pago
                        </button>
                      )}

                      {/* Botón Cancelar / Anular */}
                      {(ord.payment_status === 'pending' || ord.payment_status === 'paid') && (
                        <button
                          onClick={() => handleCancelOrder(ord)}
                          disabled={actionLoading === ord.id}
                          className="bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 px-2 py-1 rounded-lg text-xs transition"
                          title="Anular pedido y liberar números"
                        >
                          Cancelar
                        </button>
                      )}

                      {/* Botón Enviar Comprobante por WhatsApp */}
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

                      {/* Botón Copiar Enlace del Comprador */}
                      <button
                        onClick={() => copyVoucherUrl(ord.private_token)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs transition"
                        title="Copiar enlace privado del comprobante"
                      >
                        <Copy className="w-3.5 h-3.5 inline" />
                        {copiedToken === ord.private_token ? ' ¡Copiado!' : ''}
                      </button>

                      {/* Botón Abrir Comprobante */}
                      <Link
                        href={`/pedido/${ord.private_token}`}
                        target="_blank"
                        className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-xs transition"
                        title="Ver comprobante en nueva pestaña"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {/* Botón Eliminar Registro Definitivamente */}
                      <button
                        onClick={() => handleDeleteOrder(ord)}
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 py-1">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
