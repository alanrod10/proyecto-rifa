'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Inbox, Hash, Users, Settings, 
  FileText, LogOut, ExternalLink, Ticket, Shield
} from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
  displayName: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  // No aplicar layout ni chequeo en la página de login
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
      } catch {
        router.push('/admin/login');
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <p className="text-sm font-medium animate-pulse text-emerald-400">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  const navItems = [
    { label: 'Resumen', href: '/admin', icon: LayoutDashboard },
    { label: 'Ventas Directas', href: '/admin/ventas', icon: ShoppingCart },
    { label: 'Solicitudes Web', href: '/admin/solicitudes', icon: Inbox },
    { label: 'Números (80k)', href: '/admin/numeros', icon: Hash },
    { label: 'Compradores', href: '/admin/compradores', icon: Users },
    { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
    { label: 'Auditoría', href: '/admin/auditoria', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Barra Superior del Panel */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block">Panel de Administración</span>
              <span className="text-[11px] text-emerald-400">Rifa 80.000 Números</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {admin && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">
                  {admin.displayName} <span className="text-slate-400">(@{admin.username})</span>
                </span>
              </div>
            )}

            <Link
              href="/"
              target="_blank"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition"
            >
              <span>Ver Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/20 flex items-center gap-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegación Horizontal */}
        <nav className="bg-slate-950 border-t border-slate-800/80 px-4 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex space-x-1 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        {children}
      </main>
    </div>
  );
}
