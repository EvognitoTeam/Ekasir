import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { mitra, users } from '@/db/schema';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET wajib dikonfigurasi di production.');
}

const SECRET_KEY = new TextEncoder().encode(
  JWT_SECRET ?? 'rahasia-super-aman-evokasir-2026',
);

export const POS_ROLES = ['Owner', 'Cashier', 'Kitchen'] as const;

export type PosRole = (typeof POS_ROLES)[number];

export type PosBranchMode =
  | 'any'
  | 'assigned'
  | 'head-office';

type PosJwtPayload = JWTPayload & {
  userId?: number | string;
  mitraId?: number | string;
  branchId?: number | string | null;
  role?: string;
  slug?: string;
  name?: string;
  email?: string;
  authSource?: string;
};

export type PosSession = {
  userId: number;
  mitraId: number;
  branchId: number | null;

  role: PosRole;

  slug: string;
  name: string;
  email: string;

  authSource: string | null;
};

export type RequirePosAuthOptions = {

  roles?: readonly PosRole[];

  branchMode?: PosBranchMode;
};

type PosAuthSuccess = {
  ok: true;
  session: PosSession;
};

type PosAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type PosAuthResult =
  | PosAuthSuccess
  | PosAuthFailure;

/**
 * Response error standar untuk POS Auth.
 */
function authError(
  status: number,
  message: string,
  code: string,
): PosAuthFailure {
  return {
    ok: false,

    response: NextResponse.json(
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
    ),
  };
}

/**
 * Konversi value menjadi integer positif.
 */
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

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

/**
 * Normalisasi role dari JWT / database.
 *
 * HANYA role POS internal yang diterima.
 */
function normalizePosRole(
  value: unknown,
): PosRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  switch (
    value
      .trim()
      .toLowerCase()
  ) {
    case 'owner':
      return 'Owner';

    case 'cashier':
      return 'Cashier';

    case 'kitchen':
      return 'Kitchen';

    default:
      return null;
  }
}

export async function requirePosAuth(
  options: RequirePosAuthOptions = {},
): Promise<PosAuthResult> {

  const {
    roles = POS_ROLES,
    branchMode = 'any',
  } = options;

  /**
   * ========================================================
   * 1. AMBIL SESSION COOKIE
   * ========================================================
   */
  const cookieStore = await cookies();

  const token =
    cookieStore.get('ekasir_session')?.value;

  if (!token) {
    return authError(
      401,
      'Sesi tidak ditemukan. Silakan login kembali.',
      'POS_AUTH_SESSION_MISSING',
    );
  }

  /**
   * ========================================================
   * 2. VERIFIKASI JWT
   * ========================================================
   */
  let payload: PosJwtPayload;

  try {

    const verified = await jwtVerify(
      token,
      SECRET_KEY,
    );

    payload =
      verified.payload as PosJwtPayload;

  } catch (error) {

    console.error(
      '[POS_AUTH_JWT_VERIFY_ERROR]',
      error,
    );

    return authError(
      401,
      'Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.',
      'POS_AUTH_INVALID_SESSION',
    );
  }

  /**
   * ========================================================
   * 3. VALIDASI PAYLOAD JWT
   * ========================================================
   */

  const userId =
    toPositiveInteger(payload.userId);

  const mitraId =
    toPositiveInteger(payload.mitraId);

  const tokenRole =
    normalizePosRole(payload.role);

  if (
    !userId ||
    !mitraId ||
    !tokenRole
  ) {
    return authError(
      403,
      'Akun ini tidak memiliki akses POS.',
      'POS_AUTH_INVALID_PAYLOAD',
    );
  }

  const [account] = await db
    .select({
      userId: users.id,

      mitraId: users.mitra_id,

      branchId: users.branch_id,

      role: users.role,

      name: users.name,

      email: users.email,

      mitraSlug: mitra.mitra_slug,

      mitraStatus: mitra.status,
    })
    .from(users)

    .innerJoin(
      mitra,
      eq(
        users.mitra_id,
        mitra.id,
      ),
    )

    .where(
      and(
        eq(
          users.id,
          userId,
        ),

        eq(
          users.mitra_id,
          mitraId,
        ),

        isNull(
          users.deletedAt,
        ),

        isNull(
          mitra.deletedAt,
        ),
      ),
    )

    .limit(1);

  /**
   * User / mitra tidak ditemukan.
   */
  if (!account) {
    return authError(
      401,
      'Akun atau toko tidak ditemukan. Silakan login kembali.',
      'POS_AUTH_ACCOUNT_NOT_FOUND',
    );
  }

  /**
   * Mitra sedang dinonaktifkan.
   */
  if (account.mitraStatus !== 1) {
    return authError(
      403,
      'Akses toko sedang tidak aktif.',
      'POS_AUTH_MITRA_INACTIVE',
    );
  }

  /**
   * ========================================================
   * 5. ROLE TERBARU DARI DATABASE
   * ========================================================
   */

  const currentRole =
    normalizePosRole(account.role);

  if (!currentRole) {
    return authError(
      403,
      'Role akun ini tidak memiliki akses POS.',
      'POS_AUTH_ROLE_NOT_ALLOWED',
    );
  }

  /**
   * ========================================================
   * 6. CEK PERMISSION ENDPOINT
   * ========================================================
   */

  if (
    !roles.includes(currentRole)
  ) {
    return authError(
      403,
      'Anda tidak memiliki izin untuk mengakses fitur ini.',
      'POS_AUTH_PERMISSION_DENIED',
    );
  }

  /**
   * ========================================================
   * 7. BRANCH TERBARU DARI DATABASE
   * ========================================================
   */

  const currentBranchId =
    account.branchId ?? null;

  /**
   * Endpoint membutuhkan user yang
   * terikat pada cabang.
   */
  if (
    branchMode === 'assigned' &&
    currentBranchId === null
  ) {
    return authError(
      403,
      'Akun ini belum terhubung ke cabang.',
      'POS_AUTH_BRANCH_REQUIRED',
    );
  }

  /**
   * Endpoint khusus pusat.
   *
   * Contoh:
   *
   * Owner pusat:
   *
   * role      = Owner
   * branch_id = NULL
   */
  if (
    branchMode === 'head-office' &&
    currentBranchId !== null
  ) {
    return authError(
      403,
      'Fitur ini hanya dapat diakses Owner pusat.',
      'POS_AUTH_HEAD_OFFICE_REQUIRED',
    );
  }

  /**
   * ========================================================
   * 8. SESSION VALID
   * ========================================================
   */

  return {
    ok: true,

    session: {
      userId:
        account.userId,

      mitraId:
        account.mitraId,

      branchId:
        currentBranchId,

      role:
        currentRole,

      slug:
        account.mitraSlug,

      name:
        account.name,

      email:
        account.email,

      authSource:
        typeof payload.authSource === 'string'
          ? payload.authSource
          : null,
    },
  };
}