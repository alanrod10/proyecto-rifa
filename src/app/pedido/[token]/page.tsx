'use client';

import ThemeToggle from '@/components/ThemeToggle';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Ticket, CheckCircle, Clock, AlertCircle, XCircle, Copy, Share2, 
  Phone, Landmark, Banknote, RefreshCw, ArrowLeft, ShieldCheck, Printer
} from 'lucide-react';
import { formatTicketNumber, formatCurrency, formatDate, formatWhatsAppPhone, buildBuyerWhatsAppUrl } from '@/lib/utils';

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
  private_token?: string;
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
  contact_phone_secondary: string;
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
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const copyBankField = (text: string, type: 'alias' | 'cbu') => {
    navigator.clipboard.writeText(text);
    if (type === 'alias') {
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    } else {
      setCopiedCbu(true);
      setTimeout(() => setCopiedCbu(false), 2000);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-page">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-link animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Cargando comprobante digital...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-page">
        <div className="bg-surface max-w-md w-full p-6 rounded-2xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="p-3 bg-red-100 text-red-600 dark:text-red-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enlace no encontrado</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || 'No encontramos ninguna operación activa asociada a este enlace.'}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm transition"
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

  // Pre-cargar mensaje para WhatsApp diferenciando Transferencia vs Efectivo para ambos contactos (Alan y Yilda)
  const formattedNumbers = order.numbers.map(formatTicketNumber).join(', ');
  const whatsappMsg =
    order.payment_method === 'cash'
      ? `¡Hola! Soy *${order.buyer_name}*.\n\n` +
        `★ Tengo la reserva de la *Gran Rifa Familiar*:\n` +
        `• *Código:* ${order.code}\n` +
        `• *Números (${order.numbers_count}):* ${formattedNumbers}\n` +
        `• *Total:* ${formatCurrency(order.total_amount)}\n` +
        `• *Método de pago:* En efectivo\n\n` +
        `► Me comunico para coordinar la entrega del dinero. ¡Muchas gracias!`
      : `¡Hola! Soy *${order.buyer_name}*.\n\n` +
        `★ Tengo la reserva de la *Gran Rifa Familiar*:\n` +
        `• *Código:* ${order.code}\n` +
        `• *Números (${order.numbers_count}):* ${formattedNumbers}\n` +
        `• *Total:* ${formatCurrency(order.total_amount)}\n` +
        `• *Método de pago:* Transferencia bancaria\n\n` +
        `► Te adjunto aquí el comprobante de transferencia para validar mi pago. ¡Muchas gracias!`;

  const phoneAlan = raffle.contact_phone || '3884152040';
  const phoneYilda = raffle.contact_phone_secondary || '3884141514';
  const whatsappUrlAlan = `https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent(whatsappMsg)}`;
  const whatsappUrlYilda = `https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent(whatsappMsg)}`;

  // Enlace para enviar el comprobante al WhatsApp del comprador
  const buyerWaVoucherUrl = buildBuyerWhatsAppUrl({
    buyerName: order.buyer_name,
    buyerPhone: order.buyer_phone,
    orderCode: order.code,
    numbers: order.numbers,
    totalAmount: order.total_amount,
    paymentStatus: order.payment_status,
    privateToken: order.private_token || token,
  });

  return (
    <div className="min-h-screen bg-page py-6 px-4 flex flex-col items-center">
      {/* Botón Volver */}
      <div className="max-w-xl w-full mb-4 flex items-center justify-between print:hidden">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-link transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la portada
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrderData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-brand-link bg-surface border border-slate-300 px-2.5 py-1 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar estado
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Tarjeta Tipo Boleto / Comprobante */}
      <div className="animate-slide-up max-w-xl w-full bg-surface rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Cabecera del Comprobante */}
        <div className="theme-night bg-gradient-to-br from-night-900 to-night-950 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
              Comprobante de Reserva
            </span>
            <span className="font-mono font-bold text-sm bg-white/10 px-3 py-1 rounded-full border border-white/15">
              Ref: {order.code}
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2">{raffle.name}</h2>
          <p className="text-xs text-slate-300 mt-1">
            Titular: <strong className="text-white">{order.buyer_name}</strong> •{' '}
            <a
              href={buyerWaVoucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white font-mono"
              title="Enviar este comprobante al WhatsApp del comprador"
            >
              {order.buyer_phone}
            </a>
          </p>

          {/* Insignia de Estado */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm">
            {order.payment_status === 'paid' && (
              <span className="bg-emerald-700 text-white flex items-center gap-1.5 px-3 py-1 rounded-full">
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
              <span className="bg-red-600 text-white flex items-center gap-1.5 px-3 py-1 rounded-full">
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
                  className="bg-brand-600 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1"
                >
                  <Ticket className="w-3.5 h-3.5 text-brand-200" />
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
              <span className="text-brand-link text-base">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Instrucciones de Pago si está PENDIENTE */}
          {order.payment_status === 'pending' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                {order.payment_method === 'transfer' ? (
                  <Landmark className="w-5 h-5 text-amber-600" />
                ) : (
                  <Banknote className="w-5 h-5 text-amber-600" />
                )}
                <span>
                  {order.payment_method === 'transfer'
                    ? '¿Cómo abonar tu reserva por Transferencia?'
                    : '¿Cómo abonar tu reserva en Efectivo?'}
                </span>
              </div>

              {order.payment_method === 'transfer' ? (
                <div className="space-y-1.5 text-slate-700">
                  <p>Realizá la transferencia por <strong>{formatCurrency(order.total_amount)}</strong> a la siguiente cuenta:</p>
                  <div className="p-3 bg-surface rounded-xl border border-amber-200 space-y-2 font-mono text-xs">
                    {raffle.bank_alias && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200/80">
                        <div className="min-w-0">
                          <span className="font-sans font-semibold text-slate-500 block text-[11px]">Alias para transferir:</span>
                          <span className="text-brand-link font-bold text-sm block truncate">{raffle.bank_alias}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyBankField(raffle.bank_alias, 'alias')}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold font-sans transition border shadow-sm ${
                            copiedAlias
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-surface hover:bg-slate-50 text-slate-800 border-slate-300'
                          }`}
                        >
                          {copiedAlias ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                        </button>
                      </div>
                    )}
                    {raffle.bank_cbu && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200/80">
                        <div className="min-w-0">
                          <span className="font-sans font-semibold text-slate-500 block text-[11px]">CBU / CVU:</span>
                          <span className="text-slate-800 font-medium text-xs block truncate">{raffle.bank_cbu}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyBankField(raffle.bank_cbu, 'cbu')}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold font-sans transition border shadow-sm ${
                            copiedCbu
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-surface hover:bg-slate-50 text-slate-800 border-slate-300'
                          }`}
                        >
                          {copiedCbu ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                        </button>
                      </div>
                    )}
                    <div className="font-sans text-[11px] text-slate-600 pt-0.5 space-y-0.5">
                      {raffle.bank_name && <p><strong>Banco / Billetera:</strong> {raffle.bank_name}</p>}
                      {raffle.bank_holder && <p><strong>Titular:</strong> {raffle.bank_holder}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-amber-900 pt-1">
                    Una vez realizada la transferencia, envianos el comprobante por WhatsApp a cualquiera de los dos contactos para validar tu pago:
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 text-slate-700">
                  <p>
                    Elegiste abonar en <strong>Efectivo</strong>. Por favor comunicate con cualquiera de los administradores para coordinar la entrega de los <strong>{formatCurrency(order.total_amount)}</strong>:
                  </p>
                  <p className="text-xs text-amber-900">
                    Una vez que entregues el efectivo, los administradores marcarán tu reserva como <strong>PAGADA</strong> y este comprobante se actualizará automáticamente.
                  </p>
                </div>
              )}

              {/* Botones WhatsApp para Alan y Yilda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={whatsappUrlAlan}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow"
                >
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {order.payment_method === 'transfer'
                      ? `Enviar comprobante a Alan (${phoneAlan})`
                      : `Coordinar efectivo con Alan (${phoneAlan})`}
                  </span>
                </a>

                <a
                  href={whatsappUrlYilda}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow"
                >
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {order.payment_method === 'transfer'
                      ? `Enviar comprobante a Yilda (${phoneYilda})`
                      : `Coordinar efectivo con Yilda (${phoneYilda})`}
                  </span>
                </a>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Vencimiento de la reserva: {formatDate(order.expires_at)}
              </p>
            </div>
          )}

          {/* Información del Sorteo y Contactos Oficiales */}
          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
            <p><strong>Fecha del sorteo:</strong> {raffle.draw_date}</p>
            <p><strong>Premios:</strong> {raffle.prizes}</p>
            <p>
              <strong>Contacto Organización:</strong>{' '}
              <a
                href={`https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent(`¡Hola Alan! Te escribo por mi reserva *${order.code}* de la Gran Rifa Familiar.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-link font-semibold hover:underline"
              >
                Alan ({phoneAlan})
              </a>
              {' • '}
              <a
                href={`https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent(`¡Hola Yilda! Te escribo por mi reserva *${order.code}* de la Gran Rifa Familiar.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-link font-semibold hover:underline"
              >
                Yilda ({phoneYilda})
              </a>
            </p>
          </div>

          {/* Botones Compartir / Enviar a Comprador / Copiar Enlace */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 print:hidden">
            <a
              href={buyerWaVoucherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Enviar comprobante al WhatsApp de {order.buyer_name}
            </a>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={copyUrl}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl text-xs transition"
              >
                <Copy className="w-4 h-4" />
                {copied ? '¡Enlace copiado!' : 'Copiar enlace privado'}
              </button>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-xl text-xs transition"
              >
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Guardá este enlace. Te permitirá volver a consultar esta constancia en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
