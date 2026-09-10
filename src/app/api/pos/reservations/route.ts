import {
  NextResponse,
} from 'next/server';

import {
  db,
} from '@/db';

import {
  branches,
  mitra,
  reservations,
  reservationTableList,
} from '@/db/schema';

import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
} from 'drizzle-orm';

import {
  cookies,
} from 'next/headers';

import {
  jwtVerify,
} from 'jose';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

const SECRET_KEY =
  new TextEncoder().encode(
    process.env.JWT_SECRET ||
      'rahasia-super-aman-evokasir-2026',
  );

type AuthPayload = {
  branchId?:
    unknown;
  role?:
    unknown;
  mitraId?:
    unknown;
};

type ReservationStatus =
  | 'pending'
  | 'confirmed';

class ReservationApiError
  extends Error {
  status: number;
  code: string;

  constructor(
    status:
      number,
    message:
      string,
    code:
      string,
  ) {
    super(message);

    this.status =
      status;

    this.code =
      code;
  }
}

class ReservationConflictError
  extends ReservationApiError {
  conflicts:
    Array<{
      start:
        string;
      end:
        string;
      status:
        ReservationStatus;
    }>;

  constructor(
    conflicts:
      Array<{
        start:
          string;
        end:
          string;
        status:
          ReservationStatus;
      }>,
  ) {
    super(
      409,
      'Waktu tersebut sudah memiliki reservasi. Silakan pilih waktu lain.',
      'RESERVATION_TIME_CONFLICT',
    );

    this.conflicts =
      conflicts;
  }
}

function normalizeString(
  value:
    unknown,
): string {
  if (
    typeof value ===
    'string'
  ) {
    return value.trim();
  }

  return String(
    value ?? '',
  ).trim();
}

function positiveInteger(
  value:
    unknown,
):
  | number
  | null {
  if (
    value === null ||
    value ===
      undefined ||
    value === ''
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  if (
    !Number.isInteger(
      numberValue,
    ) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function jsonError(
  status:
    number,
  message:
    string,
  code:
    string,
  extra:
    Record<
      string,
      unknown
    > = {},
) {
  return NextResponse.json(
    {
      success:
        false,
      message,
      code,
      ...extra,
    },
    {
      status,
    },
  );
}

async function getAuthPayload():
  Promise<
    AuthPayload |
    null
  > {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      'ekasir_session',
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const verified =
      await jwtVerify(
        token,
        SECRET_KEY,
      );

    return verified.payload as AuthPayload;
  } catch {
    return null;
  }
}

async function findMitraBySlug(
  slug:
    string,
) {
  const [targetMitra] =
    await db
      .select({
        id:
          mitra.id,
      })
      .from(mitra)
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(1);

  return (
    targetMitra ??
    null
  );
}

async function validateBranchId(
  mitraId:
    number,
  branchId:
    number,
) {
  const [targetBranch] =
    await db
      .select({
        id:
          branches.id,
        slug:
          branches.branch_slug,
      })
      .from(branches)
      .where(
        and(
          eq(
            branches.id,
            branchId,
          ),
          eq(
            branches.mitra_id,
            mitraId,
          ),
          isNull(
            branches.deletedAt,
          ),
        ),
      )
      .limit(1);

  if (!targetBranch) {
    throw new ReservationApiError(
      404,
      'Cabang tidak ditemukan atau tidak sesuai dengan mitra.',
      'BRANCH_NOT_FOUND',
    );
  }

  return targetBranch.id;
}

async function resolveBranchSlug(
  mitraId:
    number,
  branchSlug:
    string,
) {
  const [targetBranch] =
    await db
      .select({
        id:
          branches.id,
      })
      .from(branches)
      .where(
        and(
          eq(
            branches.mitra_id,
            mitraId,
          ),
          eq(
            branches.branch_slug,
            branchSlug,
          ),
          isNull(
            branches.deletedAt,
          ),
        ),
      )
      .limit(1);

  if (!targetBranch) {
    throw new ReservationApiError(
      404,
      'Cabang tidak ditemukan atau tidak sesuai dengan mitra.',
      'BRANCH_NOT_FOUND',
    );
  }

  return targetBranch.id;
}

/*
 * Resolve exact branch scope for public customer operations.
 *
 * Priority:
 * 1. authenticated branch session
 * 2. explicit branch_id
 * 3. branch_slug
 * 4. main branch (NULL)
 */
async function resolveExactBranchId(
  mitraId:
    number,
  options: {
    authBranchId?:
      unknown;
    branchId?:
      unknown;
    branchSlug?:
      unknown;
  },
):
  Promise<
    number |
    null
  > {
  const sessionBranch =
    positiveInteger(
      options.authBranchId,
    );

  if (
    sessionBranch !==
    null
  ) {
    return validateBranchId(
      mitraId,
      sessionBranch,
    );
  }

  const requestedId =
    positiveInteger(
      options.branchId,
    );

  if (
    requestedId !==
    null
  ) {
    return validateBranchId(
      mitraId,
      requestedId,
    );
  }

  const requestedSlug =
    normalizeString(
      options.branchSlug,
    );

  if (
    requestedSlug
  ) {
    return resolveBranchSlug(
      mitraId,
      requestedSlug,
    );
  }

  return null;
}

function branchCondition(
  branchId:
    number |
    null,
) {
  return branchId ===
    null
    ? isNull(
        reservations.branch_id,
      )
    : eq(
        reservations.branch_id,
        branchId,
      );
}

function parseAvailabilityDate(
  raw:
    string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      raw,
    )
  ) {
    throw new ReservationApiError(
      400,
      'Format tanggal availability_date harus YYYY-MM-DD.',
      'INVALID_AVAILABILITY_DATE',
    );
  }

  const start =
    new Date(
      `${raw}T00:00:00`,
    );

  if (
    Number.isNaN(
      start.getTime(),
    )
  ) {
    throw new ReservationApiError(
      400,
      'Tanggal reservasi tidak valid.',
      'INVALID_AVAILABILITY_DATE',
    );
  }

  const end =
    new Date(start);

  end.setDate(
    end.getDate() +
      1,
  );

  return {
    start,
    end,
  };
}

