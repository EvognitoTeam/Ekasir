import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  branches,
  mitra,
  settings,
} from '@/db/schema';

import { getWIBDate } from '@/utils/formatters';
import { requirePosAuth } from '@/lib/auth/posAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ==========================================================
 * JWT
 * ==========================================================
 *
 * GET settings dapat dipanggil customer/public.
 *
 * Karena itu kita tidak bisa menggunakan requirePosAuth()
 * untuk GET.
 *
 * JWT di GET hanya digunakan untuk mendeteksi apakah
 * request berasal dari user yang sudah login.
 *
 * PUT tetap menggunakan requirePosAuth().
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'JWT_SECRET wajib dikonfigurasi di production.',
  );
}

const SECRET_KEY = new TextEncoder().encode(
  JWT_SECRET ??
    'rahasia-super-aman-evokasir-2026',
);

/**
 * ==========================================================
 * TYPE
 * ==========================================================
 */

type OptionalAuthPayload = JWTPayload & {
  userId?: number | string;
  mitraId?: number | string;
  branchId?: number | string | null;

  role?: string;

  slug?: string;
  email?: string;
};

/**
 * ==========================================================
 * RESPONSE ERROR
 * ==========================================================
 */

function jsonError(
  status: number,
  message: string,
  code = 'REQUEST_FAILED',
) {
  return NextResponse.json(
    {
      success: false,

      message,

      error: {
        code,
      },
    },
    {
      status,
    },
  );
}

/**
 * ==========================================================
 * NORMALIZER
 * ==========================================================
 */

function normalizeString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function normalizeNullableString(
  value: unknown,
): string | null {
  const valueString =
    normalizeString(value);

  return valueString
    ? valueString
    : null;
}

function toPositiveInteger(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

/**
 * ==========================================================
 * RATE
 * ==========================================================
 *
 * Digunakan untuk:
 *
 * taxRate
 * serviceRate
 *
 * Range:
 * 0 - 100
 */

function parseRate(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 100
  ) {
    return null;
  }

  return number;
}

/**
 * ==========================================================
 * TAX INCLUDED
 * ==========================================================
 */

function parseTaxIncluded(
  value: unknown,
): number | null {
  if (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return 1;
  }

  if (
    value === false ||
    value === 0 ||
    value === '0' ||
    value === 'false' ||
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  return null;
}

/**
 * ==========================================================
 * OPTIONAL JWT
 * ==========================================================
 *
 * Digunakan hanya untuk GET.
 *
 * Jika tidak ada token:
 * dianggap guest.
 *
 * Jika token invalid:
 * dianggap guest.
 *
 * GET settings tetap dapat berjalan.
 */

async function getOptionalAuthPayload(): Promise<OptionalAuthPayload | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return null;
    }

    const verified = await jwtVerify(
      token,
      SECRET_KEY,
    );

    return verified.payload as OptionalAuthPayload;
  } catch {
    return null;
  }
}

/**
 * ==========================================================
 * SETTINGS SCOPE CONDITION
 * ==========================================================
 *
 * Ini penting.
 *
 * Sebelumnya jika branchId = NULL:
 *
 * WHERE mitra_id = ?
 * LIMIT 1
 *
 * bisa mengambil setting cabang secara acak.
 *
 *
 * Sekarang:
 *
 * PUSAT:
 *
 * WHERE
 * mitra_id = ?
 * AND branch_id IS NULL
 *
 *
 * CABANG:
 *
 * WHERE
 * mitra_id = ?
 * AND branch_id = ?
 */

function getSettingsCondition(
  mitraId: number,
  branchId: number | null,
) {
  if (branchId === null) {
    return and(
      eq(
        settings.mitraId,
        mitraId,
      ),

      isNull(
        settings.branch_id,
      ),
    );
  }

  return and(
    eq(
      settings.mitraId,
      mitraId,
    ),

    eq(
      settings.branch_id,
      branchId,
    ),
  );
}

/**
 * ==========================================================
 * GET SETTINGS WITH FALLBACK
 * ==========================================================
 *
 * Jika branch:
 *
 * 1. cari setting cabang
 *
 * jika tidak ada:
 *
 * 2. gunakan setting pusat
 */

