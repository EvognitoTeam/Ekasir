import { NextResponse } from 'next/server';
import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import { db } from '@/db';
import { branches } from '@/db/schema';
import { requirePosAuth } from '@/lib/auth/posAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ==========================================================
 * ERROR RESPONSE
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
  const normalized =
    normalizeString(value);

  return normalized.length > 0
    ? normalized
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
 * BRANCH CODE
 * ==========================================================
 *
 * Contoh:
 *
 * Cabang Gombel
 *
 * clean:
 * Gombel
 *
 * consonant:
 * GMBL
 *
 * hasil:
 * GMBL42
 */
function createBranchCodeBase(
  name: string,
): string {

  /**
   * Hilangkan awalan:
   *
   * cabang
   * outlet
   * store
   * kedai
   */
  let cleanName = name
    .replace(
      /(cabang|outlet|store|kedai)\s*/gi,
      '',
    )
    .trim();

  /**
   * Jika hasil kosong,
   * gunakan nama asli.
   */
  if (!cleanName) {
    cleanName =
      name.trim();
  }

  /**
   * Buang huruf vokal.
   */
  let code = cleanName
    .toUpperCase()

    .replace(
      /[AEIOU\W_]/g,
      '',
    )

    .substring(
      0,
      4,
    );

  /**
   * Kalau terlalu pendek,
   * gunakan karakter dari nama asli.
   */
  if (code.length < 2) {

    code = cleanName
      .toUpperCase()

      .replace(
        /[\W_]/g,
        '',
      )

      .substring(
        0,
        4,
      );
  }

  /**
   * Fallback terakhir.
   */
  if (code.length < 2) {
    code = 'BR';
  }

  return code;
}

/**
 * ==========================================================
 * UNIQUE BRANCH CODE
 * ==========================================================
 *
 * Versi lama langsung Math.random()
 * tanpa memastikan code belum dipakai.
 *
 * Versi ini tetap mempertahankan:
 *
 * XXXX + 2 digit
 *
 * tetapi dicek terlebih dahulu ke database.
 */
async function createUniqueBranchCode(
  mitraId: number,
  name: string,
): Promise<string> {

  const baseCode =
    createBranchCodeBase(name);

  /**
   * Coba maksimal 50 kali.
   */
  for (
    let attempt = 0;
    attempt < 50;
    attempt += 1
  ) {

    const randomNum =
      Math.floor(
        Math.random() * 90 + 10,
      );

    const candidate =
      `${baseCode}${randomNum}`;

    /**
     * Cek berdasarkan:
     *
     * mitra_id
     * +
     * branch_slug
     */
    const [existing] = await db
      .select({
        id: branches.id,
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
            candidate,
          ),
        ),
      )

      .limit(1);

    /**
     * Belum dipakai.
     */
    if (!existing) {
      return candidate;
    }
  }

  /**
   * Fallback sangat jarang.
   *
   * Digunakan jika kombinasi 2 angka
   * terlalu banyak yang sudah terpakai.
   */
  return (
    `${baseCode}` +
    `${Date.now().toString().slice(-6)}`
  );
}

/**
 * ==========================================================
 * VALIDASI SLUG REQUEST
 * ==========================================================
 *
 * Request slug hanya sebagai validasi tambahan.
 *
 * mitra_id sebenarnya TIDAK lagi dicari
 * dari slug client.
 *
 * Sumber kebenaran:
 *
 * SESSION
 * ↓
 * JWT
 * ↓
 * DATABASE USER
 * ↓
 * mitra_id
 */
function isRequestSlugAllowed(
  requestSlug:
    | string
    | null
    | undefined,

  sessionSlug: string,
): boolean {

  /**
   * Slug bersifat optional.
   *
   * Ini menjaga compatibility
   * jika suatu API nanti tidak mengirim slug.
   */
  if (!requestSlug) {
    return true;
  }

  return (
    requestSlug.trim() ===
    sessionSlug
  );
}

/**
 * ==========================================================
 * GET BRANCHES
 * ==========================================================
 *
 * Endpoint:
 *
 * GET /api/pos/branches?slug=xxx
 *
 *
 * OWNER PUSAT
 *
 * role      = Owner
 * branch_id = NULL
 *
 * dapat melihat:
 *
 * semua cabang milik mitra.
 *
 *
 * OWNER CABANG
 * CASHIER
 * KITCHEN
 *
 * hanya mendapatkan cabang
 * yang terikat dengan akun.
 */
