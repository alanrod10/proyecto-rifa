import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { getCurrentAdmin, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password, confirm_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Debes completar tu contraseña actual y la nueva contraseña.' }, { status: 400 });
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    if (confirm_password !== undefined && new_password !== confirm_password) {
      return NextResponse.json({ error: 'La confirmación de la nueva contraseña no coincide.' }, { status: 400 });
    }

    const db = getDb();
    const adminRes = await db.execute({
      sql: 'SELECT id, username, password_hash FROM admins WHERE id = ? LIMIT 1',
      args: [admin.id]
    });

    if (adminRes.rows.length === 0) {
      return NextResponse.json({ error: 'Cuenta de administrador no encontrada.' }, { status: 404 });
    }

    const dbAdmin = adminRes.rows[0];
    const isCurrentValid = await verifyPassword(current_password, dbAdmin.password_hash as string);
    if (!isCurrentValid) {
      await logAudit(
        admin.username,
        'PASSWORD_CHANGE_FAILED',
        { reason: 'invalid_current_password' },
        request.headers.get('x-forwarded-for') || 'localhost'
      );
      return NextResponse.json({ error: 'La contraseña actual ingresada es incorrecta.' }, { status: 401 });
    }

    const newHash = await hashPassword(new_password);
    await db.execute({
      sql: 'UPDATE admins SET password_hash = ? WHERE id = ?',
      args: [newHash, admin.id]
    });

    await logAudit(
      admin.username,
      'PASSWORD_CHANGED',
      { updated_by: admin.username, timestamp: new Date().toISOString() },
      request.headers.get('x-forwarded-for') || 'localhost'
    );

    return NextResponse.json({
      success: true,
      message: 'Tu contraseña se actualizó correctamente en la base de datos.'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return NextResponse.json({ error: 'Error interno al actualizar la contraseña.' }, { status: 500 });
  }
}
