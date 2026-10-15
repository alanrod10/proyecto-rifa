import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_URL = process.env.DATABASE_URL || 'file:./rifa.db';
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined;

let finalUrl = DB_URL;
if (DB_URL.startsWith('file:')) {
  const filePath = DB_URL.replace('file:', '');
  if (!path.isAbsolute(filePath)) {
    finalUrl = `file:${path.resolve(process.cwd(), filePath)}`;
  }
}

const client = createClient({
  url: finalUrl,
  authToken: AUTH_TOKEN,
});

async function main() {
  const args = process.argv.slice(2);
  const username = args[0]?.trim()?.toLowerCase();
  const newPassword = args[1]?.trim();

  if (!username || !newPassword) {
    console.log('Uso: node scripts/change-admin-password.mjs <usuario> <nueva_contraseña>');
    console.log('Ejemplo: node scripts/change-admin-password.mjs alan "MiNuevaContraseñaSegura123!"');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Error de seguridad: La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  try {
    const adminCheck = await client.execute({
      sql: 'SELECT id, username, display_name FROM admins WHERE username = ? LIMIT 1',
      args: [username]
    });

    if (adminCheck.rows.length === 0) {
      console.error(`Error: No se encontró ningún administrador con el usuario: "${username}".`);
      console.error('Los usuarios registrados válidos son "alan" y "esposa".');
      process.exit(1);
    }

    const admin = adminCheck.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const tx = await client.transaction('write');
    await tx.execute({
      sql: 'UPDATE admins SET password_hash = ? WHERE id = ?',
      args: [passwordHash, admin.id]
    });

    await tx.execute({
      sql: 'INSERT INTO audit_logs (admin_username, action, details) VALUES (?, ?, ?)',
      args: [
        admin.username,
        'CHANGE_PASSWORD',
        JSON.stringify({
          updated_at: new Date().toISOString(),
          display_name: admin.display_name,
          notice: 'Contraseña actualizada mediante script de seguridad CLI'
        })
      ]
    });

    await tx.commit();

    console.log('----------------------------------------------------');
    console.log(`✓ Contraseña actualizada exitosamente para el usuario: ${admin.username} (${admin.display_name}).`);
    console.log('  El cambio impacta de inmediato en el panel administrativo.');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error al actualizar la contraseña:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
