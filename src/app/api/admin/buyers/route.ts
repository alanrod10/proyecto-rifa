import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
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
      where += ` AND (
        b.name LIKE ? 
        OR b.phone LIKE ? 
        OR EXISTS (
          SELECT 1 FROM orders o2 
          WHERE (o2.buyer_id = b.id OR o2.buyer_phone = b.phone)
            AND (o2.buyer_name LIKE ? OR o2.code LIKE ? OR o2.numbers_list LIKE ?)
        )
      )`;
      args.push(q, q, q, q, q);
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
              COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_paid_amount,
              COALESCE(SUM(CASE WHEN o.payment_status = 'pending' THEN o.total_amount ELSE 0 END), 0) as total_pending_amount
            FROM buyers b
            LEFT JOIN orders o ON (b.id = o.buyer_id OR b.phone = o.buyer_phone)
            WHERE ${where}
            GROUP BY b.id
            ORDER BY b.id DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    // Para cada teléfono/comprador, consolidar todos los nombres registrados, todos los números y sus compras individuales
    const buyers = [];
    for (const row of buyersRes.rows) {
      const buyerId = Number(row.id);
      const buyerPhone = row.phone as string;
      const ordersRes = await db.execute({
        sql: `SELECT id, code, buyer_name, payment_status, payment_method, numbers_count, total_amount, 
                     numbers_list, private_token, is_direct_sale, created_at
              FROM orders 
              WHERE buyer_id = ? OR buyer_phone = ? 
              ORDER BY id DESC`,
        args: [buyerId, buyerPhone]
      });

      const nameMap = new Map<string, string>();
      const baseName = String(row.name || '').trim();
      if (baseName) {
        nameMap.set(baseName.toLowerCase(), baseName);
      }

      const paidNumbersSet = new Set<number>();
      const pendingNumbersSet = new Set<number>();

      const mappedOrders = ordersRes.rows.map(o => {
        const orderBuyerName = String(o.buyer_name || baseName).trim();
        if (orderBuyerName) {
          const lower = orderBuyerName.toLowerCase();
          const existing = nameMap.get(lower);
          if (!existing || orderBuyerName.length > existing.length) {
            nameMap.set(lower, orderBuyerName);
          }
        }

        const nums = safeJsonParse<number[]>(o.numbers_list as string, []);
        const status = o.payment_status as string;
        if (status === 'paid') {
          nums.forEach(n => paidNumbersSet.add(n));
        } else if (status === 'pending') {
          nums.forEach(n => pendingNumbersSet.add(n));
        }

        return {
          id: Number(o.id),
          code: o.code as string,
          buyer_name: orderBuyerName,
          payment_status: status,
          payment_method: o.payment_method as string,
          numbers_count: Number(o.numbers_count),
          total_amount: Number(o.total_amount),
          numbers: nums,
          private_token: o.private_token as string,
          is_direct_sale: Boolean(o.is_direct_sale),
          created_at: o.created_at as string,
        };
      });

      // Ordenar los nombres dejando primero el nombre más completo (más largo)
      const allNames = Array.from(nameMap.values()).sort((a, b) => b.length - a.length);
      const primaryName = allNames[0] || baseName;

      const paidNumbers = Array.from(paidNumbersSet).sort((a, b) => a - b);
      const pendingNumbers = Array.from(pendingNumbersSet).sort((a, b) => a - b);
      const activeNumbers = Array.from(new Set([...paidNumbers, ...pendingNumbers])).sort((a, b) => a - b);

      buyers.push({
        id: buyerId,
        name: primaryName,
        all_names: allNames,
        phone: buyerPhone,
        created_at: row.created_at as string,
        total_orders: mappedOrders.length,
        total_numbers: activeNumbers.length,
        paid_numbers: paidNumbers,
        pending_numbers: pendingNumbers,
        active_numbers: activeNumbers,
        total_paid_amount: Number(row.total_paid_amount),
        total_pending_amount: Number(row.total_pending_amount),
        orders: mappedOrders
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

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { buyer_id } = body;

    if (!buyer_id) {
      return NextResponse.json({ error: 'ID de comprador requerido' }, { status: 400 });
    }

    const db = getDb();
    const tx = await db.transaction('write');

    try {
      const buyerRes = await tx.execute({
        sql: 'SELECT id, name, phone FROM buyers WHERE id = ? LIMIT 1',
        args: [buyer_id]
      });

      if (buyerRes.rows.length === 0) {
        await tx.rollback();
        return NextResponse.json({ error: 'Comprador no encontrado' }, { status: 404 });
      }

      const buyer = buyerRes.rows[0];

      // 1. Obtener todas las órdenes del comprador
      const ordersRes = await tx.execute({
        sql: 'SELECT id, code FROM orders WHERE buyer_id = ?',
        args: [buyer_id]
      });

      const orderIds = ordersRes.rows.map(r => Number(r.id));
      const orderCodes = ordersRes.rows.map(r => r.code as string);
      let releasedNumbersCount = 0;

      // 2. Si tiene órdenes, liberar sus números y eliminar las órdenes
      if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => '?').join(',');
        const releaseRes = await tx.execute({
          sql: `UPDATE numbers 
                SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE order_id IN (${placeholders})`,
          args: orderIds
        });
        releasedNumbersCount = Number(releaseRes.rowsAffected || 0);

        await tx.execute({
          sql: 'DELETE FROM orders WHERE buyer_id = ?',
          args: [buyer_id]
        });
      }

      // 3. Eliminar al comprador
      await tx.execute({
        sql: 'DELETE FROM buyers WHERE id = ?',
        args: [buyer_id]
      });

      await tx.commit();

      await logAudit(
        admin.username,
        'DELETE_BUYER',
        {
          buyer_id,
          buyer_name: buyer.name,
          buyer_phone: buyer.phone,
          deleted_orders: orderCodes,
          released_numbers: releasedNumbersCount
        },
        request.headers.get('x-forwarded-for') || 'localhost'
      );

      return NextResponse.json({
        success: true,
        message: `Comprador "${buyer.name}" eliminado junto con ${orderIds.length} pedido(s) (${releasedNumbersCount} número(s) liberados).`
      });
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  } catch (error) {
    console.error('Error al eliminar comprador:', error);
    return NextResponse.json({ error: 'Error al eliminar comprador' }, { status: 500 });
  }
}
