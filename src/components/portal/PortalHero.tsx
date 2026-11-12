'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Download, Eye, Sparkles, Target, Trophy } from 'lucide-react';
import { RaffleSettings, RaffleStats } from '@/lib/types';
import { TOTAL_NUMBERS, DEFAULT_RESERVE_HOURS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import FlyerModal from '@/components/portal/FlyerModal';

interface PortalHeroProps {
  settings: RaffleSettings | null;
  stats: RaffleStats | null;
  unitPrice: number;
}

export default function PortalHero({ settings, stats, unitPrice }: PortalHeroProps) {
  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false);

  const raffleTitle = settings?.raffle_name || 'Gran Rifa de Fin de Año';

  return (
    <>
      <section className="theme-night relative overflow-hidden bg-gradient-to-b from-night-900 to-night-950 text-white py-10 sm:py-14 px-4 pb-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(29,78,216,0.35),transparent)]"
        />
        <div className="relative max-w-4xl mx-auto text-center space-y-4 stagger">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-slate-200 text-xs sm:text-sm px-3 py-1 rounded-full border border-white/15">
            <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
            {settings?.raffle_badge || 'Objetivo solidario: Pro Terreno Familiar'}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {raffleTitle}
          </h2>
          <div aria-hidden="true" className="mx-auto h-1 w-12 rounded-full bg-amber-500" />
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {settings?.raffle_description ||
              'Rifa solidaria familiar de 100.000 números para pagar las cuotas de nuestro lote.'}
          </p>

          {stats && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 max-w-2xl mx-auto space-y-2.5 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400 shrink-0" />
                  Avance hacia la meta de {(stats.total || TOTAL_NUMBERS).toLocaleString('es-AR')}{' '}
                  números
                </span>
                <span className="font-extrabold text-amber-300 font-mono sm:text-right">
                  {Math.min(
                    100,
                    ((stats.sold + stats.reserved) / (stats.total || TOTAL_NUMBERS)) * 100
                  ).toFixed(1)}
                  % completado
                </span>
              </div>

              <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/20 flex">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.sold / (stats.total || TOTAL_NUMBERS)) * 100
                    )}%`,
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-l-full transition-all duration-700 ease-out"
                  title={`Vendidos: ${stats.sold.toLocaleString('es-AR')}`}
                />
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (stats.reserved / (stats.total || TOTAL_NUMBERS)) * 100
                    )}%`,
                  }}
                  className="bg-gradient-to-r from-amber-400 to-amber-300 h-full transition-all duration-700 ease-out"
                  title={`En reserva: ${stats.reserved.toLocaleString('es-AR')}`}
                />
              </div>

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
                  Faltan{' '}
                  <strong>
                    {Math.max(
                      0,
                      (stats.total || TOTAL_NUMBERS) - (stats.sold + stats.reserved)
                    ).toLocaleString('es-AR')}
                  </strong>{' '}
                  números
                </span>
              </div>
            </div>
          )}

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
                {(stats?.total || TOTAL_NUMBERS).toLocaleString('es-AR')}
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

      <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-10 w-full animate-slide-up">
        <div className="bg-surface rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Tarjeta del Flyer Oficial */}
          <div className="md:col-span-5 flex flex-col items-center sm:items-stretch">
            <div className="relative group w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-night-950">
              <picture className="block w-full">
                <source srcSet="/flyer-gran-rifa.webp" type="image/webp" />
                <img
                  src="/flyer-gran-rifa.png"
                  alt={`Flyer Oficial — ${raffleTitle}`}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </picture>

              <div className="absolute top-2.5 left-2.5 bg-brand-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow">
                🌟 Flyer Oficial
              </div>

              {/* Botón flotante para ver en grande */}
              <button
                type="button"
                onClick={() => setIsFlyerModalOpen(true)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-3 gap-2 backdrop-blur-[2px]"
                aria-label="Abrir vista completa del flyer"
              >
                <span className="p-2.5 rounded-full bg-brand-600 text-white shadow-lg">
                  <Eye className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold drop-shadow">Toca para ampliar el flyer</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 w-full max-w-[320px] mx-auto">
              <button
                type="button"
                onClick={() => setIsFlyerModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl transition"
              >
                <Eye className="w-3.5 h-3.5 text-brand-600" />
                <span>Ver Flyer</span>
              </button>

              <a
                href="/flyer-gran-rifa.png"
                download="Gran-Rifa-de-Fin-de-Ano.png"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white font-bold px-3 py-2 rounded-xl transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </a>
            </div>
          </div>

          {/* Información del Sorteo y Premios */}
          <div className="md:col-span-7 space-y-4">
            {/* Fecha del sorteo */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Fecha y Modalidad del Sorteo
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight mt-0.5">
                  {settings?.draw_date || '31/12 — Víspera de Fin de Año'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Plazo de pago: <strong>{settings?.reserve_hours || DEFAULT_RESERVE_HOURS} hs</strong>
                  </span>
                  <span>•</span>
                  <span>Valor: <strong>{formatCurrency(unitPrice)}</strong> c/u</span>
                </div>
              </div>
            </div>

            {/* Lista de premios */}
            <div className="bg-surface rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">20 Premios en Juego</h4>
                    <p className="text-[11px] text-slate-500">Conocé todo lo que podés ganar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFlyerModalOpen(true)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                >
                  Ver fotos en flyer →
                </button>
              </div>

              <div className="text-xs text-slate-700 font-mono bg-slate-50 rounded-xl p-3 border border-slate-200/60 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-line">
                {settings?.prizes || 'Premios a confirmar'}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Todos los premios están detallados con imágenes en el flyer oficial.
              </p>
            </div>
          </div>

        </div>
      </section>

      <FlyerModal
        isOpen={isFlyerModalOpen}
        onClose={() => setIsFlyerModalOpen(false)}
        title={raffleTitle}
      />
    </>
  );
}

