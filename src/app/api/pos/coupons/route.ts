import { NextResponse } from 'next/server';
import { db } from '@/db';
import { coupon } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export const dynamic = 'force-dynamic';

// ─── HELPER AUTHENTICATION ──────────────────────────────────────────
async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as any;
  } catch (err) {
    return null;
  }
}

// ─── [GET] AMBIL SEMUA KUPON UNTUK ADMIN ────────────────────────────
export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Ambil semua kupon (termasuk yang expired), KECUALI yang udah di-soft delete
    const data = await db.select()
      .from(coupon)
      .where(
        and(
          eq(coupon.mitra_id, Number(payload.mitraId)),
          isNull(coupon.deletedAt)
        )
      )
      .orderBy(coupon.id); 

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET Coupons Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── [POST] BUAT KUPON BARU ─────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await db.insert(coupon).values({
      mitra_id: Number(payload.mitraId),
      title: body.title,
      description: body.description,
      coupon_code: body.coupon_code,
      is_member_only: body.is_member_only,
      discount_rate: body.discount_rate || null,
      discount_price: body.discount_price || null,
      max_use: Number(body.max_use) || 0,
      already_used: 0,
      // 🔴 Nambahin start_date di sini
      start_date: body.start_date ? new Date(body.start_date) : null,
      expired_date: body.expired_date ? new Date(body.expired_date) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true, message: 'Kupon berhasil dibuat!' });
  } catch (error) {
    console.error("POST Coupon Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal membuat kupon' }, { status: 500 });
  }
}

// ─── [PUT] UPDATE KUPON ─────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) return NextResponse.json({ success: false, message: 'ID Kupon dibutuhkan' }, { status: 400 });

    await db.update(coupon).set({
      title: body.title,
      description: body.description,
      coupon_code: body.coupon_code,
      is_member_only: body.is_member_only,
      discount_rate: body.discount_rate || null,
      discount_price: body.discount_price || null,
      max_use: Number(body.max_use) || 0,
      // 🔴 Nambahin update start_date di sini
      start_date: body.start_date ? new Date(body.start_date) : null,
      expired_date: body.expired_date ? new Date(body.expired_date) : null,
      updatedAt: new Date()
    }).where(
      and(
        eq(coupon.id, Number(id)),
        eq(coupon.mitra_id, Number(payload.mitraId))
      )
    );

    return NextResponse.json({ success: true, message: 'Kupon berhasil diperbarui!' });
  } catch (error) {
    console.error("PUT Coupon Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui kupon' }, { status: 500 });
  }
}

// ─── [DELETE] SOFT DELETE KUPON ─────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: 'ID Kupon dibutuhkan' }, { status: 400 });

    await db.update(coupon).set({
      deletedAt: new Date() // Soft delete
    }).where(
      and(
        eq(coupon.id, Number(id)),
        eq(coupon.mitra_id, Number(payload.mitraId))
      )
    );

    return NextResponse.json({ success: true, message: 'Kupon berhasil dihapus!' });
  } catch (error) {
    console.error("DELETE Coupon Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus kupon' }, { status: 500 });
  }
}