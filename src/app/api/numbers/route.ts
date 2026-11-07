import { NextRequest, NextResponse } from 'next/server';
import { getDb, releaseExpiredReservations } from '@/lib/db';
import { pickRandomUniqueInts } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const randomCount = searchParams.get('random');
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'available'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '60', 10)));
    const offset = (page - 1) * limit;

    // Liberación reactiva de reservas vencidas
    await releaseExpiredReservations().catch(() => {});

    const db = getDb();

    // 1. Caso: Selección al azar de N números disponibles (Optimizado por Primary Key para no escanear 100k filas en Turso)
    if (randomCount) {
      const count = Math.min(50, Math.max(1, parseInt(randomCount, 10)));
      const collected: { number: number; status: string }[] = [];
      const seen = new Set<number>();

      // Hasta 3 rondas de muestreo por índice primario (consume ~30-150 lecturas en vez de 100.000)
      for (let round = 0; round < 3 && collected.length < count; round++) {
        const sampleSize = Math.min(150, Math.max((count - collected.length) * 3, 25));
        const candidates = pickRandomUniqueInts(sampleSize, 1, 100000).filter(n => !seen.has(n));
        if (candidates.length === 0) continue;
        candidates.forEach(n => seen.add(n));

        const placeholders = candidates.map(() => '?').join(',');
        const sampleRes = await db.execute({
          sql: `SELECT number, status FROM numbers WHERE number IN (${placeholders}) AND status = 'available'`,
          args: candidates
        });

        for (const r of sampleRes.rows) {
          if (collected.length < count) {
            collected.push({
              number: Number(r.number),
              status: r.status as string,
            });
          }
        }
      }

      // Fallback si quedaran muy pocos números disponibles en toda la rifa
      if (collected.length < count) {
        const needed = count - collected.length;
        const excludeList = Array.from(seen);
        const fallbackSql = excludeList.length > 0
          ? `SELECT number, status FROM numbers WHERE status = 'available' AND number NOT IN (${excludeList.map(() => '?').join(',')}) LIMIT ?`
          : `SELECT number, status FROM numbers WHERE status = 'available' LIMIT ?`;
        const fallbackRes = await db.execute({
          sql: fallbackSql,
          args: excludeList.length > 0 ? [...excludeList, needed] : [needed]
        });
        for (const r of fallbackRes.rows) {
          collected.push({
            number: Number(r.number),
            status: r.status as string,
          });
        }
      }

      return NextResponse.json({
        numbers: collected
      });
    }

    // 2. Caso: Búsqueda de números específicos (ej: "12345" o "10, 25, 999")
    if (search && search.trim().length > 0) {
      const tokens = search.split(/[\s,]+/).filter(t => /^\d+$/.test(t)).map(t => parseInt(t, 10));
      if (tokens.length === 0) {
        return NextResponse.json({ numbers: [], total: 0 });
      }

      const validTokens = tokens.filter(n => n >= 1 && n <= 100000).slice(0, 50);
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

    // 3. Caso: Listado paginado de números (permite ver todos con su estado o filtrar solo disponibles)
    const onlyAvailable = filter === 'available';
    const whereClause = onlyAvailable ? `WHERE status = 'available'` : '';

    const [listRes, countRes] = await Promise.all([
      db.execute({
        sql: `SELECT number, status FROM numbers 
              ${whereClause} 
              ORDER BY number ASC 
              LIMIT ? OFFSET ?`,
        args: [limit, offset]
      }),
      onlyAvailable
        ? db.execute(`SELECT COUNT(*) as count FROM numbers WHERE status = 'available'`)
        : Promise.resolve({ rows: [{ count: 100000 }] })
    ]);

    const totalCount = Number(countRes.rows[0].count);

    return NextResponse.json({
      numbers: listRes.rows.map(r => ({
        number: Number(r.number),
        status: r.status as string,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error al consultar números:', error);
    return NextResponse.json({ error: 'Error al consultar números' }, { status: 500 });
  }
}
