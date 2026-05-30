import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token tidak valid' }, { status: 400 });
    }

    // Cari user berdasarkan token yang di-scan, pastikan belum dihapus (soft-delete)
    const foundUser = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      mitra_id: users.mitra_id
    })
    .from(users)
    .where(
      and(
        eq(users.token, token),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

    if (foundUser.length === 0) {
      return NextResponse.json({ success: false, message: 'Akses ditolak! QR Code tidak dikenali atau sudah tidak aktif.' }, { status: 401 });
    }

    const user = foundUser[0];

    return NextResponse.json({ 
      success: true, 
      data: {
        id: user.id,
        name: user.name,
        role: user.role.toLowerCase() // Kita lower-case biar gampang di-handle di frontend ('owner', 'cashier', dll)
      } 
    });

  } catch (error) {
    console.error("Verify Token Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}