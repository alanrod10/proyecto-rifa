import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAudit, releaseExpiredReservations } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { safeJsonParse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await releaseExpiredReservations().catch(() => {});

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '30', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();

    let whereClause = '1=1';
    const args: (string | number)[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND payment_status = ?';
      args.push(status);
    }

    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      // Permitir buscar por código, nombre, teléfono o número dentro de la lista
      whereClause += ' AND (code LIKE ? OR buyer_name LIKE ? OR buyer_phone LIKE ? OR numbers_list LIKE ?)';
      args.push(q, q, q, q);
    }

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM orders WHERE ${whereClause}`,
      args: args
    });
    const total = Number(countRes.rows[0].count);

    const listRes = await db.execute({
      sql: `SELECT id, code, buyer_name, buyer_phone, payment_method, payment_status,
                   unit_price, numbers_count, total_amount, numbers_list, private_token,
                   expires_at, paid_at, confirmed_by_admin, is_direct_sale, created_by_admin,
                   notes, created_at
            FROM orders 
            WHERE ${whereClause} 
            ORDER BY id DESC 
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    return NextResponse.json({
      orders: listRes.rows.map(r => ({
        id: Number(r.id),
        code: r.code as string,
        buyer_name: r.buyer_name as string,
        buyer_phone: r.buyer_phone as string,
        payment_method: r.payment_method as string,
        payment_status: r.payment_status as string,
        unit_price: Number(r.unit_price),
        numbers_count: Number(r.numbers_count),
        total_amount: Number(r.total_amount),
        numbers: safeJsonParse<number[]>(r.numbers_list as string, []),
        private_token: r.private_token as string,
        expires_at: r.expires_at as string,
        paid_at: r.paid_at as string | null,
        confirmed_by_admin: r.confirmed_by_admin as string | null,
        is_direct_sale: Number(r.is_direct_sale) === 1,
        created_by_admin: r.created_by_admin as string | null,
        notes: r.notes as string | null,
        created_at: r.created_at as string,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al listar órdenes en panel:', error);
    return NextResponse.json({ error: 'Error al listar órdenes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, order_id, reason } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
    }

    const db = getDb();
    const orderRes = await db.execute({
      sql: 'SELECT id, code, buyer_name, payment_status, numbers_list, total_amount FROM orders WHERE id = ? LIMIT 1',
      args: [order_id]
    });

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // ACCIÓN 1: CONFIRMAR PAGO
    if (action === 'confirm_payment') {
      if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Esta orden ya fue marcada como pagada previamente.' }, { status: 400 });
      }

      const tx = await db.transaction('write');
      try {
        // 1. Actualizar orden
        await tx.execute({
          sql: `UPDATE orders 
                SET payment_status = 'paid', 
                    paid_at = CURRENT_TIMESTAMP, 
                    confirmed_by_admin = ? 
                WHERE id = ?`,
          args: [admin.username, order_id]
        });

        // 2. Marcar números como 'sold'
        await tx.execute({
          sql: `UPDATE numbers 
                SET status = 'sold', updated_at = CURRENT_TIMESTAMP 
                WHERE order_id = ?`,
          args: [order_id]
        });

        await tx.commit();

        await logAudit(
          admin.username,
          'CONFIRM_PAYMENT',
          {
            order_id,
            code: order.code,
            buyer_name: order.buyer_name,
            total_amount: order.total_amount
          },
          request.headers.get('x-forwarded-for') || 'localhost'
        );

        return NextResponse.json({ success: true, message: 'Pago confirmado exitosamente.' });
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    }

    // ACCIÓN 2: CANCELAR ORDEN Y LIBERAR NÚMEROS
    if (action === 'cancel') {
      if (order.payment_status === 'cancelled') {
        return NextResponse.json({ error: 'Esta orden ya se encuentra cancelada.' }, { status: 400 });
      }

      const tx = await db.transaction('write');
      try {
        // 1. Liberar los números
        await tx.execute({
          sql: `UPDATE numbers 
                SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE order_id = ?`,
          args: [order_id]
        });

        // 2. Marcar orden como cancelada
        await tx.execute({
          sql: `UPDATE orders 
                SET payment_status = 'cancelled', 
                    notes = COALESCE(notes || ' | ', '') || ? 
                WHERE id = ?`,
          args: [reason ? `Cancelado por ${admin.username}: ${reason}` : `Cancelado por ${admin.username}`, order_id]
        });

        await tx.commit();

        await logAudit(
          admin.username,
          'CANCEL_ORDER',
          {
            order_id,
            code: order.code,
            reason: reason || 'Sin motivo especificado'
          },
          request.headers.get('x-forwarded-for') || 'localhost'
        );

        return NextResponse.json({ success: true, message: 'Orden cancelada y números liberados correctamente.' });
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    console.error('Error al procesar acción en orden:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
