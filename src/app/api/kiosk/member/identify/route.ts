import {
  NextResponse,
} from 'next/server';

import {
  and,
  eq,
  isNull,
  or,
  sql,
} from 'drizzle-orm';

import {
  db,
} from '@/db';

import {
  mitra,
  users,
} from '@/db/schema';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

type RequestBody = {
  slug?: unknown;
  identifier?: unknown;
};

function normalizeString(
  value: unknown,
) {
  return String(
    value ?? '',
  ).trim();
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    const body =
      await request.json() as
        RequestBody;

    const slug =
      normalizeString(
        body.slug,
      );

    const identifier =
      normalizeString(
        body.identifier,
      );

    if (
      !slug ||
      !identifier
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug serta ID member atau email wajib diisi.',
        },
        {
          status:
            400,
        },
      );
    }

    const [
      currentMitra,
    ] =
      await db
        .select({
          id:
            mitra.id,
        })
        .from(mitra)
        .where(
          and(
            eq(
              mitra.mitra_slug,
              slug,
            ),
            isNull(
              mitra.deletedAt,
            ),
          ),
        )
        .limit(1);

    if (!currentMitra) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan.',
        },
        {
          status:
            404,
        },
      );
    }

    const normalizedIdentifier =
      identifier.toLowerCase();

    const [
      member,
    ] =
      await db
        .select({
          id:
            users.id,
          memberId:
            users.memberId,
          name:
            users.name,
          email:
            users.email,
          phone:
            users.phone,
          role:
            users.role,
        })
        .from(users)
        .where(
          and(
            eq(
              users.mitra_id,
              currentMitra.id,
            ),
            isNull(
              users.deletedAt,
            ),
            or(
              sql`LOWER(${users.email}) = ${normalizedIdentifier}`,
              sql`LOWER(${users.memberId}) = ${normalizedIdentifier}`,
            ),
          ),
        )
        .limit(1);

    if (
      !member ||
      !member.memberId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Member tidak ditemukan pada mitra ini.',
        },
        {
          status:
            404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId:
          member.id,
        memberId:
          member.memberId,
        name:
          member.name,
        email:
          member.email,
        phone:
          member.phone ??
          null,
      },
    });
  } catch (error) {
    console.error(
      '[KIOSK_MEMBER_IDENTIFY_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal mencari data member.',
      },
      {
        status:
          500,
      },
    );
  }
}
