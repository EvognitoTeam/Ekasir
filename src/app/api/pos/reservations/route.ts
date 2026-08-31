import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  mitra,
  reservations,
  reservationTableList,
  tableList,
} from '@/db/schema';
import {
  and,
  desc,
  eq,
  inArray,
} from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import { queueTableIoT } from '@/lib/iot/publish';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026',
);

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'canceled'
  | 'cancelled'
  | 'no_show';

async function getAuthPayload() {
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

    return verified.payload as {
      branchId?:
        | number
        | string
        | null;
      role?: string;
    };
  } catch {
    return null;
  }
}

async function getMitraBySlug(
  slug: string,
) {
  return db
    .select()
    .from(mitra)
    .where(
      eq(
        mitra.mitra_slug,
        slug,
      ),
    )
    .limit(1);
}

function normalizeTableIds(
  value: unknown,
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item,
          ) =>
            Number(
              item,
            ),
        )
        .filter(
          (
            item,
          ) =>
            Number.isInteger(
              item,
            ) &&
            item > 0,
        ),
    ),
  );
}

function normalizeBranchId(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    String(value)
      .toLowerCase() ===
      'main'
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function tableStatusFromReservationStatus(
  status: string,
): 1 | 2 | 3 | null {
  if (
    status ===
    'confirmed'
  ) {
    return 3;
  }

  /*
   * Di UI Cashier, completed = tamu hadir.
   * Setelah tamu hadir, meja menjadi OCCUPIED.
   */
  if (
    status ===
    'completed'
  ) {
    return 2;
  }

  if (
    status ===
      'canceled' ||
    status ===
      'cancelled' ||
    status ===
      'no_show'
  ) {
    return 1;
  }

  /*
   * Pending reservation tidak langsung mengunci meja.
   * Gateway tetap dapat menampilkan upcoming reservation
   * meskipun table_list.status masih AVAILABLE.
   */
  return null;
}

function queueReservationTablesIoT(
  tableIds: number[],
  reason: string,
) {
  for (
    const tableId of
    tableIds
  ) {
    queueTableIoT(
      tableId,
      reason,
    );
  }
}

// ============================================================================
// [GET] AMBIL DAFTAR RESERVASI
// ============================================================================
export async function GET(
  request: Request,
) {
  try {
    const authPayload =
      await getAuthPayload();

    if (!authPayload) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized.',
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      searchParams.get(
        'slug',
      );

    const reqBranchId =
      searchParams.get(
        'branch_id',
      );

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug wajib disertakan',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      foundMitra.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const currentMitra =
      foundMitra[0];

    const sessionBranchId =
      normalizeBranchId(
        authPayload.branchId,
      );

    const requestedBranchId =
      normalizeBranchId(
        reqBranchId,
      );

    const finalBranchId =
      sessionBranchId ??
      requestedBranchId;

    const conditions = [
      eq(
        reservations.mitra_id,
        currentMitra.id,
      ),
    ];

    if (
      finalBranchId
    ) {
      conditions.push(
        eq(
          reservations.branch_id,
          finalBranchId,
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

    const resIds =
      data.map(
        (
          reservation,
        ) =>
          Number(
            reservation.id,
          ),
      );

    let tableMappings:
      Array<
        typeof reservationTableList.$inferSelect
      > = [];

    if (
      resIds.length >
      0
    ) {
      tableMappings =
        await db
          .select()
          .from(
            reservationTableList,
          )
          .where(
            inArray(
              reservationTableList.reservation_id,
              resIds,
            ),
          );
    }

    const tableIdsByReservation =
      new Map<
        number,
        number[]
      >();

    for (
      const mapping of
      tableMappings
    ) {
      const reservationId =
        Number(
          mapping.reservation_id,
        );

      const tableId =
        Number(
          mapping.table_list_id,
        );

      const existing =
        tableIdsByReservation.get(
          reservationId,
        ) ??
        [];

      existing.push(
        tableId,
      );

      tableIdsByReservation.set(
        reservationId,
        existing,
      );
    }

    const formattedData =
      data.map(
        (
          reservation,
        ) => {
          const reservationId =
            Number(
              reservation.id,
            );

          const mappedTableIds =
            tableIdsByReservation.get(
              reservationId,
            ) ??
            [];

          /*
           * Fallback untuk data reservation lama yang mungkin
           * hanya punya reservations.table_id tanpa pivot.
           */
          const tableIds =
            mappedTableIds.length >
            0
              ? mappedTableIds
              : reservation.table_id
                ? [
                    Number(
                      reservation.table_id,
                    ),
                  ]
                : [];

          return {
            ...reservation,
            table_ids:
              tableIds,
          };
        },
      );

    return NextResponse.json({
      success: true,
      data:
        formattedData,
    });
  } catch (error) {
    console.error(
      'GET Reservations API Error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Terjadi kesalahan server',
      },
      {
        status: 500,
      },
    );
  }
}

// ============================================================================
// [POST] BUAT RESERVASI
// ============================================================================
export async function POST(
  request: Request,
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
      searchParams.get(
        'slug',
      );

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug wajib disertakan',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      foundMitra.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const currentMitra =
      foundMitra[0];

    const body =
      await request.json();

    const {
      customer_name,
      customer_phone,
      guest_count,
      reserved_start,
      reserved_end,
      table_ids,
      notes,
      status,
      branch_id,
    } = body;

    if (
      !customer_name ||
      !guest_count ||
      !reserved_start ||
      !reserved_end
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Data wajib belum lengkap',
        },
        {
          status: 400,
        },
      );
    }

    const selectedTableIds =
      normalizeTableIds(
        table_ids,
      );

    /*
     * Manual reservation Kasir wajib mempunyai meja.
     * Public reservation masih boleh mengikuti flow existing Anda.
     */
    if (
      authPayload &&
      selectedTableIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Pilih minimal satu meja untuk reservasi manual',
        },
        {
          status: 400,
        },
      );
    }

    const finalStatus:
      ReservationStatus =
        authPayload
          ? (
              status ||
              'confirmed'
            ) as ReservationStatus
          : 'pending';

    const finalBranchId =
      authPayload
        ? (
            normalizeBranchId(
              authPayload.branchId,
            ) ??
            normalizeBranchId(
              branch_id,
            )
          )
        : normalizeBranchId(
            branch_id,
          );

    const nextTableStatus =
      tableStatusFromReservationStatus(
        finalStatus,
      );

    const result =
      await db.transaction(
        async (
          tx,
        ) => {
          const [
            insertRes,
          ] =
            await tx
              .insert(
                reservations,
              )
              .values({
                mitra_id:
                  currentMitra.id,
                branch_id:
                  finalBranchId,
                customer_name,
                customer_phone,
                guest_count:
                  Number(
                    guest_count,
                  ),
                reserved_start:
                  new Date(
                    reserved_start,
                  ),
                reserved_end:
                  new Date(
                    reserved_end,
                  ),
                /*
                 * Tetap isi table_id dengan meja pertama
                 * untuk backward compatibility.
                 *
                 * Source relasi multi-meja tetap reservationTableList.
                 */
                table_id:
                  selectedTableIds[0] ??
                  null,
                notes:
                  notes ||
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
                insertRes as {
                  insertId?:
                    number | string;
                }
              ).insertId ??
                0,
            );

          if (
            reservationId >
              0 &&
            selectedTableIds.length >
              0
          ) {
            await tx
              .insert(
                reservationTableList,
              )
              .values(
                selectedTableIds.map(
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

          /*
           * Manual reservation confirmed:
           * meja langsung menjadi RESERVED di transaction yang sama.
           */
          if (
            nextTableStatus !==
              null &&
            selectedTableIds.length >
              0
          ) {
            const tableConditions = [
              eq(
                tableList.mitra_id,
                currentMitra.id,
              ),
              inArray(
                tableList.id,
                selectedTableIds,
              ),
            ];

            if (
              finalBranchId
            ) {
              tableConditions.push(
                eq(
                  tableList.branch_id,
                  finalBranchId,
                ),
              );
            }

            await tx
              .update(
                tableList,
              )
              .set({
                status:
                  nextTableStatus,
                updatedAt:
                  new Date(),
              })
              .where(
                and(
                  ...tableConditions,
                ),
              );
          }

          return {
            reservationId,
            tableIds:
              selectedTableIds,
            status:
              finalStatus,
          };
        },
      );

    /*
     * PENTING:
     * Sync IoT dilakukan SETELAH transaction commit.
     *
     * Walaupun meja sebelumnya sudah status=3, kita tetap queue sync,
     * karena customer_name / reserved_start / reserved_end mungkin baru.
     */
    queueReservationTablesIoT(
      result.tableIds,
      `reservation-created:${result.status}`,
    );

    return NextResponse.json({
      success: true,
      message:
        authPayload
          ? 'Reservasi manual berhasil dibuat'
          : 'Reservasi diajukan, menunggu konfirmasi',
      data: {
        id:
          result.reservationId,
        status:
          result.status,
        table_ids:
          result.tableIds,
      },
    });
  } catch (error) {
    console.error(
      'POST Reservation API Error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal membuat reservasi',
      },
      {
        status: 500,
      },
    );
  }
}

