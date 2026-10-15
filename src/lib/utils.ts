import { randomBytes } from 'crypto';

/**
 * Formatea un número de la rifa en formato de 5 dígitos (ej: 1 -> "00001", 80000 -> "80000")
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
 * Genera un código de pedido corto y legible para humanos (ej: RF-7B2K9A)
 */
export function generateOrderCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluimos 0, 1, I, O para evitar confusiones
  let code = 'RF-';
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Genera un token criptográficamente seguro de 192 bits (48 caracteres hex) para la URL privada
 */
export function generatePrivateToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Normaliza un número telefónico (quita espacios, guiones y caracteres no numéricos)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '').trim();
}

/**
 * Formatea una fecha en hora de Argentina
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'No definida';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return 'Fecha inválida';
  
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires'
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
