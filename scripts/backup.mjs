import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

console.log('--- PROCESO DE COPIA DE SEGURIDAD (BACKUP LOCAL Y TURSO CLOUD) ---');

// Cargar variables de .env.local si existen
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const targetDbName = `backup_${timestamp}.db`;
const targetMetaName = `backup_${timestamp}.json`;
const targetDbPath = path.join(backupDir, targetDbName);
const targetMetaPath = path.join(backupDir, targetMetaName);

const sourceDbPath = path.join(process.cwd(), 'rifa.db');
const dbUrl = process.env.DATABASE_URL || `file:${sourceDbPath}`;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
const isRemote = dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://');

async function runBackup() {
  if (!isRemote && !fs.existsSync(sourceDbPath)) {
    console.error(`Error: No se encontró la base de datos origen en: ${sourceDbPath}`);
    process.exit(1);
  }

  const client = createClient({
    url: isRemote ? dbUrl : `file:${sourceDbPath}`,
    authToken
  });

  try {
    console.log(`Conectando a origen de datos (${isRemote ? 'Turso Cloud' : 'SQLite Local'})...`);
    const [ordersRes, buyersRes, numbersRes, soldRes, reservedRes, availableRes, settingsRes, occupiedNumbersRes, adminsRes] = await Promise.all([
      client.execute('SELECT * FROM orders ORDER BY id ASC'),
      client.execute('SELECT * FROM buyers ORDER BY id ASC'),
      client.execute('SELECT COUNT(*) as count FROM numbers'),
      client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'sold'"),
      client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'reserved'"),
      client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'available'"),
      client.execute('SELECT * FROM settings ORDER BY key ASC'),
      client.execute("SELECT number, status, order_id, updated_at FROM numbers WHERE status != 'available' ORDER BY number ASC"),
      client.execute('SELECT id, username, password_hash, display_name, created_at FROM admins ORDER BY id ASC')
    ]);

    const snapshot = {
      version: '2.0',
      timestamp: now.toISOString(),
      source: isRemote ? 'turso_cloud' : 'sqlite_local',
      backup_file: fs.existsSync(sourceDbPath) ? targetDbName : null,
      metrics: {
        total_numbers: Number(numbersRes.rows[0].count),
        available_numbers: Number(availableRes.rows[0].count),
        reserved_numbers: Number(reservedRes.rows[0].count),
        sold_numbers: Number(soldRes.rows[0].count),
        total_orders: ordersRes.rows.length,
        total_buyers: buyersRes.rows.length,
        total_settings: settingsRes.rows.length
      },
      data: {
        settings: settingsRes.rows,
        admins: adminsRes.rows,
        buyers: buyersRes.rows,
        orders: ordersRes.rows,
        occupied_numbers: occupiedNumbersRes.rows
      }
    };

    // Guardar volcado JSON completo (compatible con Turso Cloud y SQLite local)
    fs.writeFileSync(targetMetaPath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // Si existe base SQLite local, generar respaldo binario consistente con WAL usando VACUUM INTO
    if (fs.existsSync(sourceDbPath)) {
      const localClient = isRemote ? createClient({ url: `file:${sourceDbPath}` }) : client;
      try {
        await localClient.execute({
          sql: `VACUUM INTO ?`,
          args: [targetDbPath]
        });
      } catch {
        fs.copyFileSync(sourceDbPath, targetDbPath);
      } finally {
        if (isRemote) localClient.close();
      }
    }

    client.close();

    console.log(`✓ Copia de seguridad generada con éxito:`);
    if (fs.existsSync(targetDbPath)) {
      const stats = fs.statSync(targetDbPath);
      console.log(`  Base SQLite (WAL-Safe): ${targetDbPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
    console.log(`  Snapshot Cloud/JSON:    ${targetMetaPath}`);
    console.log(`  Métricas respaldadas:`, snapshot.metrics);
  } catch (err) {
    console.error('Error generando el respaldo:', err);
    process.exit(1);
  }
}

runBackup();
