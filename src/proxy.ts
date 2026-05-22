import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Match:
  // /slug/dashboard
  // /slug/dashboard/xxx
  // /slug/cashier
  // /slug/cashier/xxx
  const match = path.match(/^\/([^\/]+)\/(dashboard|cashier)(\/.*)?$/);

  // Route publik
  if (!match) {
    return NextResponse.next();
  }

  // Ambil slug dari regex
  const requestedSlug = match[1];

  // Ambil token
  const token = request.cookies.get('ekasir_session')?.value;

  // Belum login
  if (!token) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  try {
    // Verify JWT
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // Role validation
    const userRole = payload.role as string;

    const allowedRoles = ['Owner', 'Cashier'];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(
        new URL('/login?error=not_authorized', request.url)
      );
    }

    // Tenant isolation
    const userSlug = payload.slug as string;

    if (!userSlug) {
      console.error(
        '❌ payload.slug kosong! Cek API login.'
      );

      const response = NextResponse.redirect(
        new URL('/login?error=invalid_tenant', request.url)
      );

      response.cookies.delete('ekasir_session');

      return response;
    }

    // Validasi slug tenant
    if (requestedSlug !== userSlug) {
      console.warn(
        `⚠️ Akses ilegal: ${userSlug} mencoba akses ${requestedSlug}`
      );

      return NextResponse.redirect(
        new URL(`/${userSlug}/dashboard`, request.url)
      );
    }

    // Semua aman
    return NextResponse.next();

  } catch (error) {
    console.error(
      '❌ Middleware: Token invalid / expired',
      error
    );

    const response = NextResponse.redirect(
      new URL('/login?error=session_expired', request.url)
    );

    response.cookies.delete('ekasir_session');

    return response;
  }
}

export const config = {
  matcher: [
    '/:slug/dashboard/:path*',
    '/:slug/cashier/:path*',
  ],
};