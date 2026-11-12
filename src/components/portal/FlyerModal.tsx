'use client';

import React, { useEffect } from 'react';
import { X, Download, ZoomIn, Sparkles, Share2 } from 'lucide-react';

interface FlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function FlyerModal({
  isOpen,
  onClose,
  title = 'Gran Rifa de Fin de Año',
}: FlyerModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `¡Participá de la ${title}! Sorteo el 31/12. 20 premios increíbles a solo $100 el número.`,
          url: window.location.origin,
        });
      } catch {
        // Ignorar si cancela el diálogo nativo
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('¡Enlace de la rifa copiado al portapapeles!');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flyer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-night-950 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-night-900/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 id="flyer-modal-title" className="font-bold text-sm sm:text-base truncate">
                Flyer Oficial — {title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                20 Premios • Sorteo 31/12 • $100 el número
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
            aria-label="Cerrar vista de flyer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Imagen central */}
        <div className="overflow-y-auto p-3 sm:p-5 flex items-center justify-center bg-black/40">
          <picture className="w-full flex justify-center">
            <source srcSet="/flyer-gran-rifa.webp" type="image/webp" />
            <img
              src="/flyer-gran-rifa.png"
              alt={`Flyer Oficial — ${title}`}
              className="rounded-xl shadow-2xl max-h-[72vh] w-auto object-contain border border-white/10"
              loading="eager"
            />
          </picture>
        </div>

        {/* Footer con acciones */}
        <div className="p-3 sm:p-4 bg-night-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
            <span>Resolución original alta definición</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 text-slate-200 px-3 py-2 rounded-xl border border-white/10 font-medium transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>

            <a
              href="/flyer-gran-rifa.png"
              download="Gran-Rifa-de-Fin-de-Ano.png"
              className="inline-flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-xl font-bold transition shadow-lg shadow-brand-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Flyer</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
