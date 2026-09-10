import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

type ProtectedArea =
  | 'admin'
  | 'dashboard'
  | 'cashier'
  | 'kitchen';

type ParsedProtectedPath = {
  slug: string;
  area: ProtectedArea;
  adminRoute?: string;
  branchSlug?: string;
  isLegacyAdminUrl?: boolean;
  isLegacyDashboardUrl?: boolean;
};

function parseProtectedPath(
  pathname: string,
): ParsedProtectedPath | null {
  const segments = pathname
    .split('/')
    .filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const slug = segments[0];

  /*
   * Route admin utama:
   *
   * /:slug/admin/dashboard
   * /:slug/admin/menu
   * /:slug/admin/sales
   * /:slug/admin/ledger
   * dst.
   */
  if (segments[1] === 'admin') {
    return {
      slug,
      area: 'admin',
      adminRoute: segments[2] || 'dashboard',
    };
  }

  /*
   * Legacy pretty URL admin lama:
   *
   * /:slug/:branch/admin/dashboard
   * /:slug/:branch/admin/menu
   *
   * Karena struktur baru tidak lagi menggunakan
   * folder branch sebelum /admin, URL ini nantinya
   * diarahkan ke canonical admin URL.
   */
  if (
    segments.length >= 3 &&
    segments[2] === 'admin'
  ) {
    return {
      slug,
      area: 'admin',
      branchSlug: segments[1],
      adminRoute: segments[3] || 'dashboard',
      isLegacyAdminUrl: true,
    };
  }

  /*
   * Dashboard lama:
   *
   * /:slug/dashboard
   *
   * Sekarang canonical URL Owner adalah:
   * /:slug/admin/dashboard
   */
  if (segments[1] === 'dashboard') {
    return {
      slug,
      area: 'dashboard',
      isLegacyDashboardUrl: true,
    };
  }

  if (segments[1] === 'cashier') {
    return {
      slug,
      area: 'cashier',
    };
  }

  if (segments[1] === 'kitchen') {
    return {
      slug,
      area: 'kitchen',
    };
  }

  return null;
}

function getHomeForRole(
  slug: string,
  role: string,
): string {
  const normalizedRole =
    role.toLowerCase();

  if (normalizedRole === 'owner') {
    return `/${slug}/admin/dashboard`;
  }

  if (normalizedRole === 'cashier') {
    return `/${slug}/cashier`;
  }

  if (normalizedRole === 'kitchen') {
    return `/${slug}/kitchen`;
  }

  return '/login';
}

export async function proxy(
  request: NextRequest,
) {
  const parsed =
    parseProtectedPath(
      request.nextUrl.pathname,
    );

  if (!parsed) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      'ekasir_session',
    )?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL(
        '/login',
        request.url,
      ),
    );
  }

  try {
    const {
      payload,
    } =
      await jwtVerify(
        token,
        SECRET_KEY,
      );

    const userRole =
      String(
        payload.role || '',
      );

    const normalizedRole =
      userRole.toLowerCase();

    const userSlug =
      String(
        payload.slug || '',
      );

    /*
     * Token tidak memiliki tenant/slug yang valid.
     */
    if (!userSlug) {
      const response =
        NextResponse.redirect(
          new URL(
            '/login?error=invalid_tenant',
            request.url,
          ),
        );

      response.cookies.delete(
        'ekasir_session',
      );

      return response;
    }

    /*
     * User mencoba membuka tenant lain.
     */
    if (
      parsed.slug !==
      userSlug
    ) {
      return NextResponse.redirect(
        new URL(
          getHomeForRole(
            userSlug,
            userRole,
          ),
          request.url,
        ),
      );
    }

    const isOwner =
      normalizedRole ===
      'owner';

    const isCashier =
      normalizedRole ===
      'cashier';

    const isKitchen =
      normalizedRole ===
      'kitchen';

    /*
     * ============================================================
     * OWNER
     * ============================================================
     *
     * Owner diperbolehkan membuka seluruh route:
     *
     * /:slug/admin/*
     *
     * Tidak ada rewrite lagi karena route admin sekarang
     * benar-benar berada di:
     *
     * src/app/[mitraSlug]/admin/*
     */
    if (parsed.area === 'admin') {
      if (!isOwner) {
        return NextResponse.redirect(
          new URL(
            getHomeForRole(
              userSlug,
              userRole,
            ),
            request.url,
          ),
        );
      }

      /*
       * URL branch-admin lama diarahkan ke struktur canonical baru.
       *
       * Contoh:
       * /kaloo/jakarta/admin/menu
       * ->
       * /kaloo/admin/menu
       */
      if (
        parsed.isLegacyAdminUrl
      ) {
        const route =
          parsed.adminRoute ||
          'dashboard';

        return NextResponse.redirect(
          new URL(
            `/${userSlug}/admin/${route}`,
            request.url,
          ),
        );
      }

      /*
       * /:slug/admin
       * ->
       * /:slug/admin/dashboard
       */
      if (
        request.nextUrl.pathname ===
        `/${userSlug}/admin`
      ) {
        return NextResponse.redirect(
          new URL(
            `/${userSlug}/admin/dashboard`,
            request.url,
          ),
        );
      }

      return NextResponse.next();
    }

    /*
     * Dashboard lama Owner.
     *
     * /:slug/dashboard
     * ->
     * /:slug/admin/dashboard
     */
    if (
      parsed.area ===
      'dashboard'
    ) {
      if (isOwner) {
        return NextResponse.redirect(
          new URL(
            `/${userSlug}/admin/dashboard`,
            request.url,
          ),
        );
      }

      return NextResponse.redirect(
        new URL(
          getHomeForRole(
            userSlug,
            userRole,
          ),
          request.url,
        ),
      );
    }

    /*
     * ============================================================
     * CASHIER
     * ============================================================
     */
    if (
      parsed.area ===
      'cashier'
    ) {
      if (!isCashier) {
        return NextResponse.redirect(
          new URL(
            getHomeForRole(
              userSlug,
              userRole,
            ),
            request.url,
          ),
        );
      }

      return NextResponse.next();
    }

    /*
     * ============================================================
     * KITCHEN
     * ============================================================
     */
    if (
      parsed.area ===
      'kitchen'
    ) {
      if (!isKitchen) {
        return NextResponse.redirect(
          new URL(
            getHomeForRole(
              userSlug,
              userRole,
            ),
            request.url,
          ),
        );
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  } catch (
    error
  ) {
    console.error(
      '[PROXY_AUTH_ERROR]',
      error,
    );

    const response =
      NextResponse.redirect(
        new URL(
          '/login?error=session_expired',
          request.url,
        ),
      );

    response.cookies.delete(
      'ekasir_session',
    );

    return response;
  }
}

export const config = {
  matcher: [
    '/:slug/admin',
    '/:slug/admin/:path*',

    /*
     * Legacy branch admin URL.
     * Bisa dihapus nanti kalau semua link lama sudah tidak digunakan.
     */
    '/:slug/:branch/admin/:path*',

    /*
     * Legacy Owner dashboard.
     */
    '/:slug/dashboard/:path*',

    '/:slug/cashier/:path*',
    '/:slug/kitchen/:path*',
  ],
};
