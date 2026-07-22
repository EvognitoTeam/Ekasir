import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  eq,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireMobileAuth } from '@/lib/mobile-api/auth';

type PointsSettingsRow = {
  id: number | string | null;
  mitraId: number | string | null;

  pointsEnabled:
    | boolean
    | number
    | string
    | null;

  pointsEarnRate:
    | number
    | string
    | null;

  pointsRedeemRate:
    | number
    | string
    | null;

  pointsMinimumRedeem:
    | number
    | string
    | null;

  pointsMaximumRedeem:
    | number
    | string
    | null;

  pointsMaxDiscountPercent:
    | number
    | string
    | null;

  pointsRequirePaidOrder:
    | boolean
    | number
    | string
    | null;

  pointsIncludeTaxService:
    | boolean
    | number
    | string
    | null;

  pointsUpdatedAt:
    | Date
    | string
    | null;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  details: unknown = null,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    {
      status,
    },
  );
}

function numberValue(
  value: unknown,
  fallback: number,
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function nullableNumberValue(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function booleanValue(
  value: unknown,
  fallback: boolean,
): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized =
      value.trim().toLowerCase();

    if (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'on'
    ) {
      return true;
    }

    if (
      normalized === '0' ||
      normalized === 'false' ||
      normalized === 'no' ||
      normalized === 'off'
    ) {
      return false;
    }
  }

  return fallback;
}

export async function GET(
  request: NextRequest,
): Promise<Response> {
  try {
    const payload =
      await requireMobileAuth(request);

    /*
     * Helper requireMobileAuth() Anda
     * mengembalikan payload secara langsung.
     */
    if (!payload) {
      return errorResponse(
        401,
        'UNAUTHORIZED',
        'Access token tidak valid atau telah kedaluwarsa.',
      );
    }

    const mitraId = Number(
      payload.mitraId,
    );

    if (
      !Number.isInteger(mitraId) ||
      mitraId <= 0
    ) {
      return errorResponse(
        401,
        'INVALID_MITRA_ID',
        'Mitra ID pada access token tidak valid.',
        {
          receivedMitraId:
            payload.mitraId,
        },
      );
    }

    /*
     * Kolom points dibaca menggunakan sql alias.
     *
     * Ini mencegah error ketika properti camelCase
     * belum tersedia pada object schema Drizzle.
     */
    const rows =
      await db
        .select({
          id: sql<
            number | string | null
          >`${settings.id}`,

          mitraId: sql<
            number | string | null
          >`${settings.mitraId}`,

          pointsEnabled: sql<
            boolean |
            number |
            string |
            null
          >`points_enabled`,

          pointsEarnRate: sql<
            number |
            string |
            null
          >`points_earn_rate`,

          pointsRedeemRate: sql<
            number |
            string |
            null
          >`points_redeem_rate`,

          pointsMinimumRedeem: sql<
            number |
            string |
            null
          >`points_minimum_redeem`,

          pointsMaximumRedeem: sql<
            number |
            string |
            null
          >`points_maximum_redeem`,

          pointsMaxDiscountPercent: sql<
            number |
            string |
            null
          >`points_max_discount_percent`,

          pointsRequirePaidOrder: sql<
            boolean |
            number |
            string |
            null
          >`points_require_paid_order`,

          pointsIncludeTaxService: sql<
            boolean |
            number |
            string |
            null
          >`points_include_tax_service`,

          pointsUpdatedAt: sql<
            Date |
            string |
            null
          >`points_updated_at`,
        })
        .from(settings)
        .where(
          eq(
            settings.mitraId,
            mitraId,
          ),
        )
        .limit(1);

    const setting =
      rows[0] as
        | PointsSettingsRow
        | undefined;

    /*
     * Bila row settings tidak ditemukan,
     * gunakan konfigurasi default.
     */
    const enabled =
      booleanValue(
        setting?.pointsEnabled,
        false,
      );

    const earnRate = Math.max(
      1,
      Math.floor(
        numberValue(
          setting?.pointsEarnRate,
          1000,
        ),
      ),
    );

    const redeemRate = Math.max(
      0,
      numberValue(
        setting?.pointsRedeemRate,
        10,
      ),
    );

    const minimumRedeem = Math.max(
      0,
      Math.floor(
        numberValue(
          setting
            ?.pointsMinimumRedeem,
          100,
        ),
      ),
    );

    const rawMaximumRedeem =
      nullableNumberValue(
        setting?.pointsMaximumRedeem,
      );

    const maximumRedeem =
      rawMaximumRedeem === null
        ? null
        : Math.max(
            0,
            Math.floor(
              rawMaximumRedeem,
            ),
          );

    const maxDiscountPercent =
      Math.min(
        100,
        Math.max(
          0,
          numberValue(
            setting
              ?.pointsMaxDiscountPercent,
            50,
          ),
        ),
      );

    const requirePaidOrder =
      booleanValue(
        setting
          ?.pointsRequirePaidOrder,
        true,
      );

    const includeTaxService =
      booleanValue(
        setting
          ?.pointsIncludeTaxService,
        false,
      );

    const exampleTransactionAmount =
      100000;

    const examplePointsEarned =
      enabled
        ? Math.floor(
            exampleTransactionAmount /
              earnRate,
          )
        : 0;

    const exampleRedeemPoints =
      Math.max(
        minimumRedeem,
        500,
      );

    const exampleDiscountValue =
      exampleRedeemPoints *
      redeemRate;

    return NextResponse.json(
      {
        success: true,
        message:
          'Konfigurasi loyalty points berhasil diambil.',

        data: {
          enabled,

          earning: {
            /*
             * Setiap nominal ini menghasilkan
             * satu poin.
             */
            rupiahPerPoint:
              earnRate,

            formula:
              'floor(eligibleAmount / rupiahPerPoint)',

            example: {
              transactionAmount:
                exampleTransactionAmount,

              pointsEarned:
                examplePointsEarned,
            },
          },

          redemption: {
            /*
             * Nilai rupiah dari satu poin.
             */
            rupiahPerPoint:
              redeemRate,

            minimumPoints:
              minimumRedeem,

            maximumPoints:
              maximumRedeem,

            maxDiscountPercent,

            formula:
              'redeemedPoints * rupiahPerPoint',

            example: {
              points:
                exampleRedeemPoints,

              discountValue:
                exampleDiscountValue,
            },
          },

          rules: {
            requirePaidOrder,
            includeTaxService,
          },

          source: {
            settingsId:
              setting?.id ===
                null ||
              setting?.id ===
                undefined
                ? null
                : Number(
                    setting.id,
                  ),

            mitraId,

            usingDefault:
              !setting,

            updatedAt:
              setting
                ?.pointsUpdatedAt ??
              null,
          },
        },

        meta: null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      '[POINTS_CONFIG_GET_ERROR]',
      error,
    );

    return errorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'Terjadi kesalahan saat mengambil konfigurasi poin.',
      process.env.NODE_ENV ===
        'development'
        ? {
            name:
              error instanceof Error
                ? error.name
                : 'UnknownError',

            message:
              error instanceof Error
                ? error.message
                : String(error),

            stack:
              error instanceof Error
                ? error.stack
                : null,
          }
        : null,
    );
  }
}