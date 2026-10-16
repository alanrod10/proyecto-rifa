'use client';

import ThemeToggle from '@/components/ThemeToggle';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas');
        return;
      }

      router.push('/admin');
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="theme-night min-h-screen bg-night-900 flex flex-col justify-between p-4 text-white">
      <div className="max-w-md w-full mx-auto pt-8 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-xs text-slate-400 hover:text-brand-400 flex items-center gap-1.5 transition"
        >
          ← Volver al Portal Público
        </Link>
        <ThemeToggle variant="night" />
      </div>

      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-night-800 rounded-3xl p-8 border border-night-700 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center border border-brand-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Panel Administrativo</h2>
            <p className="text-xs text-slate-400">
              Acceso exclusivo para los administradores de la rifa.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="ej: alan o yilda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-night-900 border border-night-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-night-900 border border-night-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Ingresar al Panel'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-night-700/60 pt-4 text-center">
            <span className="text-[11px] text-slate-400 block">
              Protegido mediante hash bcrypt y tokens JWT con expiración automática.
            </span>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 py-4">
        Proyecto RIFA • Panel Seguro
      </footer>
    </div>
  );
}
