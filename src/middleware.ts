import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'rifa_admin_session';
const DEFAULT_SECRET_FALLBACK =
  'clave_secreta_super_segura_cambiar_en_produccion_minimo_32_caracteres';

function getMiddlewareJwtSecretKey(): Uint8Array {
  const envSecret = process.env.ADMIN_SECRET_KEY;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!envSecret || envSecret === DEFAULT_SECRET_FALLBACK || envSecret.length < 32) {
      throw new Error(
        '[ERROR CRÍTICO DE SEGURIDAD] ADMIN_SECRET_KEY es obligatorio en producción.'
      );
    }
  }

  return new TextEncoder().encode(envSecret || DEFAULT_SECRET_FALLBACK);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const key = getMiddlewareJwtSecretKey();
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });

      if (!payload || !payload.id || !payload.username) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
