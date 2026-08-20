import { NextResponse } from 'next/server';
import { db } from '@/db';
import { coupon, users } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { coupon_code, user_id, mitra_id } = body;

    if (!coupon_code || !user_id || !mitra_id) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap.' }, { status: 400 });
    }

    // 1. Cari voucher berdasarkan kode dan mitra
    const [foundCoupon] = await db
      .select()
      .from(coupon)
      .where(
        and(
          eq(coupon.coupon_code, coupon_code.toUpperCase()),
          eq(coupon.mitra_id, mitra_id),
          isNull(coupon.deletedAt)
        )
      )
      .limit(1);

    if (!foundCoupon) {
      return NextResponse.json({ success: false, message: 'Kode voucher tidak ditemukan.' }, { status: 404 });
    }

    // 2. Cek apakah ini memang voucher jenis "Klaim"
    if (!foundCoupon.is_claimable) {
      return NextResponse.json({ success: false, message: 'Kupon ini adalah promo publik dan tidak perlu diklaim secara manual.' }, { status: 400 });
    }

    // 3. Cek apakah sudah diklaim orang lain (atau dirinya sendiri)
    if (foundCoupon.claimed_by_user_id !== null) {
      if (foundCoupon.claimed_by_user_id === user_id) {
        return NextResponse.json({ success: false, message: 'Anda sudah mengklaim voucher ini sebelumnya.' }, { status: 400 });
      }
      return NextResponse.json({ success: false, message: 'Maaf, voucher ini sudah diklaim oleh pengguna lain.' }, { status: 400 });
    }

    // 4. Hitung tanggal kedaluwarsa (berdasarkan valid_days_after_claim)
    const now = new Date();
    let expiredDate = null;
    
    if (foundCoupon.valid_days_after_claim && foundCoupon.valid_days_after_claim > 0) {
      expiredDate = new Date();
      expiredDate.setDate(now.getDate() + foundCoupon.valid_days_after_claim);
    }

    // 5. Update data voucher (Kunci untuk user ini)
    await db
      .update(coupon)
      .set({
        claimed_by_user_id: user_id,
        start_date: now,
        expired_date: expiredDate,
        updatedAt: now,
      })
      .where(eq(coupon.id, foundCoupon.id));

    return NextResponse.json({ 
      success: true, 
      message: 'Voucher berhasil diklaim dan ditambahkan ke akun Anda!',
      valid_until: expiredDate 
    }, { status: 200 });

  } catch (error) {
    console.error('Error klaim voucher:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}