import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { tableList } from '@/db/schema';
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

    const rows = await db
      .select({
        id: tableList.id,
        code: tableList.table_code,
        name: tableList.table_name,
        capacity: tableList.capacity,
        status: tableList.status,
      })
      .from(tableList)
      .where(
        and(
          eq(tableList.mitra_id, auth.mitraId),
          branchId ? eq(tableList.branch_id, branchId) : isNull(tableList.branch_id),
          isNull(tableList.deletedAt),
        ),
      )
      .orderBy(asc(tableList.table_name));

    return mobileSuccess(rows);
  } catch (error) {
    console.error('GET mobile tables error:', error);
    return mobileError('TABLES_FETCH_FAILED', 'Gagal mengambil meja.', 500);
  }
}
