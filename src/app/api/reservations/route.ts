import { NextRequest, NextResponse } from 'next/server';
import {
  getDb,
  getSettings,
  checkRateLimit,
  releaseExpiredReservations,
  invalidatePublicCache,
} from '@/lib/db';
import {
  TOTAL_NUMBERS,
  SQL_IN_CHUNK_SIZE,
  DEFAULT_MAX_NUMBERS_PER_ORDER,
  DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE,
  RESERVATIONS_RATE_LIMIT_MAX,
  RESERVATIONS_RATE_LIMIT_WINDOW_SECONDS,
} from '@/lib/constants';
import {
  generateUniqueOrderCode,
  generatePrivateToken,
  cleanPhoneNumber,
  chunkArray,
  getClientIp,
  safeJsonParse,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyer_name, buyer_phone, payment_method, numbers, client_request_id, request_id } = body;

    const rawRequestId = typeof (client_request_id ?? request_id) === 'string'
      ? String(client_request_id ?? request_id).trim().slice(0, 128)
      : '';
    const requestId = rawRequestId.length > 0 ? rawRequestId : null;

    const db = getDb();

    // 0. Idempotencia: si ya existe un pedido con este request_id, devolverlo con 200 sin consumir cuota adicional
    if (requestId) {
      const existingByReq = await db.execute({
        sql: `SELECT code, private_token, numbers_count, numbers_list, unit_price, total_amount, payment_method, expires_at
              FROM orders WHERE request_id = ? LIMIT 1`,
        args: [requestId],
      }).catch(() => ({ rows: [] }));

      if (existingByReq.rows.length > 0) {
        const existingOrder = existingByReq.rows[0];
        return NextResponse.json(
          {
            success: true,
            idempotent: true,
            order: {
              code: existingOrder.code as string,
              private_token: existingOrder.private_token as string,
              numbers_count: Number(existingOrder.numbers_count),
              numbers: safeJsonParse<number[]>(existingOrder.numbers_list as string, []),
              unit_price: Number(existingOrder.unit_price),
              total_amount: Number(existingOrder.total_amount),
              payment_method: existingOrder.payment_method as string,
              expires_at: existingOrder.expires_at as string,
            },
          },
          { status: 200 }
        );
      }
    }

    // 1. Rate Limiting: máximo 5 reservas por 10 minutos por IP (x-forwarded-for)
    const ip = getClientIp(request.headers);
    const rate = await checkRateLimit(
      `reservations:${ip}`,
      RESERVATIONS_RATE_LIMIT_MAX,
      RESERVATIONS_RATE_LIMIT_WINDOW_SECONDS
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error:
            'Alcanzaste el límite máximo de 5 solicitudes de reserva cada 10 minutos desde tu conexión. Por favor aguardá unos minutos antes de volver a intentar.',
        },
        { status: 429 }
      );
    }

    // 2. Validaciones básicas de entrada
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

    // Filtrar números únicos válidos del 1 al TOTAL_NUMBERS
    const uniqueNumbers = Array.from(new Set(numbers.map(n => parseInt(String(n), 10))))
      .filter(n => !isNaN(n) && n >= 1 && n <= TOTAL_NUMBERS)
      .sort((a, b) => a - b);

    if (uniqueNumbers.length === 0) {
      return NextResponse.json({ error: 'Los números seleccionados son inválidos.' }, { status: 400 });
    }

    // Liberación reactiva sin throttle previa a reservar
    await releaseExpiredReservations().catch(() => {});

    // 3. Comprobar configuración global y topes dinámicos
    const settings = await getSettings();
    if (settings.public_reservations_enabled !== 'true') {
      return NextResponse.json({ error: 'Las solicitudes públicas de números se encuentran momentáneamente pausadas por la administración.' }, { status: 403 });
    }

    const maxNumbersPerOrder = Math.max(
      1,
      parseInt(settings.max_numbers_per_order || String(DEFAULT_MAX_NUMBERS_PER_ORDER), 10) || DEFAULT_MAX_NUMBERS_PER_ORDER
    );
    const maxPendingPerPhone = Math.max(
      1,
      parseInt(settings.max_pending_numbers_per_phone || String(DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE), 10) || DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE
    );

    if (uniqueNumbers.length > maxNumbersPerOrder) {
      return NextResponse.json(
        { error: `No es posible solicitar más de ${maxNumbersPerOrder} números en una única operación.` },
        { status: 400 }
      );
    }

    const unitPrice = Math.max(1, parseInt(settings.ticket_price || '100', 10));
    const reserveHours = Math.max(1, parseInt(settings.reserve_hours || '48', 10));
    const totalAmount = uniqueNumbers.length * unitPrice;

    const expiresAt = new Date(Date.now() + reserveHours * 60 * 60 * 1000).toISOString();
    const privateToken = generatePrivateToken();

    const tx = await db.transaction('write');

    try {
      // Si viene request_id, verificar también dentro de la transacción de escritura
      if (requestId) {
        const insideCheck = await tx.execute({
          sql: `SELECT code, private_token, numbers_count, numbers_list, unit_price, total_amount, payment_method, expires_at
                FROM orders WHERE request_id = ? LIMIT 1`,
          args: [requestId],
        });
        if (insideCheck.rows.length > 0) {
          await tx.rollback();
          const existingOrder = insideCheck.rows[0];
          return NextResponse.json(
            {
              success: true,
              idempotent: true,
              order: {
                code: existingOrder.code as string,
                private_token: existingOrder.private_token as string,
                numbers_count: Number(existingOrder.numbers_count),
                numbers: safeJsonParse<number[]>(existingOrder.numbers_list as string, []),
                unit_price: Number(existingOrder.unit_price),
                total_amount: Number(existingOrder.total_amount),
                payment_method: existingOrder.payment_method as string,
                expires_at: existingOrder.expires_at as string,
              },
            },
            { status: 200 }
          );
        }
      }

      // 4. Validar tope de números pendientes por celular dentro de la transacción
      const pendingByPhoneRes = await tx.execute({
        sql: `SELECT COALESCE(SUM(numbers_count), 0) as pending_count
              FROM orders
              WHERE buyer_phone = ? AND payment_status = 'pending'`,
        args: [cleanPhone],
      });
      const currentPendingForPhone = Number(pendingByPhoneRes.rows[0]?.pending_count || 0);
      if (currentPendingForPhone + uniqueNumbers.length > maxPendingPerPhone) {
        await tx.rollback();
        return NextResponse.json(
          {
            error: `El número de celular ${cleanPhone} ya cuenta con ${currentPendingForPhone} número(s) pendientes de pago y el tope permitido es de ${maxPendingPerPhone} números pendientes por celular.`,
          },
          { status: 400 }
        );
      }

      // Generar código de orden único dentro de la transacción (con reintento ante colisión)
      const orderCode = await generateUniqueOrderCode(tx);

      // 5. Verificación atómica de disponibilidad de TODOS los números solicitados (en bloques de 500)
      const unavailable: number[] = [];
      const foundSet = new Set<number>();

      for (const chunk of chunkArray(uniqueNumbers, SQL_IN_CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(',');
        const checkRes = await tx.execute({
          sql: `SELECT number, status FROM numbers WHERE number IN (${placeholders})`,
          args: chunk,
        });

        for (const row of checkRes.rows) {
          const num = Number(row.number);
          foundSet.add(num);
          if (row.status !== 'available') {
            unavailable.push(num);
          }
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
        return NextResponse.json(
          {
            error: 'Uno o más números seleccionados acaban de ser reservados o vendidos.',
            conflictNumbers: unavailable,
          },
          { status: 409 }
        );
      }

      // 6. Crear o reutilizar comprador (conservando el nombre más completo en el directorio principal)
      let buyerId: number;
      const existingBuyer = await tx.execute({
        sql: 'SELECT id, name FROM buyers WHERE phone = ? LIMIT 1',
        args: [cleanPhone],
      });

      if (existingBuyer.rows.length > 0) {
        buyerId = Number(existingBuyer.rows[0].id);
        const currentName = String(existingBuyer.rows[0].name || '').trim();
        if (buyer_name.trim().length > currentName.length) {
          await tx.execute({
            sql: 'UPDATE buyers SET name = ? WHERE id = ?',
            args: [buyer_name.trim(), buyerId],
          });
        }
      } else {
        const insertBuyer = await tx.execute({
          sql: 'INSERT INTO buyers (name, phone) VALUES (?, ?)',
          args: [buyer_name.trim(), cleanPhone],
        });
        buyerId = Number(insertBuyer.lastInsertRowid);
      }

      // 7. Crear la orden de pedido (con request_id para idempotencia)
      const insertOrder = await tx.execute({
        sql: `INSERT INTO orders (
          code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
          unit_price, numbers_count, total_amount, numbers_list, private_token,
          expires_at, is_direct_sale, request_id
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 0, ?)`,
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
          expiresAt,
          requestId,
        ],
      });

      const orderId = Number(insertOrder.lastInsertRowid);

      // 8. Actualizar el estado de los números a 'reserved' exigiendo AND status = 'available' y rowsAffected === cantidad
      let updatedRowsCount = 0;
      for (const chunk of chunkArray(uniqueNumbers, SQL_IN_CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(',');
        const updRes = await tx.execute({
          sql: `UPDATE numbers 
                SET status = 'reserved', order_id = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE number IN (${placeholders}) AND status = 'available'`,
          args: [orderId, ...chunk],
        });
        updatedRowsCount += Number(updRes.rowsAffected || 0);
      }

      if (updatedRowsCount !== uniqueNumbers.length) {
        await tx.rollback();
        return NextResponse.json(
          {
            error: 'Uno o más números seleccionados acaban de ser reservados o vendidos.',
          },
          { status: 409 }
        );
      }

      // Confirmar transacción
      await tx.commit();
      invalidatePublicCache();

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
          expires_at: expiresAt,
        },
      });
    } catch (txError) {
      await tx.rollback().catch(() => {});
      throw txError;
    }
  } catch (error) {
    console.error('Error al procesar reserva:', error);
    return NextResponse.json({ error: 'No se pudo completar la reserva. Por favor intenta nuevamente.' }, { status: 500 });
  }
}
