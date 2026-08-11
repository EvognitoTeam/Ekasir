import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import {
  createMobileTokens,
  verifyMobileRefreshToken,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const refreshToken = String(body.refreshToken ?? '');

    if (!refreshToken) {
      return mobileError(
        'REFRESH_TOKEN_REQUIRED',
        'Refresh token wajib dikirim.',
        422,
      );
    }

    const oldPayload = await verifyMobileRefreshToken(refreshToken);

    const rows = await db
      .select({
        id: users.id,
        mitraId: users.mitra_id,
        branchId: users.branch_id,
        name: users.name,
        email: users.email,
        role: users.role,
        memberId: users.memberId,
        slug: mitra.mitra_slug,
      })
      .from(users)
      .innerJoin(mitra, eq(users.mitra_id, mitra.id))
      .where(eq(users.id, oldPayload.userId))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return mobileError('SESSION_USER_NOT_FOUND', 'Akun tidak ditemukan.', 401);
    }

    const tokens = await createMobileTokens({
      userId: user.id,
      mitraId: Number(user.mitraId),
      branchId: user.branchId == null ? null : Number(user.branchId),
      slug: user.slug,
      role: user.role,
      name: user.name,
      email: user.email,
      memberId: user.memberId,
    });

    return mobileSuccess({ tokens }, { message: 'Token berhasil diperbarui.' });
  } catch (error) {
    console.error('POST mobile refresh error:', error);
    return mobileError('INVALID_REFRESH_TOKEN', 'Refresh token tidak valid.', 401);
  }
}
