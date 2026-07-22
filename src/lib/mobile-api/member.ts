import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { loyaltyPoints, orders, users } from '@/db/schema';

export type MemberTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond';

export function getMembershipTier(totalSpentInput: number) {
  const totalSpent = Math.max(Number(totalSpentInput) || 0, 0);

  const tiers = [
    { name: 'Bronze' as const, minimum: 0 },
    { name: 'Silver' as const, minimum: 1_000_000 },
    { name: 'Gold' as const, minimum: 2_500_000 },
    { name: 'Platinum' as const, minimum: 5_000_000 },
    { name: 'Diamond' as const, minimum: 10_000_000 },
  ];

  let currentIndex = 0;
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (totalSpent >= tiers[index].minimum) {
      currentIndex = index;
      break;
    }
  }

  const current = tiers[currentIndex];
  const next = tiers[currentIndex + 1] ?? null;

  const progress = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.floor(
            ((totalSpent - current.minimum) /
              (next.minimum - current.minimum)) *
              100,
          ),
        ),
      )
    : 100;

  return {
    tier: current.name,
    totalSpent,
    nextTier: next?.name ?? null,
    nextTierMinimum: next?.minimum ?? null,
    remainingToNextTier: next
      ? Math.max(next.minimum - totalSpent, 0)
      : 0,
    tierProgress: progress,
  };
}

export async function getMemberSummary(input: {
  memberId: string;
  mitraId: number;
}) {
  const memberRows = await db
    .select({
      id: users.id,
      memberId: users.memberId,
      name: users.name,
      email: users.email,
      phone: users.phone,
      mitraId: users.mitra_id,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.memberId, input.memberId),
        eq(users.mitra_id, input.mitraId),
        eq(users.role, 'User'),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  const member = memberRows[0];
  if (!member) return null;

  const [purchaseRows, pointRows] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`COUNT(${orders.id})`,
        totalSpent: sql<string>`
          COALESCE(
            SUM(
              CAST(
                COALESCE(
                  ${orders.totalAfterDiscount},
                  ${orders.total_price},
                  0
                ) AS DECIMAL(18, 0)
              )
            ),
            0
          )
        `,
      })
      .from(orders)
      .where(
        and(
          eq(orders.user_id, member.id),
          eq(orders.mitra_id, input.mitraId),
          eq(orders.status, 'completed'),
          isNull(orders.deletedAt),
        ),
      ),
    db
      .select({
        points: sql<number>`COALESCE(SUM(${loyaltyPoints.points}), 0)`,
      })
      .from(loyaltyPoints)
      .where(
        and(
          eq(loyaltyPoints.user_id, member.id),
          eq(loyaltyPoints.mitra_id, input.mitraId),
          isNull(loyaltyPoints.deletedAt),
        ),
      ),
  ]);

  const totalOrders = Number(purchaseRows[0]?.totalOrders ?? 0);
  const totalSpent = Number(purchaseRows[0]?.totalSpent ?? 0);
  const points = Number(pointRows[0]?.points ?? 0);
  const membership = getMembershipTier(totalSpent);

  return {
    id: member.id,
    memberId: member.memberId,
    name: member.name,
    email: member.email,
    phone: member.phone,
    points,
    totalOrders,
    ...membership,
    createdAt: member.createdAt,
  };
}
