import { createClient } from '@libsql/client';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Migración idempotente de esquema v2:
 * 1. Tabla `rate_limits (key, window_start, count, PRIMARY KEY (key, window_start))`
 * 2. Columna `orders.request_id` (verificando con PRAGMA table_info antes de ALTER)
 * 3. Índice único `idx_orders_request_id` sobre `orders(request_id)`
 * 4. Settings por defecto: `max_numbers_per_order = '2000'` y `max_pending_numbers_per_phone = '1000'`
 *
 * Seguridad:
 * - Por defecto opera sobre SQLite local (`file:./rifa.db` o `--db=file:...`).
 * - Para ejecutar contra Turso remoto (`libsql://...`), exige pasar explícitamente `--confirm-turso`.
 */

const args = process.argv.slice(2);
const dbArg = args.find(a => a.startsWith('--db='))?.slice('--db='.length);
const confirmTurso = args.includes('--confirm-turso');

const rawUrl =
  dbArg ||
  process.env.MIGRATE_DATABASE_URL ||
  (confirmTurso ? process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL : undefined) ||
  'file:./rifa.db';
const isRemote = rawUrl.startsWith('libsql://') || rawUrl.startsWith('https://');

if (isRemote && !confirmTurso) {
  console.error(
    '[BLOQUEO DE SEGURIDAD] Se detectó una URL remota de Turso pero no se incluyó el flag --confirm-turso.\n' +
    'Para aplicar esta migración en Turso de producción tras confirmación explícita, ejecutá:\n' +
    '  node scripts/migrate-schema-v2.mjs --db="$TURSO_DATABASE_URL" --confirm-turso'
  );
  process.exit(1);
}

let finalUrl = rawUrl;
if (rawUrl.startsWith('file:')) {
  const filePath = rawUrl.replace('file:', '');
  if (!path.isAbsolute(filePath)) {
    finalUrl = `file:${path.resolve(process.cwd(), filePath)}`;
  }
}

const authToken = isRemote
  ? process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined
  : undefined;

export async function runMigration(client) {
  // 1. Crear tabla rate_limits (idempotente)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (key, window_start)
    )
  `);

  // 2. Verificar si existe la columna request_id en orders antes de ALTER TABLE
  const colsRes = await client.execute('PRAGMA table_info(orders)');
  const hasRequestId = colsRes.rows.some(r => r.name === 'request_id');
  if (!hasRequestId) {
    await client.execute('ALTER TABLE orders ADD COLUMN request_id TEXT');
  }

  // 3. Crear índice UNIQUE sobre orders(request_id)
  await client.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request_id ON orders(request_id)'
  );

  // 4. Insertar nuevos settings con sus valores por defecto sin pisar valores existentes
  const defaultNewSettings = [
    ['max_numbers_per_order', '2000'],
    ['max_pending_numbers_per_phone', '1000'],
  ];

  for (const [key, value] of defaultNewSettings) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      args: [key, value],
    });
  }

  return { addedRequestIdColumn: !hasRequestId };
}

async function main() {
  console.log(`--- MIGRACIÓN IDEMPOTENTE DE ESQUEMA V2 (${isRemote ? 'Turso Remoto' : finalUrl}) ---`);
  const client = createClient({ url: finalUrl, authToken });
  try {
    const result = await runMigration(client);
    console.log(
      `✓ Tabla rate_limits verificada.\n` +
      `✓ Columna orders.request_id: ${result.addedRequestIdColumn ? 'agregada' : 'ya existía'}.\n` +
      `✓ Índice UNIQUE idx_orders_request_id verificado.\n` +
      `✓ Settings max_numbers_per_order (2000) y max_pending_numbers_per_phone (1000) verificados.`
    );
  } catch (err) {
    console.error('Error ejecutando migración:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
