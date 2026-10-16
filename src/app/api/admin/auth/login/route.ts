import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { verifyPassword, signAdminToken, COOKIE_NAME } from '@/lib/auth';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const ipAddress = (request.headers.get('x-forwarded-for') || 'localhost').split(',')[0].trim();

    const db = getDb();

    // 1. Verificar límite de intentos fallidos recientes (Rate Limiting respaldado en Turso/SQLite)
    const failedCheck = await db.execute({
      sql: `SELECT COUNT(*) as count FROM audit_logs 
            WHERE action = 'ADMIN_LOGIN_FAILED' 
            AND (ip_address = ? OR admin_username = ?) 
            AND datetime(created_at) >= datetime('now', '-${LOCKOUT_WINDOW_MINUTES} minutes')`,
      args: [ipAddress, cleanUsername]
    });

    const recentFailures = Number(failedCheck.rows[0]?.count || 0);
    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Por seguridad, el acceso fue bloqueado temporalmente por ${LOCKOUT_WINDOW_MINUTES} minutos.`
        },
        { status: 429 }
      );
    }

    const adminRes = await db.execute({
      sql: 'SELECT id, username, password_hash, display_name FROM admins WHERE username = ? LIMIT 1',
      args: [cleanUsername]
    });

    if (adminRes.rows.length === 0) {
      await logAudit(cleanUsername, 'ADMIN_LOGIN_FAILED', { reason: 'user_not_found' }, ipAddress);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const admin = adminRes.rows[0];
    const passwordMatch = await verifyPassword(password, admin.password_hash as string);

    if (!passwordMatch) {
      await logAudit(cleanUsername, 'ADMIN_LOGIN_FAILED', { reason: 'wrong_password' }, ipAddress);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Actualizar último login
    await db.execute({
      sql: 'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      args: [admin.id]
    });

    const token = await signAdminToken({
      id: Number(admin.id),
      username: admin.username as string,
      displayName: admin.display_name as string,
    });

    await logAudit(
      admin.username as string,
      'ADMIN_LOGIN',
      { timestamp: new Date().toISOString() },
      ipAddress
    );

    const response = NextResponse.json({
      success: true,
      admin: {
        id: Number(admin.id),
        username: admin.username,
        displayName: admin.display_name,
      }
    });

    // Guardar cookie segura
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en login de administrador:', error);
    return NextResponse.json({ error: 'Error interno en autenticación' }, { status: 500 });
  }
}
