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
 * SETTINGS SCOPE
 * ==========================================================
 *
 * KALOO menggunakan dua scope konfigurasi:
 *
 * GLOBAL:
 * settings.branch_id IS NULL
 *
 * Berlaku untuk seluruh mitra:
 * - taxRate
 * - serviceRate
 * - isTaxIncluded
 * - faq
 * - profil mitra
 * - rekening payout
 *
 *
 * OUTLET:
 * settings.branch_id = branch id
 *
 * Khusus outlet:
 * - wifiSSID
 * - wifiPassword
 * - facility
 *
 *
 * Untuk outlet PUSAT:
 * WiFi + facility tetap menggunakan row branch_id IS NULL.
 *
 * Artinya row pusat menyimpan:
 * - canonical global settings
 * - local settings milik outlet pusat
 *
 * Sedangkan row branch hanya canonical untuk:
 * - WiFi
 * - facility
 *
 * tax/service/faq pada row branch TIDAK digunakan oleh GET sebagai
 * sumber global.
 */

/**
 * ==========================================================
 * JWT
 * ==========================================================
 *
 * GET settings tetap PUBLIC karena dipakai customer.
 *
 * JWT pada GET hanya digunakan untuk:
 * - mendeteksi session
 * - menentukan branch staff POS jika staff terikat branch
 *
 * PUT wajib Owner melalui requirePosAuth().
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (
  !JWT_SECRET &&
  process.env.NODE_ENV === 'production'
) {
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

type SettingsWriteScope =
  | 'global'
  | 'outlet'
  | 'legacy';

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

function normalizeRole(
  value: unknown,
): string {
  return normalizeString(
    value,
  ).toLowerCase();
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
 */

