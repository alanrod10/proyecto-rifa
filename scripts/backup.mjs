import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

console.log('--- PROCESO DE COPIA DE SEGURIDAD (BACKUP) ---');

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

async function runBackup() {
  if (!fs.existsSync(sourceDbPath)) {
    console.error(`Error: No se encontró la base de datos origen en: ${sourceDbPath}`);
    process.exit(1);
  }

  // 1. Obtener métricas y verificar integridad antes de respaldar
  const client = createClient({ url: `file:${sourceDbPath}` });
  try {
    const ordersRes = await client.execute('SELECT COUNT(*) as count FROM orders');
    const buyersRes = await client.execute('SELECT COUNT(*) as count FROM buyers');
    const numbersRes = await client.execute('SELECT COUNT(*) as count FROM numbers');
    const soldRes = await client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'sold'");
    const reservedRes = await client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'reserved'");
    const availableRes = await client.execute("SELECT COUNT(*) as count FROM numbers WHERE status = 'available'");
    const settingsRes = await client.execute('SELECT COUNT(*) as count FROM settings');

    const meta = {
      timestamp: now.toISOString(),
      backup_file: targetDbName,
      metrics: {
        total_numbers: Number(numbersRes.rows[0].count),
        available_numbers: Number(availableRes.rows[0].count),
        reserved_numbers: Number(reservedRes.rows[0].count),
        sold_numbers: Number(soldRes.rows[0].count),
        total_orders: Number(ordersRes.rows[0].count),
        total_buyers: Number(buyersRes.rows[0].count),
        total_settings: Number(settingsRes.rows[0].count)
      }
    };

    client.close();

    // 2. Copiar archivo binario de SQLite
    fs.copyFileSync(sourceDbPath, targetDbPath);
    fs.writeFileSync(targetMetaPath, JSON.stringify(meta, null, 2), 'utf-8');

    const stats = fs.statSync(targetDbPath);
    console.log(`✓ Copia de seguridad generada con éxito:`);
    console.log(`  Archivo: ${targetDbPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`  Metadatos: ${targetMetaPath}`);
    console.log(`  Métricas respaldadas:`, meta.metrics);
  } catch (err) {
    console.error('Error generando el respaldo:', err);
    process.exit(1);
  }
}

runBackup();