export async function GET(
  request: Request,
) {

  /**
   * ========================================================
   * AUTH
   * ========================================================
   */

  const auth =
    await requirePosAuth({
      roles: [
        'Owner',
        'Cashier',
        'Kitchen',
      ],
    });

  if (!auth.ok) {
    return auth.response;
  }

  const {
    session,
  } = auth;

  /**
   * ========================================================
   * QUERY PARAM
   * ========================================================
   */

  const {
    searchParams,
  } = new URL(
    request.url,
  );

  const requestSlug =
    searchParams.get('slug');

  /**
   * ========================================================
   * MITRA PROTECTION
   * ========================================================
   */

  if (
    !isRequestSlugAllowed(
      requestSlug,
      session.slug,
    )
  ) {
    return jsonError(
      403,

      'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',

      'BRANCH_MITRA_MISMATCH',
    );
  }

  try {

    /**
     * Base filter wajib:
     *
     * mitra_id
     * deleted_at
     */
    const conditions = [
      eq(
        branches.mitra_id,
        session.mitraId,
      ),

      isNull(
        branches.deletedAt,
      ),
    ];

    /**
     * ======================================================
     * BRANCH SCOPE
     * ======================================================
     *
     * Owner pusat:
     *
     * role = Owner
     * branchId = null
     *
     * boleh melihat semua branch.
     *
     *
     * Selain itu:
     *
     * hanya branch milik akun.
     */
    if (
      !(
        session.role === 'Owner' &&
        session.branchId === null
      )
    ) {

      /**
       * User POS selain Owner pusat
       * tetapi belum punya branch.
       */
      if (
        session.branchId === null
      ) {

        return NextResponse.json({
          success: true,

          data: [],
        });
      }

      /**
       * Scope hanya branch sendiri.
       */
      conditions.push(
        eq(
          branches.id,
          session.branchId,
        ),
      );
    }

    /**
     * ======================================================
     * DATABASE
     * ======================================================
     */

    const activeBranches =
      await db
        .select()

        .from(
          branches,
        )

        .where(
          and(
            ...conditions,
          ),
        );

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json({
      success: true,

      data:
        activeBranches,
    });

  } catch (error) {

    console.error(
      '[GET_BRANCHES_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat memuat daftar cabang.',

      'BRANCH_LIST_FAILED',
    );
  }
}

/**
 * ==========================================================
 * CREATE BRANCH
 * ==========================================================
 *
 * POST /api/pos/branches
 *
 * Hanya:
 *
 * Owner pusat
 *
 * role      = Owner
 * branch_id = NULL
 */
export async function POST(
  request: Request,
) {

  /**
   * ========================================================
   * AUTH OWNER PUSAT
   * ========================================================
   */

  const auth =
    await requirePosAuth({
      roles: [
        'Owner',
      ],

      branchMode:
        'head-office',
    });

  if (!auth.ok) {
    return auth.response;
  }

  const {
    session,
  } = auth;

  try {

    /**
     * ======================================================
     * BODY
     * ======================================================
     */

    const body =
      await request.json();

    const requestSlug =
      normalizeString(
        body?.slug,
      );

    const name =
      normalizeString(
        body?.name,
      );

    const address =
      normalizeNullableString(
        body?.address,
      );

    const phone =
      normalizeNullableString(
        body?.phone,
      );

    /**
     * ======================================================
     * MITRA PROTECTION
     * ======================================================
     */

    if (
      !isRequestSlugAllowed(
        requestSlug,
        session.slug,
      )
    ) {
      return jsonError(
        403,

        'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',

        'BRANCH_MITRA_MISMATCH',
      );
    }

    /**
     * ======================================================
     * VALIDASI NAME
     * ======================================================
     */

    if (!name) {
      return jsonError(
        400,

        'Nama cabang wajib diisi.',

        'BRANCH_NAME_REQUIRED',
      );
    }

    if (
      name.length > 255
    ) {
      return jsonError(
        400,

        'Nama cabang maksimal 255 karakter.',

        'BRANCH_NAME_TOO_LONG',
      );
    }

    /**
     * ======================================================
     * VALIDASI PHONE
     * ======================================================
     */

    if (
      phone &&
      phone.length > 50
    ) {
      return jsonError(
        400,

        'Nomor telepon maksimal 50 karakter.',

        'BRANCH_PHONE_TOO_LONG',
      );
    }

    /**
     * ======================================================
     * GENERATE UNIQUE CODE
     * ======================================================
     */

    const branchCode =
      await createUniqueBranchCode(
        session.mitraId,
        name,
      );

    /**
     * ======================================================
     * INSERT DATABASE
     * ======================================================
     *
     * PERHATIKAN:
     *
     * mitra_id TIDAK berasal dari body.
     *
     * mitra_id berasal dari session.
     */
    await db
      .insert(
        branches,
      )

      .values({
        mitra_id:
          session.mitraId,

        branch_slug:
          branchCode,

        name,

        address,

        phone,

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      });

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          'Cabang berhasil ditambahkan.',
      },
      {
        status: 201,
      },
    );

  } catch (error) {

    console.error(
      '[POST_BRANCHES_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat menambahkan cabang.',

      'BRANCH_CREATE_FAILED',
    );
  }
}