// ============================================================================
// [PUT] UPDATE STATUS RESERVASI
// ============================================================================
export async function PUT(
  request: Request,
) {
  try {
    const authPayload =
      await getAuthPayload();

    if (!authPayload) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized.',
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      searchParams.get(
        'slug',
      );

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug wajib disertakan',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      foundMitra.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const currentMitra =
      foundMitra[0];

    const body =
      await request.json();

    const reservationId =
      Number(
        body.id,
      );

    const status =
      String(
        body.status ??
        '',
      ).trim() as ReservationStatus;

    if (
      !Number.isInteger(
        reservationId,
      ) ||
      reservationId <= 0 ||
      !status
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Data reservasi tidak valid',
        },
        {
          status: 400,
        },
      );
    }

    const branchId =
      normalizeBranchId(
        authPayload.branchId,
      );

    const nextTableStatus =
      tableStatusFromReservationStatus(
        status,
      );

    const result =
      await db.transaction(
        async (
          tx,
        ) => {
          const reservationConditions = [
            eq(
              reservations.id,
              reservationId,
            ),
            eq(
              reservations.mitra_id,
              currentMitra.id,
            ),
          ];

          if (
            branchId
          ) {
            reservationConditions.push(
              eq(
                reservations.branch_id,
                branchId,
              ),
            );
          }

          const [
            targetReservation,
          ] =
            await tx
              .select({
                id:
                  reservations.id,
                tableId:
                  reservations.table_id,
                status:
                  reservations.status,
              })
              .from(
                reservations,
              )
              .where(
                and(
                  ...reservationConditions,
                ),
              )
              .limit(
                1,
              );

          if (
            !targetReservation
          ) {
            return {
              found:
                false as const,
              tableIds:
                [] as number[],
            };
          }

          const mappings =
            await tx
              .select({
                tableId:
                  reservationTableList.table_list_id,
              })
              .from(
                reservationTableList,
              )
              .where(
                eq(
                  reservationTableList.reservation_id,
                  reservationId,
                ),
              );

          const mappedTableIds =
            mappings
              .map(
                (
                  mapping,
                ) =>
                  Number(
                    mapping.tableId,
                  ),
              )
              .filter(
                (
                  tableId,
                ) =>
                  Number.isInteger(
                    tableId,
                  ) &&
                  tableId > 0,
              );

          const tableIds =
            Array.from(
              new Set(
                mappedTableIds.length >
                0
                  ? mappedTableIds
                  : targetReservation.tableId
                    ? [
                        Number(
                          targetReservation.tableId,
                        ),
                      ]
                    : [],
              ),
            );

          await tx
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
                ...reservationConditions,
              ),
            );

          if (
            nextTableStatus !==
              null &&
            tableIds.length >
              0
          ) {
            const tableConditions = [
              eq(
                tableList.mitra_id,
                currentMitra.id,
              ),
              inArray(
                tableList.id,
                tableIds,
              ),
            ];

            if (
              branchId
            ) {
              tableConditions.push(
                eq(
                  tableList.branch_id,
                  branchId,
                ),
              );
            }

            await tx
              .update(
                tableList,
              )
              .set({
                status:
                  nextTableStatus,
                updatedAt:
                  new Date(),
              })
              .where(
                and(
                  ...tableConditions,
                ),
              );
          }

          return {
            found:
              true as const,
            tableIds,
          };
        },
      );

    if (!result.found) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Reservasi tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Selalu sync semua meja setelah perubahan reservation,
     * bukan hanya ketika table_list.status berubah.
     *
     * Ini yang memperbaiki kasus:
     * table_list sudah 3 tetapi jam/nama reservation masih snapshot lama.
     */
    queueReservationTablesIoT(
      result.tableIds,
      `reservation-status:${status}`,
    );

    return NextResponse.json({
      success: true,
      message:
        'Status diperbarui',
      data: {
        id:
          reservationId,
        status,
        table_ids:
          result.tableIds,
      },
    });
  } catch (error) {
    console.error(
      'PUT Reservation API Error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal update status',
      },
      {
        status: 500,
      },
    );
  }
}
