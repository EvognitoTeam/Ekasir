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
  const match = path.match(
    /^\/([^\/]+)\/(dashboard|cashier)(\/.*)?$/
  );

  // Route publik
  if (!match) {
    return NextResponse.next();
  }

  // =========================
  // DATA URL
  // =========================

  const requestedSlug = match[1];
  const requestedArea = match[2]; // dashboard | cashier

  // =========================
  // TOKEN
  // =========================

  const token =
    request.cookies.get('ekasir_session')?.value;

  // Belum login
  if (!token) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  try {
    // =========================
    // VERIFY JWT
    // =========================

    const { payload } = await jwtVerify(
      token,
      SECRET_KEY
    );

    const userRole = payload.role as string;
    const userSlug = payload.slug as string;

    // =========================
    // VALID ROLE
    // =========================

    const allowedRoles = ['Owner', 'Cashier'];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(
        new URL(
          '/login?error=not_authorized',
          request.url
        )
      );
    }

    // =========================
    // VALID SLUG
    // =========================

    if (!userSlug) {
      console.error(
        '❌ payload.slug kosong! Cek API login.'
      );

      const response = NextResponse.redirect(
        new URL(
          '/login?error=invalid_tenant',
          request.url
        )
      );

      response.cookies.delete('ekasir_session');

      return response;
    }

    // Tenant isolation
    if (requestedSlug !== userSlug) {
      console.warn(
        `⚠️ Akses ilegal: ${userSlug} mencoba akses ${requestedSlug}`
      );

      // Redirect sesuai role
      if (userRole === 'Cashier') {
        return NextResponse.redirect(
          new URL(`/${userSlug}/cashier`, request.url)
        );
      }

      return NextResponse.redirect(
        new URL(`/${userSlug}/dashboard`, request.url)
      );
    }

    // =========================
    // ROLE ACCESS CONTROL
    // =========================

    // CASHIER buka dashboard
    if (
      userRole === 'Cashier' &&
      requestedArea === 'dashboard'
    ) {
      return NextResponse.redirect(
        new URL(`/${userSlug}/cashier`, request.url)
      );
    }

    // OWNER buka cashier
    if (
      userRole === 'Owner' &&
      requestedArea === 'cashier'
    ) {
      return NextResponse.redirect(
        new URL(`/${userSlug}/dashboard`, request.url)
      );
    }

    // =========================
    // AMAN
    // =========================

    return NextResponse.next();

  } catch (error) {
    console.error(
      '❌ Middleware: Token invalid / expired',
      error
    );

    const response = NextResponse.redirect(
      new URL(
        '/login?error=session_expired',
        request.url
      )
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