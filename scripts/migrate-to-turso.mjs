import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const localDbPath = path.resolve(process.cwd(), 'rifa.db');

function askQuestion(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim().replace(/^["']|["']$/g, ''));
    });
  });
}

async function migrate() {
  console.log('====================================================');
  console.log('   MIGRACIÓN DE DATOS A TURSO LIBSQL (NUBE $0)');
  console.log('====================================================');

  let tursoUrl = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  let tursoToken = (process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '').trim().replace(/^["']|["']$/g, '');

  if (!tursoUrl || !tursoUrl.startsWith('libsql://')) {
    console.log('\nPor favor ingresá las credenciales que te dio Turso en la web:');
    tursoUrl = await askQuestion('\n1. Pegá aquí la URL de Turso (empieza con libsql://): ');
  }

  if (!tursoToken) {
    tursoToken = await askQuestion('\n2. Pegá aquí el Token de Turso: ');
  }

  if (!tursoUrl || !tursoUrl.startsWith('libsql://')) {
    console.error('\nError: La URL de Turso debe comenzar con "libsql://" (ej: libsql://rifa-prod-alanrod10.turso.io).');
    process.exit(1);
  }

  if (!tursoToken) {
    console.error('\nError: El token de Turso no puede estar vacío.');
    process.exit(1);
  }

  if (!fs.existsSync(localDbPath)) {
    console.error(`\nError: No se encontró el archivo local ${localDbPath}`);
    process.exit(1);
  }

  console.log(`\n1. Conectando a base local: ${localDbPath}`);
  const local = createClient({ url: `file:${localDbPath}` });

  console.log(`2. Conectando a Turso remoto: ${tursoUrl}`);
  const remote = createClient({ url: tursoUrl, authToken: tursoToken });

  try {
    // 1. Crear esquema en Turso
    console.log('3. Creando tablas e índices en Turso...');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/schema.sql'), 'utf-8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await remote.execute(stmt);
    }
    console.log('   ✓ Tablas e índices creados en Turso.');

    // 2. Migrar configuraciones
    console.log('4. Migrando configuraciones...');
    const settings = await local.execute('SELECT key, value FROM settings');
    for (const row of settings.rows) {
      await remote.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        args: [row.key, row.value]
      });
    }
    console.log(`   ✓ ${settings.rows.length} configuraciones migradas.`);

    // 3. Migrar administradores
    console.log('5. Migrando cuentas administradoras (Alan e Yilda)...');
    const admins = await local.execute('SELECT id, username, password_hash, display_name FROM admins');
    for (const admin of admins.rows) {
      await remote.execute({
        sql: 'INSERT OR REPLACE INTO admins (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
        args: [admin.id, admin.username, admin.password_hash, admin.display_name]
      });
    }
    console.log(`   ✓ ${admins.rows.length} administradores migrados con contraseñas seguras intactas.`);

    // 4. Migrar los 80.000 números
    console.log('6. Verificando números en Turso...');
    const remoteNumsCheck = await remote.execute('SELECT COUNT(*) as count FROM numbers');
    const remoteCount = Number(remoteNumsCheck.rows[0].count);

    if (remoteCount < 80000) {
      console.log(`   Subiendo 80.000 números a Turso en lotes...`);
      console.time('   Tiempo de subida');
      const BATCH_SIZE = 2000;
      const TOTAL = 80000;

      for (let start = 1; start <= TOTAL; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE - 1, TOTAL);
        const placeholders = [];
        const values = [];

        for (let n = start; n <= end; n++) {
          placeholders.push('(?)');
          values.push(n);
        }

        const sql = `INSERT OR IGNORE INTO numbers (number) VALUES ${placeholders.join(',')}`;
        await remote.execute({ sql, args: values });

        if (end % 20000 === 0 || end === TOTAL) {
          console.log(`   -> Sincronizados hasta el número ${end} de ${TOTAL}`);
        }
      }
      console.timeEnd('   Tiempo de subida');
    } else {
      console.log(`   ✓ Turso ya cuenta con los ${remoteCount} números.`);
    }

    // 5. Verificación final
    const finalCheck = await remote.execute('SELECT COUNT(*) as c FROM numbers');
    const adminsCheck = await remote.execute('SELECT username, display_name FROM admins');

    console.log('\n====================================================');
    console.log('✓ MIGRACIÓN A TURSO COMPLETADA CON ÉXITO');
    console.log(`  - Total números en Turso: ${finalCheck.rows[0].c}`);
    console.log(`  - Administradores en Turso:`, adminsCheck.rows);
    console.log('  La base de datos en la nube está 100% lista para Vercel.');
    console.log('====================================================');
  } catch (err) {
    console.error('\nError durante la migración a Turso:', err);
    process.exit(1);
  } finally {
    local.close();
    remote.close();
  }
}

migrate();
