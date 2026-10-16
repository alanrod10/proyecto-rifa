'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'rifa-theme';

/**
 * Selector de apariencia (oscuro / claro).
 * Solo guarda la preferencia visual en este navegador (localStorage).
 * El tema inicial lo aplica el script de layout.tsx antes de hidratar.
 */
export default function ThemeToggle({ className = '', variant = 'surface' }: { className?: string; variant?: 'surface' | 'night' }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.setAttribute('data-theme', next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* almacenamiento no disponible: el cambio sigue valiendo para esta sesión */
    }
    setTheme(next);
  };

  const isLight = theme === 'light';
  const label = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/20 bg-surface/10 text-slate-100 hover:bg-surface/20 transition shrink-0 ${className}`}
    >
      {theme === null ? (
        <span className="w-5 h-5" aria-hidden="true" />
      ) : isLight ? (
        <Moon className="w-5 h-5 animate-pop" aria-hidden="true" />
      ) : (
        <Sun className="w-5 h-5 animate-pop" aria-hidden="true" />
      )}
    </button>
  );
}
