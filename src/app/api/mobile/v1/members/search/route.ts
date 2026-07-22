import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { getMemberSummary } from '@/lib/mobile-api/member';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get('query') ?? '').trim();

    if (query.length < 2) {
      return mobileError(
        'MEMBER_QUERY_TOO_SHORT',
        'Pencarian member minimal 2 karakter.',
        422,
      );
    }

    const pattern = `%${query.toLowerCase()}%`;

    const rows = await db
      .select({ memberId: users.memberId })
      .from(users)
      .where(
        and(
          eq(users.mitra_id, auth.mitraId),
          eq(users.role, 'User'),
          isNull(users.deletedAt),
          or(
            sql`LOWER(${users.memberId}) LIKE ${pattern}`,
            sql`LOWER(${users.name}) LIKE ${pattern}`,
            sql`LOWER(${users.email}) LIKE ${pattern}`,
            sql`LOWER(COALESCE(${users.phone}, '')) LIKE ${pattern}`,
          ),
        ),
      )
      .limit(20);

    const summaries = await Promise.all(
      rows
        .filter((row): row is { memberId: string } => Boolean(row.memberId))
        .map((row) =>
          getMemberSummary({
            memberId: row.memberId,
            mitraId: auth.mitraId,
          }),
        ),
    );

    const data = summaries.filter(
      (member): member is NonNullable<typeof member> => member !== null,
    );

    return mobileSuccess(data, {
      meta: { total: data.length },
    });
  } catch (error) {
    console.error('GET mobile member search error:', error);
    return mobileError('UNAUTHORIZED', 'Access token tidak valid.', 401);
  }
}
