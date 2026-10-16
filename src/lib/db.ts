import { createClient, Client } from '@libsql/client';
import path from 'path';

let clientInstance: Client | null = null;

/**
 * Obtiene la instancia singleton del cliente de base de datos
 */
export function getDb(): Client {
  if (!clientInstance) {
    const dbUrl = process.env.DATABASE_URL || 'file:./rifa.db';
    const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

    // Si es una ruta relativa de archivo local, asegurar la resolución absoluta
    let finalUrl = dbUrl;
    if (dbUrl.startsWith('file:')) {
      const filePath = dbUrl.replace('file:', '');
      if (!path.isAbsolute(filePath)) {
        finalUrl = `file:${path.resolve(process.cwd(), filePath)}`;
      }
    }

    clientInstance = createClient({
      url: finalUrl,
      authToken: authToken,
    });
  }
  return clientInstance;
}

export interface SettingsMap {
  raffle_name: string;
  raffle_description: string;
  ticket_price: string;
  prizes: string;
  draw_date: string;
  bank_alias: string;
  bank_cbu: string;
  bank_name: string;
  bank_holder: string;
  contact_phone: string;
  contact_phone_secondary: string;
  reserve_hours: string;
  public_reservations_enabled: string;
  rules_terms: string;
  [key: string]: string;
}

/**
 * Obtiene todas las configuraciones del sistema
 */
export async function getSettings(): Promise<SettingsMap> {
  const db = getDb();
  const res = await db.execute('SELECT key, value FROM settings');
  const defaults: SettingsMap = {
    raffle_name: 'Gran Rifa Familiar pro Terreno',
    raffle_description: 'Rifa solidaria familiar de 80.000 números para pagar las cuotas de nuestro lote.',
    ticket_price: '100',
    prizes: 'Premios a confirmar',
    draw_date: 'Fecha del sorteo a confirmar',
    bank_alias: '',
    bank_cbu: '',
    bank_name: '',
    bank_holder: '',
    contact_phone: '3884152040',
    contact_phone_secondary: '3884141514',
    reserve_hours: '48',
    public_reservations_enabled: 'true',
    rules_terms: '1. El valor de cada número es de ARS 100.\n2. Los pagos se reciben por transferencia bancaria o en efectivo coordinando con los administradores.\n3. Una vez realizada la reserva, contás con el plazo establecido para enviar el comprobante de pago antes de que el número sea liberado.\n4. El sorteo se realizará en la fecha a confirmar.',
  };

  for (const row of res.rows) {
    const key = row.key as string;
    const val = row.value as string;
    if ((key === 'contact_phone' || key === 'contact_phone_secondary') && (!val || !val.trim())) {
      continue;
    }
    defaults[key] = val;
  }
  return defaults;
}

/**
 * Registra una acción sensible en el historial de auditoría
 */
export async function logAudit(
  adminUsername: string,
  action: string,
  details: Record<string, unknown> | string,
  ipAddress?: string
) {
  try {
    const db = getDb();
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    await db.execute({
      sql: 'INSERT INTO audit_logs (admin_username, action, details, ip_address) VALUES (?, ?, ?, ?)',
      args: [adminUsername, action, detailsStr, ipAddress || null]
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
}

/**
 * Libera de forma atómica y segura las reservas vencidas sin requerir un cron externo pago.
 * Realiza tanto la lectura como la liberación dentro de la misma transacción de escritura,
 * verificando que la orden siga 'pending' y los números sigan 'reserved'.
 */
export async function releaseExpiredReservations(): Promise<{ releasedOrdersCount: number; releasedNumbersCount: number }> {
  const db = getDb();

  // Verificación rápida de lectura para evitar abrir transacciones innecesarias cuando no hay vencidos
  const quickCheck = await db.execute({
    sql: `SELECT 1 FROM orders WHERE payment_status = 'pending' AND datetime(expires_at) < datetime('now') LIMIT 1`,
    args: []
  });

  if (quickCheck.rows.length === 0) {
    return { releasedOrdersCount: 0, releasedNumbersCount: 0 };
  }

  const tx = await db.transaction('write');
  let orderIds: number[] = [];
  let releasedNumbersCount = 0;

  try {
    // 1. Buscar órdenes vencidas pendientes DENTRO de la transacción de escritura
    const expiredOrdersRes = await tx.execute({
      sql: `SELECT id, numbers_list FROM orders 
            WHERE payment_status = 'pending' 
            AND datetime(expires_at) < datetime('now')`,
      args: []
    });

    if (expiredOrdersRes.rows.length === 0) {
      await tx.rollback();
      return { releasedOrdersCount: 0, releasedNumbersCount: 0 };
    }

    orderIds = expiredOrdersRes.rows.map(r => Number(r.id));
    const placeholders = orderIds.map(() => '?').join(',');

    // 2. Marcar como vencidas ÚNICAMENTE las órdenes que continúen en estado 'pending'
    const updateOrdersRes = await tx.execute({
      sql: `UPDATE orders 
            SET payment_status = 'expired' 
            WHERE id IN (${placeholders}) 
            AND payment_status = 'pending' 
            AND datetime(expires_at) < datetime('now')`,
      args: orderIds
    });

    // 3. Liberar ÚNICAMENTE los números en estado 'reserved' pertenecientes a órdenes que ahora están 'expired'
    const updateNumbersRes = await tx.execute({
      sql: `UPDATE numbers 
            SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE order_id IN (${placeholders}) 
            AND status = 'reserved'
            AND order_id IN (SELECT id FROM orders WHERE id IN (${placeholders}) AND payment_status = 'expired')`,
      args: [...orderIds, ...orderIds]
    });

    releasedNumbersCount = Number(updateNumbersRes.rowsAffected || 0);
    const releasedOrdersCount = Number(updateOrdersRes.rowsAffected || 0);

    await tx.commit();

    if (releasedOrdersCount > 0) {
      await logAudit('SYSTEM_AUTO_CLEAN', 'EXPIRE_RESERVATIONS', {
        orderIds,
        releasedOrdersCount,
        releasedNumbersCount,
        timestamp: new Date().toISOString()
      });
    }

    return {
      releasedOrdersCount,
      releasedNumbersCount
    };
  } catch (err) {
    await tx.rollback().catch(() => {});
    console.error('Error liberando reservas vencidas:', err);
    throw err;
  }
}
