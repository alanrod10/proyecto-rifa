'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, Shuffle, CheckCircle, AlertTriangle, ArrowRight, 
  Banknote, Landmark, Ticket, X
} from 'lucide-react';
import { formatTicketNumber, formatCurrency } from '@/lib/utils';

export default function AdminVentasPage() {
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [numbersInput, setNumbersInput] = useState('');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Parsear texto de números ingresados
  const handleAddManualNumbers = () => {
    if (!numbersInput.trim()) return;
    const tokens = numbersInput.split(/[\s,]+/).filter(t => /^\d+$/.test(t)).map(t => parseInt(t, 10));
    const valid = tokens.filter(n => n >= 1 && n <= 80000);
    if (valid.length === 0) {
      setError('No se detectaron números válidos entre 1 y 80.000.');
      return;
    }

    setSelectedNumbers(prev => {
      const combined = Array.from(new Set([...prev, ...valid])).sort((a, b) => a - b);
      return combined;
    });
    setNumbersInput('');
    setError(null);
  };

  // Azar
  const handleRandomSelect = async (count: number) => {
    try {
      const res = await fetch(`/api/numbers?random=${count}`);
      if (res.ok) {
        const data = await res.json();
        const randNums = (data.numbers || []).map((n: any) => n.number);
        setSelectedNumbers(prev => {
          const combined = Array.from(new Set([...prev, ...randNums])).sort((a, b) => a - b);
          return combined;
        });
      }
    } catch (err) {
      console.error('Error al obtener números al azar:', err);
    }
  };

  const removeNumber = (num: number) => {
    setSelectedNumbers(prev => prev.filter(n => n !== num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedNumbers.length === 0) {
      setError('Debes añadir al menos un número a la venta.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/direct-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          payment_method: paymentMethod,
          is_paid: isPaid,
          numbers: selectedNumbers,
          notes: notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar la venta directa.');
        return;
      }

      setSuccessOrder(data.order);
      // Limpiar formulario
      setBuyerName('');
      setBuyerPhone('');
      setSelectedNumbers([]);
      setNotes('');
    } catch (err) {
      setError('Error de red al intentar registrar la venta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registrar Venta Directa</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Asigná números directamente a un comprador presencial y marcalos como pagados o reservados.
        </p>
      </div>

      {successOrder && (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl space-y-3 animate-fade-in text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>¡Venta directa registrada con éxito!</span>
          </div>
          <p>
            Código de orden: <strong>{successOrder.code}</strong> • Total:{' '}
            <strong>{formatCurrency(successOrder.total_amount)}</strong> ({successOrder.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'})
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/pedido/${successOrder.private_token}`}
              target="_blank"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg transition"
            >
              Abrir comprobante digital
            </Link>
            <button
              onClick={() => setSuccessOrder(null)}
              className="text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Registrar otra venta
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre y Apellido del Comprador *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Roberto Gomez"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Celular del Comprador *
            </label>
            <input
              type="tel"
              required
              placeholder="Ej: 3884123456"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Sección de Selección y Asignación de Números */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold text-slate-700">
            Números a Asignar
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribí números separados por coma o espacio (ej: 15, 780, 24500)..."
              value={numbersInput}
              onChange={(e) => setNumbersInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManualNumbers(); } }}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddManualNumbers}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-xl text-xs transition"
            >
              Agregar
            </button>
          </div>

          {/* Botones de Selección Rápida al Azar */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Shuffle className="w-3.5 h-3.5" /> Agregar al azar:
            </span>
            <button
              type="button"
              onClick={() => handleRandomSelect(1)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg transition"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleRandomSelect(5)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg transition"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleRandomSelect(10)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg transition"
            >
              +10
            </button>
          </div>

          {/* Lista de Números Seleccionados */}
          {selectedNumbers.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Números elegidos ({selectedNumbers.length}):</span>
                <button
                  type="button"
                  onClick={() => setSelectedNumbers([])}
                  className="text-red-600 hover:underline"
                >
                  Quitar todos
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {selectedNumbers.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg font-mono text-xs font-bold"
                  >
                    {formatTicketNumber(num)}
                    <button
                      type="button"
                      onClick={() => removeNumber(num)}
                      className="hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Medio de Pago y Estado del Cobro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Medio de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-medium ${
                paymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="pm"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span>Efectivo</span>
              </label>

              <label className={`flex items-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-medium ${
                paymentMethod === 'transfer' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="pm"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                />
                <Landmark className="w-4 h-4 text-emerald-700" />
                <span>Transferencia</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estado de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-medium ${
                isPaid ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="is_paid"
                  checked={isPaid}
                  onChange={() => setIsPaid(true)}
                />
                <span>✓ Pagado ahora</span>
              </label>

              <label className={`flex items-center gap-1.5 p-2.5 border rounded-xl cursor-pointer text-xs font-medium ${
                !isPaid ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="is_paid"
                  checked={!isPaid}
                  onChange={() => setIsPaid(false)}
                />
                <span>⏳ Pendiente</span>
              </label>
            </div>
          </div>
        </div>

        {/* Notas u Observaciones */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones / Notas internas (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Entregó $500 en efectivo en mano"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Botón Guardar */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading || selectedNumbers.length === 0}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow disabled:opacity-50 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : 'Confirmar y Guardar Venta'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
