import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const DEFAULT_SECRET_FALLBACK = 'clave_secreta_super_segura_cambiar_en_produccion_minimo_32_caracteres';
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || DEFAULT_SECRET_FALLBACK;

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SECRET_KEY) {
  console.warn('[ALERTA DE SEGURIDAD] ADMIN_SECRET_KEY no está configurada en las variables de entorno. Configure una clave segura de al menos 32 caracteres en .env.local.');
}

const key = new TextEncoder().encode(SECRET_KEY);

export const COOKIE_NAME = 'rifa_admin_session';

export interface AdminPayload {
  id: number;
  username: string;
  displayName: string;
}

/**
 * Hashea una contraseña con bcrypt y salting
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compara una contraseña en texto plano con un hash almacenado
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Genera un token JWT firmado para la sesión del administrador
 */
export async function signAdminToken(admin: AdminPayload): Promise<string> {
  return new SignJWT({
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Sesión válida por 7 días
    .sign(key);
}

/**
 * Verifica la validez y firma de un token JWT
 */
export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return {
      id: payload.id as number,
      username: payload.username as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene el administrador autenticado a partir de las cookies de la petición
 */
export async function getCurrentAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}
