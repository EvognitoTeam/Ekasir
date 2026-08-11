import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false
        },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      SECRET_KEY
    );

    return NextResponse.json({
      authenticated: true,
      user: {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        slug: payload.slug,
        memberId: payload.memberId ?? null,
        member_id: payload.memberId ?? null,
        branchId: payload.branchId ?? null,
        branch_id: payload.branchId ?? null
      }
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false
      },
      { status: 401 }
    );
  }
}