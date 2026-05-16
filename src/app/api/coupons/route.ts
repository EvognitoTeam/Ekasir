import { NextResponse } from 'next/server';
import { db } from '@/db'; // Sesuaikan path database Drizzle kamu
import { mitra, coupon } from '@/db/schema'; // Sesuaikan path skema
import { eq, and, gt, lt, or, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  // 🔴 SOLUSI: Gunakan objek Date() langsung agar tipe datanya cocok dengan Drizzle
  // Drizzle/MySQL akan otomatis menyesuaikan konversi waktunya.
  const currentDate = new Date();

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });
  }

  try {
    // 1. Cari ID Mitra berdasarkan Slug
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    const mitraId = foundMitra[0].id;

    // 2. Ambil Semua Kupon yang Aktif (Member & Publik)
    const activeCoupons = await db.select()
        .from(coupon)
        .where(
            and(
                eq(coupon.mitra_id, mitraId),
                
                // Validasi Waktu: Expired date > hari ini ATAU expired_date nya kosong/null
                or(
                    // Karena currentDate sekarang adalah tipe Date(), Drizzle tidak akan protes lagi
                    gt(coupon.expired_date, currentDate),
                    isNull(coupon.expired_date)
                ),
                
                // Validasi Kuota: Belum sentuh limit ATAU max_use diset 0 (Unlimited)
                or(
                    eq(coupon.max_use, 0),
                    lt(coupon.already_used, coupon.max_use)
                )
            )
        );

    return NextResponse.json({ success: true, data: activeCoupons });

  } catch (error) {
    console.error("Error fetching coupon:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}