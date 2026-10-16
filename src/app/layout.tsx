import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gran Rifa Familiar de 80.000 Números | Pro Terreno',
  description: 'Portal oficial de la rifa solidaria familiar de 80.000 números. Consulta de números disponibles, reserva segura y comprobante digital.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Aplica el tema guardado (por defecto: oscuro) antes de pintar, para evitar destellos.
const themeInitScript = `(function(){try{var t=localStorage.getItem('rifa-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
