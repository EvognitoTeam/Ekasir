import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { loyaltyPoints, users } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireMobileAuth(request);
    const { memberId: rawMemberId } = await context.params;
    const memberId = decodeURIComponent(rawMemberId).trim().toUpperCase();

    const memberRows = await db
      .select({ id: users.id })
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

    const member = memberRows[0];
    if (!member) {
      return mobileError('MEMBER_NOT_FOUND', 'Member tidak ditemukan.', 404);
    }

    const [balanceRows, history] = await Promise.all([
      db
        .select({
          balance: sql<number>`COALESCE(SUM(${loyaltyPoints.points}), 0)`,
        })
        .from(loyaltyPoints)
        .where(
          and(
            eq(loyaltyPoints.user_id, member.id),
            eq(loyaltyPoints.mitra_id, auth.mitraId),
            isNull(loyaltyPoints.deletedAt),
          ),
        ),
      db
        .select({
          id: loyaltyPoints.id,
          points: loyaltyPoints.points,
          loyaltyId: loyaltyPoints.loyalty_id,
          branchId: loyaltyPoints.branch_id,
          createdAt: loyaltyPoints.createdAt,
        })
        .from(loyaltyPoints)
        .where(
          and(
            eq(loyaltyPoints.user_id, member.id),
            eq(loyaltyPoints.mitra_id, auth.mitraId),
            isNull(loyaltyPoints.deletedAt),
          ),
        )
        .orderBy(desc(loyaltyPoints.createdAt))
        .limit(100),
    ]);

    return mobileSuccess({
      memberId,
      balance: Number(balanceRows[0]?.balance ?? 0),
      history,
    });
  } catch (error) {
    console.error('GET mobile member points error:', error);
    return mobileError(
      'MEMBER_POINTS_FETCH_FAILED',
      'Gagal mengambil poin member.',
      500,
    );
  }
}
