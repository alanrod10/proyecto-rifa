import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPublicSettingsAndStats, releaseExpiredReservationsThrottled } from '@/lib/db';
import {
  TOTAL_NUMBERS,
  PUBLIC_CACHE_CONTROL,
  SQL_IN_CHUNK_SIZE,
  DEFAULT_MAX_NUMBERS_PER_ORDER,
} from '@/lib/constants';
import { pickRandomUniqueInts, chunkArray, parseNumbersAndRanges } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const randomCount = searchParams.get('random');
    const filter = searchParams.get('filter') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '60', 10)));
    const cursorParam = searchParams.get('cursor');

    // Liberación reactiva de reservas vencidas con throttle por instancia (máximo 1 vez cada 60 s)
    await releaseExpiredReservationsThrottled().catch(() => {});

    const db = getDb();

    // 1. Caso: Selección al azar de N números disponibles (alineado a max_numbers_per_order, muestreo por PK)
    if (randomCount) {
      const publicData = await getPublicSettingsAndStats();
      const maxNumbersPerOrder =
        publicData.settings.max_numbers_per_order || DEFAULT_MAX_NUMBERS_PER_ORDER;
      const count = Math.min(
        maxNumbersPerOrder,
        Math.max(1, parseInt(randomCount, 10) || 1)
      );
      const collected: { number: number; status: string }[] = [];
      const seen = new Set<number>();

      // Hasta 4 rondas de muestreo por índice primario en bloques de 500
      for (let round = 0; round < 4 && collected.length < count; round++) {
        const remaining = count - collected.length;
        const sampleSize = Math.min(
          maxNumbersPerOrder * 2,
          Math.max(remaining * 2, 30)
        );
        const candidates = pickRandomUniqueInts(sampleSize, 1, TOTAL_NUMBERS).filter(
          (n) => !seen.has(n)
        );
        if (candidates.length === 0) continue;
        candidates.forEach((n) => seen.add(n));

        for (const chunk of chunkArray(candidates, SQL_IN_CHUNK_SIZE)) {
          if (collected.length >= count) break;
          const placeholders = chunk.map(() => '?').join(',');
          const sampleRes = await db.execute({
            sql: `SELECT number, status FROM numbers WHERE number IN (${placeholders}) AND status = 'available'`,
            args: chunk,
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
      }

      // Fallback si quedaran muy pocos números disponibles en toda la rifa
      if (collected.length < count) {
        const needed = count - collected.length;
        const collectedSet = new Set(collected.map((c) => c.number));
        const fallbackRes = await db.execute({
          sql: `SELECT number, status FROM numbers WHERE status = 'available' LIMIT ?`,
          args: [needed + collectedSet.size],
        });
        for (const r of fallbackRes.rows) {
          const num = Number(r.number);
          if (!collectedSet.has(num) && collected.length < count) {
            collectedSet.add(num);
            collected.push({
              number: num,
              status: r.status as string,
            });
          }
        }
      }

      return NextResponse.json(
        { numbers: collected },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2. Caso: Búsqueda de números específicos o rangos (ej: "100-250, 777, 1500-1510")
    if (search && search.trim().length > 0) {
      const publicData = await getPublicSettingsAndStats();
      const maxNumbersPerOrder =
        publicData.settings.max_numbers_per_order || DEFAULT_MAX_NUMBERS_PER_ORDER;
      const parsed = parseNumbersAndRanges(search, maxNumbersPerOrder, TOTAL_NUMBERS);

      if (parsed.numbers.length === 0) {
        return NextResponse.json(
          { numbers: [], total: 0 },
          { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
        );
      }

      const foundRows: { number: number; status: string }[] = [];
      for (const chunk of chunkArray(parsed.numbers, SQL_IN_CHUNK_SIZE)) {
        const placeholders = chunk.map(() => '?').join(',');
        const searchRes = await db.execute({
          sql: `SELECT number, status FROM numbers 
                WHERE number IN (${placeholders}) 
                ORDER BY number ASC`,
          args: chunk,
        });
        for (const r of searchRes.rows) {
          foundRows.push({
            number: Number(r.number),
            status: r.status as string,
          });
        }
      }

      foundRows.sort((a, b) => a.number - b.number);

      return NextResponse.json(
        {
          numbers: foundRows,
          total: foundRows.length,
        },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    // 3. Caso: Listado paginado de números
    if (filter === 'available') {
      const cursor =
        cursorParam !== null
          ? Math.max(0, parseInt(cursorParam, 10) || 0)
          : (page - 1) * limit;

      const [listRes, publicData] = await Promise.all([
        db.execute({
          sql: `SELECT number, status FROM numbers 
                WHERE status = 'available' AND number > ? 
                ORDER BY number ASC 
                LIMIT ?`,
          args: [cursor, limit],
        }),
        getPublicSettingsAndStats(),
      ]);

      const totalCount = publicData.stats.available;
      const numbers = listRes.rows.map((r) => ({
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
            hasMore:
              numbers.length === limit && (nextCursor ?? TOTAL_NUMBERS) < TOTAL_NUMBERS,
          },
        },
        { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
      );
    }

    // Caso filter === 'all': rango directo por clave primaria (BETWEEN) sin OFFSET ni COUNT
    const startNumber = (page - 1) * limit + 1;
    const endNumber = Math.min(page * limit, TOTAL_NUMBERS);

    const listRes =
      startNumber <= TOTAL_NUMBERS
        ? await db.execute({
            sql: `SELECT number, status FROM numbers 
                  WHERE number BETWEEN ? AND ? 
                  ORDER BY number ASC`,
            args: [startNumber, endNumber],
          })
        : { rows: [] };

    return NextResponse.json(
      {
        numbers: listRes.rows.map((r) => ({
          number: Number(r.number),
          status: r.status as string,
        })),
        pagination: {
          page,
          limit,
          total: TOTAL_NUMBERS,
          totalPages: Math.ceil(TOTAL_NUMBERS / limit),
        },
      },
      { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } }
    );
  } catch (error) {
    console.error('Error al consultar números:', error);
    return NextResponse.json({ error: 'Error al consultar números' }, { status: 500 });
  }
}
