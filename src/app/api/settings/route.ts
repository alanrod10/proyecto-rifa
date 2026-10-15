import { NextResponse } from 'next/server';
import { getDb, getSettings, releaseExpiredReservations } from '@/lib/db';

export async function GET() {
  try {
    // Liberación reactiva de reservas vencidas
    await releaseExpiredReservations().catch(err => {
      console.error('Error en liberación automática de vencidos:', err);
    });

    const settings = await getSettings();
    const db = getDb();

    // Obtener estadísticas públicas de los 80.000 números
    const statsRes = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold
      FROM numbers
    `);

    const stats = statsRes.rows[0];

    return NextResponse.json({
      settings: {
        raffle_name: settings.raffle_name,
        raffle_description: settings.raffle_description,
        ticket_price: Number(settings.ticket_price) || 100,
        prizes: settings.prizes,
        draw_date: settings.draw_date,
        bank_alias: settings.bank_alias,
        bank_cbu: settings.bank_cbu,
        bank_name: settings.bank_name,
        bank_holder: settings.bank_holder,
        contact_phone: settings.contact_phone,
        reserve_hours: Number(settings.reserve_hours) || 48,
        public_reservations_enabled: settings.public_reservations_enabled === 'true',
        rules_terms: settings.rules_terms,
      },
      stats: {
        total: Number(stats.total) || 80000,
        available: Number(stats.available) || 0,
        reserved: Number(stats.reserved) || 0,
        sold: Number(stats.sold) || 0,
      }
    });
  } catch (error) {
    console.error('Error al obtener configuraciones públicas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
