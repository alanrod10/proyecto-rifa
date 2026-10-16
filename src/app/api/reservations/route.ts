import { NextRequest, NextResponse } from 'next/server';
import { getDb, getSettings, releaseExpiredReservations } from '@/lib/db';
import { generateUniqueOrderCode, generatePrivateToken, cleanPhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyer_name, buyer_phone, payment_method, numbers } = body;

    // 1. Validaciones básicas de entrada
    if (!buyer_name || typeof buyer_name !== 'string' || buyer_name.trim().length < 3) {
      return NextResponse.json({ error: 'El nombre y apellido debe tener al menos 3 caracteres.' }, { status: 400 });
    }

    const cleanPhone = cleanPhoneNumber(buyer_phone || '');
    if (!cleanPhone || cleanPhone.length < 6) {
      return NextResponse.json({ error: 'El número de celular ingresado es inválido.' }, { status: 400 });
    }

    if (payment_method !== 'cash' && payment_method !== 'transfer') {
      return NextResponse.json({ error: 'El método de pago debe ser Efectivo o Transferencia.' }, { status: 400 });
    }

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un número para reservar.' }, { status: 400 });
    }

    // Filtrar números únicos válidos del 1 al 80000
    const uniqueNumbers = Array.from(new Set(numbers.map(n => parseInt(n, 10))))
      .filter(n => !isNaN(n) && n >= 1 && n <= 80000)
      .sort((a, b) => a - b);

    if (uniqueNumbers.length === 0) {
      return NextResponse.json({ error: 'Los números seleccionados son inválidos.' }, { status: 400 });
    }

    if (uniqueNumbers.length > 500) {
      return NextResponse.json({ error: 'No es posible solicitar más de 500 números en una única operación.' }, { status: 400 });
    }

    // Liberación reactiva previa
    await releaseExpiredReservations().catch(() => {});

    // 2. Comprobar configuración global
    const settings = await getSettings();
    if (settings.public_reservations_enabled !== 'true') {
      return NextResponse.json({ error: 'Las solicitudes públicas de números se encuentran momentáneamente pausadas por la administración.' }, { status: 403 });
    }

    const unitPrice = Math.max(1, parseInt(settings.ticket_price || '100', 10));
    const reserveHours = Math.max(1, parseInt(settings.reserve_hours || '48', 10));
    const totalAmount = uniqueNumbers.length * unitPrice;

    const expiresAt = new Date(Date.now() + reserveHours * 60 * 60 * 1000).toISOString();
    const privateToken = generatePrivateToken();

    const db = getDb();
    const tx = await db.transaction('write');

    try {
      // Generar código de orden único dentro de la transacción (con reintento ante colisión)
      const orderCode = await generateUniqueOrderCode(tx);

      // 3. Verificación atómica de disponibilidad de TODOS los números solicitados
      const placeholders = uniqueNumbers.map(() => '?').join(',');
      const checkRes = await tx.execute({
        sql: `SELECT number, status FROM numbers WHERE number IN (${placeholders})`,
        args: uniqueNumbers
      });

      const unavailable: number[] = [];
      const foundSet = new Set<number>();

      for (const row of checkRes.rows) {
        const num = Number(row.number);
        foundSet.add(num);
        if (row.status !== 'available') {
          unavailable.push(num);
        }
      }

      // Si algún número ni siquiera existe en la base
      for (const reqNum of uniqueNumbers) {
        if (!foundSet.has(reqNum)) {
          unavailable.push(reqNum);
        }
      }

      if (unavailable.length > 0) {
        await tx.rollback();
        return NextResponse.json({
          error: 'Uno o más números seleccionados acaban de ser reservados o vendidos.',
          conflictNumbers: unavailable
        }, { status: 409 });
      }

      // 4. Crear o reutilizar comprador (sin sobrescribir el nombre histórico desde el formulario público)
      let buyerId: number;
      const existingBuyer = await tx.execute({
        sql: 'SELECT id FROM buyers WHERE phone = ? LIMIT 1',
        args: [cleanPhone]
      });

      if (existingBuyer.rows.length > 0) {
        buyerId = Number(existingBuyer.rows[0].id);
      } else {
        const insertBuyer = await tx.execute({
          sql: 'INSERT INTO buyers (name, phone) VALUES (?, ?)',
          args: [buyer_name.trim(), cleanPhone]
        });
        buyerId = Number(insertBuyer.lastInsertRowid);
      }

      // 5. Crear la orden de pedido
      const insertOrder = await tx.execute({
        sql: `INSERT INTO orders (
          code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
          unit_price, numbers_count, total_amount, numbers_list, private_token,
          expires_at, is_direct_sale
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 0)`,
        args: [
          orderCode,
          buyerId,
          buyer_name.trim(),
          cleanPhone,
          payment_method,
          unitPrice,
          uniqueNumbers.length,
          totalAmount,
          JSON.stringify(uniqueNumbers),
          privateToken,
          expiresAt
        ]
      });

      const orderId = Number(insertOrder.lastInsertRowid);

      // 6. Actualizar el estado de los números a 'reserved' con el order_id
      await tx.execute({
        sql: `UPDATE numbers 
              SET status = 'reserved', order_id = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE number IN (${placeholders})`,
        args: [orderId, ...uniqueNumbers]
      });

      // Confirmar transacción
      await tx.commit();

      return NextResponse.json({
        success: true,
        order: {
          code: orderCode,
          private_token: privateToken,
          numbers_count: uniqueNumbers.length,
          numbers: uniqueNumbers,
          unit_price: unitPrice,
          total_amount: totalAmount,
          payment_method: payment_method,
          expires_at: expiresAt
        }
      });
    } catch (txError) {
      await tx.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Error al procesar reserva:', error);
    return NextResponse.json({ error: 'No se pudo completar la reserva. Por favor intenta nuevamente.' }, { status: 500 });
  }
}
