import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      releasedOrdersCount: result.releasedOrdersCount,
      releasedNumbersCount: result.releasedNumbersCount,
      message: result.releasedOrdersCount > 0 
        ? `Se liberaron ${result.releasedNumbersCount} números de ${result.releasedOrdersCount} pedidos vencidos.`
        : 'No hay reservas vencidas pendientes de liberación.'
    });
  } catch (error) {
    console.error('Error al liberar reservas vencidas:', error);
    return NextResponse.json({ error: 'Error al liberar reservas vencidas' }, { status: 500 });
  }
}
