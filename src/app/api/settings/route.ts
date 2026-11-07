import { NextResponse } from 'next/server';
import { getPublicSettingsAndStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicSettingsAndStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al obtener configuraciones públicas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
