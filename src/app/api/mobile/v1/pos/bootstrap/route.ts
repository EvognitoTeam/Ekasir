import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { branches, mitra, settings } from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const { searchParams } = new URL(request.url);
    const branchId = resolveMobileBranch(auth, searchParams.get('branch_id'));

    const tenantRows = await db
      .select()
      .from(mitra)
      .where(eq(mitra.id, auth.mitraId))
      .limit(1);

    const tenant = tenantRows[0];
    if (!tenant) return mobileError('MITRA_NOT_FOUND', 'Mitra tidak ditemukan.', 404);

    const branchRows = branchId
      ? await db
          .select()
          .from(branches)
          .where(
            and(
              eq(branches.id, branchId),
              eq(branches.mitra_id, auth.mitraId),
              isNull(branches.deletedAt),
            ),
          )
          .limit(1)
      : [];

    const settingConditions = [eq(settings.mitraId, auth.mitraId)];
    settingConditions.push(
      branchId ? eq(settings.branch_id, branchId) : isNull(settings.branch_id),
    );

    const settingRows = await db
      .select()
      .from(settings)
      .where(and(...settingConditions))
      .limit(1);

    return mobileSuccess({
      tenant: {
        id: tenant.id,
        slug: tenant.mitra_slug,
        name: tenant.mitra_name,
        address: tenant.mitra_address,
        welcome: tenant.mitra_welcome,
      },
      branch: branchId
        ? {
            id: branchRows[0]?.id ?? branchId,
            name: branchRows[0]?.name ?? null,
            slug: branchRows[0]?.branch_slug ?? null,
          }
        : {
            id: null,
            name: 'Outlet Utama',
            slug: null,
          },
      settings: settingRows[0] ?? {
        taxRate: 0,
        serviceRate: 0,
        isTaxIncluded: 0,
      },
    });
  } catch (error) {
    console.error('GET mobile bootstrap error:', error);
    return mobileError('UNAUTHORIZED', 'Access token tidak valid.', 401);
  }
}
