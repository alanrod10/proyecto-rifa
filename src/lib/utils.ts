import { randomBytes } from 'crypto';
import type { Client, Transaction } from '@libsql/client';

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
      ? 'PAGO CONFIRMADO ✅ (Participando)'
      : params.paymentStatus === 'pending'
      ? 'RESERVA PENDIENTE DE PAGO ⏳'
      : params.paymentStatus === 'expired'
      ? 'RESERVA VENCIDA'
      : 'RESERVA CANCELADA';

  const message =
    `Hola ${params.buyerName}! Te enviamos tu comprobante digital de la Gran Rifa Familiar:\n\n` +
    `• Operación: ${params.orderCode}\n` +
    `• Estado: ${statusLabel}\n` +
    `• Números (${params.numbers.length}): ${formattedNums}\n` +
    `• Total: ${formatCurrency(params.totalAmount)}\n\n` +
    `Podés ver y guardar tu comprobante oficial en este enlace:\n${voucherUrl}`;

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

  let message = `Hola ${params.buyerName}! Te enviamos el resumen total de todos tus números en la Gran Rifa Familiar:\n\n`;
  message += `• Total acumulado: ${allActiveNumbers.length} número(s)\n`;

  if (allActiveNumbers.length > 0) {
    message += `• Todos tus números: ${allActiveNumbers.map(formatTicketNumber).join(', ')}\n`;
  }

  if (paidList.length > 0) {
    message += `\n✅ PAGADOS (${paidList.length}): ${paidList.map(formatTicketNumber).join(', ')} (${formatCurrency(params.totalPaidAmount)})`;
  }

  if (pendingList.length > 0) {
    message += `\n⏳ PENDIENTES DE PAGO (${pendingList.length}): ${pendingList.map(formatTicketNumber).join(', ')} (Pendiente: ${formatCurrency(params.totalPendingAmount)})`;
  }

  const activeOrders = (params.orders || []).filter(
    o => o.payment_status === 'paid' || o.payment_status === 'pending'
  );

  if (activeOrders.length > 0) {
    message += `\n\nDetalle de tus comprobantes (${activeOrders.length}):`;
    for (const ord of activeOrders) {
      const statusText = ord.payment_status === 'paid' ? 'PAGADO ✅' : 'PENDIENTE ⏳';
      const methodText = ord.payment_method === 'cash' ? 'Efectivo' : 'Transferencia';
      message += `\n• ${ord.code} (${methodText} - ${statusText}): ${baseOrigin}/pedido/${ord.private_token}`;
    }
  }

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
