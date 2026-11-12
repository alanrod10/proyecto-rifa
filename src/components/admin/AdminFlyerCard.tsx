'use client';

import React, { useState } from 'react';
import { Download, Eye, Sparkles, Check, Copy, Share2 } from 'lucide-react';
import FlyerModal from '@/components/portal/FlyerModal';

export default function AdminFlyerCard() {
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/flyer-gran-rifa.png`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="bg-surface rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Flyer Oficial de Difusión
              </h3>
              <p className="text-xs text-slate-500">
                Gran Rifa de Fin de Año • Sorteo 31/12
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
            Listo para compartir en WhatsApp
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-3 flex justify-center">
            <div
              onClick={() => setModalOpen(true)}
              className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200 shadow-md max-w-[160px] bg-night-950"
            >
              <img
                src="/flyer-gran-rifa.webp"
                alt="Flyer Oficial"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                <Eye className="w-4 h-4 mr-1" />
                Ampliar
              </div>
            </div>
          </div>

          <div className="md:col-span-9 space-y-3">
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Dimensiones:</strong> 1122 × 1402 píxeles (Formato óptimo para historias, estados y mensajes de WhatsApp).
              </p>
              <p>
                <strong>Premios incluidos:</strong> Freidora de aire, termos 1.3L, cubiertos x24, planchas de pelo, pavas eléctricas, valija de maquillaje, tartas frutales, sábanas y toallas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="/flyer-gran-rifa.png"
                download="Gran-Rifa-de-Fin-de-Ano.png"
                className="inline-flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold px-3.5 py-2 rounded-xl transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PNG (Alta Calidad 2.4 MB)</span>
              </a>

              <a
                href="/flyer-gran-rifa.webp"
                download="Gran-Rifa-de-Fin-de-Ano.webp"
                className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl transition border border-slate-200"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Descargar WebP (Rápido 380 KB)</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl transition border border-slate-200"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar Enlace Directo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-bold px-2 py-2 transition ml-auto"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver en Pantalla Completa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <FlyerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Gran Rifa de Fin de Año"
      />
    </>
  );
}
