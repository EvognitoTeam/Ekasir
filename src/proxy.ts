import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

function parseProtectedPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const slug = segments[0];

  // URL admin baru: /slug/admin/dashboard atau /slug/branch/admin/dashboard
  const adminIndex = segments.indexOf('admin');
  if (adminIndex === 1 || adminIndex === 2) {
    return {
      slug,
      area: 'dashboard' as const,
      branchSlug: adminIndex === 2 ? segments[1] : undefined,
      isAdminPrettyUrl: true,
    };
  }

  // URL lama/internal: /slug/dashboard, /slug/cashier, /slug/kitchen
  const area = segments[1];
  if (area === 'dashboard' || area === 'cashier' || area === 'kitchen') {
    return {
      slug,
      area,
      branchSlug: undefined,
      isAdminPrettyUrl: false,
    };
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const parsed = parseProtectedPath(request.nextUrl.pathname);
  if (!parsed) return NextResponse.next();

  const token = request.cookies.get('ekasir_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userRole = String(payload.role || '');
    const userSlug = String(payload.slug || '');

    if (parsed.slug !== userSlug) {
      const target = userRole === 'Owner'
        ? `/${userSlug}/admin/dashboard`
        : `/${userSlug}/${userRole.toLowerCase()}`;
      return NextResponse.redirect(new URL(target, request.url));
    }

    const isOwner = userRole === 'Owner';
    const isCashier = userRole === 'Cashier';
    const isKitchen = userRole === 'Kitchen';

    if (isOwner && parsed.area !== 'dashboard') {
      return NextResponse.redirect(new URL(`/${userSlug}/admin/dashboard`, request.url));
    }
    if (isCashier && parsed.area !== 'cashier') {
      return NextResponse.redirect(new URL(`/${userSlug}/cashier`, request.url));
    }
    if (isKitchen && parsed.area !== 'kitchen') {
      return NextResponse.redirect(new URL(`/${userSlug}/kitchen`, request.url));
    }

    // Pretty URL admin ditulis ulang ke route internal dashboard tanpa mengubah URL browser.
    if (parsed.isAdminPrettyUrl) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/${parsed.slug}/dashboard`;
      return NextResponse.rewrite(rewriteUrl);
    }

    // URL dashboard lama diarahkan ke base URL baru.
    if (isOwner && request.nextUrl.pathname === `/${parsed.slug}/dashboard`) {
      return NextResponse.redirect(new URL(`/${parsed.slug}/admin/dashboard`, request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url));
    response.cookies.delete('ekasir_session');
    return response;
  }
}

export const config = {
  matcher: [
    '/:slug/admin/:path*',
    '/:slug/:branch/admin/:path*',
    '/:slug/dashboard/:path*',
    '/:slug/cashier/:path*',
    '/:slug/kitchen/:path*',
  ],
};
