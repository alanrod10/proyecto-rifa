import { NextResponse } from 'next/server';
import { getPublicSettingsAndStats } from '@/lib/db';
import { PUBLIC_CACHE_CONTROL } from '@/lib/constants';

export async function GET() {
  try {
    const data = await getPublicSettingsAndStats();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': PUBLIC_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('Error al obtener configuraciones públicas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
