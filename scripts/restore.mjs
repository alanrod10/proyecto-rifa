import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

console.log('--- PROCESO DE RESTAURACIÓN DE BASE DE DATOS ---');

const backupDir = path.join(process.cwd(), 'backups');
const targetDbPath = path.join(process.cwd(), 'rifa.db');

async function runRestore() {
  const args = process.argv.slice(2);
  let backupFile = args[0];

  if (!backupFile) {
    // Si no se pasó argumento, buscar el respaldo más reciente
    if (!fs.existsSync(backupDir)) {
      console.error('Error: No existe el directorio de respaldos.');
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') && !f.startsWith('pre_restore'))
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

  // 1. Verificar integridad del archivo de respaldo
  console.log(`Verificando integridad del respaldo: ${backupFile}`);
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

    // 2. Crear una copia de seguridad preventiva del estado actual antes de sobrescribir
    if (fs.existsSync(targetDbPath)) {
      const emergencyBak = path.join(backupDir, `pre_restore_${Date.now()}.db`);
      fs.copyFileSync(targetDbPath, emergencyBak);
      console.log(`Copia preventiva de seguridad creada en: ${emergencyBak}`);
    }

    // 3. Restaurar copiando el archivo
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
