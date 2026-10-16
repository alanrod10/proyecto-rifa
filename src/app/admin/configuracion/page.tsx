'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, Save, CheckCircle, AlertTriangle, RefreshCw, 
  DollarSign, Clock, Shield, Sparkles, Landmark, Phone, Lock, Download, Database
} from 'lucide-react';

interface SettingsData {
  raffle_name: string;
  raffle_description: string;
  ticket_price: string;
  prizes: string;
  draw_date: string;
  bank_alias: string;
  bank_cbu: string;
  bank_name: string;
  bank_holder: string;
  contact_phone: string;
  reserve_hours: string;
  public_reservations_enabled: string;
  rules_terms: string;
}

export default function AdminConfiguracionPage() {
  const [formData, setFormData] = useState<SettingsData>({
    raffle_name: '',
    raffle_description: '',
    ticket_price: '100',
    prizes: 'Premios a confirmar',
    draw_date: 'Fecha del sorteo a confirmar',
    bank_alias: '',
    bank_cbu: '',
    bank_name: '',
    bank_holder: '',
    contact_phone: '',
    reserve_hours: '48',
    public_reservations_enabled: 'true',
    rules_terms: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado para cambio de contraseña desde el panel web
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setError(null);

    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback('¡Configuración guardada exitosamente! Los cambios ya son visibles en el portal público.');
        setFormData(data.settings);
      } else {
        setError(data.error || 'Error al guardar la configuración.');
      }
    } catch {
      setError('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

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
          confirm_password: confirmPassword
        })
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

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de la Rifa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustá precios, premios, fechas bancarias, respaldos y tu contraseña directamente desde la web.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recargar</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOQUE 1: INFORMACIÓN PÚBLICA PRINCIPAL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            Información Pública y Portada
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Rifa
              </label>
              <input
                type="text"
                name="raffle_name"
                value={formData.raffle_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio Unitario Vigente (ARS) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                name="ticket_price"
                value={formData.ticket_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Las órdenes ya emitidas conservan su precio histórico.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción Solidaria
            </label>
            <textarea
              name="raffle_description"
              rows={2}
              value={formData.raffle_description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Premios Confirmados (o «Premios a confirmar»)
              </label>
              <textarea
                name="prizes"
                rows={3}
                value={formData.prizes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha y Hora del Sorteo (o «Fecha del sorteo a confirmar»)
              </label>
              <textarea
                name="draw_date"
                rows={3}
                value={formData.draw_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: CONDICIONES DE RESERVAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            Condiciones de Reservas y Disponibilidad
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plazo de Expiración de Reservas (en Horas)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                name="reserve_hours"
                value={formData.reserve_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Tiempo que el comprador tiene para enviar comprobante antes de liberar el número.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado de Recepción de Solicitudes Web
              </label>
              <select
                name="public_reservations_enabled"
                value={formData.public_reservations_enabled}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="true">Abierta (Cualquiera puede solicitar números)</option>
                <option value="false">Pausada (Solo consulta, no se aceptan nuevas reservas)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bases y Condiciones
            </label>
            <textarea
              name="rules_terms"
              rows={3}
              value={formData.rules_terms}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans"
            />
          </div>
        </div>

        {/* BLOQUE 3: DATOS BANCARIOS Y CONTACTO WHATSAPP */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-700" />
            Datos Bancarios para Transferencias e Instrucciones
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alias Bancario
              </label>
              <input
                type="text"
                placeholder="ej: MI.RIFA.LOTE"
                name="bank_alias"
                value={formData.bank_alias}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono text-emerald-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CBU / CVU
              </label>
              <input
                type="text"
                placeholder="22 dígitos"
                name="bank_cbu"
                value={formData.bank_cbu}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Banco / Entidad
              </label>
              <input
                type="text"
                placeholder="ej: Banco Nación / Mercado Pago"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titular de la Cuenta
              </label>
              <input
                type="text"
                placeholder="Nombre del titular"
                name="bank_holder"
                value={formData.bank_holder}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Celular para Contacto y Recepción de Comprobantes (WhatsApp, sin 54)
            </label>
            <div className="flex items-center w-full sm:w-1/2">
              <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono font-bold text-slate-600 select-none">
                +54
              </span>
              <input
                type="tel"
                placeholder="ej: 3884123456"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Ingresá directamente el número sin el 54 (ej: 3884123456). El sistema agrega automáticamente el código internacional para WhatsApp.
            </span>
          </div>
        </div>

        {/* Botón Guardar Cambios */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-8 py-3 rounded-2xl text-sm transition shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </form>

      {/* BLOQUE 4: CAMBIO DE CONTRASEÑA DESDE EL PANEL WEB */}
      <form onSubmit={handlePasswordChange} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-700" />
          Seguridad de Mi Cuenta — Cambiar Contraseña
        </h3>
        <p className="text-xs text-slate-500">
          Actualizá tu contraseña de administrador directamente en la base de datos en la nube (Turso).
        </p>

        {pwdFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{pwdFeedback}</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changingPassword}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{changingPassword ? 'Actualizando...' : 'Actualizar Mi Contraseña'}</span>
          </button>
        </div>
      </form>

      {/* BLOQUE 5: RESPALDOS EN LA NUBE Y EXPORTACIÓN */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-700" />
          Copias de Seguridad en la Nube y Exportación para Excel
        </h3>
        <p className="text-xs text-slate-500">
          Descargá un respaldo completo en vivo desde Turso o exportá planillas CSV protegidas para abrir en Excel.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href="/api/admin/backup"
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
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
    </div>
  );
}
