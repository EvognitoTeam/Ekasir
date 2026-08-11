import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

export async function POST(request: Request) {
  try {
    const { token, slug } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Harap login terlebih dahulu' },
        { status: 400 },
      );
    }
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Slug toko wajib diisi' },
        { status: 400 },
      );
    }

    const foundUser = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        mitra_id: users.mitra_id,
        branch_id: users.branch_id,
        mitra_slug: mitra.mitra_slug,
        memberId: users.memberId ?? null,
        member_id: users.memberId ?? null,
      })
      .from(users)
      .innerJoin(mitra, eq(users.mitra_id, mitra.id))
      .where(and(eq(users.token, token), isNull(users.deletedAt)))
      .limit(1);

    if (foundUser.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak. QR Code tidak dikenali atau sudah tidak aktif.',
        },
        { status: 401 },
      );
    }

    const user = foundUser[0];

    if (user.mitra_slug !== slug) {
      return NextResponse.json(
        {
          success: false,
          message: 'QR staf ini tidak terdaftar pada toko yang sedang dibuka.',
        },
        { status: 403 },
      );
    }

    const normalizedRole = user.role.toLowerCase();
    if (!['cashier','kitchen'].includes(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: 'Akun ini tidak memiliki akses kasir.' },
        { status: 403 },
      );
    }

    await db
      .update(users)
      .set({ is_login: true, login_at: new Date() })
      .where(eq(users.id, user.id));

    const sessionToken = await new SignJWT({
      userId: user.id,
      mitraId: user.mitra_id,
      branchId: user.branch_id ?? null,
      slug: user.mitra_slug,
      role: user.role,
      name: user.name,
      email: user.email,
      authSource: 'staff-qr',
      memberId: user.memberId ?? null,
      member_id: user.memberId ?? null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(SECRET_KEY);

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        role: normalizedRole,
        branchId: user.branch_id ?? null,
        branch_id: user.branch_id ?? null,
        memberId: user.memberId ?? null,
        member_id: user.memberId ?? null,
      },
    });

    response.cookies.set('ekasir_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify Token Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
