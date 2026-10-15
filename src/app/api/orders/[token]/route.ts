import { NextRequest, NextResponse } from 'next/server';
import { getDb, getSettings, releaseExpiredReservations } from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token de consulta inválido' }, { status: 400 });
    }

    // Liberación reactiva
    await releaseExpiredReservations().catch(() => {});

    const db = getDb();
    const orderRes = await db.execute({
      sql: `SELECT 
              id, code, buyer_name, buyer_phone, payment_method, payment_status,
              unit_price, numbers_count, total_amount, numbers_list,
              expires_at, paid_at, created_at, notes
            FROM orders 
            WHERE private_token = ? LIMIT 1`,
      args: [token]
    });

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontró ninguna operación asociada a este enlace privado.' }, { status: 404 });
    }

    const order = orderRes.rows[0];
    const settings = await getSettings();

    const numbers = safeJsonParse<number[]>(order.numbers_list as string, []);

    return NextResponse.json({
      order: {
        code: order.code,
        buyer_name: order.buyer_name,
        buyer_phone: order.buyer_phone,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        unit_price: Number(order.unit_price),
        numbers_count: Number(order.numbers_count),
        total_amount: Number(order.total_amount),
        numbers: numbers,
        expires_at: order.expires_at,
        paid_at: order.paid_at,
        created_at: order.created_at,
      },
      raffle: {
        name: settings.raffle_name,
        description: settings.raffle_description,
        prizes: settings.prizes,
        draw_date: settings.draw_date,
        bank_alias: settings.bank_alias,
        bank_cbu: settings.bank_cbu,
        bank_name: settings.bank_name,
        bank_holder: settings.bank_holder,
        contact_phone: settings.contact_phone,
        rules_terms: settings.rules_terms,
      }
    });
  } catch (error) {
    console.error('Error al consultar pedido privado:', error);
    return NextResponse.json({ error: 'Error al consultar la operación' }, { status: 500 });
  }
}
