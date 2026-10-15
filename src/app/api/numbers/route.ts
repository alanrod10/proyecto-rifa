import { NextRequest, NextResponse } from 'next/server';
import { getDb, releaseExpiredReservations } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const randomCount = searchParams.get('random');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '60', 10)));
    const offset = (page - 1) * limit;

    // Liberación reactiva de reservas vencidas
    await releaseExpiredReservations().catch(() => {});

    const db = getDb();

    // 1. Caso: Selección al azar de N números disponibles
    if (randomCount) {
      const count = Math.min(50, Math.max(1, parseInt(randomCount, 10)));
      const randRes = await db.execute({
        sql: `SELECT number, status FROM numbers 
              WHERE status = 'available' 
              ORDER BY RANDOM() 
              LIMIT ?`,
        args: [count]
      });

      return NextResponse.json({
        numbers: randRes.rows.map(r => ({
          number: Number(r.number),
          status: r.status as string,
        }))
      });
    }

    // 2. Caso: Búsqueda de números específicos (ej: "12345" o "10, 25, 999")
    if (search && search.trim().length > 0) {
      const tokens = search.split(/[\s,]+/).filter(t => /^\d+$/.test(t)).map(t => parseInt(t, 10));
      if (tokens.length === 0) {
        return NextResponse.json({ numbers: [], total: 0 });
      }

      const validTokens = tokens.filter(n => n >= 1 && n <= 80000).slice(0, 50);
      if (validTokens.length === 0) {
        return NextResponse.json({ numbers: [], total: 0 });
      }

      const placeholders = validTokens.map(() => '?').join(',');
      const searchRes = await db.execute({
        sql: `SELECT number, status FROM numbers 
              WHERE number IN (${placeholders}) 
              ORDER BY number ASC`,
        args: validTokens
      });

      return NextResponse.json({
        numbers: searchRes.rows.map(r => ({
          number: Number(r.number),
          status: r.status as string,
        })),
        total: searchRes.rows.length
      });
    }

    // 3. Caso: Listado paginado de números disponibles
    const [listRes, countRes] = await Promise.all([
      db.execute({
        sql: `SELECT number, status FROM numbers 
              WHERE status = 'available' 
              ORDER BY number ASC 
              LIMIT ? OFFSET ?`,
        args: [limit, offset]
      }),
      db.execute(`SELECT COUNT(*) as count FROM numbers WHERE status = 'available'`)
    ]);

    const totalAvailable = Number(countRes.rows[0].count);

    return NextResponse.json({
      numbers: listRes.rows.map(r => ({
        number: Number(r.number),
        status: r.status as string,
      })),
      pagination: {
        page,
        limit,
        total: totalAvailable,
        totalPages: Math.ceil(totalAvailable / limit)
      }
    });
  } catch (error) {
    console.error('Error al consultar números:', error);
    return NextResponse.json({ error: 'Error al consultar números' }, { status: 500 });
  }
}
