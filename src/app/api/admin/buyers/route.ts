import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { safeJsonParse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '30', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    let where = '1=1';
    const args: string[] = [];

    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      where += ' AND (b.name LIKE ? OR b.phone LIKE ?)';
      args.push(q, q);
    }

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM buyers b WHERE ${where}`,
      args: args
    });
    const total = Number(countRes.rows[0].count);

    const buyersRes = await db.execute({
      sql: `SELECT 
              b.id, b.name, b.phone, b.created_at,
              COUNT(o.id) as total_orders,
              COALESCE(SUM(CASE WHEN o.payment_status IN ('paid', 'pending') THEN o.numbers_count ELSE 0 END), 0) as total_numbers,
              COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_paid_amount
            FROM buyers b
            LEFT JOIN orders o ON b.id = o.buyer_id
            WHERE ${where}
            GROUP BY b.id
            ORDER BY b.id DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    // Para cada comprador, traer también sus pedidos recientes con tokens privados para recuperación
    const buyers = [];
    for (const row of buyersRes.rows) {
      const buyerId = Number(row.id);
      const ordersRes = await db.execute({
        sql: `SELECT id, code, payment_status, payment_method, numbers_count, total_amount, 
                     numbers_list, private_token, created_at
              FROM orders WHERE buyer_id = ? ORDER BY id DESC`,
        args: [buyerId]
      });

      buyers.push({
        id: buyerId,
        name: row.name as string,
        phone: row.phone as string,
        created_at: row.created_at as string,
        total_orders: Number(row.total_orders),
        total_numbers: Number(row.total_numbers),
        total_paid_amount: Number(row.total_paid_amount),
        orders: ordersRes.rows.map(o => ({
          id: Number(o.id),
          code: o.code as string,
          payment_status: o.payment_status as string,
          payment_method: o.payment_method as string,
          numbers_count: Number(o.numbers_count),
          total_amount: Number(o.total_amount),
          numbers: safeJsonParse<number[]>(o.numbers_list as string, []),
          private_token: o.private_token as string,
          created_at: o.created_at as string,
        }))
      });
    }

    return NextResponse.json({
      buyers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al consultar compradores:', error);
    return NextResponse.json({ error: 'Error al consultar compradores' }, { status: 500 });
  }
}
