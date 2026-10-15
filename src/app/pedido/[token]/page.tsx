'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, CheckCircle, Clock, AlertCircle, XCircle, Copy, Share2, 
  Phone, Landmark, Banknote, RefreshCw, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { formatTicketNumber, formatCurrency, formatDate } from '@/lib/utils';

interface OrderData {
  code: string;
  buyer_name: string;
  buyer_phone: string;
  payment_method: 'transfer' | 'cash';
  payment_status: 'pending' | 'paid' | 'cancelled' | 'expired';
  unit_price: number;
  numbers_count: number;
  total_amount: number;
  numbers: number[];
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

interface RaffleData {
  name: string;
  description: string;
  prizes: string;
  draw_date: string;
  bank_alias: string;
  bank_cbu: string;
  bank_name: string;
  bank_holder: string;
  contact_phone: string;
  rules_terms: string;
}

export default function BuyerPrivateOrderPage() {
  const params = useParams();
  const token = params?.token as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [raffle, setRaffle] = useState<RaffleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrderData = async (isManualRefresh = false) => {
    if (!token) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/orders/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo cargar la información de la operación.');
        return;
      }

      setOrder(data.order);
      setRaffle(data.raffle);
    } catch (err) {
      console.error('Error al consultar pedido:', err);
      setError('Error de conexión al consultar el pedido.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [token]);

  const copyUrl = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Cargando comprobante digital...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enlace no encontrado</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || 'No encontramos ninguna operación activa asociada a este enlace.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-xl text-sm transition"
            >
              Ir al Portal Principal
            </Link>
            <Link
              href="/consultar"
              className="text-xs text-slate-500 hover:text-slate-800 py-1"
            >
              Consultar por referencia
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pre-cargar mensaje para WhatsApp
  const formattedNumbers = order.numbers.map(formatTicketNumber).join(', ');
  const whatsappMsg = `Hola! Soy ${order.buyer_name}. Tengo la reserva ${order.code} de la rifa por ${order.numbers_count} número(s) (${formattedNumbers}) por un total de ${formatCurrency(order.total_amount)}. Te envío el comprobante de pago.`;
  const whatsappUrl = raffle.contact_phone 
    ? `https://wa.me/${raffle.contact_phone}?text=${encodeURIComponent(whatsappMsg)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 flex flex-col items-center">
      {/* Botón Volver */}
      <div className="max-w-xl w-full mb-4 flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la portada
        </Link>
        <button
          onClick={() => fetchOrderData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 bg-white border border-slate-300 px-2.5 py-1 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar estado
        </button>
      </div>

      {/* Tarjeta Tipo Boleto / Comprobante */}
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Cabecera del Comprobante */}
        <div className="bg-emerald-800 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">
              Comprobante de Reserva
            </span>
            <span className="font-mono font-bold text-sm bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-600/40">
              Ref: {order.code}
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2">{raffle.name}</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Titular: <strong className="text-white">{order.buyer_name}</strong> • {order.buyer_phone}
          </p>

          {/* Insignia de Estado */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm">
            {order.payment_status === 'paid' && (
              <span className="bg-emerald-500 text-white flex items-center gap-1.5 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
                PAGO CONFIRMADO — PARTICIPANDO
              </span>
            )}
            {order.payment_status === 'pending' && (
              <span className="bg-amber-400 text-amber-950 flex items-center gap-1.5 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                RESERVA PENDIENTE DE PAGO
              </span>
            )}
            {order.payment_status === 'expired' && (
              <span className="bg-slate-400 text-slate-950 flex items-center gap-1.5 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                RESERVA VENCIDA
              </span>
            )}
            {order.payment_status === 'cancelled' && (
              <span className="bg-red-500 text-white flex items-center gap-1.5 px-3 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                RESERVA CANCELADA
              </span>
            )}
          </div>
        </div>

        {/* Separador tipo Ticket */}
        <div className="relative h-6 bg-slate-100 flex items-center justify-between px-2">
          <div className="w-5 h-5 rounded-full bg-slate-100 -ml-5 border-r border-slate-200" />
          <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />
          <div className="w-5 h-5 rounded-full bg-slate-100 -mr-5 border-l border-slate-200" />
        </div>

        {/* Cuerpo del Comprobante */}
        <div className="p-6 space-y-6">
          {/* Números Asignados */}
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Tus números asignados ({order.numbers_count}):
            </span>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {order.numbers.map(num => (
                <div 
                  key={num}
                  className="bg-emerald-700 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1"
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{formatTicketNumber(num)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose de Pago */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Cantidad de números:</span>
              <span className="font-semibold text-slate-800">{order.numbers_count}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Precio unitario:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(order.unit_price)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Medio elegido:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {order.payment_method === 'transfer' ? 'Transferencia Bancaria' : 'Efectivo'}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total:</span>
              <span className="text-emerald-700 text-base">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Instrucciones de Pago si está PENDIENTE */}
          {order.payment_status === 'pending' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Landmark className="w-5 h-5 text-amber-600" />
                <span>¿Cómo abonar tu reserva?</span>
              </div>

              {order.payment_method === 'transfer' ? (
                <div className="space-y-1.5 text-slate-700">
                  <p>Realizá la transferencia por <strong>{formatCurrency(order.total_amount)}</strong> a la siguiente cuenta:</p>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 font-mono text-xs">
                    {raffle.bank_alias && <p><span className="font-sans font-semibold text-slate-500">Alias:</span> <strong className="text-emerald-700 font-bold text-sm">{raffle.bank_alias}</strong></p>}
                    {raffle.bank_cbu && <p><span className="font-sans font-semibold text-slate-500">CBU:</span> {raffle.bank_cbu}</p>}
                    {raffle.bank_name && <p><span className="font-sans font-semibold text-slate-500">Banco:</span> {raffle.bank_name}</p>}
                    {raffle.bank_holder && <p><span className="font-sans font-semibold text-slate-500">Titular:</span> {raffle.bank_holder}</p>}
                  </div>
                  <p className="text-[11px] text-amber-900 pt-1">
                    Una vez realizada la transferencia, envianos el comprobante por WhatsApp para validar tu pago.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-slate-700">
                  <p>Coordiná la entrega de los <strong>{formatCurrency(order.total_amount)}</strong> en efectivo directamente con los administradores.</p>
                </div>
              )}

              {/* Botón WhatsApp */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow"
                >
                  <Phone className="w-4 h-4" />
                  Enviar comprobante por WhatsApp
                </a>
              )}

              <p className="text-[11px] text-slate-500 text-center">
                Vencimiento de la reserva: {formatDate(order.expires_at)}
              </p>
            </div>
          )}

          {/* Información del Sorteo */}
          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
            <p><strong>Fecha del sorteo:</strong> {raffle.draw_date}</p>
            <p><strong>Premios:</strong> {raffle.prizes}</p>
          </div>

          {/* Botón Compartir / Copiar Enlace */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={copyUrl}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-xs transition"
            >
              <Copy className="w-4 h-4" />
              {copied ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace privado de este comprobante'}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Guardá este enlace. Te permitirá volver a consultar esta constancia en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
