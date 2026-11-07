import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const alt = 'Gran Rifa Familiar pro Terreno — 100.000 Números';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1220 0%, #182540 50%, #1e3a8a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(147, 197, 253, 0.4)',
            borderRadius: '9999px',
            padding: '10px 24px',
            marginBottom: '24px',
            fontSize: '20px',
            fontWeight: 600,
            color: '#93c5fd',
          }}
        >
          🎟️ Sorteo Solidario Familiar • Jujuy
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.15,
            marginBottom: '20px',
            color: '#ffffff',
            maxWidth: '1000px',
          }}
        >
          Gran Rifa Familiar pro Terreno
        </div>
        <div
          style={{
            fontSize: '26px',
            color: '#cbd5e1',
            textAlign: 'center',
            maxWidth: '850px',
            lineHeight: 1.4,
            marginBottom: '36px',
          }}
        >
          100.000 números disponibles • ARS $100 por número • Consulta tu boleto y reserva online con comprobante digital
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '14px 34px',
              borderRadius: '16px',
              fontSize: '22px',
              fontWeight: 'bold',
            }}
          >
            Elegí tus números
          </div>
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: 'white',
              padding: '14px 30px',
              borderRadius: '16px',
              fontSize: '20px',
            }}
          >
            proyecto-rifa.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