async function getOptionalAuthPayload(): Promise<OptionalAuthPayload | null> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        'ekasir_session',
      )?.value;

    if (!token) {
      return null;
    }

    const verified =
      await jwtVerify(
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
 * SETTINGS CONDITION
 * ==========================================================
 */

function getSettingsCondition(
  mitraId: number,
  branchId: number | null,
) {
  if (
    branchId === null
  ) {
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
 * EXACT SETTINGS
 * ==========================================================
 *
 * Tidak memakai fallback.
 *
 * GLOBAL:
 * exact branch_id IS NULL.
 *
 * OUTLET:
 * exact branch_id outlet.
 *
 * Ini penting untuk WiFi/fasilitas.
 *
 * Jika cabang belum dikonfigurasi,
 * WiFi/fasilitas cabang harus kosong,
 * BUKAN diam-diam memakai WiFi outlet pusat.
 */

async function findExactSettings(
  mitraId: number,
  branchId: number | null,
) {
  const [
    result,
  ] =
    await db
      .select()
      .from(
        settings,
      )
      .where(
        getSettingsCondition(
          mitraId,
          branchId,
        ),
      )
      .limit(
        1,
      );

  return result ?? null;
}

/**
 * ==========================================================
 * ACTIVE BRANCH
 * ==========================================================
 */

async function findActiveBranch(
  mitraId: number,
  branchId: number,
) {
  const [
    branch,
  ] =
    await db
      .select({
        id:
          branches.id,

        mitraId:
          branches.mitra_id,

        name:
          branches.name,
      })
      .from(
        branches,
      )
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
      .limit(
        1,
      );

  return branch ?? null;
}


/**
 * ==========================================================
 * ACTIVE BRANCH BY SLUG
 * ==========================================================
 *
 * Dipakai oleh customer/public route.
 *
 * Frontend customer mengenal:
 *
 * /[mitraSlug]/[branchSlug]/...
 *
 * sehingga tidak perlu mengetahui numeric branch_id.
 */

async function findActiveBranchBySlug(
  mitraId: number,
  branchSlug: string,
) {
  const [
    branch,
  ] =
    await db
      .select({
        id:
          branches.id,

        mitraId:
          branches.mitra_id,

        name:
          branches.name,

        branchSlug:
          branches.branch_slug,
      })
      .from(
        branches,
      )
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
      .limit(
        1,
      );

  return branch ?? null;
}

/**
 * ==========================================================
 * GET
 * ==========================================================
 *
 * PUBLIC.
 *
 * GLOBAL field selalu dibaca dari:
 *
 * settings.branch_id IS NULL
 *
 *
 * OUTLET field dibaca dari:
 *
 * branch_id yang sedang dipilih.
 *
 *
 * Contoh:
 *
 * /api/settings?slug=kopisenja
 *
 * => global + WiFi/fasilitas pusat
 *
 *
 * /api/settings?slug=kopisenja&branch_id=10
 *
 * => global + WiFi/fasilitas branch 10
 */

export async function GET(
  request: Request,
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

    const branchIdRaw =
      searchParams.get(
        'branch_id',
      );

    const branchSlug =
      normalizeString(
        searchParams.get(
          'branch_slug',
        ),
      );

    if (!slug) {
      return jsonError(
        400,
        'Slug diperlukan.',
        'SETTINGS_SLUG_REQUIRED',
      );
    }

    let requestedBranchId:
      number | null =
        null;

    if (
      branchIdRaw !== null &&
      branchIdRaw !== ''
    ) {
      requestedBranchId =
        toPositiveInteger(
          branchIdRaw,
        );

      if (
        !requestedBranchId
      ) {
        return jsonError(
          400,
          'Branch ID tidak valid.',
          'SETTINGS_BRANCH_ID_INVALID',
        );
      }
    }

    /**
     * ======================================================
     * MITRA
     * ======================================================
     */

    const [
      mitraData,
    ] =
      await db
        .select()
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

    if (
      !mitraData
    ) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'SETTINGS_MITRA_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * RESOLVE PUBLIC BRANCH SLUG
     * ======================================================
     *
     * Customer frontend mengirim branch_slug.
     *
     * Jika branch_id juga dikirim, branch_id menjadi prioritas
     * untuk backward compatibility.
     */

    if (
      requestedBranchId ===
        null &&
      branchSlug
    ) {
      const selectedBranch =
        await findActiveBranchBySlug(
          mitraData.id,
          branchSlug,
        );

      if (
        !selectedBranch
      ) {
        return jsonError(
          404,
          'Cabang tidak ditemukan.',
          'SETTINGS_BRANCH_NOT_FOUND',
        );
      }

      requestedBranchId =
        selectedBranch.id;
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

    if (
      payload
    ) {
      const tokenMitraId =
        toPositiveInteger(
          payload.mitraId,
        );

      const sameMitra =
        tokenMitraId ===
          mitraData.id ||
        (
          typeof payload.slug ===
            'string' &&
          payload.slug ===
            slug
        );

      if (
        sameMitra
      ) {
        isAuthenticated =
          true;

        const role =
          normalizeRole(
            payload.role,
          );

        const isPosStaff =
          role ===
            'owner' ||
          role ===
            'cashier' ||
          role ===
            'kitchen';

        /**
         * Staff yang TERIKAT branch tetap dipaksa ke branch session.
         *
         * Owner pusat branchId NULL tetap boleh memilih branch
         * menggunakan branch_id query.
         */
        if (
          isPosStaff
        ) {
          const tokenBranchId =
            toPositiveInteger(
              payload.branchId,
            );

          if (
            tokenBranchId
          ) {
            finalBranchId =
              tokenBranchId;
          }
        }
      }
    }

    /**
     * ======================================================
     * VALIDATE OUTLET
     * ======================================================
     */

    if (
      finalBranchId !==
      null
    ) {
      const selectedBranch =
        await findActiveBranch(
          mitraData.id,
          finalBranchId,
        );

      if (
        !selectedBranch
      ) {
        return jsonError(
          404,
          'Cabang tidak ditemukan.',
          'SETTINGS_BRANCH_NOT_FOUND',
        );
      }
    }

    /**
     * ======================================================
     * READ BOTH SCOPES
     * ======================================================
     *
     * Global selalu exact main row.
     *
     * Outlet:
     * - Pusat => main row
     * - Cabang => exact branch row
     */

    const [
      globalSettings,
      outletSettings,
    ] =
      await Promise.all([
        findExactSettings(
          mitraData.id,
          null,
        ),

        finalBranchId ===
          null
          ? findExactSettings(
              mitraData.id,
              null,
            )
          : findExactSettings(
              mitraData.id,
              finalBranchId,
            ),
      ]);

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    const publicData = {
      /**
       * GLOBAL - MITRA
       */
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

      platformFeeRate:
        mitraData.cashout ??
        null,

      /**
       * GLOBAL - SETTINGS
       *
       * Tidak pernah dibaca dari row branch.
       *
       * Jika row global belum ada, jangan mengarang nilai default
       * untuk frontend. UI akan menampilkan field kosong sampai
       * konfigurasi benar-benar tersimpan di database.
       */
      taxRate:
        globalSettings
          ? globalSettings.taxRate
          : null,

      serviceRate:
        globalSettings
          ? globalSettings.serviceRate
          : null,

      isTaxIncluded:
        globalSettings
          ? globalSettings.isTaxIncluded
          : null,

      faq:
        globalSettings?.faq ??
        [],

      globalConfigured:
        Boolean(
          globalSettings,
        ),

      /**
       * OUTLET
       *
       * Tidak memakai fallback.
       */
      wifiSSID:
        outletSettings?.wifiSSID ||
        '',

      wifiPassword:
        outletSettings?.wifiPassword ||
        '',

      facilities:
        outletSettings?.facility ??
        [],

      /**
       * Backward compatibility untuk customer component lama
       * yang masih membaca data.facility.
       */
      facility:
        outletSettings?.facility ??
        [],

      /**
       * Metadata scope.
       */
      branchId:
        finalBranchId,

      branchSlug:
        branchSlug ||
        null,

      outletConfigured:
        Boolean(
          outletSettings,
        ),
    };

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

    return NextResponse.json({
      success: true,

      isAuthenticated,

      data: {
        ...publicData,
        ...privateData,
      },
    });
  } catch (
    error
  ) {
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
 * BODY BARU:
 *
 * GLOBAL
 * {
 *   scope: "global",
 *   taxRate,
 *   serviceRate,
 *   is_tax_included,
 *   cafeName,
 *   mitraAddress,
 *   mitraWelcome,
 *   bankName,
 *   bankNumber,
 *   bankOwner,
 *   faq
 * }
 *
 *
 * OUTLET
 * {
 *   scope: "outlet",
 *   branch_id: null | number,
 *   wifiSSID,
 *   wifiPassword,
 *   facilities
 * }
 *
 *
 * OWNER PUSAT:
 * - boleh GLOBAL
 * - boleh OUTLET mana pun
 *
 *
 * OWNER CABANG:
 * - TIDAK boleh GLOBAL
 * - hanya OUTLET cabang session sendiri
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

    if (
      !auth.ok
    ) {
      return auth.response;
    }

    const {
      session,
    } =
      auth;

    /**
     * ======================================================
     * SLUG
     * ======================================================
     */

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
        'Slug diperlukan.',
        'SETTINGS_SLUG_REQUIRED',
      );
    }

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

    const rawScope =
      normalizeString(
        body?.scope,
      ).toLowerCase();

    let writeScope:
      SettingsWriteScope =
        rawScope ===
          'global'
          ? 'global'
          : rawScope ===
              'outlet'
            ? 'outlet'
            : 'legacy';

    /**
     * ======================================================
     * REQUESTED BRANCH
     * ======================================================
     */

    let requestedBranchId:
      number | null =
        null;

    if (
      body?.branch_id !==
        null &&
      body?.branch_id !==
        undefined &&
      body?.branch_id !==
        ''
    ) {
      requestedBranchId =
        toPositiveInteger(
          body.branch_id,
        );

      if (
        !requestedBranchId
      ) {
        return jsonError(
          400,
          'Branch ID tidak valid.',
          'SETTINGS_BRANCH_ID_INVALID',
        );
      }
    }

    /**
     * ======================================================
     * LEGACY COMPATIBILITY
     * ======================================================
     *
     * Client lama belum mengirim body.scope.
     *
     * - Owner cabang -> dianggap OUTLET
     * - Owner pusat + branch_id -> dianggap OUTLET
     * - Owner pusat tanpa branch_id -> dianggap GLOBAL
     *
     * Dengan demikian client lama tidak dapat lagi mengubah
     * tax/service global dari request branch.
     */

    if (
      writeScope ===
      'legacy'
    ) {
      writeScope =
        session.branchId !==
          null ||
        requestedBranchId !==
          null
          ? 'outlet'
          : 'global';
    }

    /**
     * ======================================================
     * MITRA FROM SESSION
     * ======================================================
     */

    const [
      mitraData,
    ] =
      await db
        .select()
        .from(
          mitra,
        )
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
        .limit(
          1,
        );

    if (
      !mitraData
    ) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'SETTINGS_MITRA_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * GLOBAL WRITE
     * ======================================================
     */

    if (
      writeScope ===
      'global'
    ) {
      /**
       * Owner branch tidak boleh mengubah global.
       */
      if (
        session.branchId !==
        null
      ) {
        return jsonError(
          403,
          'Owner cabang tidak dapat mengubah konfigurasi global.',
          'SETTINGS_GLOBAL_FORBIDDEN',
        );
      }

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

      if (
        taxRate ===
        null
      ) {
        return jsonError(
          400,
          'Tax rate harus berupa angka antara 0 sampai 100.',
          'SETTINGS_TAX_RATE_INVALID',
        );
      }

      if (
        serviceRate ===
        null
      ) {
        return jsonError(
          400,
          'Service rate harus berupa angka antara 0 sampai 100.',
          'SETTINGS_SERVICE_RATE_INVALID',
        );
      }

      if (
        isTaxIncluded ===
        null
      ) {
        return jsonError(
          400,
          'Nilai tax included tidak valid.',
          'SETTINGS_TAX_INCLUDED_INVALID',
        );
      }

      if (
        body?.faq !==
          undefined &&
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

      const faq =
        Array.isArray(
          body?.faq,
        )
          ? body.faq
          : [];

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

      const now =
        getWIBDate();

      await db.transaction(
        async (
          tx,
        ) => {
          /**
           * GLOBAL MITRA DATA
           */
          await tx
            .update(
              mitra,
            )
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
                now,

              updatedAt:
                now,

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

          /**
           * MAIN / GLOBAL SETTINGS ROW
           */
          const [
            existingGlobal,
          ] =
            await tx
              .select({
                id:
                  settings.id,
              })
              .from(
                settings,
              )
              .where(
                getSettingsCondition(
                  session.mitraId,
                  null,
                ),
              )
              .limit(
                1,
              );

          if (
            existingGlobal
          ) {
            /**
             * PENTING:
             *
             * WiFi dan facility TIDAK disentuh.
             */
            await tx
              .update(
                settings,
              )
              .set({
                taxRate,

                serviceRate,

                isTaxIncluded,

                faq,

                updatedAt:
                  now,
              })
              .where(
                getSettingsCondition(
                  session.mitraId,
                  null,
                ),
              );
          } else {
            /**
             * Row pusat belum ada.
             *
             * Buat row canonical global.
             * Local settings pusat masih kosong.
             */
            await tx
              .insert(
                settings,
              )
              .values({
                mitraId:
                  session.mitraId,

                branch_id:
                  null,

                taxRate,

                serviceRate,

                isTaxIncluded,

                faq,

                wifiSSID:
                  null,

                wifiPassword:
                  null,

                facility:
                  [],

                createdAt:
                  now,

                updatedAt:
                  now,
              });
          }
        },
      );

      return NextResponse.json({
        success: true,

        message:
          'Konfigurasi global berhasil diperbarui.',

        data: {
          scope:
            'global',

          branchId:
            null,
        },
      });
    }

    /**
     * ======================================================
     * OUTLET WRITE
     * ======================================================
     *
     * HANYA:
     * - wifiSSID
     * - wifiPassword
     * - facilities
     */

    const finalBranchId =
      session.branchId !==
        null
        ? session.branchId
        : requestedBranchId;

    if (
      finalBranchId !==
      null
    ) {
      const selectedBranch =
        await findActiveBranch(
          session.mitraId,
          finalBranchId,
        );

      if (
        !selectedBranch
      ) {
        return jsonError(
          404,
          'Cabang tidak ditemukan atau bukan milik toko Anda.',
          'SETTINGS_BRANCH_NOT_FOUND',
        );
      }
    }

    if (
      body?.facilities !==
        undefined &&
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

    const facilities =
      Array.isArray(
        body?.facilities,
      )
        ? body.facilities
        : [];

    const wifiSSID =
      normalizeNullableString(
        body?.wifiSSID,
      );

    const wifiPassword =
      normalizeNullableString(
        body?.wifiPassword,
      );

    const now =
      getWIBDate();

    await db.transaction(
      async (
        tx,
      ) => {
        const outletCondition =
          getSettingsCondition(
            session.mitraId,
            finalBranchId,
          );

        const [
          existingOutlet,
        ] =
          await tx
            .select({
              id:
                settings.id,
            })
            .from(
              settings,
            )
            .where(
              outletCondition,
            )
            .limit(
              1,
            );

        if (
          existingOutlet
        ) {
          /**
           * PENTING:
           *
           * tax/service/isTaxIncluded/faq
           * TIDAK disentuh.
           */
          await tx
            .update(
              settings,
            )
            .set({
              wifiSSID,

              wifiPassword,

              facility:
                facilities,

              updatedAt:
                now,
            })
            .where(
              outletCondition,
            );

          return;
        }

        /**
         * ==================================================
         * INSERT NEW BRANCH ROW
         * ==================================================
         *
         * Karena schema settings lama mungkin mewajibkan
         * taxRate/serviceRate/isTaxIncluded/faq pada setiap row,
         * branch row baru mengambil snapshot dari global row.
         *
         * Snapshot ini BUKAN sumber canonical.
         *
         * GET selalu membaca global field dari row pusat.
         */

        const [
          globalSettings,
        ] =
          await tx
            .select()
            .from(
              settings,
            )
            .where(
              getSettingsCondition(
                session.mitraId,
                null,
              ),
            )
            .limit(
              1,
            );

        await tx
          .insert(
            settings,
          )
          .values({
            mitraId:
              session.mitraId,

            branch_id:
              finalBranchId,

            taxRate:
              Number(
                globalSettings?.taxRate ??
                  0,
              ),

            serviceRate:
              Number(
                globalSettings?.serviceRate ??
                  0,
              ),

            isTaxIncluded:
              Number(
                globalSettings?.isTaxIncluded ??
                  0,
              ),

            faq:
              globalSettings?.faq ??
              [],

            wifiSSID,

            wifiPassword,

            facility:
              facilities,

            createdAt:
              now,

            updatedAt:
              now,
          });
      },
    );

    return NextResponse.json({
      success: true,

      message:
        finalBranchId ===
          null
          ? 'WiFi dan fasilitas outlet pusat berhasil diperbarui.'
          : 'WiFi dan fasilitas cabang berhasil diperbarui.',

      data: {
        scope:
          'outlet',

        branchId:
          finalBranchId,
      },
    });
  } catch (
    error
  ) {
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
