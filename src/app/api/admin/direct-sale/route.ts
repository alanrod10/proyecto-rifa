import { NextRequest, NextResponse } from 'next/server';
import { getDb, getSettings, logAudit } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { generateUniqueOrderCode, generatePrivateToken, cleanPhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { buyer_name, buyer_phone, payment_method, is_paid, numbers, notes } = body;

    if (!buyer_name || typeof buyer_name !== 'string' || buyer_name.trim().length < 2) {
      return NextResponse.json({ error: 'Nombre de comprador requerido' }, { status: 400 });
    }

    const cleanPhone = cleanPhoneNumber(buyer_phone || '');
    if (!cleanPhone || cleanPhone.length < 6) {
      return NextResponse.json({ error: 'Número de celular requerido' }, { status: 400 });
    }

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un número' }, { status: 400 });
    }

    const uniqueNumbers = Array.from(new Set(numbers.map(n => parseInt(n, 10))))
      .filter(n => !isNaN(n) && n >= 1 && n <= 80000)
      .sort((a, b) => a - b);

    if (uniqueNumbers.length === 0) {
      return NextResponse.json({ error: 'Números inválidos' }, { status: 400 });
    }

    const settings = await getSettings();
    const unitPrice = Math.max(1, parseInt(settings.ticket_price || '100', 10));
    const totalAmount = uniqueNumbers.length * unitPrice;
    const reserveHours = Math.max(1, parseInt(settings.reserve_hours || '48', 10));

    const status = is_paid ? 'paid' : 'pending';
    const numberStatus = is_paid ? 'sold' : 'reserved';
    const expiresAt = new Date(Date.now() + reserveHours * 60 * 60 * 1000).toISOString();
    const privateToken = generatePrivateToken();

    const db = getDb();
    const tx = await db.transaction('write');

    try {
      const orderCode = await generateUniqueOrderCode(tx);

      // 1. Verificar disponibilidad de los números
      const placeholders = uniqueNumbers.map(() => '?').join(',');
      const checkRes = await tx.execute({
        sql: `SELECT number, status FROM numbers WHERE number IN (${placeholders})`,
        args: uniqueNumbers
      });

      const unavailable: number[] = [];
      const foundSet = new Set<number>();

      for (const row of checkRes.rows) {
        foundSet.add(Number(row.number));
        if (row.status !== 'available') {
          unavailable.push(Number(row.number));
        }
      }

      for (const num of uniqueNumbers) {
        if (!foundSet.has(num)) unavailable.push(num);
      }

      if (unavailable.length > 0) {
        await tx.rollback();
        return NextResponse.json({
          error: 'Algunos números ya no están disponibles',
          conflictNumbers: unavailable
        }, { status: 409 });
      }

      // 2. Comprador
      let buyerId: number;
      const existingBuyer = await tx.execute({
        sql: 'SELECT id FROM buyers WHERE phone = ? LIMIT 1',
        args: [cleanPhone]
      });

      if (existingBuyer.rows.length > 0) {
        buyerId = Number(existingBuyer.rows[0].id);
        await tx.execute({
          sql: 'UPDATE buyers SET name = ? WHERE id = ?',
          args: [buyer_name.trim(), buyerId]
        });
      } else {
        const insertBuyer = await tx.execute({
          sql: 'INSERT INTO buyers (name, phone) VALUES (?, ?)',
          args: [buyer_name.trim(), cleanPhone]
        });
        buyerId = Number(insertBuyer.lastInsertRowid);
      }

      // 3. Crear orden directa
      const insertOrder = await tx.execute({
        sql: `INSERT INTO orders (
          code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
          unit_price, numbers_count, total_amount, numbers_list, private_token,
          expires_at, is_direct_sale, created_by_admin, paid_at, confirmed_by_admin, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        args: [
          orderCode,
          buyerId,
          buyer_name.trim(),
          cleanPhone,
          payment_method || 'cash',
          status,
          unitPrice,
          uniqueNumbers.length,
          totalAmount,
          JSON.stringify(uniqueNumbers),
          privateToken,
          expiresAt,
          admin.username,
          is_paid ? new Date().toISOString() : null,
          is_paid ? admin.username : null,
          notes ? `Venta directa por ${admin.username}: ${notes}` : `Venta directa por ${admin.username}`
        ]
      });

      const orderId = Number(insertOrder.lastInsertRowid);

      // 4. Asignar números
      await tx.execute({
        sql: `UPDATE numbers 
              SET status = ?, order_id = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE number IN (${placeholders})`,
        args: [numberStatus, orderId, ...uniqueNumbers]
      });

      await tx.commit();

      await logAudit(
        admin.username,
        'DIRECT_SALE',
        {
          order_id: orderId,
          code: orderCode,
          buyer_name: buyer_name.trim(),
          numbers_count: uniqueNumbers.length,
          is_paid,
          total_amount: totalAmount
        },
        request.headers.get('x-forwarded-for') || 'localhost'
      );

      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          code: orderCode,
          private_token: privateToken,
          numbers: uniqueNumbers,
          total_amount: totalAmount,
          payment_status: status
        }
      });
    } catch (txError) {
      await tx.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Error al registrar venta directa:', error);
    return NextResponse.json({ error: 'Error al registrar venta directa' }, { status: 500 });
  }
}
