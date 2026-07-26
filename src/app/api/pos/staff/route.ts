import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import { generateUniqueMemberId } from '@/lib/member/memberId';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET wajib dikonfigurasi di production.');
}

const SECRET_KEY = new TextEncoder().encode(
  JWT_SECRET ?? 'rahasia-super-aman-evokasir-2026',
);

const STAFF_ROLES = ['Owner', 'Cashier', 'Kitchen'] as const;

type StaffRole = (typeof STAFF_ROLES)[number];

type AuthPayload = JWTPayload & {
  userId?: number | string;
  mitraId?: number | string;
  branchId?: number | string | null;
  role?: string;
  slug?: string;
};

type CreateStaffBody = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  branchId?: unknown;
  branch_id?: unknown;
};

type UpdateStaffBody = {
  id?: unknown;
  action?: unknown;
  branchId?: unknown;
  branch_id?: unknown;
};

function jsonError(
  status: number,
  message: string,
  code = 'REQUEST_FAILED',
  details: unknown = null,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        details,
      },
    },
    { status },
  );
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRole(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

function toPositiveInteger(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeStaffRole(value: unknown): StaffRole | null {
  const role = normalizeRole(value);

  switch (role) {
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

function isAuthorizedStaffManager(payload: AuthPayload | null): boolean {
  if (!payload) {
    return false;
  }

  const role = normalizeRole(payload.role);

  return ['owner', 'admin'].includes(role);
}

async function getAuthPayload(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as AuthPayload;
  } catch (error) {
    console.error('[STAFF_AUTH_VERIFY_ERROR]', error);
    return null;
  }
}

/**
 * Admin utama ditentukan sebagai:
 * - role Owner
 * - branch_id NULL
 * - owner paling awal pada mitra tersebut
 *
 * Idealnya nanti tambahkan kolom khusus:
 * users.is_primary_admin BOOLEAN
 */
async function getPrimaryAdminId(
  mitraId: number,
): Promise<number | null> {
  const [primaryAdmin] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.mitra_id, mitraId),
        eq(users.role, 'Owner'),
        isNull(users.branch_id),
        isNull(users.deletedAt),
      ),
    )
    .orderBy(
      asc(users.createdAt),
      asc(users.id),
    )
    .limit(1);

  return primaryAdmin?.id ?? null;
}

