import { NextResponse } from 'next/server';
import { getDb, getSettings, releaseExpiredReservations } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { safeJsonParse } from '@/lib/utils';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Liberación reactiva
    await releaseExpiredReservations().catch(() => {});

    const db = getDb();
    const settings = await getSettings();
    const currentPrice = Number(settings.ticket_price) || 100;

    // 1. Estadísticas de Números
    const numStatsRes = await db.execute(`
      SELECT 
        COUNT(*) as total_numbers,
        COALESCE(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END), 0) as available_numbers,
        COALESCE(SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END), 0) as reserved_numbers,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END), 0) as sold_numbers
      FROM numbers
    `);
    const numStats = numStatsRes.rows[0];
    const availableNumbers = Number(numStats.available_numbers);
    const reservedNumbers = Number(numStats.reserved_numbers);
    const soldNumbers = Number(numStats.sold_numbers);
    const totalNumbers = Number(numStats.total_numbers);

    // 2. Estadísticas de Órdenes y Recaudación Real
    const orderStatsRes = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) as paid_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'expired' THEN 1 ELSE 0 END), 0) as expired_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as money_collected_total,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' AND payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as money_collected_cash,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' AND payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as money_collected_transfer,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as money_pending
      FROM orders
    `);
    const orderStats = orderStatsRes.rows[0];

    // 3. Reservas por vencer (en las próximas 12 horas)
    const expiringSoonRes = await db.execute(`
      SELECT COUNT(*) as count FROM orders 
      WHERE payment_status = 'pending' 
        AND datetime(expires_at) >= datetime('now')
        AND datetime(expires_at) <= datetime('now', '+12 hours')
    `);
    const expiringSoonCount = Number(expiringSoonRes.rows[0].count);

    // 4. Recaudación potencial restante: números disponibles multiplicados por precio vigente
    const remainingPotential = availableNumbers * currentPrice;

    // 5. Últimas 8 órdenes
    const recentOrdersRes = await db.execute(`
      SELECT id, code, buyer_name, buyer_phone, payment_method, payment_status,
             numbers_count, numbers_list, total_amount, private_token, is_direct_sale, created_at
      FROM orders 
      ORDER BY id DESC LIMIT 8
    `);

    return NextResponse.json({
      admin,
      metrics: {
        total_numbers: totalNumbers,
        available_numbers: availableNumbers,
        reserved_numbers: reservedNumbers,
        sold_numbers: soldNumbers,
        total_orders: Number(orderStats.total_orders),
        paid_orders: Number(orderStats.paid_orders),
        pending_orders: Number(orderStats.pending_orders),
        cancelled_orders: Number(orderStats.cancelled_orders),
        expired_orders: Number(orderStats.expired_orders),
        money_collected_total: Number(orderStats.money_collected_total),
        money_collected_cash: Number(orderStats.money_collected_cash),
        money_collected_transfer: Number(orderStats.money_collected_transfer),
        money_pending: Number(orderStats.money_pending),
        remaining_potential: remainingPotential,
        expiring_soon_count: expiringSoonCount,
        current_ticket_price: currentPrice
      },
      recent_orders: recentOrdersRes.rows.map(r => ({
        id: Number(r.id),
        code: r.code as string,
        buyer_name: r.buyer_name as string,
        buyer_phone: r.buyer_phone as string,
        payment_method: r.payment_method as string,
        payment_status: r.payment_status as string,
        numbers_count: Number(r.numbers_count),
        numbers: safeJsonParse<number[]>(r.numbers_list as string, []),
        total_amount: Number(r.total_amount),
        private_token: r.private_token as string,
        is_direct_sale: Number(r.is_direct_sale) === 1,
        created_at: r.created_at as string
      }))
    });
  } catch (error) {
    console.error('Error al generar métricas del panel:', error);
    return NextResponse.json({ error: 'Error interno en dashboard' }, { status: 500 });
  }
}
