import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPublicSettingsAndStats, releaseExpiredReservationsThrottled } from '@/lib/db';
import { TOTAL_NUMBERS, PUBLIC_CACHE_CONTROL } from '@/lib/constants';
import { pickRandomUniqueInts } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const randomCount = searchParams.get('random');
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'available'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '60', 10)));
    const cursorParam = searchParams.get('cursor');

    // Liberación reactiva de reservas vencidas con throttle por instancia (máximo 1 vez cada 60 s)
    await releaseExpiredReservationsThrottled().catch(() => {});

    const db = getDb();

    // 1. Caso: Selección al azar de N números disponibles (Optimizado por Primary Key para no escanear 100k filas en Turso)
    if (randomCount) {
      const count = Math.min(50, Math.max(1, parseInt(randomCount, 10)));
      const collected: { number: number; status: string }[] = [];
      const seen = new Set<number>();

      // Hasta 3 rondas de muestreo por índice primario (consume ~30-150 lecturas en vez de 100.000)
      for (let round = 0; round < 3 && collected.length < count; round++) {
        const sampleSize = Math.min(150, Math.max((count - collected.length) * 3, 25));
        const candidates = pickRandomUniqueInts(sampleSize, 1, TOTAL_NUMBERS).filter(n => !seen.has(n));
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

      return NextResponse.json(
        { numbers: collected },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2. Caso: Búsqueda de números específicos (ej: "12345" o "10, 25, 999")
    if (search && search.trim().length > 0) {
      const tokens = search.split(/[\s,]+/).filter(t => /^\d+$/.test(t)).map(t => parseInt(t, 10));
      if (tokens.length === 0) {
        return NextResponse.json(
          { numbers: [], total: 0 },
          { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
        );
      }

      const validTokens = tokens.filter(n => n >= 1 && n <= TOTAL_NUMBERS).slice(0, 50);
      if (validTokens.length === 0) {
        return NextResponse.json(
          { numbers: [], total: 0 },
          { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
        );
      }

      const placeholders = validTokens.map(() => '?').join(',');
      const searchRes = await db.execute({
        sql: `SELECT number, status FROM numbers 
              WHERE number IN (${placeholders}) 
              ORDER BY number ASC`,
        args: validTokens
      });

      return NextResponse.json(
        {
          numbers: searchRes.rows.map(r => ({
            number: Number(r.number),
            status: r.status as string,
          })),
          total: searchRes.rows.length
        },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    // 3. Caso: Listado paginado de números
    if (filter === 'available') {
      // Paginación por cursor para disponibles: WHERE status = 'available' AND number > ? ORDER BY number ASC LIMIT ?
      const cursor = cursorParam !== null
        ? Math.max(0, parseInt(cursorParam, 10) || 0)
        : (page - 1) * limit;

      const [listRes, publicData] = await Promise.all([
        db.execute({
          sql: `SELECT number, status FROM numbers 
                WHERE status = 'available' AND number > ? 
                ORDER BY number ASC 
                LIMIT ?`,
          args: [cursor, limit]
        }),
        getPublicSettingsAndStats()
      ]);

      const totalCount = publicData.stats.available;
      const numbers = listRes.rows.map(r => ({
        number: Number(r.number),
        status: r.status as string,
      }));
      const nextCursor = numbers.length > 0 ? numbers[numbers.length - 1].number : null;

      return NextResponse.json(
        {
          numbers,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
            cursor,
            nextCursor,
            hasMore: numbers.length === limit && (nextCursor ?? TOTAL_NUMBERS) < TOTAL_NUMBERS,
          }
        },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    // Caso filter === 'all': rango directo por clave primaria (BETWEEN) sin OFFSET ni COUNT
    const startNumber = (page - 1) * limit + 1;
    const endNumber = Math.min(page * limit, TOTAL_NUMBERS);

    const listRes = startNumber <= TOTAL_NUMBERS
      ? await db.execute({
          sql: `SELECT number, status FROM numbers 
                WHERE number BETWEEN ? AND ? 
                ORDER BY number ASC`,
          args: [startNumber, endNumber]
        })
      : { rows: [] };

    return NextResponse.json(
      {
        numbers: listRes.rows.map(r => ({
          number: Number(r.number),
          status: r.status as string,
        })),
        pagination: {
          page,
          limit,
          total: TOTAL_NUMBERS,
          totalPages: Math.ceil(TOTAL_NUMBERS / limit)
        }
      },
      { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
    );
  } catch (error) {
    console.error('Error al consultar números:', error);
    return NextResponse.json({ error: 'Error al consultar números' }, { status: 500 });
  }
}
