import { NextRequest, NextResponse } from 'next/server';
import { getDb, getSettings, logAudit, invalidatePublicCache } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { cleanPhoneNumber } from '@/lib/utils';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    return NextResponse.json({ error: 'Error al obtener configuraciones' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();

    const allowedKeys = [
      'raffle_badge',
      'raffle_name',
      'raffle_description',
      'ticket_price',
      'prizes',
      'draw_date',
      'bank_alias',
      'bank_cbu',
      'bank_name',
      'bank_holder',
      'contact_phone',
      'contact_phone_secondary',
      'reserve_hours',
      'public_reservations_enabled',
      'rules_terms'
    ];

    const updatedKeys: string[] = [];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const rawVal = String(body[key]);
        const val = (key === 'contact_phone' || key === 'contact_phone_secondary') ? cleanPhoneNumber(rawVal) : rawVal;
        await db.execute({
          sql: `INSERT INTO settings (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
          args: [key, val]
        });
        updatedKeys.push(key);
      }
    }

    await logAudit(
      admin.username,
      'UPDATE_SETTINGS',
      { updatedKeys, body },
      request.headers.get('x-forwarded-for') || 'localhost'
    );

    invalidatePublicCache();
    const newSettings = await getSettings();
    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente.',
      settings: newSettings
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
