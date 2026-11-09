'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Lock, Download, Database } from 'lucide-react';

export default function AdminSecurityAndBackups() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);
    setPwdError(null);

    if (newPassword.length < 8) {
      setPwdError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch('/api/admin/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdFeedback(data.message || 'Contraseña actualizada correctamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(data.error || 'No se pudo actualizar la contraseña.');
      }
    } catch {
      setPwdError('Error de conexión al cambiar la contraseña.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      {/* BLOQUE 4: CAMBIO DE CONTRASEÑA DESDE EL PANEL WEB */}
      <form
        onSubmit={handlePasswordChange}
        className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
      >
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-link" />
          Seguridad de Mi Cuenta — Cambiar Contraseña
        </h3>
        <p className="text-xs text-slate-500">
          Actualizá tu contraseña de administrador directamente en la base de datos en la nube
          (Turso).
        </p>

        {pwdFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{pwdFeedback}</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña Actual *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Contraseña (mín. 8 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changingPassword}
            className="bg-night-800 hover:bg-night-700 border border-night-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{changingPassword ? 'Actualizando...' : 'Actualizar Mi Contraseña'}</span>
          </button>
        </div>
      </form>

      {/* BLOQUE 5: RESPALDOS EN LA NUBE Y EXPORTACIÓN */}
      <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-link" />
          Copias de Seguridad en la Nube y Exportación para Excel
        </h3>
        <p className="text-xs text-slate-500">
          Descargá un respaldo completo en vivo desde Turso o exportá planillas CSV protegidas
          para abrir en Excel.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href="/api/admin/backup"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Respaldo Completo (.JSON)</span>
          </a>

          <a
            href="/api/admin/export?type=orders"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Pedidos (.CSV)</span>
          </a>

          <a
            href="/api/admin/export?type=buyers"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Compradores (.CSV)</span>
          </a>

          <a
            href="/api/admin/export?type=sold_numbers"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Números Ocupados (.CSV)</span>
          </a>
        </div>
      </div>
    </>
  );
}
