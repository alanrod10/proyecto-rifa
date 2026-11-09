import { randomBytes } from 'crypto';
import type { Client, Transaction } from '@libsql/client';
import { SQL_IN_CHUNK_SIZE } from '@/lib/constants';

/**
 * Divide un arreglo en bloques de tamaño máximo `size` (por defecto 500 para listas SQL IN)
 */
export function chunkArray<T>(items: readonly T[], size: number = SQL_IN_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Enmascara un número de celular dejando visibles únicamente los últimos 4 dígitos (***1234)
 */
export function maskPhoneNumber(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`;
  }
  return '***';
}

/**
 * Extrae la IP del cliente a partir de la cabecera x-forwarded-for
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (!forwarded) return 'localhost';
  return forwarded.split(',')[0].trim() || 'localhost';
}

/**
 * Formatea un número de la rifa en formato de al menos 5 dígitos (ej: 1 -> "00001", 100000 -> "100000")
 */
export function formatTicketNumber(num: number): string {
  return num.toString().padStart(5, '0');
}

/**
 * Formatea un importe monetario en Pesos Argentinos (ARS)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Genera un código de pedido de 6 caracteres legible para humanos (ej: RF-7B2K9A)
 * 32^6 = 1.073.741.824 combinaciones posibles
 */
export function generateOrderCode(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluimos 0, 1, I, O para evitar confusiones
  let code = 'RF-';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Genera un código de pedido único verificando contra la base de datos con reintentos ante colisión
 */
export async function generateUniqueOrderCode(dbOrTx: Client | Transaction, maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateOrderCode(6);
    const existing = await dbOrTx.execute({
      sql: 'SELECT 1 FROM orders WHERE code = ? LIMIT 1',
      args: [candidate]
    });
    if (existing.rows.length === 0) {
      return candidate;
    }
  }
  // Fallback de 8 caracteres si hubiera colisiones reiteradas
  return generateOrderCode(8);
}

/**
 * Genera un token criptográficamente seguro de 192 bits (48 caracteres hex) para la URL privada
 */
export function generatePrivateToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Normaliza un número telefónico argentino para que el usuario no tenga que ingresar el prefijo 54 / +549.
 * Si el usuario ingresa "3884123456", "+54 9 388 4123456", "543884123456" o "0388 154123456",
 * devuelve el número limpio sin el prefijo internacional (ej: "3884123456").
 */
export function cleanPhoneNumber(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Quitar prefijo internacional 00549, 0054, 549 o 54 si el número completo los incluye
  if (digits.startsWith('00549') && digits.length > 12) {
    digits = digits.slice(5);
  } else if (digits.startsWith('0054') && digits.length > 11) {
    digits = digits.slice(4);
  } else if (digits.startsWith('549') && digits.length >= 12) {
    digits = digits.slice(3);
  } else if (digits.startsWith('54') && digits.length >= 11) {
    digits = digits.slice(2);
  }

  // Quitar el 0 inicial de código de área (ej: 0388 -> 388)
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = digits.slice(1);
  }

  return digits.trim();
}

/**
 * Convierte cualquier número de celular (con o sin 54) al formato internacional requerido por WhatsApp (549 + número)
 */
export function formatWhatsAppPhone(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return '';
  if (clean.startsWith('54')) return clean;
  return `549${clean}`;
}

/**
 * Construye el enlace de WhatsApp hacia el comprador con el mensaje completo del comprobante digital pre-escrito
 */
export function buildBuyerWhatsAppUrl(params: {
  buyerName: string;
  buyerPhone: string;
  orderCode: string;
  numbers: number[];
  totalAmount: number;
  paymentStatus: string;
  privateToken: string;
  origin?: string;
}): string {
  const waPhone = formatWhatsAppPhone(params.buyerPhone);
  const baseOrigin =
    params.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://proyecto-rifa.vercel.app');
  const voucherUrl = `${baseOrigin}/pedido/${params.privateToken}`;
  const formattedNums = (params.numbers || []).map(formatTicketNumber).join(', ');
  const statusLabel =
    params.paymentStatus === 'paid'
      ? '✓ *PAGO CONFIRMADO* (¡Ya estás participando!)'
      : params.paymentStatus === 'pending'
      ? '• *RESERVA PENDIENTE DE PAGO*'
      : params.paymentStatus === 'expired'
      ? '✗ *RESERVA VENCIDA*'
      : '✗ *RESERVA CANCELADA*';

  const message =
    `★ *GRAN RIFA FAMILIAR* ★\n\n` +
    `¡Hola ${params.buyerName}!\n` +
    `Te compartimos el comprobante de tu reserva:\n\n` +
    `• *Código de Reserva:* ${params.orderCode}\n` +
    `• *Estado:* ${statusLabel}\n` +
    `• *Tus Números (${params.numbers.length}):* ${formattedNums}\n` +
    `• *Monto Total:* ${formatCurrency(params.totalAmount)}\n\n` +
    `► *Ver tu comprobante oficial aquí:*\n` +
    `${voucherUrl}\n\n` +
    `¡Muchas gracias por tu apoyo y mucha suerte! ✦`;

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Construye el enlace de WhatsApp hacia el comprador con el RESUMEN UNIFICADO de todos los números
 * que tiene registrados bajo su número de teléfono (sumando todas sus compras individuales).
 */
export function buildBuyerSummaryWhatsAppUrl(params: {
  buyerName: string;
  buyerPhone: string;
  paidNumbers: number[];
  pendingNumbers: number[];
  totalPaidAmount: number;
  totalPendingAmount: number;
  orders: {
    code: string;
    payment_status: string;
    payment_method: string;
    numbers: number[];
    total_amount: number;
    private_token: string;
  }[];
  origin?: string;
}): string {
  const waPhone = formatWhatsAppPhone(params.buyerPhone);
  const baseOrigin =
    params.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://proyecto-rifa.vercel.app');

  const paidList = [...(params.paidNumbers || [])].sort((a, b) => a - b);
  const pendingList = [...(params.pendingNumbers || [])].sort((a, b) => a - b);
  const allActiveNumbers = Array.from(new Set([...paidList, ...pendingList])).sort((a, b) => a - b);

  let message =
    `★ *GRAN RIFA FAMILIAR* ★\n` +
    `*RESUMEN TOTAL DE NÚMEROS*\n\n` +
    `¡Hola ${params.buyerName}!\n` +
    `Te enviamos el resumen unificado de todas tus reservas registradas:\n\n` +
    `• *Total acumulado:* ${allActiveNumbers.length} número(s)\n`;

  if (allActiveNumbers.length > 0) {
    message += `• *Tus números:* ${allActiveNumbers.map(formatTicketNumber).join(', ')}\n`;
  }

  if (paidList.length > 0) {
    message +=
      `\n✓ *Confirmados y Pagados (${paidList.length}):*\n` +
      `   • Números: ${paidList.map(formatTicketNumber).join(', ')}\n` +
      `   • Total pagado: ${formatCurrency(params.totalPaidAmount)}\n`;
  }

  if (pendingList.length > 0) {
    message +=
      `\n• *Pendientes de Pago (${pendingList.length}):*\n` +
      `   • Números: ${pendingList.map(formatTicketNumber).join(', ')}\n` +
      `   • Importe pendiente: ${formatCurrency(params.totalPendingAmount)}\n`;
  }

  const activeOrders = (params.orders || []).filter(
    o => o.payment_status === 'paid' || o.payment_status === 'pending'
  );

  if (activeOrders.length > 0) {
    message += `\n*Tus Comprobantes Digitales (${activeOrders.length}):*\n`;
    for (const ord of activeOrders) {
      const statusText = ord.payment_status === 'paid' ? '✓ Pagado' : '• Pendiente';
      const methodText = ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia';
      message += `• *${ord.code}* (${methodText} — ${statusText}):\n  ► ${baseOrigin}/pedido/${ord.private_token}\n`;
    }
  }

  message += `\n¡Muchísimas gracias por tu apoyo y el mayor de los éxitos! ✦`;

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Sanitiza un campo de texto contra inyección de fórmulas en CSV (Excel / Calc)
 * y escapa comillas dobles internas
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  const neutralized = formulaPrefixes.some(p => raw.startsWith(p)) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Genera una lista de N números aleatorios únicos en el rango [min, max]
 */
export function pickRandomUniqueInts(count: number, min = 1, max = 100000): number[] {
  const range = max - min + 1;
  const target = Math.min(count, range);
  const set = new Set<number>();
  while (set.size < target) {
    const val = randomBytes(4).readUInt32BE(0);
    set.add(min + (val % range));
  }
  return Array.from(set);
}

/**
 * Formatea una fecha en hora de Argentina (Jujuy).
 * Normaliza marcas de tiempo UTC de SQLite ("YYYY-MM-DD HH:MM:SS") agregando "T" y "Z"
 * para evitar desfases de huso horario en el navegador.
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'No definida';
  let normalized: string | Date = dateStr;
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
      normalized = `${trimmed.replace(' ', 'T')}Z`;
    }
  }
  const date = typeof normalized === 'string' ? new Date(normalized) : normalized;
  if (isNaN(date.getTime())) return 'Fecha inválida';
  
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Jujuy'
  }).format(date);
}

/**
 * Valida si un texto es un JSON válido y lo parsea con fallback seguro
 */
export function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parsea una cadena de números y rangos (ej: "100-250, 777, 1500-1510"),
 * valida contra el rango [1..100000] y contra maxLimit, y deduplica en orden ascendente.
 */
export function parseNumbersAndRanges(
  input: string,
  maxLimit = 2000,
  totalNumbers = 100000
): {
  numbers: number[];
  invalidTokens: string[];
  exceedsMax: boolean;
} {
  const normalized = (input || '').replace(/\s*-\s*/g, '-');
  const rawTokens = normalized
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const uniqueSet = new Set<number>();
  const invalidTokens: string[] = [];
  let exceedsMax = false;

  for (const token of rawTokens) {
    if (/^\d+-\d+$/.test(token)) {
      const [startStr, endStr] = token.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < 1 ||
        end < 1 ||
        start > totalNumbers ||
        end > totalNumbers
      ) {
        invalidTokens.push(token);
        continue;
      }
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      if (to - from + 1 > maxLimit) {
        exceedsMax = true;
      }
      for (let n = from; n <= to; n++) {
        if (uniqueSet.size >= maxLimit) {
          exceedsMax = true;
          break;
        }
        uniqueSet.add(n);
      }
    } else if (/^\d+$/.test(token)) {
      const n = parseInt(token, 10);
      if (isNaN(n) || n < 1 || n > totalNumbers) {
        invalidTokens.push(token);
        continue;
      }
      if (uniqueSet.size >= maxLimit && !uniqueSet.has(n)) {
        exceedsMax = true;
        continue;
      }
      uniqueSet.add(n);
    } else {
      invalidTokens.push(token);
    }
  }

  return {
    numbers: Array.from(uniqueSet).sort((a, b) => a - b),
    invalidTokens,
    exceedsMax,
  };
}
