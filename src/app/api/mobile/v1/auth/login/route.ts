import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import { generateUniqueMemberId } from '@/lib/member/memberId';
import { createMobileTokens } from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return mobileError(
        'VALIDATION_ERROR',
        'Email dan kata sandi wajib diisi.',
        422,
      );
    }

    const rows = await db
      .select({
        id: users.id,
        mitraId: users.mitra_id,
        branchId: users.branch_id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
        phone: users.phone,
        memberId: users.memberId,
        slug: mitra.mitra_slug,
        mitraName: mitra.mitra_name,
      })
      .from(users)
      .innerJoin(mitra, eq(users.mitra_id, mitra.id))
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return mobileError(
        'INVALID_CREDENTIALS',
        'Email atau kata sandi salah.',
        401,
      );
    }

    const normalizedRole = String(user.role).toLowerCase();
    if (!['owner', 'cashier', 'kitchen'].includes(normalizedRole)) {
      return mobileError(
        'ROLE_NOT_ALLOWED',
        'Akun ini tidak memiliki akses POS mobile.',
        403,
      );
    }

    let memberId = user.memberId;
    if (!memberId) {
      memberId = await generateUniqueMemberId(db, user.mitraName);
      await db
        .update(users)
        .set({ memberId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const tokens = await createMobileTokens({
      userId: user.id,
      mitraId: Number(user.mitraId),
      branchId: user.branchId == null ? null : Number(user.branchId),
      slug: user.slug,
      role: normalizedRole,
      name: user.name,
      email: user.email,
      memberId,
    });

    return mobileSuccess(
      {
        tokens,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: normalizedRole,
          memberId,
        },
        tenant: {
          mitraId: Number(user.mitraId),
          slug: user.slug,
          name: user.mitraName,
          branchId: user.branchId == null ? null : Number(user.branchId),
        },
      },
      { message: 'Login berhasil.' },
    );
  } catch (error) {
    console.error('POST mobile login error:', error);
    return mobileError('INTERNAL_ERROR', 'Terjadi kesalahan pada server.', 500);
  }
}
