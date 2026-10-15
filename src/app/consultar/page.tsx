'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
      setError('Por favor ingresá tu token o enlace privado.');
      return;
    }

    // Si el usuario pegó la URL completa, extraer el token
    let cleanToken = val;
    if (val.includes('/pedido/')) {
      const parts = val.split('/pedido/');
      cleanToken = parts[1].split('?')[0].split('#')[0].trim();
    }

    if (cleanToken.length < 16) {
      setError('El token ingresado no tiene un formato válido.');
      return;
    }

    router.push(`/pedido/${cleanToken}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4">
      <header className="max-w-lg w-full mx-auto pt-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la portada
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
              <Ticket className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Consultar Mi Reserva</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Ingresá el enlace privado o el código de acceso que recibiste al completar tu solicitud.
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
                Token o Enlace Privado
              </label>
              <input
                type="text"
                required
                placeholder="Pegá tu enlace o token aquí..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Abrir Mi Comprobante
            </button>
          </form>

          {/* Información de Recuperación Segura */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>¿Extraviaste tu enlace?</span>
            </div>
            <p className="leading-relaxed">
              Por razones de privacidad y protección de datos, los pedidos no pueden buscarse públicamente por número de teléfono.
            </p>
            <p className="leading-relaxed">
              Contactá a los administradores indicando tu nombre completo para que verifiquen tu identidad y te reenvíen tu enlace privado de forma segura.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Gran Rifa Familiar • Plataforma Oficial Segura
      </footer>
    </div>
  );
}
