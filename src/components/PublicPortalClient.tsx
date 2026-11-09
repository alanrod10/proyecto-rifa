'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket, Phone } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import PortalHero from '@/components/portal/PortalHero';
import NumberGrid from '@/components/portal/NumberGrid';
import SelectionCart from '@/components/portal/SelectionCart';
import ReservationForm from '@/components/portal/ReservationForm';
import PaymentInstructions, { OrderSuccessData } from '@/components/portal/PaymentInstructions';
import { useNumbers } from '@/hooks/useNumbers';
import { RaffleSettings, RaffleStats } from '@/lib/types';
import {
  DEFAULT_CONTACT_PHONE,
  DEFAULT_CONTACT_PHONE_SECONDARY,
  DEFAULT_TICKET_PRICE,
  DEFAULT_MAX_NUMBERS_PER_ORDER,
} from '@/lib/constants';
import { formatTicketNumber, formatWhatsAppPhone } from '@/lib/utils';

export type { RaffleSettings, RaffleStats };

interface PublicPortalClientProps {
  initialSettings?: RaffleSettings | null;
  initialStats?: RaffleStats | null;
}

function createClientRequestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PublicPortalClient({
  initialSettings,
  initialStats,
}: PublicPortalClientProps) {
  const [settings, setSettings] = useState<RaffleSettings | null>(initialSettings || null);
  const [stats, setStats] = useState<RaffleStats | null>(initialStats || null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictNumbers, setConflictNumbers] = useState<number[]>([]);
  const [clientRequestId, setClientRequestId] = useState<string>(createClientRequestId);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessData | null>(null);

  const regenerateRequestId = () => setClientRequestId(createClientRequestId());

  const maxNumbersPerOrder = settings?.max_numbers_per_order || DEFAULT_MAX_NUMBERS_PER_ORDER;

  const {
    selectedNumbers,
    setSelectedNumbers,
    page,
    gridFilter,
    availableNumbers,
    totalPages,
    loadingNumbers,
    availableCursor,
    hasMoreAvailable,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    jumpNumberInput,
    setJumpNumberInput,
    highlightedNumber,
    handleFilterChange,
    handleNextPage,
    handlePrevPage,
    handleJumpToNumber,
    handleSearch,
    clearSearch,
    toggleSelectNumber,
    handleRandomSelect,
  } = useNumbers({
    maxNumbersPerOrder,
    onSelectionChange: regenerateRequestId,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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
          client_request_id: clientRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.conflictNumbers) {
          setConflictNumbers(data.conflictNumbers);
          setErrorMessage(
            `Los números [${data.conflictNumbers.map(formatTicketNumber).join(', ')}] acaban de ser reservados por otra persona.`
          );
        } else {
          setErrorMessage(data.error || 'Ocurrió un error al procesar la reserva.');
        }
        return;
      }

      setOrderSuccess({
        ...data.order,
        payment_method: data.order.payment_method || paymentMethod,
        buyer_name: buyerName.trim(),
      });
      setSelectedNumbers([]);
      regenerateRequestId();
      setIsModalOpen(false);
      fetchSettings();
    } catch (err) {
      console.error('Error al enviar reserva:', err);
      setErrorMessage('Error de conexión. Verificá tu red e intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeConflictNumbers = () => {
    setSelectedNumbers((prev) => prev.filter((n) => !conflictNumbers.includes(n)));
    setConflictNumbers([]);
    setErrorMessage(null);
    regenerateRequestId();
  };

  const unitPrice = settings?.ticket_price || DEFAULT_TICKET_PRICE;
  const phoneAlan = settings?.contact_phone || DEFAULT_CONTACT_PHONE;
  const phoneYilda = settings?.contact_phone_secondary || DEFAULT_CONTACT_PHONE_SECONDARY;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="theme-night bg-gradient-to-r from-night-950 to-night-900 border-b border-white/10 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-400/30 shrink-0">
              <Ticket className="w-6 h-6 text-brand-300" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight truncate">
                Gran Rifa Familiar
              </h1>
              <p className="text-xs sm:text-xs text-slate-300 truncate">
                100.000 números disponibles
              </p>
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

      <PortalHero settings={settings} stats={stats} unitPrice={unitPrice} />

      {orderSuccess && (
        <PaymentInstructions
          orderSuccess={orderSuccess}
          settings={settings}
          onClose={() => setOrderSuccess(null)}
        />
      )}

      <NumberGrid
        selectedNumbers={selectedNumbers}
        page={page}
        totalPages={totalPages}
        gridFilter={gridFilter}
        availableNumbers={availableNumbers}
        loadingNumbers={loadingNumbers}
        availableCursor={availableCursor}
        hasMoreAvailable={hasMoreAvailable}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={searchResults}
        isSearching={isSearching}
        jumpNumberInput={jumpNumberInput}
        setJumpNumberInput={setJumpNumberInput}
        highlightedNumber={highlightedNumber}
        onFilterChange={handleFilterChange}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        onJumpToNumber={handleJumpToNumber}
        onSearch={handleSearch}
        onClearSearch={clearSearch}
        onToggleSelectNumber={toggleSelectNumber}
        onRandomSelect={handleRandomSelect}
      />

      <SelectionCart
        selectedNumbers={selectedNumbers}
        unitPrice={unitPrice}
        onRemoveNumber={(num) => {
          regenerateRequestId();
          setSelectedNumbers((prev) => prev.filter((x) => x !== num));
        }}
        onClearAll={() => {
          regenerateRequestId();
          setSelectedNumbers([]);
        }}
        onOpenModal={() => setIsModalOpen(true)}
      />

      <ReservationForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedNumbers={selectedNumbers}
        unitPrice={unitPrice}
        settings={settings}
        buyerName={buyerName}
        setBuyerName={setBuyerName}
        buyerPhone={buyerPhone}
        setBuyerPhone={setBuyerPhone}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        submitting={submitting}
        errorMessage={errorMessage}
        conflictNumbers={conflictNumbers}
        onRemoveConflictNumbers={removeConflictNumbers}
        onSubmit={handleSubmitReservation}
      />

      <footer className="theme-night bg-night-900 text-slate-400 py-8 px-4 text-xs mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-night-800 pb-6 mb-6">
          <div className="text-center sm:text-left">
            <h4 className="text-white font-bold text-sm">
              {settings?.raffle_name || 'Gran Rifa Familiar pro Terreno'}
            </h4>
            <p className="text-slate-400 mt-1 max-w-md">
              Rifa solidaria familiar para la adquisición del lote.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            <a
              href={`https://wa.me/${formatWhatsAppPhone(phoneAlan)}?text=${encodeURIComponent(
                '¡Hola Alan! Quisiera hacerte una consulta sobre la Gran Rifa Familiar.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-medium transition"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Alan ({phoneAlan})</span>
            </a>
            <a
              href={`https://wa.me/${formatWhatsAppPhone(phoneYilda)}?text=${encodeURIComponent(
                '¡Hola Yilda! Quisiera hacerte una consulta sobre la Gran Rifa Familiar.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-medium transition"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Yilda ({phoneYilda})</span>
            </a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-2">
          <p>© {new Date().getFullYear()} Gran Rifa Familiar. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-4">
            <Link href="/consultar" className="hover:text-white transition">
              Consultar Pedido
            </Link>
            <Link href="/admin/login" className="hover:text-white transition">
              Acceso Administradores
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
