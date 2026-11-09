/**
 * Constantes únicas del sistema (sin dependencias: se importan tanto desde el servidor,
 * el cliente y los scripts de prueba ejecutados directamente con Node).
 */

/** Cantidad total de números de la rifa (la tabla `numbers` contiene exactamente estas filas). */
export const TOTAL_NUMBERS = 100000;

/** Tamaño máximo de cada bloque de variables en listas `IN (...)`. */
export const SQL_IN_CHUNK_SIZE = 500;

/** Cantidad de números por página en la grilla pública. */
export const PUBLIC_GRID_PAGE_SIZE = 60;

/** TTL (ms) de la caché en memoria por instancia de configuración y estadísticas públicas. */
export const PUBLIC_CACHE_TTL_MS = 10_000;

/** Cabecera Cache-Control para respuestas públicas cacheables en el CDN. */
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=10, stale-while-revalidate=30';

/** Intervalo mínimo (ms) entre ejecuciones de la liberación perezosa de vencidos en GET públicos. */
export const EXPIRY_THROTTLE_MS = 60_000;
