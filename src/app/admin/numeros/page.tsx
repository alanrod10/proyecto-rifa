'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Hash, Search, Filter, RefreshCw, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { formatTicketNumber, formatDate, buildBuyerWhatsAppUrl } from '@/lib/utils';

interface NumberRecord {
  number: number;
  status: string;
  order_id: number | null;
  order_code: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  payment_status: string | null;
  order_numbers?: number[];
  total_amount?: number | null;
  private_token?: string | null;
  updated_at: string;
}

export default function AdminNumerosPage() {
  const [numbers, setNumbers] = useState<NumberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(100000);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/numbers?page=${page}&limit=50&status=${status}&search=${encodeURIComponent(search.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Error al listar números:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchNumbers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de 100.000 Números</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspeccioná el estado de cualquier número del 00001 al 100000 y sus compradores asignados.
          </p>
        </div>

        <button
          onClick={fetchNumbers}
          className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-surface p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'Todos (100.000)' },
            { id: 'available', label: 'Disponibles' },
            { id: 'reserved', label: 'Reservados' },
            { id: 'sold', label: 'Vendidos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatus(tab.id); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                status === tab.id
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar número específico (ej: 54321)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {/* Tabla de Números */}
      <div className="bg-surface rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Cargando números...</div>
        ) : numbers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No se encontraron números con ese criterio.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Número</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Orden Asociada</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Celular</th>
                  <th className="py-3 px-4">Última Modificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {numbers.map((item) => (
                  <tr key={item.number} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                      {formatTicketNumber(item.number)}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.status === 'sold'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'reserved'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status === 'sold' ? 'Vendido' : item.status === 'reserved' ? 'Reservado' : 'Disponible'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {item.order_code ? (
                        <Link href={`/admin/solicitudes?search=${item.order_code}`} className="text-brand-link hover:underline">
                          {item.order_code}
                        </Link>
                      ) : (
                        <span className="text-slate-300 font-sans">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.buyer_name || <span className="text-slate-300 font-normal">—</span>}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.buyer_phone ? (
                        <a
                          href={buildBuyerWhatsAppUrl({
                            buyerPhone: item.buyer_phone,
                            buyerName: item.buyer_name || 'Comprador',
                            orderCode: item.order_code || 'RIFA',
                            numbers: item.order_numbers || [item.number],
                            totalAmount: item.total_amount || 100,
                            paymentStatus: item.payment_status || 'paid',
                            privateToken: item.private_token || '',
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-link hover:underline font-semibold"
                          title="Enviar comprobante por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{item.buyer_phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {formatDate(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total en este filtro: {totalCount.toLocaleString('es-AR')} números</span>
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
