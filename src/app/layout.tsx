import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://proyecto-rifa.vercel.app'),
  title: 'Gran Rifa Familiar de 80.000 Números | Pro Terreno',
  description: 'Portal oficial de la rifa solidaria familiar de 80.000 números. Consulta de números disponibles, reserva segura y comprobante digital.',
  openGraph: {
    title: 'Gran Rifa Familiar de 80.000 Números | Pro Terreno',
    description: 'Portal oficial de la rifa solidaria familiar de 80.000 números. Consulta números disponibles y reserva online con comprobante digital.',
    url: 'https://proyecto-rifa.vercel.app',
    siteName: 'Proyecto RIFA',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gran Rifa Familiar de 80.000 Números | Pro Terreno',
    description: 'Portal oficial de la rifa solidaria familiar de 80.000 números. Consulta números disponibles y reserva online con comprobante digital.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Aplica el tema guardado (por defecto: claro) antes de pintar, para evitar destellos.
const themeInitScript = `(function(){try{var t=localStorage.getItem('rifa-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
