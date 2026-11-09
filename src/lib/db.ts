import { createClient, Client, Transaction } from '@libsql/client';
import path from 'path';
import {
  TOTAL_NUMBERS,
  PUBLIC_CACHE_TTL_MS,
  EXPIRY_THROTTLE_MS,
  SQL_IN_CHUNK_SIZE,
  DEFAULT_MAX_NUMBERS_PER_ORDER,
  DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE,
  DEFAULT_CONTACT_PHONE,
  DEFAULT_CONTACT_PHONE_SECONDARY,
  DEFAULT_TICKET_PRICE,
  DEFAULT_RESERVE_HOURS,
  DEFAULT_SETTINGS,
} from '@/lib/constants';
import { chunkArray } from '@/lib/utils';

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
  raffle_badge: string;
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
  max_numbers_per_order: string;
  max_pending_numbers_per_phone: string;
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
    raffle_badge: DEFAULT_SETTINGS.raffle_badge,
    raffle_name: DEFAULT_SETTINGS.raffle_name,
    raffle_description: DEFAULT_SETTINGS.raffle_description,
    ticket_price: String(DEFAULT_TICKET_PRICE),
    prizes: DEFAULT_SETTINGS.prizes,
    draw_date: DEFAULT_SETTINGS.draw_date,
    bank_alias: DEFAULT_SETTINGS.bank_alias,
    bank_cbu: DEFAULT_SETTINGS.bank_cbu,
    bank_name: DEFAULT_SETTINGS.bank_name,
    bank_holder: DEFAULT_SETTINGS.bank_holder,
    contact_phone: DEFAULT_CONTACT_PHONE,
    contact_phone_secondary: DEFAULT_CONTACT_PHONE_SECONDARY,
    reserve_hours: String(DEFAULT_RESERVE_HOURS),
    public_reservations_enabled: 'true',
    max_numbers_per_order: String(DEFAULT_MAX_NUMBERS_PER_ORDER),
    max_pending_numbers_per_phone: String(DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE),
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

export interface NumberStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
}

/**
 * Calcula las estadísticas de números usando idx_numbers_status (solo lee filas 'sold' y 'reserved')
 * y deriva available = TOTAL_NUMBERS - reserved - sold.
 */
export async function getNumberStats(dbOrTx?: Client | Transaction): Promise<NumberStats> {
  const executor = dbOrTx || getDb();
  const [soldRes, reservedRes] = await Promise.all([
    executor.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'sold'"),
    executor.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'reserved'"),
  ]);
  const sold = Number(soldRes.rows[0]?.count || 0);
  const reserved = Number(reservedRes.rows[0]?.count || 0);
  const available = Math.max(0, TOTAL_NUMBERS - reserved - sold);

  return {
    total: TOTAL_NUMBERS,
    available,
    reserved,
    sold,
  };
}

type PublicSettingsAndStatsResult = {
  settings: {
    raffle_badge: string;
    raffle_name: string;
    raffle_description: string;
    ticket_price: number;
    prizes: string;
    draw_date: string;
    bank_alias: string;
    bank_cbu: string;
    bank_name: string;
    bank_holder: string;
    contact_phone: string;
    contact_phone_secondary: string;
    reserve_hours: number;
    public_reservations_enabled: boolean;
    max_numbers_per_order: number;
    max_pending_numbers_per_phone: number;
    rules_terms: string;
  };
  stats: NumberStats;
};

let publicStatsCache: {
  data: PublicSettingsAndStatsResult;
  expiresAt: number;
} | null = null;

export function invalidatePublicCache(): void {
  publicStatsCache = null;
}

/**
 * Obtiene las configuraciones públicas y estadísticas consolidadas con caché en memoria de 10 s por instancia
 */
