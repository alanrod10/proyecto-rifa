'use client';

import React from 'react';
import { Landmark } from 'lucide-react';

interface AdminBankSettingsSectionProps {
  bankAlias: string;
  bankCbu: string;
  bankName: string;
  bankHolder: string;
  contactPhone: string;
  contactPhoneSecondary: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

export default function AdminBankSettingsSection({
  bankAlias,
  bankCbu,
  bankName,
  bankHolder,
  contactPhone,
  contactPhoneSecondary,
  onChange,
}: AdminBankSettingsSectionProps) {
  return (
    <div className="bg-surface p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
        <Landmark className="w-4 h-4 text-brand-link" />
        Datos Bancarios para Transferencias e Instrucciones
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alias Bancario</label>
          <input
            type="text"
            placeholder="ej: MI.RIFA.LOTE"
            name="bank_alias"
            value={bankAlias}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm font-mono text-brand-link font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">CBU / CVU</label>
          <input
            type="text"
            placeholder="22 dígitos"
            name="bank_cbu"
            value={bankCbu}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
            value={bankName}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
            value={bankHolder}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Celular de Contacto 1 — Alan (WhatsApp, sin 54)
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono font-bold text-slate-600 select-none">
              +54
            </span>
            <input
              type="tel"
              placeholder="ej: 3884152040"
              name="contact_phone"
              value={contactPhone}
              onChange={onChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Celular de Contacto 2 — Yilda (WhatsApp, sin 54)
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono font-bold text-slate-600 select-none">
              +54
            </span>
            <input
              type="tel"
              placeholder="ej: 3884141514"
              name="contact_phone_secondary"
              value={contactPhoneSecondary}
              onChange={onChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-r-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <span className="text-[11px] text-slate-400 block">
        Ambos contactos (Alan y Yilda) se muestran en el portal público y en los comprobantes
        digitales.
      </span>
    </div>
  );
}
