import {
  NextResponse,
} from 'next/server';

import { db } from '@/db';

import {
  branches,
  mitra,
  orders,
} from '@/db/schema';

import {
  and,
  asc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

function normalizeText(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function normalizeBanner(
  value: unknown,
): string | null {
  const banner =
    normalizeText(
      value,
    );

  if (!banner) {
    return null;
  }

  if (
    banner.startsWith('/') ||
    banner.startsWith('http://') ||
    banner.startsWith('https://') ||
    banner.startsWith('data:') ||
    banner.startsWith('blob:')
  ) {
    return banner;
  }

  return `/${banner}`;
}

function dateTimestamp(
  value:
    | Date
    | string
    | number
    | null
    | undefined,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : 0;
}

export async function GET(
  request: Request,
): Promise<Response> {
  const {
    searchParams,
  } =
    new URL(
      request.url,
    );

  const slug =
    normalizeText(
      searchParams.get(
        'slug',
      ),
    );

  const branchSlug =
    normalizeText(
      searchParams.get(
        'branch_slug',
      ),
    );

  if (!slug) {
    return NextResponse.json(
      {
        success:
          false,

        message:
          'Slug mitra wajib diisi.',
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const [
      targetMitra,
    ] =
      await db
        .select({
          id:
            mitra.id,

          name:
            mitra.mitra_name,

          banner:
            mitra.banner,
        })
        .from(
          mitra,
        )
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
        .limit(
          1,
        );

    if (!targetMitra) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            'Mitra tidak ditemukan.',
        },
        {
          status:
            404,
        },
      );
    }

    let branchId:
      number | null =
      null;

    let branchName:
      string | null =
      null;

    if (
      branchSlug
    ) {
      const [
        targetBranch,
      ] =
        await db
          .select({
            id:
              branches.id,

            name:
              branches.name,
          })
          .from(
            branches,
          )
          .where(
            and(
              eq(
                branches.mitra_id,
                targetMitra.id,
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
          .limit(
            1,
          );

      if (!targetBranch) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              'Cabang tidak ditemukan.',
          },
          {
            status:
              404,
          },
        );
      }

      branchId =
        targetBranch.id;

      branchName =
        targetBranch.name;
    }

    const conditions = [
      eq(
        orders.mitra_id,
        targetMitra.id,
      ),

      inArray(
        orders.status,
        [
          'preparing',
          'ready',
        ],
      ),

      isNull(
        orders.deletedAt,
      ),

      branchId ===
        null
        ? isNull(
            orders.branch_id,
          )
        : eq(
            orders.branch_id,
            branchId,
          ),
    ];

    const activeOrders =
      await db
        .select({
          id:
            orders.id,

          orderCode:
            orders.order_code,

          customerName:
            orders.name,

          status:
            orders.status,

          createdAt:
            orders.createdAt,

          preparingAt:
            orders.preparingAt,

          readyAt:
            orders.readyAt,
        })
        .from(
          orders,
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .orderBy(
          asc(
            orders.createdAt,
          ),
        );

    const preparing =
      activeOrders
        .filter(
          (
            order,
          ) =>
            order.status ===
            'preparing',
        )
        .sort(
          (
            first,
            second,
          ) => {
            const a =
              dateTimestamp(
                first.preparingAt ??
                  first.createdAt,
              );

            const b =
              dateTimestamp(
                second.preparingAt ??
                  second.createdAt,
              );

            return a -
              b;
          },
        );

    const ready =
      activeOrders
        .filter(
          (
            order,
          ) =>
            order.status ===
            'ready',
        )
        .sort(
          (
            first,
            second,
          ) => {
            const a =
              dateTimestamp(
                first.readyAt ??
                  first.createdAt,
              );

            const b =
              dateTimestamp(
                second.readyAt ??
                  second.createdAt,
              );

            return b -
              a;
          },
        );

    const normalizeOrder =
      (
        order:
          typeof activeOrders[
            number
          ],
      ) => ({
        id:
          Number(
            order.id,
          ),

        orderCode:
          normalizeText(
            order.orderCode,
          ),

        customerName:
          normalizeText(
            order.customerName,
          ) ||
          null,

        status:
          order.status,

        createdAt:
          order.createdAt
            ? new Date(
                order.createdAt,
              ).toISOString()
            : null,

        preparingAt:
          order.preparingAt
            ? new Date(
                order.preparingAt,
              ).toISOString()
            : null,

        readyAt:
          order.readyAt
            ? new Date(
                order.readyAt,
              ).toISOString()
            : null,
      });

    return NextResponse.json(
      {
        success:
          true,

        data: {
          store: {
            name:
              branchName
                ? `${targetMitra.name} - ${branchName}`
                : targetMitra.name,

            mitraName:
              targetMitra.name,

            branchName,

            banner:
              normalizeBanner(
                targetMitra.banner,
              ),
          },

          preparing:
            preparing.map(
              normalizeOrder,
            ),

          ready:
            ready.map(
              normalizeOrder,
            ),

          serverTime:
            new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      '[QUEUE_API_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : 'Gagal memuat antrean.',
      },
      {
        status:
          500,
      },
    );
  }
}