async function getTargetStaff(
  staffId: number,
  mitraId: number,
) {
  const [staff] = await db
    .select({
      id: users.id,
      mitraId: users.mitra_id,
      branchId: users.branch_id,
      role: users.role,
      name: users.name,
      email: users.email,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(
      and(
        eq(users.id, staffId),
        eq(users.mitra_id, mitraId),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return staff ?? null;
}

/**
 * GET /api/pos/staff
 *
 * Owner/admin pusat:
 * - dapat melihat semua staf dalam satu mitra.
 *
 * Owner/admin cabang:
 * - hanya dapat melihat staf pada cabangnya.
 */
export async function GET(): Promise<Response> {
  try {
    const payload = await getAuthPayload();

    if (!isAuthorizedStaffManager(payload)) {
      return jsonError(
        401,
        'Anda tidak memiliki akses ke manajemen karyawan.',
        'UNAUTHORIZED',
      );
    }

    const mitraId = toPositiveInteger(payload?.mitraId);

    if (!mitraId) {
      return jsonError(
        401,
        'Data mitra pada sesi tidak valid.',
        'INVALID_MITRA_SESSION',
      );
    }

    const requesterBranchId = toPositiveInteger(
      payload?.branchId,
    );

    const primaryAdminId = await getPrimaryAdminId(mitraId);

    const conditions = [
      eq(users.mitra_id, mitraId),
      isNull(users.deletedAt),
      inArray(users.role, [...STAFF_ROLES]),
    ];

    /*
     * Admin cabang hanya melihat staf pada cabangnya.
     * Admin pusat dengan branchId null melihat semua staf.
     */
    if (requesterBranchId !== null) {
      conditions.push(
        eq(users.branch_id, requesterBranchId),
      );
    }

    const staffRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        token: users.token,
        role: users.role,
        memberId: users.memberId,
        branchId: users.branch_id,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isLogin: users.is_login,
        loginAt: users.login_at,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(
        asc(users.createdAt),
        asc(users.id),
      );

    const data = staffRows.map((staff) => ({
      ...staff,

      branch_id:
        staff.branchId ?? null,

      member_id:
        staff.memberId ?? null,

      isPrimaryAdmin:
        staff.id === primaryAdminId,

      is_primary_admin:
        staff.id === primaryAdminId,

      canChangeBranch:
        staff.id !== primaryAdminId,

      canDelete:
        staff.id !== primaryAdminId,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        requesterBranchId,
        requester_branch_id:
          requesterBranchId,
        isCentralAdmin:
          requesterBranchId === null,
        is_central_admin:
          requesterBranchId === null,
      },
    });
  } catch (error) {
    console.error('[GET_STAFF_ERROR]', error);

    return jsonError(
      500,
      'Gagal mengambil data karyawan.',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}

/**
 * POST /api/pos/staff
 *
 * Body:
 * {
 *   "name": "Budi",
 *   "email": "budi@example.com",
 *   "role": "Cashier",
 *   "branchId": 2
 * }
 */
export async function POST(
  request: Request,
): Promise<Response> {
  try {
    const payload = await getAuthPayload();

    if (!isAuthorizedStaffManager(payload)) {
      return jsonError(
        401,
        'Anda tidak memiliki akses untuk menambahkan karyawan.',
        'UNAUTHORIZED',
      );
    }

    const mitraId = toPositiveInteger(payload?.mitraId);
    const requesterBranchId = toPositiveInteger(
      payload?.branchId,
    );

    if (!mitraId) {
      return jsonError(
        401,
        'Data mitra pada sesi tidak valid.',
        'INVALID_MITRA_SESSION',
      );
    }

    let body: CreateStaffBody;

    try {
      body = (await request.json()) as CreateStaffBody;
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const name = normalizeString(body.name);
    const email = normalizeString(body.email).toLowerCase();
    const role = normalizeStaffRole(body.role);

    const requestedBranchId = toPositiveInteger(
      body.branchId ?? body.branch_id,
    );

    if (!name || !email) {
      return jsonError(
        400,
        'Nama dan email wajib diisi.',
        'VALIDATION_ERROR',
      );
    }

    if (!role) {
      return jsonError(
        400,
        'Role tidak valid.',
        'INVALID_ROLE',
        {
          allowedRoles: STAFF_ROLES,
        },
      );
    }

    /*
     * Admin cabang tidak boleh membuat staf di cabang lain
     * atau memberikan akses semua cabang.
     */
    const finalBranchId =
      requesterBranchId !== null
        ? requesterBranchId
        : requestedBranchId;

    /*
     * Owner tambahan juga tetap boleh diberi cabang.
     * Hanya admin utama yang otomatis branch_id NULL.
     */
    if (
      requesterBranchId !== null &&
      requestedBranchId !== null &&
      requestedBranchId !== requesterBranchId
    ) {
      return jsonError(
        403,
        'Anda hanya dapat membuat staf untuk cabang Anda sendiri.',
        'BRANCH_ACCESS_DENIED',
      );
    }

    const [existingEmail] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (existingEmail) {
      return jsonError(
        409,
        'Email sudah digunakan oleh akun lain.',
        'EMAIL_ALREADY_EXISTS',
      );
    }

    const [currentMitra] = await db
      .select({
        id: mitra.id,
        name: mitra.mitra_name,
      })
      .from(mitra)
      .where(eq(mitra.id, mitraId))
      .limit(1);

    if (!currentMitra) {
      return jsonError(
        404,
        'Mitra tidak ditemukan.',
        'MITRA_NOT_FOUND',
      );
    }

    const generatedToken = crypto.randomUUID();

    const rawPassword =
      email.split('@')[0] ||
      crypto.randomBytes(4).toString('hex');

    const hashedPassword = await bcrypt.hash(
      rawPassword,
      10,
    );

    const memberId = await generateUniqueMemberId(
      db,
      currentMitra.name,
    );

    const now = new Date();

    await db.insert(users).values({
      mitra_id: mitraId,
      branch_id: finalBranchId,
      name,
      email,
      password: hashedPassword,
      memberId,
      role,
      token: generatedToken,
      is_login: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Karyawan berhasil ditambahkan.',
        data: {
          name,
          email,
          role,

          token:
            generatedToken,

          memberId,
          member_id:
            memberId,

          branchId:
            finalBranchId,

          branch_id:
            finalBranchId,

          defaultPassword:
            rawPassword,

          isPrimaryAdmin:
            false,

          is_primary_admin:
            false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST_STAFF_ERROR]', error);

    return jsonError(
      500,
      'Gagal membuat staf. Pastikan email belum digunakan.',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}

/**
 * PATCH /api/pos/staff
 *
 * Body:
 * {
 *   "id": 12,
 *   "action": "update-branch",
 *   "branchId": 2
 * }
 *
 * Untuk semua cabang:
 * {
 *   "id": 12,
 *   "action": "update-branch",
 *   "branchId": null
 * }
 */
export async function PATCH(
  request: Request,
): Promise<Response> {
  try {
    const payload = await getAuthPayload();

    if (!isAuthorizedStaffManager(payload)) {
      return jsonError(
        401,
        'Anda tidak memiliki akses untuk mengubah karyawan.',
        'UNAUTHORIZED',
      );
    }

    const mitraId = toPositiveInteger(payload?.mitraId);
    const requesterBranchId = toPositiveInteger(
      payload?.branchId,
    );

    if (!mitraId) {
      return jsonError(
        401,
        'Data mitra pada sesi tidak valid.',
        'INVALID_MITRA_SESSION',
      );
    }

    let body: UpdateStaffBody;

    try {
      body = (await request.json()) as UpdateStaffBody;
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const staffId = toPositiveInteger(body.id);
    const action = normalizeString(body.action);

    if (!staffId) {
      return jsonError(
        400,
        'ID karyawan wajib diisi.',
        'STAFF_ID_REQUIRED',
      );
    }

    if (action !== 'update-branch') {
      return jsonError(
        400,
        'Action tidak didukung.',
        'INVALID_ACTION',
        {
          supportedActions: ['update-branch'],
        },
      );
    }

    const targetStaff = await getTargetStaff(
      staffId,
      mitraId,
    );

    if (!targetStaff) {
      return jsonError(
        404,
        'Karyawan tidak ditemukan.',
        'STAFF_NOT_FOUND',
      );
    }

    const primaryAdminId = await getPrimaryAdminId(mitraId);

    if (staffId === primaryAdminId) {
      return jsonError(
        403,
        'Cabang admin utama tidak dapat diubah.',
        'PRIMARY_ADMIN_PROTECTED',
      );
    }

    const requestedBranchValue =
      body.branchId ?? body.branch_id;

    const requestedBranchId =
      toPositiveInteger(requestedBranchValue);

    /*
     * Nilai null berarti akses semua cabang.
     * Nilai bukan null tetapi tidak valid harus ditolak.
     */
    const explicitlyNull =
      requestedBranchValue === null ||
      requestedBranchValue === '';

    if (
      !explicitlyNull &&
      requestedBranchId === null
    ) {
      return jsonError(
        400,
        'ID cabang tidak valid.',
        'INVALID_BRANCH_ID',
      );
    }

    /*
     * Admin cabang:
     * - hanya dapat mengatur staf pada cabangnya;
     * - tidak boleh memberi akses semua cabang;
     * - tidak boleh memindah staf ke cabang lain.
     */
    if (requesterBranchId !== null) {
      if (targetStaff.branchId !== requesterBranchId) {
        return jsonError(
          403,
          'Anda tidak dapat mengubah staf dari cabang lain.',
          'TARGET_BRANCH_ACCESS_DENIED',
        );
      }

      if (requestedBranchId !== requesterBranchId) {
        return jsonError(
          403,
          'Anda hanya dapat menetapkan staf ke cabang Anda sendiri.',
          'BRANCH_ACCESS_DENIED',
        );
      }
    }

    const finalBranchId =
      explicitlyNull
        ? null
        : requestedBranchId;

    await db
      .update(users)
      .set({
        branch_id: finalBranchId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, staffId),
          eq(users.mitra_id, mitraId),
          isNull(users.deletedAt),
        ),
      );

    return NextResponse.json({
      success: true,
      message: finalBranchId
        ? 'Cabang karyawan berhasil diperbarui.'
        : 'Karyawan berhasil diberi akses semua cabang.',
      data: {
        id: staffId,
        branchId: finalBranchId,
        branch_id: finalBranchId,
      },
    });
  } catch (error) {
    console.error('[PATCH_STAFF_ERROR]', error);

    return jsonError(
      500,
      'Gagal memperbarui cabang karyawan.',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}

/**
 * DELETE /api/pos/staff?id=12
 *
 * Soft delete staf.
 */
export async function DELETE(
  request: Request,
): Promise<Response> {
  try {
    const payload = await getAuthPayload();

    if (!isAuthorizedStaffManager(payload)) {
      return jsonError(
        401,
        'Anda tidak memiliki akses untuk menghapus karyawan.',
        'UNAUTHORIZED',
      );
    }

    const mitraId = toPositiveInteger(payload?.mitraId);
    const requesterBranchId = toPositiveInteger(
      payload?.branchId,
    );

    if (!mitraId) {
      return jsonError(
        401,
        'Data mitra pada sesi tidak valid.',
        'INVALID_MITRA_SESSION',
      );
    }

    const { searchParams } = new URL(request.url);
    const staffId = toPositiveInteger(
      searchParams.get('id'),
    );

    if (!staffId) {
      return jsonError(
        400,
        'ID karyawan wajib diisi.',
        'STAFF_ID_REQUIRED',
      );
    }

    const targetStaff = await getTargetStaff(
      staffId,
      mitraId,
    );

    if (!targetStaff) {
      return jsonError(
        404,
        'Karyawan tidak ditemukan.',
        'STAFF_NOT_FOUND',
      );
    }

    const primaryAdminId = await getPrimaryAdminId(mitraId);

    if (staffId === primaryAdminId) {
      return jsonError(
        403,
        'Admin utama tidak dapat dihapus.',
        'PRIMARY_ADMIN_PROTECTED',
      );
    }

    /*
     * Mencegah akun menghapus dirinya sendiri.
     */
    const requesterUserId = toPositiveInteger(
      payload?.userId,
    );

    if (
      requesterUserId !== null &&
      requesterUserId === staffId
    ) {
      return jsonError(
        403,
        'Anda tidak dapat menghapus akun yang sedang digunakan.',
        'CANNOT_DELETE_SELF',
      );
    }

    /*
     * Admin cabang hanya dapat menghapus staf cabangnya.
     */
    if (
      requesterBranchId !== null &&
      targetStaff.branchId !== requesterBranchId
    ) {
      return jsonError(
        403,
        'Anda tidak dapat menghapus staf dari cabang lain.',
        'BRANCH_ACCESS_DENIED',
      );
    }

    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        is_login: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, staffId),
          eq(users.mitra_id, mitraId),
          isNull(users.deletedAt),
        ),
      );

    return NextResponse.json({
      success: true,
      message: 'Akses karyawan berhasil dicabut.',
    });
  } catch (error) {
    console.error('[DELETE_STAFF_ERROR]', error);

    return jsonError(
      500,
      'Gagal menghapus staf.',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : null,
    );
  }
}