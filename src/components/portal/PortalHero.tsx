'use client';

import React from 'react';
import { Clock, Sparkles, Target } from 'lucide-react';
import { RaffleSettings, RaffleStats } from '@/lib/types';
import { TOTAL_NUMBERS, DEFAULT_RESERVE_HOURS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface PortalHeroProps {
  settings: RaffleSettings | null;
  stats: RaffleStats | null;
  unitPrice: number;
}

export default function PortalHero({ settings, stats, unitPrice }: PortalHeroProps) {
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
            {settings?.raffle_name || 'Gran Rifa Familiar pro Terreno'}
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
                Plazo para abonar reservas:{' '}
                <strong>{settings?.reserve_hours || DEFAULT_RESERVE_HOURS} horas</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
