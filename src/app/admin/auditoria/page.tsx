'use client';

import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Shield, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AuditLog {
  id: number;
  admin_username: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/audit?page=${page}&limit=40`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalLogs(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Auditoría</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historial inmutable de acciones administrativas sensibles, pagos confirmados y cambios de configuración.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 text-xs bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-2 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="bg-surface rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Cargando registros de auditoría...</div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">Aún no hay registros de auditoría.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Administrador</th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Detalles</th>
                  <th className="py-3 px-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      @{log.admin_username}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        log.action === 'CONFIRM_PAYMENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'CANCEL_ORDER' || log.action === 'DELETE_ORDER' || log.action === 'DELETE_BUYER'
                          ? 'bg-red-100 text-red-800'
                          : log.action === 'DIRECT_SALE'
                          ? 'bg-purple-100 text-purple-800'
                          : log.action === 'UPDATE_SETTINGS' || log.action === 'CHANGE_PAYMENT_METHOD'
                          ? 'bg-blue-100 text-blue-800'
                          : log.action === 'EXPIRE_RESERVATIONS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-md font-mono text-xs text-slate-600 break-words">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {totalLogs} acciones auditadas</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 py-1">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-surface border border-slate-200 rounded disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
