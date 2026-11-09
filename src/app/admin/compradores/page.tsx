'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BuyerItem, BuyerOrder } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import BuyerCard from '@/components/admin/BuyerCard';

export default function AdminCompradoresPage() {
  const [buyers, setBuyers] = useState<BuyerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBuyers, setTotalBuyers] = useState(0);

  const [expandedBuyerId, setExpandedBuyerId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchBuyers = async (customSearch?: string) => {
    try {
      setLoading(true);
      const query = customSearch !== undefined ? customSearch : search;
      const url = `/api/admin/buyers?page=${page}&limit=30&search=${encodeURIComponent(
        query.trim()
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBuyers(data.buyers || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalBuyers(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Error cargando compradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSearch = params.get('search');
      if (urlSearch && page === 1 && !search) {
        setSearch(urlSearch);
        fetchBuyers(urlSearch);
        return;
      }
    }
    fetchBuyers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBuyers(search);
  };

  const handleDeleteBuyer = async (buyer: BuyerItem) => {
    if (
      !confirm(
        `¿Estás seguro de ELIMINAR al comprador "${buyer.name}" (${buyer.phone})?\n\n• Se borrarán sus ${buyer.total_orders} pedido(s).\n• Todos sus números volverán a estar disponibles.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/buyers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyer.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Comprador eliminado correctamente.');
        fetchBuyers();
      } else {
        alert(data.error || 'Error al eliminar comprador.');
      }
    } catch {
      alert('Error de red al eliminar comprador.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (ord: BuyerOrder, buyerName: string) => {
    if (
      !confirm(
        `¿Estás seguro de ELIMINAR definitivamente el pedido ${ord.code} de "${buyerName}"?\n\n• Sus ${ord.numbers_count} número(s) volverán a estar disponibles.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          order_id: ord.id,
          reason: 'Eliminación manual desde Compradores',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Pedido eliminado correctamente.');
        fetchBuyers();
      } else {
        alert(data.error || 'Error al eliminar pedido.');
      }
    } catch {
      alert('Error de red al eliminar pedido.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePaymentMethod = async (ord: BuyerOrder, buyerName: string) => {
    const nextMethod = ord.payment_method === 'cash' ? 'transfer' : 'cash';
    const nextLabel = nextMethod === 'cash' ? 'Efectivo' : 'Transferencia';
    if (
      !confirm(
        `¿Cambiar el medio de pago del pedido ${ord.code} (${buyerName}) a ${nextLabel}?`
      )
    )
      return;

    try {
      setActionLoading(true);
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
        setFeedback(data.message || `Medio de pago actualizado a ${nextLabel}.`);
        fetchBuyers();
      } else {
        alert(data.error || 'Error al cambiar medio de pago.');
      }
    } catch {
      alert('Error de red al cambiar medio de pago.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (ord: BuyerOrder, buyerName: string) => {
    if (
      !confirm(
        `¿Confirmar el pago del pedido ${ord.code} de "${buyerName}" por ${formatCurrency(
          ord.total_amount
        )}?`
      )
    )
      return;

    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_payment',
          order_id: ord.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Pago confirmado exitosamente.');
        fetchBuyers();
      } else {
        alert(data.error || 'Error al confirmar pago.');
      }
    } catch {
      alert('Error de red al confirmar pago.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Compradores Agrupados por Celular
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unifica todas las compras de un mismo número de teléfono (incluso si se anotó con
            variantes de nombre), muestra todos sus números elegidos juntos y envía el resumen
            total por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => fetchBuyers()}
          className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
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

      {/* Buscador */}
      <form
        onSubmit={handleSearch}
        className="bg-surface p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2"
      >
        <input
          type="text"
          placeholder="Buscar por cualquier nombre usado, número de celular, código o número de rifa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-base sm:text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-night-800 hover:bg-night-700 border border-night-700 text-white text-xs px-4 py-2 rounded-xl font-medium transition"
        >
          Buscar
        </button>
      </form>

      {/* Listado de Compradores Agrupados por Teléfono */}
      <div className="bg-surface rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Cargando compradores...</div>
        ) : buyers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No se encontraron compradores registrados.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {buyers.map((buyer) => (
              <BuyerCard
                key={buyer.id}
                buyer={buyer}
                isExpanded={expandedBuyerId === buyer.id}
                actionLoading={actionLoading}
                onToggleExpand={() =>
                  setExpandedBuyerId(expandedBuyerId === buyer.id ? null : buyer.id)
                }
                onDeleteBuyer={handleDeleteBuyer}
                onDeleteOrder={handleDeleteOrder}
                onTogglePaymentMethod={handleTogglePaymentMethod}
                onConfirmPayment={handleConfirmPayment}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {totalBuyers} compradores registrados</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 py-1">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