function sanitizeIntervals(
  rows:
    Array<{
      reserved_start:
        Date;
      reserved_end:
        Date;
      status:
        unknown;
    }>,
) {
  return rows.map(
    (
      row,
    ) => ({
      start:
        row.reserved_start.toISOString(),
      end:
        row.reserved_end.toISOString(),
      status:
        String(
          row.status,
        ) as ReservationStatus,
    }),
  );
}

/*
 * GET /api/pos/reservations
 *
 * PUBLIC availability mode:
 *   ?slug=xxx&branch_slug=yyy&availability_date=YYYY-MM-DD
 *
 * Returns sanitized time intervals only.
 * No customer name, phone, notes, or table information is exposed.
 *
 * NORMAL staff mode:
 *   remains authenticated and returns full reservation rows.
 */
export async function GET(
  request:
    Request,
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      normalizeString(
        searchParams.get(
          'slug',
        ),
      );

    if (!slug) {
      return jsonError(
        400,
        'Slug wajib disertakan.',
        'SLUG_REQUIRED',
      );
    }

    const targetMitra =
      await findMitraBySlug(
        slug,
      );

    if (
      !targetMitra
    ) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const availabilityDate =
      normalizeString(
        searchParams.get(
          'availability_date',
        ),
      );

    /*
     * Safe public mode.
     */
    if (
      availabilityDate
    ) {
      const branchId =
        await resolveExactBranchId(
          targetMitra.id,
          {
            branchId:
              searchParams.get(
                'branch_id',
              ),
            branchSlug:
              searchParams.get(
                'branch_slug',
              ),
          },
        );

      const range =
        parseAvailabilityDate(
          availabilityDate,
        );

      const rows =
        await db
          .select({
            reserved_start:
              reservations.reserved_start,
            reserved_end:
              reservations.reserved_end,
            status:
              reservations.status,
          })
          .from(
            reservations,
          )
          .where(
            and(
              eq(
                reservations.mitra_id,
                targetMitra.id,
              ),
              branchCondition(
                branchId,
              ),
              inArray(
                reservations.status,
                [
                  'pending',
                  'confirmed',
                ],
              ),
              /*
               * Any reservation that overlaps this calendar day.
               */
              lt(
                reservations.reserved_start,
                range.end,
              ),
              gt(
                reservations.reserved_end,
                range.start,
              ),
            ),
          )
          .orderBy(
            reservations.reserved_start,
          );

      return NextResponse.json({
        success:
          true,
        data:
          sanitizeIntervals(
            rows as Array<{
              reserved_start:
                Date;
              reserved_end:
                Date;
              status:
                unknown;
            }>,
          ),
        scope: {
          branchId,
          branchSlug:
            normalizeString(
              searchParams.get(
                'branch_slug',
              ),
            ) ||
            null,
          date:
            availabilityDate,
        },
      });
    }

    /*
     * Existing internal/staff GET remains protected.
     */
    const authPayload =
      await getAuthPayload();

    if (
      !authPayload
    ) {
      return jsonError(
        401,
        'Unauthorized.',
        'UNAUTHORIZED',
      );
    }

    const sessionBranchId =
      positiveInteger(
        authPayload.branchId,
      );

    const requestedBranchId =
      positiveInteger(
        searchParams.get(
          'branch_id',
        ),
      );

    const requestedBranchSlug =
      normalizeString(
        searchParams.get(
          'branch_slug',
        ),
      );

    const conditions =
      [
        eq(
          reservations.mitra_id,
          targetMitra.id,
        ),
      ];

    /*
     * Preserve owner/global behavior:
     * if no branch is requested and session is not branch-scoped,
     * do not add a branch filter.
     */
    if (
      sessionBranchId !==
        null ||
      requestedBranchId !==
        null ||
      requestedBranchSlug
    ) {
      const branchId =
        await resolveExactBranchId(
          targetMitra.id,
          {
            authBranchId:
              sessionBranchId,
            branchId:
              requestedBranchId,
            branchSlug:
              requestedBranchSlug,
          },
        );

      conditions.push(
        branchCondition(
          branchId,
        ),
      );
    }

    const data =
      await db
        .select()
        .from(
          reservations,
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .orderBy(
          desc(
            reservations.createdAt,
          ),
        );

    const reservationIds =
      data.map(
        (
          row,
        ) =>
          row.id,
      );

    let tableMappings:
      Array<{
        reservation_id:
          number;
        table_list_id:
          number;
      }> = [];

    if (
      reservationIds.length >
      0
    ) {
      tableMappings =
        await db
          .select({
            reservation_id:
              reservationTableList.reservation_id,
            table_list_id:
              reservationTableList.table_list_id,
          })
          .from(
            reservationTableList,
          )
          .where(
            inArray(
              reservationTableList.reservation_id,
              reservationIds,
            ),
          );
    }

    const formatted =
      data.map(
        (
          row,
        ) => ({
          ...row,
          table_ids:
            tableMappings
              .filter(
                (
                  mapping,
                ) =>
                  mapping.reservation_id ===
                  row.id,
              )
              .map(
                (
                  mapping,
                ) =>
                  mapping.table_list_id,
              ),
        }),
      );

    return NextResponse.json({
      success:
        true,
      data:
        formatted,
    });
  } catch (
    error
  ) {
    console.error(
      '[RESERVATIONS_GET_ERROR]',
      error,
    );

    if (
      error instanceof
      ReservationApiError
    ) {
      return jsonError(
        error.status,
        error.message,
        error.code,
      );
    }

    return jsonError(
      500,
      'Terjadi kesalahan server.',
      'RESERVATIONS_GET_FAILED',
    );
  }
}

