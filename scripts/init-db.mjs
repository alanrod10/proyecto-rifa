import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_URL = process.env.DATABASE_URL || 'file:./rifa.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined;

console.log('--- INICIALIZACIÓN DE BASE DE DATOS PROYECTO RIFA ---');
console.log(`Conectando a base de datos: ${DB_URL}`);

const client = createClient({
  url: DB_URL,
  authToken: AUTH_TOKEN,
});

async function main() {
  try {
    // 1. Leer y ejecutar el esquema DDL
    const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Separar por sentencias (evitando comentarios vacíos)
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Ejecutando ${statements.length} sentencias del esquema...`);
    for (const statement of statements) {
      await client.execute(statement);
    }
    console.log('✓ Esquema e índices creados con éxito.');

    // 2. Verificar y sembrar configuraciones iniciales
    const settingsCheck = await client.execute('SELECT COUNT(*) as count FROM settings');
    const settingsCount = Number(settingsCheck.rows[0].count);

    if (settingsCount === 0) {
      console.log('Insertando configuración inicial del sorteo...');
      const initialSettings = [
        ['raffle_name', 'Gran Rifa Familiar pro Terreno'],
        ['raffle_description', 'Rifa solidaria familiar de 80.000 números para pagar las cuotas de nuestro lote.'],
        ['ticket_price', '100'],
        ['prizes', 'Premios a confirmar'],
        ['draw_date', 'Fecha del sorteo a confirmar'],
        ['bank_alias', ''],
        ['bank_cbu', ''],
        ['bank_name', ''],
        ['bank_holder', ''],
        ['contact_phone', '3884152040'],
        ['contact_phone_secondary', '3884141514'],
        ['reserve_hours', '48'],
        ['public_reservations_enabled', 'true'],
        ['rules_terms', '1. Cada número tiene un valor de ARS 100.\n2. Los pagos se reciben por transferencia bancaria o en efectivo coordinando con los administradores.\n3. Una vez solicitada la reserva, contás con 48 hs para enviar el comprobante de pago.\n4. El sorteo se realizará ante escribano o transmisión pública en la fecha a confirmar.']
      ];

      for (const [key, val] of initialSettings) {
        await client.execute({
          sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
          args: [key, val]
        });
      }
      console.log('✓ Configuraciones iniciales insertadas.');
    } else {
      console.log(`✓ Ya existen ${settingsCount} registros de configuración.`);
    }

    // 3. Crear los dos administradores individuales
    const adminCheck = await client.execute('SELECT COUNT(*) as count FROM admins');
    const adminCount = Number(adminCheck.rows[0].count);

    if (adminCount === 0) {
      console.log('Creando cuentas individuales de los dos administradores...');
      const admin1User = process.env.DEFAULT_ADMIN1_USERNAME || 'alan';
      const admin1Pass = process.env.DEFAULT_ADMIN1_PASSWORD || 'Rifa2026!Admin1';
      const admin1Name = process.env.DEFAULT_ADMIN1_NAME || 'Alan';

      const admin2User = process.env.DEFAULT_ADMIN2_USERNAME || 'yilda';
      const admin2Pass = process.env.DEFAULT_ADMIN2_PASSWORD || 'Rifa2026!Admin2';
      const admin2Name = process.env.DEFAULT_ADMIN2_NAME || 'Yilda';

      const hash1 = await bcrypt.hash(admin1Pass, 10);
      const hash2 = await bcrypt.hash(admin2Pass, 10);

      await client.execute({
        sql: 'INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)',
        args: [admin1User, hash1, admin1Name]
      });

      await client.execute({
        sql: 'INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)',
        args: [admin2User, hash2, admin2Name]
      });

      console.log(`✓ Administrador 1 creado: ${admin1User} (${admin1Name})`);
      console.log(`✓ Administrador 2 creado: ${admin2User} (${admin2Name})`);
    } else {
      console.log(`✓ Ya existen ${adminCount} administradores registrados.`);
    }

    // 4. Sembrar los 80.000 números
    const numbersCheck = await client.execute('SELECT COUNT(*) as count FROM numbers');
    const numbersCount = Number(numbersCheck.rows[0].count);

    if (numbersCount < 80000) {
      console.log(`Poblando 80.000 números (del 1 al 80000)... Actualmente hay ${numbersCount}`);
      console.time('Tiempo de inserción de 80.000 números');

      // Insertar en lotes de 2.000 dentro de transacciones para máxima velocidad
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
        await client.execute({ sql, args: values });

        if (end % 20000 === 0 || end === TOTAL) {
          console.log(`  -> Insertados hasta el número ${end} de ${TOTAL}`);
        }
      }

      console.timeEnd('Tiempo de inserción de 80.000 números');
      const finalCountRes = await client.execute('SELECT COUNT(*) as count FROM numbers');
      console.log(`✓ Base de datos sembrada con éxito: ${finalCountRes.rows[0].count} números verificados.`);
    } else {
      console.log(`✓ La tabla de números ya contiene los ${numbersCount} números.`);
    }

    console.log('----------------------------------------------------');
    console.log('INICIALIZACIÓN COMPLETADA CON ÉXITO.');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