export async function getPublicSettingsAndStats(): Promise<PublicSettingsAndStatsResult> {
  await releaseExpiredReservationsThrottled().catch(() => {});

  const now = Date.now();
  if (publicStatsCache && publicStatsCache.expiresAt > now) {
    return publicStatsCache.data;
  }

  const [settings, stats] = await Promise.all([
    getSettings(),
    getNumberStats(),
  ]);

  const data: PublicSettingsAndStatsResult = {
    settings: {
      raffle_badge: settings.raffle_badge || DEFAULT_SETTINGS.raffle_badge,
      raffle_name: settings.raffle_name || DEFAULT_SETTINGS.raffle_name,
      raffle_description: settings.raffle_description || DEFAULT_SETTINGS.raffle_description,
      ticket_price: Number(settings.ticket_price) || DEFAULT_TICKET_PRICE,
      prizes: settings.prizes || DEFAULT_SETTINGS.prizes,
      draw_date: settings.draw_date || DEFAULT_SETTINGS.draw_date,
      bank_alias: settings.bank_alias || '',
      bank_cbu: settings.bank_cbu || '',
      bank_name: settings.bank_name || '',
      bank_holder: settings.bank_holder || '',
      contact_phone: settings.contact_phone || DEFAULT_CONTACT_PHONE,
      contact_phone_secondary: settings.contact_phone_secondary || DEFAULT_CONTACT_PHONE_SECONDARY,
      reserve_hours: Number(settings.reserve_hours) || DEFAULT_RESERVE_HOURS,
      public_reservations_enabled: settings.public_reservations_enabled === 'true',
      max_numbers_per_order: Math.max(1, parseInt(settings.max_numbers_per_order || String(DEFAULT_MAX_NUMBERS_PER_ORDER), 10) || DEFAULT_MAX_NUMBERS_PER_ORDER),
      max_pending_numbers_per_phone: Math.max(1, parseInt(settings.max_pending_numbers_per_phone || String(DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE), 10) || DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE),
      rules_terms: settings.rules_terms || '',
    },
    stats,
  };

  publicStatsCache = {
    data,
    expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
  };

  return data;
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

let rateLimitTableEnsured = false;

/**
 * Controla límites de tasa por clave y ventana de tiempo en la tabla `rate_limits (key, window_start, count)`.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  dbOrTx?: Client | Transaction
): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
  const executor = dbOrTx || getDb();
  if (!rateLimitTableEnsured && !dbOrTx) {
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (key, window_start)
      )
    `).catch(() => {});
    rateLimitTableEnsured = true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;

  await executor.execute({
    sql: `INSERT INTO rate_limits (key, window_start, count)
          VALUES (?, ?, 1)
          ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
    args: [key, windowStart],
  });

  const countRes = await executor.execute({
    sql: 'SELECT count FROM rate_limits WHERE key = ? AND window_start = ? LIMIT 1',
    args: [key, windowStart],
  });

  const count = Number(countRes.rows[0]?.count || 1);
  const retryAfterSeconds = Math.max(1, windowStart + windowSeconds - nowSeconds);

  return {
    allowed: count <= maxRequests,
    count,
    retryAfterSeconds,
  };
}

let lastExpiryCheckAt = 0;

/**
 * Ejecuta releaseExpiredReservations como máximo una vez cada 60 s por instancia (para GET públicos).
 */
export async function releaseExpiredReservationsThrottled(): Promise<{ releasedOrdersCount: number; releasedNumbersCount: number }> {
  const now = Date.now();
  if (now - lastExpiryCheckAt < EXPIRY_THROTTLE_MS) {
    return { releasedOrdersCount: 0, releasedNumbersCount: 0 };
  }
  lastExpiryCheckAt = now;
  return releaseExpiredReservations();
}

/**
 * Libera de forma atómica y segura las reservas vencidas sin requerir un cron externo pago.
 * Realiza tanto la lectura como la liberación dentro de la misma transacción de escritura,
 * verificando que la orden siga 'pending' y los números sigan 'reserved'.
 */
export async function releaseExpiredReservations(): Promise<{ releasedOrdersCount: number; releasedNumbersCount: number }> {
  lastExpiryCheckAt = Date.now();
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
  let releasedOrdersCount = 0;

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

    // Procesar en bloques de 500 para respetar límites de variables SQL
    for (const chunk of chunkArray(orderIds, SQL_IN_CHUNK_SIZE)) {
      const placeholders = chunk.map(() => '?').join(',');

      // 2. Marcar como vencidas ÚNICAMENTE las órdenes que continúen en estado 'pending'
      const updateOrdersRes = await tx.execute({
        sql: `UPDATE orders 
              SET payment_status = 'expired' 
              WHERE id IN (${placeholders}) 
              AND payment_status = 'pending' 
              AND datetime(expires_at) < datetime('now')`,
        args: chunk
      });
      releasedOrdersCount += Number(updateOrdersRes.rowsAffected || 0);

      // 3. Liberar ÚNICAMENTE los números en estado 'reserved' pertenecientes a órdenes que ahora están 'expired'
      const updateNumbersRes = await tx.execute({
        sql: `UPDATE numbers 
              SET status = 'available', order_id = NULL, updated_at = CURRENT_TIMESTAMP 
              WHERE order_id IN (${placeholders}) 
              AND status = 'reserved'
              AND order_id IN (SELECT id FROM orders WHERE id IN (${placeholders}) AND payment_status = 'expired')`,
        args: [...chunk, ...chunk]
      });
      releasedNumbersCount += Number(updateNumbersRes.rowsAffected || 0);
    }

    await tx.commit();

    if (releasedOrdersCount > 0) {
      invalidatePublicCache();
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