/*
 * POST /api/pos/reservations
 *
 * Customer:
 * - may be unauthenticated
 * - branch_slug is supported
 * - table selection is optional
 * - pending by default
 *
 * Staff:
 * - authenticated branch is respected
 * - table_ids still supported for manual reservations
 *
 * BOTH:
 * - server rejects overlapping pending/confirmed reservation intervals
 *   within the exact same mitra + branch.
 */
export async function POST(
  request:
    Request,
) {
  try {
    const authPayload =
      await getAuthPayload();

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      normalizeString(
        searchParams.get(
          'slug',
        ),
      );

    if (!slug) {
      return jsonError(
        400,
        'Slug wajib disertakan.',
        'SLUG_REQUIRED',
      );
    }

    const targetMitra =
      await findMitraBySlug(
        slug,
      );

    if (
      !targetMitra
    ) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const body =
      await request.json() as {
        customer_name?:
          unknown;
        customer_phone?:
          unknown;
        guest_count?:
          unknown;
        reserved_start?:
          unknown;
        reserved_end?:
          unknown;
        table_ids?:
          unknown;
        notes?:
          unknown;
        status?:
          unknown;
        branch_id?:
          unknown;
        branch_slug?:
          unknown;
      };

    const customerName =
      normalizeString(
        body.customer_name,
      );

    const customerPhone =
      normalizeString(
        body.customer_phone,
      );

    const guestCount =
      positiveInteger(
        body.guest_count,
      );

    const reservedStartRaw =
      normalizeString(
        body.reserved_start,
      );

    const reservedEndRaw =
      normalizeString(
        body.reserved_end,
      );

    if (
      !customerName ||
      !guestCount ||
      !reservedStartRaw ||
      !reservedEndRaw
    ) {
      return jsonError(
        400,
        'Data reservasi wajib belum lengkap.',
        'INVALID_RESERVATION_DATA',
      );
    }

    const reservedStart =
      new Date(
        reservedStartRaw,
      );

    const reservedEnd =
      new Date(
        reservedEndRaw,
      );

    if (
      Number.isNaN(
        reservedStart.getTime(),
      ) ||
      Number.isNaN(
        reservedEnd.getTime(),
      )
    ) {
      return jsonError(
        400,
        'Tanggal atau waktu reservasi tidak valid.',
        'INVALID_RESERVATION_TIME',
      );
    }

    if (
      reservedEnd <=
      reservedStart
    ) {
      return jsonError(
        400,
        'Waktu selesai harus setelah waktu kedatangan.',
        'INVALID_RESERVATION_RANGE',
      );
    }

    const branchId =
      await resolveExactBranchId(
        targetMitra.id,
        {
          authBranchId:
            authPayload?.branchId,
          branchId:
            body.branch_id,
          branchSlug:
            body.branch_slug,
        },
      );

    const rawTableIds =
      Array.isArray(
        body.table_ids,
      )
        ? body.table_ids
        : [];

    const tableIds =
      rawTableIds
        .map(
          (
            value,
          ) =>
            positiveInteger(
              value,
            ),
        )
        .filter(
          (
            value,
          ):
            value is number =>
              value !==
              null,
        );

    const requestedStatus =
      normalizeString(
        body.status,
      );

    const finalStatus =
      authPayload
        ? requestedStatus ||
          'confirmed'
        : 'pending';

    try {
      await db.transaction(
        async (
          tx,
        ) => {
          /*
           * IMPORTANT:
           * overlap condition:
           *
           * existing.start < requested.end
           * AND
           * existing.end > requested.start
           *
           * Touching edges are allowed:
           * 18:00-20:00 and 20:00-21:00 do NOT conflict.
           */
          const conflictRows =
            await tx
              .select({
                reserved_start:
                  reservations.reserved_start,
                reserved_end:
                  reservations.reserved_end,
                status:
                  reservations.status,
              })
              .from(
                reservations,
              )
              .where(
                and(
                  eq(
                    reservations.mitra_id,
                    targetMitra.id,
                  ),
                  branchCondition(
                    branchId,
                  ),
                  inArray(
                    reservations.status,
                    [
                      'pending',
                      'confirmed',
                    ],
                  ),
                  lt(
                    reservations.reserved_start,
                    reservedEnd,
                  ),
                  gt(
                    reservations.reserved_end,
                    reservedStart,
                  ),
                ),
              )
              .orderBy(
                reservations.reserved_start,
              );

          if (
            conflictRows.length >
            0
          ) {
            throw new ReservationConflictError(
              sanitizeIntervals(
                conflictRows as Array<{
                  reserved_start:
                    Date;
                  reserved_end:
                    Date;
                  status:
                    unknown;
                }>,
              ),
            );
          }

          const [
            inserted,
          ] =
            await tx
              .insert(
                reservations,
              )
              .values({
                mitra_id:
                  targetMitra.id,
                branch_id:
                  branchId,
                customer_name:
                  customerName,
                customer_phone:
                  customerPhone ||
                  null,
                guest_count:
                  guestCount,
                reserved_start:
                  reservedStart,
                reserved_end:
                  reservedEnd,

                /*
                 * Customer flow normally sends [].
                 * Staff manual booking can still use physical tables.
                 */
                table_id:
                  tableIds[0] ??
                  null,

                notes:
                  normalizeString(
                    body.notes,
                  ) ||
                  null,

                status:
                  finalStatus as any,

                createdAt:
                  new Date(),

                updatedAt:
                  new Date(),
              });

          const reservationId =
            Number(
              (
                inserted as {
                  insertId?:
                    unknown;
                }
              )?.insertId ??
                0,
            );

          if (
            reservationId >
              0 &&
            tableIds.length >
              0
          ) {
            await tx
              .insert(
                reservationTableList,
              )
              .values(
                tableIds.map(
                  (
                    tableId,
                  ) => ({
                    reservation_id:
                      reservationId,
                    table_list_id:
                      tableId,
                    createdAt:
                      new Date(),
                    updatedAt:
                      new Date(),
                  }),
                ),
              );
          }
        },
      );
    } catch (
      error
    ) {
      if (
        error instanceof
        ReservationConflictError
      ) {
        return jsonError(
          error.status,
          error.message,
          error.code,
          {
            conflicts:
              error.conflicts,
          },
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        success:
          true,
        message:
          authPayload
            ? 'Reservasi berhasil dibuat.'
            : 'Reservasi diajukan dan menunggu konfirmasi.',
        status:
          finalStatus,
        branchId,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      '[RESERVATIONS_POST_ERROR]',
      error,
    );

    if (
      error instanceof
      ReservationApiError
    ) {
      return jsonError(
        error.status,
        error.message,
        error.code,
      );
    }

    return jsonError(
      500,
      'Gagal membuat reservasi.',
      'RESERVATION_CREATE_FAILED',
    );
  }
}

/*
 * PUT remains staff/auth only.
 */
export async function PUT(
  request:
    Request,
) {
  try {
    const authPayload =
      await getAuthPayload();

    if (
      !authPayload
    ) {
      return jsonError(
        401,
        'Unauthorized.',
        'UNAUTHORIZED',
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      normalizeString(
        searchParams.get(
          'slug',
        ),
      );

    if (!slug) {
      return jsonError(
        400,
        'Slug wajib disertakan.',
        'SLUG_REQUIRED',
      );
    }

    const targetMitra =
      await findMitraBySlug(
        slug,
      );

    if (
      !targetMitra
    ) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const body =
      await request.json() as {
        id?:
          unknown;
        status?:
          unknown;
      };

    const reservationId =
      positiveInteger(
        body.id,
      );

    const status =
      normalizeString(
        body.status,
      );

    if (
      reservationId ===
        null ||
      !status
    ) {
      return jsonError(
        400,
        'ID dan status reservasi wajib diisi.',
        'INVALID_UPDATE_DATA',
      );
    }

    const conditions =
      [
        eq(
          reservations.id,
          reservationId,
        ),
        eq(
          reservations.mitra_id,
          targetMitra.id,
        ),
      ];

    const sessionBranch =
      positiveInteger(
        authPayload.branchId,
      );

    if (
      sessionBranch !==
      null
    ) {
      conditions.push(
        eq(
          reservations.branch_id,
          sessionBranch,
        ),
      );
    }

    await db
      .update(
        reservations,
      )
      .set({
        status:
          status as any,
        updatedAt:
          new Date(),
      })
      .where(
        and(
          ...conditions,
        ),
      );

    return NextResponse.json({
      success:
        true,
      message:
        'Status diperbarui.',
    });
  } catch (
    error
  ) {
    console.error(
      '[RESERVATIONS_PUT_ERROR]',
      error,
    );

    return jsonError(
      500,
      'Gagal update status.',
      'RESERVATION_UPDATE_FAILED',
    );
  }
}