async function findSettings(
  mitraId: number,
  branchId: number | null,
) {

  /**
   * ========================================================
   * SETTING CABANG
   * ========================================================
   */

  if (branchId !== null) {
    const [branchSettings] =
      await db
        .select()
        .from(settings)

        .where(
          getSettingsCondition(
            mitraId,
            branchId,
          ),
        )

        .limit(1);

    if (branchSettings) {
      return branchSettings;
    }
  }

  /**
   * ========================================================
   * SETTING PUSAT
   * ========================================================
   */

  const [globalSettings] =
    await db
      .select()
      .from(settings)

      .where(
        getSettingsCondition(
          mitraId,
          null,
        ),
      )

      .limit(1);

  return globalSettings ?? null;
}

/**
 * ==========================================================
 * VALIDATE BRANCH
 * ==========================================================
 *
 * Memastikan branch:
 *
 * - ada
 * - milik mitra
 * - belum soft delete
 */

async function findActiveBranch(
  mitraId: number,
  branchId: number,
) {
  const [branch] =
    await db
      .select({
        id:
          branches.id,

        mitraId:
          branches.mitra_id,

        name:
          branches.name,
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

  return branch ?? null;
}

/**
 * ==========================================================
 * GET
 * ==========================================================
 *
 * PUBLIC ENDPOINT
 *
 * Contoh:
 *
 * /api/settings?slug=kopisenja
 *
 * /api/settings?slug=kopisenja&branch_id=10
 *
 *
 * Tidak membutuhkan login.
 */

export async function GET(
  request: Request,
) {
  try {

    /**
     * ======================================================
     * REQUEST
     * ======================================================
     */

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const slug =
      normalizeString(
        searchParams.get('slug'),
      );

    const branchIdRaw =
      searchParams.get(
        'branch_id',
      );

    /**
     * ======================================================
     * VALIDASI SLUG
     * ======================================================
     */

    if (!slug) {
      return jsonError(
        400,

        'Slug diperlukan.',

        'SETTINGS_SLUG_REQUIRED',
      );
    }

    /**
     * ======================================================
     * VALIDASI BRANCH ID
     * ======================================================
     */

    let requestedBranchId:
      number | null = null;

    if (
      branchIdRaw !== null &&
      branchIdRaw !== ''
    ) {

      requestedBranchId =
        toPositiveInteger(
          branchIdRaw,
        );

      if (!requestedBranchId) {
        return jsonError(
          400,

          'Branch ID tidak valid.',

          'SETTINGS_BRANCH_ID_INVALID',
        );
      }
    }

    /**
     * ======================================================
     * CARI MITRA
     * ======================================================
     */

    const [mitraData] =
      await db
        .select()
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

    if (!mitraData) {
      return jsonError(
        404,

        'Mitra tidak ditemukan.',

        'SETTINGS_MITRA_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * OPTIONAL AUTH
     * ======================================================
     */

    const payload =
      await getOptionalAuthPayload();

    let isAuthenticated =
      false;

    let finalBranchId =
      requestedBranchId;

    /**
     * Token dianggap terkait dengan toko ini
     * hanya jika:
     *
     * mitraId sama
     *
     * ATAU
     *
     * slug sama.
     */

    if (payload) {

      const tokenMitraId =
        toPositiveInteger(
          payload.mitraId,
        );

      const sameMitra =
        (
          tokenMitraId ===
          mitraData.id
        ) ||
        (
          typeof payload.slug ===
            'string' &&
          payload.slug === slug
        );

      if (sameMitra) {

        isAuthenticated =
          true;

        /**
         * ==================================================
         * STAFF BRANCH
         * ==================================================
         *
         * Hanya staff POS yang branchId token-nya
         * diprioritaskan.
         *
         * User/customer tetap menggunakan branch_id
         * dari request.
         */

        const role =
          typeof payload.role ===
            'string'
            ? payload.role
            : '';

        const isPosStaff =
          role === 'Owner' ||
          role === 'Cashier' ||
          role === 'Kitchen';

        if (isPosStaff) {

          const tokenBranchId =
            toPositiveInteger(
              payload.branchId,
            );

          if (tokenBranchId) {
            finalBranchId =
              tokenBranchId;
          }
        }
      }
    }

    /**
     * ======================================================
     * VALIDASI BRANCH
     * ======================================================
     *
     * Jika branch dipilih,
     * pastikan benar-benar milik mitra.
     */

    if (finalBranchId !== null) {

      const selectedBranch =
        await findActiveBranch(
          mitraData.id,
          finalBranchId,
        );

      if (!selectedBranch) {
        return jsonError(
          404,

          'Cabang tidak ditemukan.',

          'SETTINGS_BRANCH_NOT_FOUND',
        );
      }
    }

    /**
     * ======================================================
     * SETTINGS
     * ======================================================
     *
     * Branch setting
     *
     * ↓ jika tidak ada
     *
     * Global setting
     */

    const dbSettings =
      await findSettings(
        mitraData.id,
        finalBranchId,
      );

    /**
     * ======================================================
     * PUBLIC DATA
     * ======================================================
     *
     * Saya pertahankan field yang sebelumnya
     * sudah dikirim oleh API Anda agar frontend
     * tidak rusak.
     */

    const publicData = {

      cafeName:
        mitraData.mitra_name ||
        '',

      mitraAddress:
        mitraData.mitra_address ||
        '',

      mitraWelcome:
        mitraData.mitra_welcome ||
        '',

      banner:
        mitraData.banner ||
        '',

      bankName:
        mitraData.bank_name ||
        '',

      bankNumber:
        mitraData.no_rek ||
        '',

      bankOwner:
        mitraData.nama_rek ||
        '',

      taxRate:
        dbSettings?.taxRate ??
        0,

      serviceRate:
        dbSettings?.serviceRate ??
        0,

      isTaxIncluded:
        dbSettings?.isTaxIncluded ??
        0,

      wifiSSID:
        dbSettings?.wifiSSID ||
        '',

      wifiPassword:
        dbSettings?.wifiPassword ||
        '',

      facilities:
        dbSettings?.facility ||
        [],

      faq:
        dbSettings?.faq ||
        [],

      platformFeeRate:
        mitraData.cashout ??
        0,

      /**
       * Berguna supaya frontend tahu
       * setting branch mana yang akhirnya digunakan.
       */
      branchId:
        finalBranchId,
    };

    /**
     * ======================================================
     * PRIVATE SESSION DATA
     * ======================================================
     */

    const privateData =
      isAuthenticated
        ? {
            email:
              typeof payload?.email ===
                'string'
                ? payload.email
                : '',

            role:
              typeof payload?.role ===
                'string'
                ? payload.role
                : '',
          }
        : {};

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json({
      success: true,

      isAuthenticated,

      data: {
        ...publicData,
        ...privateData,
      },
    });

  } catch (error) {

    console.error(
      '[GET_SETTINGS_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat mengambil pengaturan.',

      'SETTINGS_FETCH_FAILED',
    );
  }
}

/**
 * ==========================================================
 * PUT
 * ==========================================================
 *
 * HANYA OWNER.
 *
 *
 * OWNER PUSAT:
 *
 * branchId = null
 *
 * Bisa:
 *
 * - update setting pusat
 * - memilih branch_id untuk update setting cabang
 * - update data global mitra
 *
 *
 * OWNER CABANG:
 *
 * branchId terisi
 *
 * Bisa:
 *
 * - update settings cabangnya sendiri
 *
 * Tidak bisa:
 *
 * - memilih branch lain
 * - mengubah data global mitra
 */

export async function PUT(
  request: Request,
) {
  try {

    /**
     * ======================================================
     * AUTH
     * ======================================================
     */

    const auth =
      await requirePosAuth({
        roles: [
          'Owner',
        ],
      });

    if (!auth.ok) {
      return auth.response;
    }

    const {
      session,
    } = auth;

    /**
     * ======================================================
     * SLUG
     * ======================================================
     */

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const slug =
      normalizeString(
        searchParams.get('slug'),
      );

    if (!slug) {
      return jsonError(
        400,

        'Slug diperlukan.',

        'SETTINGS_SLUG_REQUIRED',
      );
    }

    /**
     * ======================================================
     * TENANT PROTECTION
     * ======================================================
     *
     * slug URL hanya untuk validasi.
     *
     * mitraId asli selalu berasal dari session.
     */

    if (
      slug !==
      session.slug
    ) {
      return jsonError(
        403,

        'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',

        'SETTINGS_MITRA_MISMATCH',
      );
    }

    /**
     * ======================================================
     * BODY
     * ======================================================
     */

    const body =
      await request.json();

    /**
     * RATE
     */

    const taxRate =
      parseRate(
        body?.taxRate,
      );

    const serviceRate =
      parseRate(
        body?.serviceRate,
      );

    const isTaxIncluded =
      parseTaxIncluded(
        body?.is_tax_included ??
        body?.isTaxIncluded,
      );

    /**
     * ======================================================
     * VALIDASI RATE
     * ======================================================
     */

    if (taxRate === null) {
      return jsonError(
        400,

        'Tax rate harus berupa angka antara 0 sampai 100.',

        'SETTINGS_TAX_RATE_INVALID',
      );
    }

    if (serviceRate === null) {
      return jsonError(
        400,

        'Service rate harus berupa angka antara 0 sampai 100.',

        'SETTINGS_SERVICE_RATE_INVALID',
      );
    }

    if (isTaxIncluded === null) {
      return jsonError(
        400,

        'Nilai tax included tidak valid.',

        'SETTINGS_TAX_INCLUDED_INVALID',
      );
    }

    /**
     * ======================================================
     * ARRAY
     * ======================================================
     */

    if (
      body?.facilities !== undefined &&
      !Array.isArray(
        body.facilities,
      )
    ) {
      return jsonError(
        400,

        'Facilities harus berupa array.',

        'SETTINGS_FACILITIES_INVALID',
      );
    }

    if (
      body?.faq !== undefined &&
      !Array.isArray(
        body.faq,
      )
    ) {
      return jsonError(
        400,

        'FAQ harus berupa array.',

        'SETTINGS_FAQ_INVALID',
      );
    }

    const facilities =
      Array.isArray(
        body?.facilities,
      )
        ? body.facilities
        : [];

    const faq =
      Array.isArray(
        body?.faq,
      )
        ? body.faq
        : [];

    /**
     * ======================================================
     * STRING
     * ======================================================
     */

    const wifiSSID =
      normalizeNullableString(
        body?.wifiSSID,
      );

    const wifiPassword =
      normalizeNullableString(
        body?.wifiPassword,
      );

    const bankName =
      normalizeNullableString(
        body?.bankName,
      );

    const bankNumber =
      normalizeNullableString(
        body?.bankNumber,
      );

    const bankOwner =
      normalizeNullableString(
        body?.bankOwner,
      );

    const cafeName =
      normalizeString(
        body?.cafeName,
      );

    const mitraAddress =
      normalizeString(
        body?.mitraAddress,
      );

    const mitraWelcome =
      normalizeString(
        body?.mitraWelcome,
      );

    /**
     * ======================================================
     * BRANCH REQUEST
     * ======================================================
     */

    let requestedBranchId:
      number | null = null;

    if (
      body?.branch_id !== null &&
      body?.branch_id !== undefined &&
      body?.branch_id !== ''
    ) {

      requestedBranchId =
        toPositiveInteger(
          body.branch_id,
        );

      if (!requestedBranchId) {
        return jsonError(
          400,

          'Branch ID tidak valid.',

          'SETTINGS_BRANCH_ID_INVALID',
        );
      }
    }

    /**
     * ======================================================
     * FINAL BRANCH
     * ======================================================
     *
     * Owner cabang:
     *
     * ALWAYS gunakan branch dari session.
     *
     *
     * Owner pusat:
     *
     * boleh menggunakan branch_id dari UI.
     */

    const finalBranchId =
      session.branchId !== null
        ? session.branchId
        : requestedBranchId;

    /**
     * ======================================================
     * VALIDASI BRANCH OWNERSHIP
     * ======================================================
     */

    if (finalBranchId !== null) {

      const selectedBranch =
        await findActiveBranch(
          session.mitraId,
          finalBranchId,
        );

      if (!selectedBranch) {
        return jsonError(
          404,

          'Cabang tidak ditemukan atau bukan milik toko Anda.',

          'SETTINGS_BRANCH_NOT_FOUND',
        );
      }
    }

    /**
     * ======================================================
     * CARI MITRA BERDASARKAN SESSION
     * ======================================================
     *
     * Bukan berdasarkan slug client.
     */

    const [mitraData] =
      await db
        .select()
        .from(mitra)

        .where(
          and(
            eq(
              mitra.id,
              session.mitraId,
            ),

            isNull(
              mitra.deletedAt,
            ),
          ),
        )

        .limit(1);

    if (!mitraData) {
      return jsonError(
        404,

        'Mitra tidak ditemukan.',

        'SETTINGS_MITRA_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * EXACT SETTINGS SCOPE
     * ======================================================
     */

    const settingsCondition =
      getSettingsCondition(
        session.mitraId,
        finalBranchId,
      );

    /**
     * ======================================================
     * DATABASE TRANSACTION
     * ======================================================
     *
     * Update global mitra dan settings berada
     * dalam transaksi yang sama.
     */

    await db.transaction(
      async (tx) => {

        /**
         * ==================================================
         * GLOBAL MITRA DATA
         * ==================================================
         *
         * Hanya Owner pusat:
         *
         * branch_id = NULL
         *
         * yang boleh mengubah:
         *
         * - nama cafe
         * - alamat mitra
         * - welcome
         * - rekening
         */

        if (
          session.branchId === null
        ) {

          await tx
            .update(mitra)

            .set({

              bank_name:
                bankName,

              no_rek:
                bankNumber,

              nama_rek:
                bankOwner
                  ? bankOwner.toUpperCase()
                  : null,

              rek_added_at:
                getWIBDate(),

              updatedAt:
                getWIBDate(),

              mitra_name:
                cafeName ||
                mitraData.mitra_name,

              mitra_address:
                mitraAddress ||
                mitraData.mitra_address,

              mitra_welcome:
                mitraWelcome ||
                mitraData.mitra_welcome,
            })

            .where(
              and(
                eq(
                  mitra.id,
                  session.mitraId,
                ),

                isNull(
                  mitra.deletedAt,
                ),
              ),
            );
        }

        /**
         * ==================================================
         * CARI SETTINGS EXACT SCOPE
         * ==================================================
         */

        const [existingSettings] =
          await tx
            .select({
              id:
                settings.id,
            })

            .from(settings)

            .where(
              settingsCondition,
            )

            .limit(1);

        /**
         * ==================================================
         * INSERT
         * ==================================================
         */

        if (!existingSettings) {

          await tx
            .insert(settings)

            .values({
              mitraId:
                session.mitraId,

              branch_id:
                finalBranchId,

              taxRate,

              serviceRate,

              isTaxIncluded,

              wifiSSID,

              wifiPassword,

              facility:
                facilities,

              faq,

              createdAt:
                getWIBDate(),

              updatedAt:
                getWIBDate(),
            });

          return;
        }

        /**
         * ==================================================
         * UPDATE
         * ==================================================
         */

        await tx
          .update(settings)

          .set({
            taxRate,

            serviceRate,

            isTaxIncluded,

            wifiSSID,

            wifiPassword,

            facility:
              facilities,

            faq,

            updatedAt:
              getWIBDate(),
          })

          .where(
            settingsCondition,
          );
      },
    );

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json({
      success: true,

      message:
        'Pengaturan berhasil diperbarui.',

      data: {

        scope:
          finalBranchId === null
            ? 'global'
            : 'branch',

        branchId:
          finalBranchId,
      },
    });

  } catch (error) {

    console.error(
      '[PUT_SETTINGS_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat menyimpan pengaturan.',

      'SETTINGS_UPDATE_FAILED',
    );
  }
}