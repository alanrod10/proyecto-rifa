'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  DollarSign, Ticket, Clock, CheckCircle, AlertTriangle, 
  Download, RefreshCw, ShoppingCart, ArrowRight, Banknote, Landmark, ShieldAlert, Phone
} from 'lucide-react';
import { formatCurrency, formatDate, buildBuyerWhatsAppUrl } from '@/lib/utils';

interface DashboardMetrics {
  total_numbers: number;
  available_numbers: number;
  reserved_numbers: number;
  sold_numbers: number;
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  expired_orders: number;
  money_collected_total: number;
  money_collected_cash: number;
  money_collected_transfer: number;
  money_pending: number;
  remaining_potential: number;
  expiring_soon_count: number;
  current_ticket_price: number;
}

interface RecentOrder {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: string;
  payment_status: string;
  numbers_count: number;
  numbers?: number[];
  total_amount: number;
  private_token?: string;
  is_direct_sale: boolean;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

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
    } catch (err) {
      setCleanMessage('Error de red al intentar liberar vencidos');
    } finally {
      setCleaning(false);
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
      {/* Cabecera con Título y Botones de Acción Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Resumen General</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas oficiales y estado real de los 80.000 números de la rifa.
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
            className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </a>

          <Link
            href="/admin/ventas"
            className="inline-flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl transition shadow"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Venta Directa</span>
          </Link>
        </div>
      </div>

      {cleanMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{cleanMessage}</span>
          <button onClick={() => setCleanMessage(null)} className="text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Alerta de Reservas por vencer */}
      {metrics && metrics.expiring_soon_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Hay <strong>{metrics.expiring_soon_count} reserva(s)</strong> que vencen en las próximas 12 horas.</span>
          </div>
          <Link href="/admin/solicitudes?status=pending" className="underline font-bold text-amber-950">
            Revisar solicitudes
          </Link>
        </div>
      )}

      {/* BLOQUE 1: RECAUDACIÓN Y DINERO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudado Efectivo Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cobrado</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(metrics?.money_collected_total || 0)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
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

        {/* Dinero Pendiente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dinero Pendiente</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {formatCurrency(metrics?.money_pending || 0)}
          </div>
          <p className="text-[11px] text-slate-400">
            Correspondiente a {metrics?.pending_orders || 0} pedido(s) en espera de pago.
          </p>
        </div>

        {/* Recaudación Potencial Restante */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Potencial Restante</span>
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {formatCurrency(metrics?.remaining_potential || 0)}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics?.available_numbers?.toLocaleString('es-AR')} nros × {formatCurrency(metrics?.current_ticket_price || 100)}
          </p>
        </div>

        {/* Total Operaciones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pedidos</span>
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">
            {metrics?.total_orders || 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics?.paid_orders || 0} pagados • {metrics?.cancelled_orders || 0} cancelados
          </p>
        </div>
      </div>

      {/* BLOQUE 2: ESTADO DE LOS 80.000 NÚMEROS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Estado de los 80.000 Números</h3>
          <Link href="/admin/numeros" className="text-xs font-semibold text-emerald-700 hover:underline">
            Explorar números →
          </Link>
        </div>

        {/* Barra Visual de Progreso */}
        {metrics && (
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${(metrics.sold_numbers / metrics.total_numbers) * 100}%` }}
                className="bg-emerald-600 transition-all duration-500" 
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
                <span className="text-[10px] text-emerald-600 block">
                  {((metrics.sold_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="block text-xs text-amber-800 font-semibold">Reservados</span>
                <span className="text-lg font-black text-amber-700">
                  {metrics.reserved_numbers.toLocaleString('es-AR')}
                </span>
                <span className="text-[10px] text-amber-600 block">
                  {((metrics.reserved_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-xs text-slate-600 font-semibold">Disponibles</span>
                <span className="text-lg font-black text-slate-800">
                  {metrics.available_numbers.toLocaleString('es-AR')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {((metrics.available_numbers / metrics.total_numbers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOQUE 3: PEDIDOS RECIENTES */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Últimos Pedidos Registrados</h3>
            <p className="text-xs text-slate-400">Solicitudes web y ventas directas recientes</p>
          </div>
          <Link href="/admin/solicitudes" className="text-xs font-semibold text-emerald-700 hover:underline">
            Ver todas las solicitudes →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Todavía no hay pedidos registrados.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {ord.code}
                    </td>
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
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline font-mono"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{ord.buyer_phone}</span>
                        </a>
                      ) : (
                        <span className="block text-[11px] text-slate-400 font-mono">{ord.buyer_phone}</span>
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.payment_status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : ord.payment_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : ord.payment_status === 'expired'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ord.payment_status === 'paid' ? 'Pagado' : ord.payment_status === 'pending' ? 'Pendiente' : ord.payment_status === 'expired' ? 'Vencido' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        ord.is_direct_sale ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {ord.is_direct_sale ? 'Directa' : 'Web'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {formatDate(ord.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
