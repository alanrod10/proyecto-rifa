/**
 * Constantes únicas del sistema (sin dependencias: se importan tanto desde el servidor,
 * el cliente y los scripts de prueba ejecutados directamente con Node).
 */

/** Cantidad total de números de la rifa (la tabla `numbers` contiene exactamente estas filas). */
export const TOTAL_NUMBERS = 100000;

/** Teléfonos oficiales de contacto por defecto (usados en db.ts, API de órdenes y componentes). */
export const DEFAULT_CONTACT_PHONE = '3884152040';
export const DEFAULT_CONTACT_PHONE_SECONDARY = '3884141514';

/** Parámetros económicos y temporales por defecto. */
export const DEFAULT_TICKET_PRICE = 100;
export const DEFAULT_RESERVE_HOURS = 48;

/** Topes operativos por defecto (configurables en settings). */
export const DEFAULT_MAX_NUMBERS_PER_ORDER = 2000;
export const DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE = 1000;

/** Valores por defecto de todas las configuraciones públicas y operativas. */
export const DEFAULT_SETTINGS = {
  raffle_badge: 'Objetivo solidario: Pro Terreno Familiar',
  raffle_name: 'Gran Rifa Familiar pro Terreno',
  raffle_description:
    'Rifa solidaria familiar de 100.000 números para pagar las cuotas de nuestro lote.',
  ticket_price: DEFAULT_TICKET_PRICE,
  prizes: 'Premios a confirmar',
  draw_date: 'Fecha del sorteo a confirmar',
  bank_alias: '',
  bank_cbu: '',
  bank_name: '',
  bank_holder: '',
  contact_phone: DEFAULT_CONTACT_PHONE,
  contact_phone_secondary: DEFAULT_CONTACT_PHONE_SECONDARY,
  reserve_hours: DEFAULT_RESERVE_HOURS,
  public_reservations_enabled: true,
  max_numbers_per_order: DEFAULT_MAX_NUMBERS_PER_ORDER,
  max_pending_numbers_per_phone: DEFAULT_MAX_PENDING_NUMBERS_PER_PHONE,
  rules_terms: '',
} as const;

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

/** Ventanas y límites de Rate Limiting por IP. */
export const RESERVATIONS_RATE_LIMIT_MAX = 5;
export const RESERVATIONS_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutos
export const ORDER_LOOKUP_RATE_LIMIT_MAX = 30;
export const ORDER_LOOKUP_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutos

/** Ventana de bloqueo de login administrativo (15 minutos, 5 intentos). */
export const LOGIN_LOCKOUT_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
