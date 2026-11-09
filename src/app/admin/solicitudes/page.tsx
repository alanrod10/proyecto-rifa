'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { OrderItem } from '@/lib/types';
import OrdersTableSection from '@/components/admin/OrdersTableSection';
import DeleteOrderModal from '@/components/admin/DeleteOrderModal';

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

  // Modal seguro de confirmación antes de eliminar
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/orders?page=${page}&status=${statusFilter}&search=${encodeURIComponent(
        searchTerm.trim()
      )}`;
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
        body: JSON.stringify({ action: 'confirm_payment', order_id: orderId }),
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
    if (reason === null) return;

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
          force_cancel_paid: isPaid,
        }),
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
    if (
      !confirm(
        `¿Cambiar el medio de pago del pedido ${ord.code} (${ord.buyer_name}) a ${nextLabel}?`
      )
    )
      return;

    try {
      setActionLoading(ord.id);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_payment_method',
          order_id: ord.id,
          payment_method: nextMethod,
        }),
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

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      setActionLoading(orderToDelete.id);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          order_id: orderToDelete.id,
          reason: 'Eliminación manual confirmada desde Solicitudes',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Registro eliminado y números liberados correctamente.');
        setOrderToDelete(null);
        fetchOrders();
      } else {
        alert(data.error || 'Error al eliminar el registro.');
      }
    } catch {
      alert('Error de red al eliminar el registro.');
    } finally {
      setDeleting(false);
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Solicitudes y Pedidos
          </h2>
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
          <button
            onClick={() => setFeedback(null)}
            className="text-emerald-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-surface p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
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
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
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

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por código, nombre, celular o número (ej: 7 o 00007)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-3 py-1.5 border border-slate-300 rounded-xl text-base sm:text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-night-800 hover:bg-night-700 border border-night-700 text-white text-xs px-3 py-1.5 rounded-xl font-medium transition"
          >
            Buscar
          </button>
        </form>
      </div>

      <OrdersTableSection
        orders={orders}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        actionLoading={actionLoading}
        onPageChange={(newPage) => setPage(newPage)}
        onConfirmPayment={handleConfirmPayment}
        onCancelOrder={handleCancelOrder}
        onTogglePaymentMethod={handleTogglePaymentMethod}
        onDeleteOrder={(ord) => setOrderToDelete(ord)}
      />

      <DeleteOrderModal
        order={orderToDelete}
        deleting={deleting}
        onCancel={() => setOrderToDelete(null)}
        onConfirm={confirmDeleteOrder}
      />
    </div>
  );
}
