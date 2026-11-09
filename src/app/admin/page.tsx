'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Download, ShoppingCart } from 'lucide-react';
import { DashboardMetrics, RecentOrder } from '@/lib/types';
import DashboardMetricsSection from '@/components/admin/DashboardMetricsSection';
import RecentOrdersTable from '@/components/admin/RecentOrdersTable';
import DeleteOrderModal from '@/components/admin/DeleteOrderModal';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<RecentOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Buscador Rápido Exprés
  const [quickSearch, setQuickSearch] = useState('');
  const [quickResults, setQuickResults] = useState<RecentOrder[] | null>(null);
  const [quickSearching, setQuickSearching] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<number | null>(null);

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = quickSearch.trim();
    if (!term) {
      setQuickResults(null);
      return;
    }
    try {
      setQuickSearching(true);
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(term)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setQuickResults(data.orders || []);
      }
    } catch {
      alert('Error al buscar orden');
    } finally {
      setQuickSearching(false);
    }
  };

  const handleQuickConfirmPayment = async (orderId: number) => {
    try {
      setQuickActionLoading(orderId);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', order_id: orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCleanMessage('¡Pago confirmado exitosamente!');
        fetchDashboard();
        setQuickResults((prev) =>
          prev
            ? prev.map((o) => (o.id === orderId ? { ...o, payment_status: 'paid' } : o))
            : null
        );
      } else {
        alert(data.error || 'Error al confirmar pago');
      }
    } catch {
      alert('Error de red al confirmar pago');
    } finally {
      setQuickActionLoading(null);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setRecentOrders(data.recent_orders || []);
      }
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleReleaseExpired = async () => {
    try {
      setCleaning(true);
      setCleanMessage(null);
      const res = await fetch('/api/admin/release-expired', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCleanMessage(data.message);
        fetchDashboard();
      } else {
        setCleanMessage(data.error || 'Error al liberar vencidos');
      }
    } catch {
      setCleanMessage('Error de red al intentar liberar vencidos');
    } finally {
      setCleaning(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      setDeletingId(orderToDelete.id);
      setCleanMessage(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          order_id: orderToDelete.id,
          reason: 'Eliminación manual confirmada desde Resumen General',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCleanMessage(data.message || 'Registro eliminado y números liberados correctamente.');
        setOrderToDelete(null);
        fetchDashboard();
      } else {
        alert(data.error || 'Error al eliminar el registro.');
      }
    } catch {
      alert('Error de red al eliminar el registro.');
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="py-24 text-center text-slate-500 text-sm animate-pulse">
        Cargando métricas del panel en tiempo real...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Resumen General</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas oficiales y estado real de los 100.000 números de la rifa.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleReleaseExpired}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-2 rounded-xl transition"
          >
            <Clock className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
            <span>Liberar Vencidos</span>
          </button>

          <a
            href="/api/admin/export?type=orders"
            download
            className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </a>

          <Link
            href="/admin/ventas"
            className="inline-flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl transition shadow"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Venta Directa</span>
          </Link>
        </div>
      </div>

      {cleanMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{cleanMessage}</span>
          <button
            onClick={() => setCleanMessage(null)}
            className="text-emerald-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      <DashboardMetricsSection
        metrics={metrics}
        quickSearch={quickSearch}
        setQuickSearch={setQuickSearch}
        quickResults={quickResults}
        setQuickResults={setQuickResults}
        quickSearching={quickSearching}
        quickActionLoading={quickActionLoading}
        onQuickSearch={handleQuickSearch}
        onQuickConfirmPayment={handleQuickConfirmPayment}
      />

      <RecentOrdersTable
        recentOrders={recentOrders}
        deletingId={deletingId}
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
