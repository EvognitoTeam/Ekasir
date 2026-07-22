import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { branches, mitra, users } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        memberId: users.memberId,
        mitraId: users.mitra_id,
        branchId: users.branch_id,
        slug: mitra.mitra_slug,
        mitraName: mitra.mitra_name,
        branchName: branches.name,
        branchSlug: branches.branch_slug,
      })
      .from(users)
      .innerJoin(mitra, eq(users.mitra_id, mitra.id))
      .leftJoin(branches, eq(users.branch_id, branches.id))
      .where(eq(users.id, auth.userId))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return mobileError('USER_NOT_FOUND', 'Pengguna tidak ditemukan.', 404);
    }

    return mobileSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: String(user.role).toLowerCase(),
        memberId: user.memberId,
      },
      tenant: {
        mitraId: Number(user.mitraId),
        slug: user.slug,
        name: user.mitraName,
        branchId: user.branchId == null ? null : Number(user.branchId),
        branchName: user.branchName,
        branchSlug: user.branchSlug,
        isMainOutlet: user.branchId == null,
      },
    });
  } catch (error) {
    console.error('GET mobile me error:', error);
    return mobileError('UNAUTHORIZED', 'Access token tidak valid.', 401);
  }
}
