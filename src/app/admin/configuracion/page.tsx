'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, Save, CheckCircle, AlertTriangle, RefreshCw, 
  DollarSign, Clock, Shield, Sparkles, Landmark, Phone
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

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración de la Rifa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustá precios, premios, fechas bancarias y reglas sin necesidad de modificar el código.
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
              Celular para Contacto y Recepción de Comprobantes (WhatsApp)
            </label>
            <input
              type="text"
              placeholder="ej: 5493884123456 (con código de país 549)"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Al hacer clic en «Enviar comprobante», el comprador abrirá un chat directo a este número con los datos de su reserva ya escritos.
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
    </div>
  );
}
