'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { Search, ArrowLeft, Ticket, ShieldCheck, HelpCircle } from 'lucide-react';

export default function ConsultarPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = tokenInput.trim();
    if (!val) {
      setError('Por favor ingresá tu código de pedido o enlace privado.');
      return;
    }

    // Si el usuario pegó la URL completa, extraer el identificador
    let cleanToken = val;
    if (val.includes('/pedido/')) {
      const parts = val.split('/pedido/');
      cleanToken = parts[1].split('?')[0].split('#')[0].trim();
    }
    cleanToken = cleanToken.replace(/^\/+|\/+$/g, '').trim();

    if (cleanToken.length < 3) {
      setError('El código o enlace ingresado es demasiado corto.');
      return;
    }

    router.push(`/pedido/${encodeURIComponent(cleanToken)}`);
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between p-4">
      <header className="max-w-lg w-full mx-auto pt-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-link transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la portada
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="animate-slide-up bg-surface rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="p-3 bg-brand-100 text-brand-link rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
              <Ticket className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Consultar Mi Reserva</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Ingresá tu código de pedido (ej: RF-7B2K9A) o el enlace privado que recibiste al completar tu solicitud.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código de Pedido o Enlace Privado
              </label>
              <input
                type="text"
                required
                placeholder="Ej: RF-7B2K9A o tu enlace privado completo..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Abrir Mi Comprobante
            </button>
          </form>

          {/* Información de Recuperación Segura */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-brand-link" />
              <span>¿Extraviaste tu enlace?</span>
            </div>
            <p className="leading-relaxed">
              Por razones de privacidad y protección de datos, los pedidos no pueden buscarse públicamente por número de teléfono.
            </p>
            <p className="leading-relaxed">
              Contactá a cualquiera de los administradores indicando tu nombre completo para que verifiquen tu identidad y te reenvíen tu enlace privado de forma segura:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/5493884152040?text=${encodeURIComponent('Hola Alan! Extravié el enlace de mi reserva de la rifa. Mi nombre completo es: ')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm"
              >
                <span>WhatsApp Alan (3884152040)</span>
              </a>
              <a
                href={`https://wa.me/5493884141514?text=${encodeURIComponent('Hola Yilda! Extravié el enlace de mi reserva de la rifa. Mi nombre completo es: ')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm"
              >
                <span>WhatsApp Yilda (3884141514)</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Gran Rifa Familiar • Plataforma Oficial Segura
      </footer>
    </div>
  );
}
