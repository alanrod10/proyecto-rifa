import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

console.log('--- PROCESO DE RESTAURACIÓN DE BASE DE DATOS (LOCAL / TURSO CLOUD) ---');

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
const targetDbPath = path.join(process.cwd(), 'rifa.db');

async function restoreJsonSnapshot(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  if (!raw.data) {
    throw new Error('El archivo JSON no contiene un bloque "data" de respaldo completo.');
  }

  const dbUrl = process.env.DATABASE_URL || `file:${targetDbPath}`;
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
  const client = createClient({ url: dbUrl, authToken });

  try {
    const tx = await client.transaction('write');
    try {
      // Restaurar settings
      if (Array.isArray(raw.data.settings)) {
        for (const s of raw.data.settings) {
          await tx.execute({
            sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            args: [s.key, s.value, s.updated_at || null]
          });
        }
      }

      // Restaurar buyers y orders
      if (Array.isArray(raw.data.buyers)) {
        for (const b of raw.data.buyers) {
          await tx.execute({
            sql: `INSERT OR REPLACE INTO buyers (id, name, phone, created_at) VALUES (?, ?, ?, ?)`,
            args: [b.id, b.name, b.phone, b.created_at]
          });
        }
      }

      if (Array.isArray(raw.data.orders)) {
        for (const o of raw.data.orders) {
          await tx.execute({
            sql: `INSERT OR REPLACE INTO orders (
              id, code, buyer_id, buyer_name, buyer_phone, payment_method, payment_status,
              unit_price, numbers_count, total_amount, numbers_list, private_token,
              expires_at, paid_at, confirmed_by_admin, is_direct_sale, created_by_admin, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              o.id, o.code, o.buyer_id, o.buyer_name, o.buyer_phone, o.payment_method, o.payment_status,
              o.unit_price, o.numbers_count, o.total_amount, o.numbers_list, o.private_token,
              o.expires_at, o.paid_at, o.confirmed_by_admin, o.is_direct_sale, o.created_by_admin, o.notes, o.created_at
            ]
          });
        }
      }

      // Resetear números a available y reaplicar ocupados
      await tx.execute("UPDATE numbers SET status = 'available', order_id = NULL");
      if (Array.isArray(raw.data.occupied_numbers)) {
        for (const n of raw.data.occupied_numbers) {
          await tx.execute({
            sql: `UPDATE numbers SET status = ?, order_id = ?, updated_at = COALESCE(?, CURRENT_TIMESTAMP) WHERE number = ?`,
            args: [n.status, n.order_id, n.updated_at || null, n.number]
          });
        }
      }

      await tx.commit();
      console.log(`✓ Snapshot JSON restaurado exitosamente en ${dbUrl.startsWith('libsql://') ? 'Turso Cloud' : 'SQLite Local'}.`);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } finally {
    client.close();
  }
}

async function runRestore() {
  const args = process.argv.slice(2);
  let backupFile = args[0];

  if (!backupFile) {
    if (!fs.existsSync(backupDir)) {
      console.error('Error: No existe el directorio de respaldos.');
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => (f.endsWith('.db') || f.endsWith('.json')) && !f.startsWith('pre_restore') && !f.startsWith('test_'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error('Error: No se encontraron archivos de respaldo en backups/');
      process.exit(1);
    }

    backupFile = path.join(backupDir, files[0]);
    console.log(`Seleccionando automáticamente el respaldo más reciente: ${files[0]}`);
  } else {
    backupFile = path.resolve(process.cwd(), backupFile);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Error: El archivo de respaldo no existe: ${backupFile}`);
    process.exit(1);
  }

  if (backupFile.endsWith('.json')) {
    await restoreJsonSnapshot(backupFile);
    return;
  }

  // Verificar integridad del archivo .db de respaldo
  console.log(`Verificando integridad del respaldo SQLite: ${backupFile}`);
  const testClient = createClient({ url: `file:${backupFile}` });
  try {
    const checkNumbers = await testClient.execute('SELECT COUNT(*) as count FROM numbers');
    const numbersCount = Number(checkNumbers.rows[0].count);
    if (numbersCount !== 80000) {
      throw new Error(`Integridad fallida: el respaldo contiene ${numbersCount} números en lugar de 80.000.`);
    }

    const checkSettings = await testClient.execute('SELECT COUNT(*) as count FROM settings');
    const checkAdmins = await testClient.execute('SELECT COUNT(*) as count FROM admins');
    console.log(`✓ Verificación exitosa: 80.000 números, ${checkSettings.rows[0].count} configuraciones, ${checkAdmins.rows[0].count} administradores.`);
    testClient.close();

    if (fs.existsSync(targetDbPath)) {
      const emergencyBak = path.join(backupDir, `pre_restore_${Date.now()}.db`);
      fs.copyFileSync(targetDbPath, emergencyBak);
      console.log(`Copia preventiva de seguridad creada en: ${emergencyBak}`);
    }

    fs.copyFileSync(backupFile, targetDbPath);
    console.log('----------------------------------------------------');
    console.log('✓ RESTAURACIÓN COMPLETADA EXITOSAMENTE.');
    console.log(`  Base de datos activa actualizada desde: ${path.basename(backupFile)}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error durante la verificación o restauración:', err);
    process.exit(1);
  }
}

runRestore();
