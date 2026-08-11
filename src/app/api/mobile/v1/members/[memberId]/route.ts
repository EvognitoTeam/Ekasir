import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { getMemberSummary } from '@/lib/mobile-api/member';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireMobileAuth(request);
    const { memberId: rawMemberId } = await context.params;
    const memberId = decodeURIComponent(rawMemberId).trim().toUpperCase();

    const member = await getMemberSummary({
      memberId,
      mitraId: auth.mitraId,
    });

    if (!member) {
      return mobileError('MEMBER_NOT_FOUND', 'Member tidak ditemukan.', 404);
    }

    return mobileSuccess(member);
  } catch (error) {
    console.error('GET mobile member detail error:', error);
    return mobileError('MEMBER_FETCH_FAILED', 'Gagal mengambil member.', 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireMobileAuth(request);
    const { memberId: rawMemberId } = await context.params;
    const memberId = decodeURIComponent(rawMemberId).trim().toUpperCase();
    const body = await request.json();

    const currentRows = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.memberId, memberId),
          eq(users.mitra_id, auth.mitraId),
          eq(users.role, 'User'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const current = currentRows[0];
    if (!current) {
      return mobileError('MEMBER_NOT_FOUND', 'Member tidak ditemukan.', 404);
    }

    const name = body.name === undefined ? undefined : String(body.name).trim();
    const email = body.email === undefined
      ? undefined
      : String(body.email).trim().toLowerCase();
    const phone = body.phone === undefined
      ? undefined
      : body.phone
        ? String(body.phone).trim()
        : null;

    if (name !== undefined && !name) {
      return mobileError('NAME_INVALID', 'Nama member tidak valid.', 422);
    }

    if (email !== undefined && !email) {
      return mobileError('EMAIL_INVALID', 'Email member tidak valid.', 422);
    }

    if (email && email !== current.email) {
      const duplicateRows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .limit(1);

      if (duplicateRows[0]) {
        return mobileError(
          'EMAIL_ALREADY_REGISTERED',
          'Email sudah digunakan akun lain.',
          409,
        );
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, current.id));

    const member = await getMemberSummary({
      memberId,
      mitraId: auth.mitraId,
    });

    return mobileSuccess(member, {
      message: 'Data member berhasil diperbarui.',
    });
  } catch (error) {
    console.error('PATCH mobile member error:', error);
    return mobileError('MEMBER_UPDATE_FAILED', 'Gagal memperbarui member.', 500);
  }
}
