'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  Ticket, Search, Shuffle, ShoppingCart, CheckCircle, Clock, AlertTriangle, 
  Copy, Phone, ArrowRight, ShieldCheck, HelpCircle, X, ChevronLeft, ChevronRight,
  Landmark, Banknote, Sparkles, Target, Check
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { formatTicketNumber, formatCurrency, formatWhatsAppPhone } from '@/lib/utils';

interface RaffleSettings {
  raffle_badge?: string;
  raffle_name: string;
  raffle_description: string;
  ticket_price: number;
  prizes: string;
  draw_date: string;
  bank_alias: string;
  bank_cbu: string;
  bank_name: string;
  bank_holder: string;
  contact_phone: string;
  contact_phone_secondary: string;
  reserve_hours: number;
  public_reservations_enabled: boolean;
  rules_terms: string;
}

interface RaffleStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

interface NumberItem {
  number: number;
  status: string;
}

export default function PublicPortal() {
  const [settings, setSettings] = useState<RaffleSettings | null>(null);
  const [stats, setStats] = useState<RaffleStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Selector y Carrito
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [gridFilter, setGridFilter] = useState<'all' | 'available'>('all');
  const [availableNumbers, setAvailableNumbers] = useState<NumberItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<NumberItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modal de Reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictNumbers, setConflictNumbers] = useState<number[]>([]);

  // Éxito de reserva
  const [orderSuccess, setOrderSuccess] = useState<{
    code: string;
    private_token: string;
    numbers_count: number;
    numbers: number[];
    total_amount: number;
    payment_method: 'transfer' | 'cash';
    buyer_name: string;
    expires_at: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Salto directo a cualquier número
  const [jumpNumberInput, setJumpNumberInput] = useState('');
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);

  // Copia de alias / CBU en modal de reserva
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);

  const copyBankData = (text: string, type: 'alias' | 'cbu') => {
    navigator.clipboard.writeText(text);
    if (type === 'alias') {
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    } else {
      setCopiedCbu(true);
      setTimeout(() => setCopiedCbu(false), 2000);
    }
  };

  const handleJumpToNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpNumberInput.trim(), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100000) {
      alert('Por favor ingresá un número válido entre 1 y 100.000.');
      return;
    }

    if (gridFilter !== 'all') {
      setGridFilter('all');
    }

    const targetPage = Math.floor((parsed - 1) / 60) + 1;
    setPage(targetPage);
    setHighlightedNumber(parsed);

    setTimeout(() => {
      setHighlightedNumber(null);
    }, 4000);
  };

  // Cargar configuraciones y estadísticas iniciales
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar números por página y filtro
  useEffect(() => {
    loadPageNumbers(page, gridFilter);
  }, [page, gridFilter]);

  const loadPageNumbers = async (pageNum: number, filterMode: 'all' | 'available' = gridFilter) => {
    try {
      setLoadingNumbers(true);
      const res = await fetch(`/api/numbers?page=${pageNum}&limit=60&filter=${filterMode}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableNumbers(data.numbers || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Error cargando números:', err);
    } finally {
      setLoadingNumbers(false);
    }
  };

  // Buscar números específicos
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch(`/api/numbers?search=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.numbers || []);
      }
    } catch (err) {
      console.error('Error buscando números:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  // Agregar número al carrito
  const toggleSelectNumber = (num: number, status: string) => {
    if (status !== 'available' && !selectedNumbers.includes(num)) {
      return;
    }
    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        if (prev.length >= 500) {
          alert('Podés seleccionar hasta un máximo de 500 números por solicitud.');
          return prev;
        }
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Elegir números al azar
  const handleRandomSelect = async (count: number) => {
    try {
      setLoadingNumbers(true);
      const res = await fetch(`/api/numbers?random=${count}`);
      if (res.ok) {
        const data = await res.json();
        const randNums = (data.numbers || []).map((n: NumberItem) => n.number);
        setSelectedNumbers(prev => {
          const combined = Array.from(new Set([...prev, ...randNums])).sort((a, b) => a - b);
          return combined.slice(0, 500);
        });
      }
    } catch (err) {
      console.error('Error seleccionando al azar:', err);
    } finally {
      setLoadingNumbers(false);
    }
  };

  // Enviar formulario de reserva
  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConflictNumbers([]);

    if (selectedNumbers.length === 0) {
      setErrorMessage('Debes seleccionar al menos un número.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          payment_method: paymentMethod,
          numbers: selectedNumbers,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.conflictNumbers) {
          setConflictNumbers(data.conflictNumbers);
          setErrorMessage(`Los números [${data.conflictNumbers.map(formatTicketNumber).join(', ')}] acaban de ser reservados por otra persona.`);
        } else {
          setErrorMessage(data.error || 'Ocurrió un error al procesar la reserva.');
        }
        return;
      }

      // Éxito
      setOrderSuccess({
        ...data.order,
        payment_method: data.order.payment_method || paymentMethod,
        buyer_name: buyerName.trim(),
      });
      setSelectedNumbers([]);
      setIsModalOpen(false);
      fetchSettings(); // Actualizar estadísticas
    } catch (err) {
      console.error('Error al enviar reserva:', err);
      setErrorMessage('Error de conexión. Verificá tu red e intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeConflictNumbers = () => {
    setSelectedNumbers(prev => prev.filter(n => !conflictNumbers.includes(n)));
    setConflictNumbers([]);
    setErrorMessage(null);
  };

  const copyPrivateUrl = () => {
    if (!orderSuccess) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/pedido/${orderSuccess.private_token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const unitPrice = settings?.ticket_price || 100;
  const totalCartAmount = selectedNumbers.length * unitPrice;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra Superior */}
      <header className="theme-night bg-gradient-to-r from-night-950 to-night-900 border-b border-white/10 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-400/30 shrink-0">
              <Ticket className="w-6 h-6 text-brand-300" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight truncate">Gran Rifa Familiar</h1>
              <p className="text-xs sm:text-xs text-slate-300 truncate">100.000 números disponibles</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link 
              href="/consultar"
              className="text-xs sm:text-sm bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-xl border border-white/15 font-medium transition"
            >
              Ya tengo una reserva
            </Link>
            <Link
              href="/admin/login"
              className="hidden sm:inline text-xs text-slate-300 hover:text-white px-2 py-1 transition"
            >
              Admin
            </Link>
            <ThemeToggle variant="night" />
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <section className="theme-night relative overflow-hidden bg-gradient-to-b from-night-900 to-night-950 text-white py-10 sm:py-14 px-4 pb-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(29,78,216,0.35),transparent)]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-4 stagger">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-slate-200 text-xs sm:text-sm px-3 py-1 rounded-full border border-white/15">
            <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
            {settings?.raffle_badge || 'Objetivo solidario: Pro Terreno Familiar'}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {settings?.raffle_name || 'Gran Rifa Familiar pro Terreno'}
          </h2>
          <div aria-hidden="true" className="mx-auto h-1 w-12 rounded-full bg-amber-500" />
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {settings?.raffle_description || 'Rifa solidaria familiar de 100.000 números para pagar las cuotas de nuestro lote.'}
          </p>

          {/* Barra de Progreso Solidaria hacia la Meta */}
          {stats && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 max-w-2xl mx-auto space-y-2.5 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400 shrink-0" />
                  Avance hacia la meta de {(stats.total || 100000).toLocaleString('es-AR')} números
                </span>
                <span className="font-extrabold text-amber-300 font-mono sm:text-right">
                  {Math.min(100, (((stats.sold + stats.reserved) / (stats.total || 100000)) * 100)).toFixed(1)}% completado
                </span>
              </div>

              {/* Pista de progreso */}
              <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/20 flex">
                <div
                  style={{ width: `${Math.min(100, ((stats.sold / (stats.total || 100000)) * 100))}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-l-full transition-all duration-700 ease-out"
                  title={`Vendidos: ${stats.sold.toLocaleString('es-AR')}`}
                />
                <div
                  style={{ width: `${Math.min(100, ((stats.reserved / (stats.total || 100000)) * 100))}%` }}
                  className="bg-gradient-to-r from-amber-400 to-amber-300 h-full transition-all duration-700 ease-out"
                  title={`En reserva: ${stats.reserved.toLocaleString('es-AR')}`}
                />
              </div>

              {/* Leyenda explicativa */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-300 font-medium flex-wrap gap-2 pt-0.5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    <strong>{stats.sold.toLocaleString('es-AR')}</strong> vendidos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <strong>{stats.reserved.toLocaleString('es-AR')}</strong> en reserva
                  </span>
                </div>
                <span className="text-slate-400">
                  Faltan <strong>{Math.max(0, (stats.total || 100000) - (stats.sold + stats.reserved)).toLocaleString('es-AR')}</strong> números
                </span>
              </div>
            </div>
          )}

          {/* Tarjetas de Métricas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-3xl mx-auto stagger">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 lift hover:border-white/25 hover:bg-white/10">
              <span className="block text-xs text-slate-300 font-medium">Valor por número</span>
              <span className="text-xl sm:text-2xl font-bold text-amber-300">
                {formatCurrency(unitPrice)}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 lift hover:border-white/25 hover:bg-white/10">
              <span className="block text-xs text-slate-300 font-medium">Total de números</span>
              <span className="text-xl sm:text-2xl font-bold text-white">
                {(stats?.total || 100000).toLocaleString('es-AR')}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 lift hover:border-white/25 hover:bg-white/10">
              <span className="block text-xs text-slate-300 font-medium">Disponibles</span>
              <span className="text-xl sm:text-2xl font-bold text-blue-200">
                {stats?.available?.toLocaleString('es-AR') ?? '...'}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 lift hover:border-white/25 hover:bg-white/10">
              <span className="block text-xs text-slate-300 font-medium">Vendidos</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-100">
                {stats?.sold?.toLocaleString('es-AR') ?? '...'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Información del Sorteo (Premios y Fechas) */}
      <section className="max-w-5xl mx-auto px-4 -mt-4 relative z-10 w-full animate-slide-up">
        <div className="bg-surface rounded-2xl shadow-xl border border-slate-200/80 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Premios del Sorteo</h3>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                {settings?.prizes || 'Premios a confirmar'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Fecha y Horario</h3>
              <p className="text-sm text-slate-600 mt-1">
                {settings?.draw_date || 'Fecha del sorteo a confirmar'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Plazo para abonar reservas: <strong>{settings?.reserve_hours || 48} horas</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mensaje de Reserva Exitosa (Si se completó una) */}
      {orderSuccess && (
        <section className="max-w-3xl mx-auto px-4 my-6 w-full animate-fade-in">
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 text-slate-900 shadow-lg">
            <div className="flex items-center space-x-3 text-emerald-700">
              <CheckCircle className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-extrabold">
                  {orderSuccess.payment_method === 'cash'
                    ? '¡Reserva Registrada para Pago en Efectivo!'
                    : '¡Solicitud de Reserva Registrada!'}
                </h3>
                <p className="text-sm text-emerald-800">
                  Referencia de pedido: <strong>{orderSuccess.code}</strong> • Medio:{' '}
                  <strong>{orderSuccess.payment_method === 'cash' ? 'Efectivo' : 'Transferencia Bancaria'}</strong>
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-surface rounded-xl border border-emerald-200 space-y-2 text-sm">
              <p>
                <strong>Números reservados ({orderSuccess.numbers_count}):</strong>{' '}
                <span className="font-mono text-emerald-700 font-semibold">
                  {orderSuccess.numbers.map(formatTicketNumber).join(', ')}
                </span>
              </p>
              <p>
                <strong>Total a abonar:</strong>{' '}
                <span className="font-bold text-slate-900 text-base">{formatCurrency(orderSuccess.total_amount)}</span>
              </p>
              {orderSuccess.payment_method === 'cash' ? (
                <p className="text-xs text-slate-600">
                  Tus números están reservados de forma segura. Tenés <strong>{settings?.reserve_hours || 48} horas</strong> para coordinar y entregar el pago en efectivo a los administradores.
                </p>
              ) : (
                <p className="text-xs text-slate-600">
                  Tus números están reservados de forma segura. Tenés <strong>{settings?.reserve_hours || 48} horas</strong> para realizar la transferencia y enviar el comprobante de pago.
                </p>
              )}
            </div>

            {/* Enlace Privado Único */}
            <div className="mt-4 p-3 bg-emerald-100/70 rounded-xl border border-emerald-300">
              <span className="block text-xs font-semibold text-emerald-900 mb-1">Tu Enlace Privado de Consulta:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pedido/${orderSuccess.private_token}`} 
                  className="w-full text-xs bg-surface px-3 py-2 rounded border border-emerald-300 text-slate-700 select-all font-mono"
                />
                <button
                  onClick={copyPrivateUrl}
                  className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 rounded transition whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-emerald-800 mt-1.5">
                Guardá este enlace en tus favoritos o WhatsApp. Te permitirá consultar el estado de tu pago cuando lo confirmemos.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {(() => {
                const phoneAlan = settings?.contact_phone || '3884152040';
                const phoneYilda = settings?.contact_phone_secondary || '3884141514';
                const msg =
                  orderSuccess.payment_method === 'cash'
                    ? `Hola! Soy ${orderSuccess.buyer_name}. Tengo la reserva ${orderSuccess.code} de la rifa por ${orderSuccess.numbers_count} número(s) (${orderSuccess.numbers.map(formatTicketNumber).join(', ')}) por un total de ${formatCurrency(orderSuccess.total_amount)} para abonar en efectivo. Quiero coordinar la entrega del dinero.`
                    : `Hola! Soy ${orderSuccess.buyer_name}. Tengo la reserva ${orderSuccess.code} de la rifa por ${orderSuccess.numbers_count} número(s) (${orderSuccess.numbers.map(formatTicketNumber).join(', ')}) por un total de ${formatCurrency(orderSuccess.total_amount)}. Te envío el comprobante de pago.`;

                return (
                  <>
                    <a
                      href={`https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
                    >
                      <Phone className="w-4 h-4" />
                      {orderSuccess.payment_method === 'cash'
                        ? `Coordinar efectivo con Alan (${phoneAlan})`
                        : `Enviar comprobante a Alan (${phoneAlan})`}
                    </a>

                    <a
                      href={`https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
                    >
                      <Phone className="w-4 h-4" />
                      {orderSuccess.payment_method === 'cash'
                        ? `Coordinar efectivo con Yilda (${phoneYilda})`
                        : `Enviar comprobante a Yilda (${phoneYilda})`}
                    </a>
                  </>
                );
              })()}
              <Link
                href={`/pedido/${orderSuccess.private_token}`}
                className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow"
              >
                Ver Mi Comprobante Digital
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setOrderSuccess(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2"
              >
                Cerrar este mensaje
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ÁREA DE SELECCIÓN DE NÚMEROS */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Elegí tus Números</h3>
            <p className="text-sm text-slate-500">
              Podés buscar números de tu preferencia, elegir al azar o explorar los disponibles.
            </p>
          </div>

          {/* Botones de Azar Rápido */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Shuffle className="w-3.5 h-3.5" /> Al azar:
            </span>
            <button
              onClick={() => handleRandomSelect(1)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:text-brand-300 font-bold px-2.5 py-1.5 rounded-lg border border-brand-200 transition"
            >
              +1
            </button>
            <button
              onClick={() => handleRandomSelect(3)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:text-brand-300 font-bold px-2.5 py-1.5 rounded-lg border border-brand-200 transition"
            >
              +3
            </button>
            <button
              onClick={() => handleRandomSelect(5)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:text-brand-300 font-bold px-2.5 py-1.5 rounded-lg border border-brand-200 transition"
            >
              +5
            </button>
            <button
              onClick={() => handleRandomSelect(10)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 dark:text-brand-300 font-bold px-2.5 py-1.5 rounded-lg border border-brand-200 transition"
            >
              +10
            </button>
          </div>
        </div>

        {/* Buscador de Números */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar un número específico (ej: 777, 12345 o varios: 10, 25, 999)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-surface border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Resultados de Búsqueda si se realizó una */}
        {searchResults !== null && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Resultados de búsqueda ({searchResults.length}):
              </span>
              <button
                onClick={clearSearch}
                className="text-xs text-amber-700 hover:underline"
              >
                Volver a la lista general
              </button>
            </div>

            {searchResults.length === 0 ? (
              <p className="text-xs text-amber-800">
                No se encontraron números que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {searchResults.map(item => {
                  const isSelected = selectedNumbers.includes(item.number);
                  const isAvailable = item.status === 'available';

                  return (
                    <button
                      key={item.number}
                      type="button"
                      disabled={!isAvailable && !isSelected}
                      onClick={() => toggleSelectNumber(item.number, item.status)}
                      className={`p-2 rounded-xl text-center font-mono font-bold text-xs sm:text-sm border transition flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-700 ring-2 ring-brand-300 shadow'
                          : isAvailable
                          ? 'bg-surface hover:bg-brand-50 text-slate-800 border-slate-300 hover:border-brand-500'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>{formatTicketNumber(item.number)}</span>
                      <span className="text-[11px] font-sans font-normal mt-0.5">
                        {isSelected ? '✓ Elegido' : isAvailable ? 'Disponible' : item.status === 'reserved' ? 'Reservado' : 'Vendido'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Grilla Paginada de Números */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Explorando números (Página {page} de {totalPages}):</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => { setGridFilter('all'); setPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    gridFilter === 'all' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Todos (ver estados)
                </button>
                <button
                  type="button"
                  onClick={() => { setGridFilter('available'); setPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    gridFilter === 'available' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Solo disponibles
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {/* Control de salto directo a cualquier número del 1 al 100.000 */}
              <form onSubmit={handleJumpToNumber} className="flex items-center gap-1.5 bg-surface border border-slate-300 rounded-xl px-2 py-1 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Ir al nro:</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  placeholder="1 - 100000"
                  value={jumpNumberInput}
                  onChange={(e) => setJumpNumberInput(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-xs border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-lg transition"
                >
                  Ir
                </button>
              </form>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loadingNumbers}
                  className="p-1 rounded bg-surface border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loadingNumbers}
                  className="p-1 rounded bg-surface border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loadingNumbers ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Cargando números...
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2">
              {availableNumbers.map(item => {
                const isSelected = selectedNumbers.includes(item.number);
                const isAvailable = item.status === 'available';
                const isHighlighted = highlightedNumber === item.number;

                return (
                  <button
                    key={item.number}
                    type="button"
                    disabled={!isAvailable && !isSelected}
                    onClick={() => toggleSelectNumber(item.number, item.status)}
                    title={isAvailable ? 'Disponible' : item.status === 'reserved' ? 'Reservado' : 'Vendido'}
                    className={`min-h-12 py-2 px-1 rounded-xl text-center font-mono font-bold text-xs sm:text-sm border transition flex flex-col items-center justify-center animate-cell ${
                      isHighlighted
                        ? 'ring-4 ring-amber-400 scale-105 shadow-xl animate-pulse z-10 bg-amber-50 text-amber-900 border-amber-300'
                        : isSelected
                        ? 'bg-brand-600 text-white border-brand-700 ring-2 ring-brand-300 shadow-md animate-pop'
                        : isAvailable
                        ? 'bg-surface hover:bg-brand-50 text-slate-800 border-slate-200 hover:border-brand-400'
                        : item.status === 'reserved'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed opacity-75'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60 line-through'
                    }`}
                  >
                    <span>{formatTicketNumber(item.number)}</span>
                    {isSelected && (
                      <span className="text-[10px] font-sans font-semibold leading-none mt-0.5">✓ Elegido</span>
                    )}
                    {!isAvailable && !isSelected && (
                      <span className="text-[10px] font-sans font-semibold no-underline">
                        {item.status === 'reserved' ? 'Reservado' : 'Vendido'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Paginación Inferior */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loadingNumbers}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-slate-300 text-slate-700 disabled:opacity-40 font-medium hover:bg-slate-50 transition"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loadingNumbers}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface border border-slate-300 text-slate-700 disabled:opacity-40 font-medium hover:bg-slate-50 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      </main>

      {/* BARRA FLOTANTE INFERIOR DEL CARRITO */}
      {selectedNumbers.length > 0 && (
        <aside className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3 sm:p-4 z-40 animate-slide-up space-y-2">
          {/* Bandeja de chips interactivos de números elegidos con descarte en 1 toque */}
          <div className="max-w-5xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap shrink-0 pr-1">
              Tus boletos:
            </span>
            {selectedNumbers.map(n => (
              <span
                key={n}
                className="inline-flex items-center gap-1 bg-brand-50 text-brand-link border border-brand-200 font-mono font-bold text-xs px-2 py-0.5 rounded-lg shrink-0 shadow-xs"
              >
                <span>{formatTicketNumber(n)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedNumbers(prev => prev.filter(x => x !== n))}
                  title={`Quitar boleto ${formatTicketNumber(n)}`}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-brand-200 text-brand-700 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-100 text-brand-link rounded-lg shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">
                    {selectedNumbers.length} {selectedNumbers.length === 1 ? 'número seleccionado' : 'números seleccionados'}
                  </span>
                  <span className="text-lg font-black text-slate-900 leading-tight">
                    Total: {formatCurrency(totalCartAmount)}
                  </span>
                </div>
              </div>

              {/* Botón Vaciar */}
              <button
                onClick={() => setSelectedNumbers([])}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 underline ml-2 font-medium"
              >
                Limpiar todo
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
              >
                Solicitar Reserva ({selectedNumbers.length})
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL DE RESERVA / CHECKOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-night-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Confirmar Solicitud de Reserva</h3>
            <p className="text-xs text-slate-500 mb-4">
              Completá tus datos para apartar tus números. Al confirmar recibirás tu enlace privado.
            </p>

            {/* Alerta de Error o Conflicto */}
            {errorMessage && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                {conflictNumbers.length > 0 && (
                  <button
                    type="button"
                    onClick={removeConflictNumbers}
                    className="self-end text-xs font-bold text-red-800 underline hover:text-red-950"
                  >
                    Quitar números en conflicto y continuar
                  </button>
                )}
              </div>
            )}

            {/* Resumen de números seleccionados */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 text-xs space-y-1.5 max-h-32 overflow-y-auto">
              <span className="font-semibold text-slate-700 block">
                Números a reservar ({selectedNumbers.length}):
              </span>
              <div className="flex flex-wrap gap-1 font-mono text-brand-link font-bold">
                {selectedNumbers.map(n => (
                  <span key={n} className="bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                    {formatTicketNumber(n)}
                  </span>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total a pagar:</span>
                <span className="text-brand-link">{formatCurrency(totalCartAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitReservation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Celular (sin 54, directo con característica local) *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono font-bold text-slate-600 select-none">
                    +54
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3884123456"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                  />
                </div>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Ingresá directamente tu número sin el 54 (ej: 3884123456).
                </span>
              </div>

              {/* Medio de pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Medio de Pago *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-medium transition ${
                    paymentMethod === 'transfer' ? 'border-brand-600 bg-brand-50 text-slate-900' : 'border-slate-200 bg-surface text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={() => setPaymentMethod('transfer')}
                      className="accent-brand-600"
                    />
                    <Landmark className="w-4 h-4 text-brand-link" />
                    <span>Transferencia</span>
                  </label>

                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-medium transition ${
                    paymentMethod === 'cash' ? 'border-brand-600 bg-brand-50 text-slate-900' : 'border-slate-200 bg-surface text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="accent-brand-600"
                    />
                    <Banknote className="w-4 h-4 text-brand-link" />
                    <span>Efectivo</span>
                  </label>
                </div>
              </div>

              {/* Datos Bancarios Informativos con Copia en 1 Clic */}
              {paymentMethod === 'transfer' && settings?.bank_alias && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                  <p className="font-semibold text-slate-900">Datos para la transferencia:</p>

                  <div className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Alias</span>
                      <span className="font-mono text-brand-link font-bold text-xs truncate block">{settings.bank_alias}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankData(settings.bank_alias, 'alias')}
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold transition border ${
                        copiedAlias
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {copiedAlias ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                    </button>
                  </div>

                  {settings.bank_cbu && (
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">CBU / CVU</span>
                        <span className="font-mono text-slate-800 font-medium text-xs truncate block">{settings.bank_cbu}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyBankData(settings.bank_cbu, 'cbu')}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-semibold transition border ${
                          copiedCbu
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {copiedCbu ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                        <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-0.5 space-y-0.5">
                    {settings.bank_name && <p><strong>Banco:</strong> {settings.bank_name}</p>}
                    {settings.bank_holder && <p><strong>Titular:</strong> {settings.bank_holder}</p>}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow disabled:opacity-50"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer className="theme-night bg-night-900 text-slate-400 py-8 px-4 text-xs mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-night-800 pb-6 mb-6">
          <div className="text-center sm:text-left">
            <h4 className="text-white font-bold text-sm">{settings?.raffle_name || 'Gran Rifa Familiar pro Terreno'}</h4>
            <p className="text-slate-400 mt-1 max-w-md">
              Rifa solidaria familiar para la adquisición del lote.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            {(() => {
              const phoneAlan = settings?.contact_phone || '3884152040';
              const phoneYilda = settings?.contact_phone_secondary || '3884141514';
              return (
                <>
                  <a
                    href={`https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent('Hola Alan! Quisiera hacer una consulta sobre la rifa.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-medium transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Alan ({phoneAlan})</span>
                  </a>
                  <a
                    href={`https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent('Hola Yilda! Quisiera hacer una consulta sobre la rifa.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-medium transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Yilda ({phoneYilda})</span>
                  </a>
                </>
              );
            })()}
          </div>
        </div>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} Gran Rifa Familiar. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-4">
            <Link href="/consultar" className="hover:text-white transition">Consultar Pedido</Link>
            <Link href="/admin/login" className="hover:text-white transition">Acceso Administradores</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