/**
 * ==========================================================
 * UPDATE BRANCH
 * ==========================================================
 *
 * PUT /api/pos/branches
 *
 * Hanya Owner pusat.
 *
 *
 * CATATAN PENTING:
 *
 * branch_slug TIDAK dibuat ulang.
 *
 * Karena branch_slug digunakan sebagai
 * identifier URL cabang.
 *
 * Contoh:
 *
 * /kopisenja/GMBL42
 *
 * Jika setiap edit alamat membuat slug baru,
 * URL cabang ikut berubah.
 */
export async function PUT(
  request: Request,
) {

  /**
   * ========================================================
   * AUTH OWNER PUSAT
   * ========================================================
   */

  const auth =
    await requirePosAuth({
      roles: [
        'Owner',
      ],

      branchMode:
        'head-office',
    });

  if (!auth.ok) {
    return auth.response;
  }

  const {
    session,
  } = auth;

  try {

    /**
     * ======================================================
     * REQUEST BODY
     * ======================================================
     */

    const body =
      await request.json();

    const id =
      toPositiveInteger(
        body?.id,
      );

    const requestSlug =
      normalizeString(
        body?.slug,
      );

    const name =
      normalizeString(
        body?.name,
      );

    const address =
      normalizeNullableString(
        body?.address,
      );

    const phone =
      normalizeNullableString(
        body?.phone,
      );

    /**
     * ======================================================
     * MITRA PROTECTION
     * ======================================================
     */

    if (
      !isRequestSlugAllowed(
        requestSlug,
        session.slug,
      )
    ) {
      return jsonError(
        403,

        'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',

        'BRANCH_MITRA_MISMATCH',
      );
    }

    /**
     * ======================================================
     * VALIDASI ID
     * ======================================================
     */

    if (!id) {
      return jsonError(
        400,

        'ID cabang tidak valid.',

        'BRANCH_ID_INVALID',
      );
    }

    /**
     * ======================================================
     * VALIDASI NAME
     * ======================================================
     */

    if (!name) {
      return jsonError(
        400,

        'Nama cabang wajib diisi.',

        'BRANCH_NAME_REQUIRED',
      );
    }

    if (
      name.length > 255
    ) {
      return jsonError(
        400,

        'Nama cabang maksimal 255 karakter.',

        'BRANCH_NAME_TOO_LONG',
      );
    }

    /**
     * ======================================================
     * VALIDASI PHONE
     * ======================================================
     */

    if (
      phone &&
      phone.length > 50
    ) {
      return jsonError(
        400,

        'Nomor telepon maksimal 50 karakter.',

        'BRANCH_PHONE_TOO_LONG',
      );
    }

    /**
     * ======================================================
     * CARI TARGET
     * ======================================================
     *
     * WAJIB:
     *
     * id
     * +
     * mitra_id
     * +
     * deleted_at NULL
     */

    const [targetBranch] =
      await db
        .select({
          id:
            branches.id,

          branchSlug:
            branches.branch_slug,
        })

        .from(
          branches,
        )

        .where(
          and(
            eq(
              branches.id,
              id,
            ),

            eq(
              branches.mitra_id,
              session.mitraId,
            ),

            isNull(
              branches.deletedAt,
            ),
          ),
        )

        .limit(1);

    /**
     * Target bukan milik mitra
     * atau sudah terhapus.
     */
    if (!targetBranch) {
      return jsonError(
        404,

        'Cabang tidak ditemukan.',

        'BRANCH_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * UPDATE
     * ======================================================
     *
     * branch_slug sengaja tidak disentuh.
     */
    await db
      .update(
        branches,
      )

      .set({
        name,

        address,

        phone,

        updatedAt:
          new Date(),
      })

      .where(
        and(
          eq(
            branches.id,
            id,
          ),

          eq(
            branches.mitra_id,
            session.mitraId,
          ),

          isNull(
            branches.deletedAt,
          ),
        ),
      );

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json({
      success: true,

      message:
        'Cabang berhasil diperbarui.',

      data: {
        id,

        branch_slug:
          targetBranch.branchSlug,
      },
    });

  } catch (error) {

    console.error(
      '[PUT_BRANCHES_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat memperbarui cabang.',

      'BRANCH_UPDATE_FAILED',
    );
  }
}

/**
 * ==========================================================
 * DELETE / SOFT DELETE BRANCH
 * ==========================================================
 *
 * DELETE /api/pos/branches?id=123&slug=xxx
 *
 * Hanya Owner pusat.
 *
 * Tidak benar-benar menghapus database.
 *
 * deleted_at akan diisi.
 */
export async function DELETE(
  request: Request,
) {

  /**
   * ========================================================
   * AUTH OWNER PUSAT
   * ========================================================
   */

  const auth =
    await requirePosAuth({
      roles: [
        'Owner',
      ],

      branchMode:
        'head-office',
    });

  if (!auth.ok) {
    return auth.response;
  }

  const {
    session,
  } = auth;

  /**
   * ========================================================
   * QUERY PARAM
   * ========================================================
   */

  const {
    searchParams,
  } = new URL(
    request.url,
  );

  const id =
    toPositiveInteger(
      searchParams.get('id'),
    );

  const requestSlug =
    searchParams.get('slug');

  /**
   * ========================================================
   * MITRA PROTECTION
   * ========================================================
   */

  if (
    !isRequestSlugAllowed(
      requestSlug,
      session.slug,
    )
  ) {
    return jsonError(
      403,

      'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',

      'BRANCH_MITRA_MISMATCH',
    );
  }

  /**
   * ========================================================
   * VALIDASI ID
   * ========================================================
   */

  if (!id) {
    return jsonError(
      400,

      'ID cabang tidak valid.',

      'BRANCH_ID_INVALID',
    );
  }

  try {

    /**
     * ======================================================
     * CARI BRANCH
     * ======================================================
     *
     * Pastikan:
     *
     * branch benar-benar milik mitra
     * yang sedang login.
     */
    const [targetBranch] =
      await db
        .select({
          id:
            branches.id,
        })

        .from(
          branches,
        )

        .where(
          and(
            eq(
              branches.id,
              id,
            ),

            eq(
              branches.mitra_id,
              session.mitraId,
            ),

            isNull(
              branches.deletedAt,
            ),
          ),
        )

        .limit(1);

    if (!targetBranch) {
      return jsonError(
        404,

        'Cabang tidak ditemukan.',

        'BRANCH_NOT_FOUND',
      );
    }

    /**
     * ======================================================
     * SOFT DELETE
     * ======================================================
     */

    await db
      .update(
        branches,
      )

      .set({
        deletedAt:
          new Date(),

        updatedAt:
          new Date(),
      })

      .where(
        and(
          eq(
            branches.id,
            id,
          ),

          eq(
            branches.mitra_id,
            session.mitraId,
          ),

          isNull(
            branches.deletedAt,
          ),
        ),
      );

    /**
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return NextResponse.json({
      success: true,

      message:
        'Cabang berhasil dihapus.',
    });

  } catch (error) {

    console.error(
      '[DELETE_BRANCHES_ERROR]',
      error,
    );

    return jsonError(
      500,

      'Terjadi kesalahan saat menghapus cabang.',

      'BRANCH_DELETE_FAILED',
    );
  }
}