'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Phone, Ticket, Copy, ExternalLink, RefreshCw, 
  ChevronDown, ChevronUp, CheckCircle, Clock
} from 'lucide-react';
import { formatTicketNumber, formatCurrency, formatDate, formatWhatsAppPhone, buildBuyerWhatsAppUrl } from '@/lib/utils';

interface BuyerOrder {
  id: number;
  code: string;
  payment_status: string;
  payment_method: string;
  numbers_count: number;
  total_amount: number;
  numbers: number[];
  private_token: string;
  created_at: string;
}

interface BuyerItem {
  id: number;
  name: string;
  phone: string;
  created_at: string;
  total_orders: number;
  total_numbers: number;
  total_paid_amount: number;
  orders: BuyerOrder[];
}

export default function AdminCompradoresPage() {
  const [buyers, setBuyers] = useState<BuyerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBuyers, setTotalBuyers] = useState(0);

  const [expandedBuyerId, setExpandedBuyerId] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/buyers?page=${page}&limit=30&search=${encodeURIComponent(search.trim())}`;
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
    fetchBuyers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBuyers();
  };

  const copyUrl = (token: string) => {
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Compradores</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consultá participantes, pedidos históricos y recuperá enlaces privados de consulta.
          </p>
        </div>

        <button
          onClick={fetchBuyers}
          className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre o número de celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-xl font-medium transition"
        >
          Buscar
        </button>
      </form>

      {/* Listado de Compradores */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Cargando compradores...</div>
        ) : buyers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">No se encontraron compradores registrados.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {buyers.map((buyer) => {
              const isExpanded = expandedBuyerId === buyer.id;
              const latestOrder = buyer.orders && buyer.orders.length > 0 ? buyer.orders[0] : null;
              const mainBuyerWaUrl = latestOrder
                ? buildBuyerWhatsAppUrl({
                    buyerName: buyer.name,
                    buyerPhone: buyer.phone,
                    orderCode: latestOrder.code,
                    numbers: latestOrder.numbers,
                    totalAmount: latestOrder.total_amount,
                    paymentStatus: latestOrder.payment_status,
                    privateToken: latestOrder.private_token,
                  })
                : `https://wa.me/${formatWhatsAppPhone(buyer.phone)}?text=${encodeURIComponent(`Hola ${buyer.name}! Te escribimos desde la administración de la Gran Rifa Familiar.`)}`;

              return (
                <div key={buyer.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{buyer.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <a 
                            href={mainBuyerWaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Enviar comprobante por WhatsApp"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{buyer.phone}</span>
                          </a>
                          <span>•</span>
                          <span>{buyer.total_orders} pedido(s)</span>
                          <span>•</span>
                          <span>{buyer.total_numbers} número(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Total Pagado</span>
                        <span className="text-sm font-bold text-emerald-700">
                          {formatCurrency(buyer.total_paid_amount)}
                        </span>
                      </div>

                      {latestOrder && (
                        <a
                          href={mainBuyerWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                          title="Enviar comprobante de su último pedido por WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reenviar Comprobante</span>
                        </a>
                      )}

                      <button
                        onClick={() => setExpandedBuyerId(isExpanded ? null : buyer.id)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                        title={isExpanded ? 'Ocultar pedidos' : 'Ver pedidos'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalle Desplegable de Pedidos del Comprador */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Historial de Operaciones:
                      </span>

                      {buyer.orders.length === 0 ? (
                        <p className="text-xs text-slate-400">Sin pedidos registrados.</p>
                      ) : (
                        <div className="space-y-2">
                          {buyer.orders.map((ord) => {
                            const waLink = buildBuyerWhatsAppUrl({
                              buyerName: buyer.name,
                              buyerPhone: buyer.phone,
                              orderCode: ord.code,
                              numbers: ord.numbers,
                              totalAmount: ord.total_amount,
                              paymentStatus: ord.payment_status,
                              privateToken: ord.private_token,
                            });

                            return (
                              <div key={ord.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800">{ord.code}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ord.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {ord.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">{formatDate(ord.created_at)}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 font-mono text-[11px] text-slate-700">
                                    <span>Números:</span>
                                    {ord.numbers.map(n => (
                                      <span key={n} className="bg-white px-1 rounded border border-slate-200">
                                        {formatTicketNumber(n)}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
                                  <span className="font-bold text-slate-900 mr-2">{formatCurrency(ord.total_amount)}</span>

                                  {/* Botón Reenviar por WhatsApp */}
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                                    title="Reenviar enlace por WhatsApp"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Reenviar</span>
                                  </a>

                                  {/* Botón Copiar Token */}
                                  <button
                                    onClick={() => copyUrl(ord.private_token)}
                                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                                    title="Copiar enlace privado"
                                  >
                                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                                    {copiedToken === ord.private_token ? '¡Copiado!' : 'Copiar enlace'}
                                  </button>

                                  <Link
                                    href={`/pedido/${ord.private_token}`}
                                    target="_blank"
                                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition"
                                    title="Abrir comprobante"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
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
              );
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {totalBuyers} compradores registrados</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 py-1">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
