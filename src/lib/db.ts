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
    contact_phone: '',
    reserve_hours: '48',
    public_reservations_enabled: 'true',
    rules_terms: '1. El valor de cada número es de ARS 100.\n2. Los pagos se reciben por transferencia bancaria o en efectivo coordinando con los administradores.\n3. Una vez realizada la reserva, contás con el plazo establecido para enviar el comprobante de pago antes de que el número sea liberado.\n4. El sorteo se realizará en la fecha a confirmar.',
  };

  for (const row of res.rows) {
    defaults[row.key as string] = row.value as string;
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
 * Libera de forma atómica y segura las reservas vencidas sin requerir un cron externo pago
 */
export async function releaseExpiredReservations(): Promise<{ releasedOrdersCount: number; releasedNumbersCount: number }> {
  const db = getDb();
  
  // Buscar órdenes vencidas pendientes
  const expiredOrdersRes = await db.execute({
    sql: `SELECT id, numbers_list FROM orders 
          WHERE payment_status = 'pending' 
          AND datetime(expires_at) < datetime('now')`,
    args: []
  });

  if (expiredOrdersRes.rows.length === 0) {
    return { releasedOrdersCount: 0, releasedNumbersCount: 0 };
  }

  const orderIds = expiredOrdersRes.rows.map(r => r.id as number);
  let totalNumbers = 0;

  for (const row of expiredOrdersRes.rows) {
    try {
      const nums = JSON.parse(row.numbers_list as string);
      totalNumbers += Array.isArray(nums) ? nums.length : 0;
    } catch {
      // Ignorar parseo si estuviera dañado
    }
  }

  const tx = await db.transaction('write');
  try {
    // 1. Liberar los números asociados a esas órdenes vencidas
    const placeholders = orderIds.map(() => '?').join(',');
    await tx.execute({
      sql: `UPDATE numbers 
            SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
            WHERE order_id IN (${placeholders})`,
      args: orderIds
    });

    // 2. Marcar las órdenes como vencidas (expired)
    await tx.execute({
      sql: `UPDATE orders 
            SET payment_status = 'expired' 
            WHERE id IN (${placeholders})`,
      args: orderIds
    });

    await tx.commit();

    // Registrar en auditoría
    await logAudit('SYSTEM_AUTO_CLEAN', 'EXPIRE_RESERVATIONS', {
      orderIds,
      releasedNumbersCount: totalNumbers,
      timestamp: new Date().toISOString()
    });

    return {
      releasedOrdersCount: orderIds.length,
      releasedNumbersCount: totalNumbers
    };
  } catch (err) {
    await tx.rollback();
    console.error('Error liberando reservas vencidas:', err);
    throw err;
  }
}
