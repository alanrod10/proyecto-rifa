import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import readline from 'readline';

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

function askText(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askPassword(promptText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(promptText, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    process.stdout.write(promptText);
    const stdin = process.stdin;
    const isRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (char) => {
      // Ctrl+C
      if (char === '\u0003') {
        stdin.setRawMode(isRaw || false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\nCancelado por el usuario.\n');
        process.exit(1);
      }
      // Enter (\r or \n)
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(isRaw || false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      // Backspace (\u0008 or \u007f)
      if (char === '\u0008' || char === '\u007f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      // Ignore control characters
      if (char.charCodeAt(0) < 32) {
        return;
      }
      password += char;
      process.stdout.write('*');
    };

    stdin.on('data', onData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  let username = args[0]?.trim()?.toLowerCase();
  let newPassword = process.env.NEW_ADMIN_PASSWORD?.trim();

  console.log('====================================================');
  console.log('  PROYECTO RIFA — ACTUALIZACIÓN SEGURA DE CONTRASEÑA');
  console.log('====================================================');

  // Si no se proporcionó usuario por argumento, solicitarlo interactivamente
  if (!username) {
    username = (await askText('Usuario administrador (alan / esposa): ')).toLowerCase();
  }

  if (!username) {
    console.error('Error: Debe especificar un nombre de usuario válido.');
    process.exit(1);
  }

  // Verificar primero si el usuario existe antes de pedir contraseñas
  try {
    const adminCheck = await client.execute({
      sql: 'SELECT id, username, display_name FROM admins WHERE username = ? LIMIT 1',
      args: [username]
    });

    if (adminCheck.rows.length === 0) {
      console.error(`\nError: No se encontró ningún administrador con el usuario "${username}".`);
      console.error('Los usuarios válidos registrados son "alan" y "esposa".');
      process.exit(1);
    }

    const admin = adminCheck.rows[0];
    console.log(`✓ Administrador identificado: ${admin.display_name} (@${admin.username})`);

    // Si no se pasó por variable de entorno, comprobar si vino como segundo argumento CLI
    if (!newPassword && args[1]) {
      console.warn('\n[AVISO DE SEGURIDAD]');
      console.warn('Pasar contraseñas como argumento de línea de comandos puede exponerlas');
      console.warn('en el historial del shell (~/.bash_history) y en la lista de procesos (ps aux).');
      console.warn('Se recomienda ejecutar el comando de forma interactiva.\n');
      newPassword = args[1].trim();
    }

    // Si aún no hay contraseña, solicitarla interactivamente con máscara
    if (!newPassword) {
      newPassword = await askPassword('Nueva contraseña (mínimo 8 caracteres): ');
      if (newPassword.length < 8) {
        console.error('\nError de seguridad: La contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
      }
      const confirmPassword = await askPassword('Confirme la nueva contraseña: ');
      if (newPassword !== confirmPassword) {
        console.error('\nError: Las contraseñas ingresadas no coinciden.');
        process.exit(1);
      }
    } else {
      if (newPassword.length < 8) {
        console.error('\nError de seguridad: La contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
      }
    }

    // Hashear con bcrypt y guardar
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

    console.log('\n----------------------------------------------------');
    console.log(`✓ Contraseña actualizada exitosamente para: ${admin.display_name} (@${admin.username}).`);
    console.log('✓ Hash criptográfico generado y persistido en la base de datos.');
    console.log('✓ Registro de auditoría asentado sin exponer secretos.');
    console.log('✓ El cambio tiene efecto inmediato en el panel administrativo (/admin).');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\nError al actualizar la contraseña:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
