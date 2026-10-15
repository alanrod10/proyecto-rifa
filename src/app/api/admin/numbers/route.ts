import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(20, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    let where = '1=1';
    const args: (string | number)[] = [];

    if (search && search.trim().length > 0) {
      const num = parseInt(search.trim(), 10);
      if (!isNaN(num)) {
        where += ' AND n.number = ?';
        args.push(num);
      }
    }

    if (status && status !== 'all') {
      where += ' AND n.status = ?';
      args.push(status);
    }

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as count FROM numbers n WHERE ${where}`,
      args: args
    });
    const total = Number(countRes.rows[0].count);

    const listRes = await db.execute({
      sql: `SELECT 
              n.number, n.status, n.order_id, n.updated_at,
              o.code as order_code, o.buyer_name, o.buyer_phone, o.payment_status
            FROM numbers n
            LEFT JOIN orders o ON n.order_id = o.id
            WHERE ${where}
            ORDER BY n.number ASC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    return NextResponse.json({
      numbers: listRes.rows.map(r => ({
        number: Number(r.number),
        status: r.status as string,
        order_id: r.order_id ? Number(r.order_id) : null,
        order_code: r.order_code as string | null,
        buyer_name: r.buyer_name as string | null,
        buyer_phone: r.buyer_phone as string | null,
        payment_status: r.payment_status as string | null,
        updated_at: r.updated_at as string,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al consultar números en panel:', error);
    return NextResponse.json({ error: 'Error al consultar números' }, { status: 500 });
  }
}
