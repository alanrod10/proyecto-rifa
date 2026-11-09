import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consultar Reserva | Gran Rifa Familiar',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConsultarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
