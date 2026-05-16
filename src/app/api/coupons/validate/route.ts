import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, coupon } from '@/db/schema';
import { eq, and, gt, lt, or, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const code = searchParams.get('code');

  if (!slug || !code) {
    return NextResponse.json({ success: false, message: 'Slug dan Code diperlukan' }, { status: 400 });
  }

  try {
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    // ✅ DIPERBAIKI: Tambahkan
    const mitraId = foundMitra[0].id;
    
    // Fungsi untuk memproduksi string waktu murni WIB, contoh: "2026-05-08 15:20:11"
    const getWIBDateTime = () => {
      const date = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      // en-CA formatnya adalah YYYY-MM-DD, HH:mm:ss. Kita replace koma dengan spasi.
      return formatter.format(date).replace(', ', ' '); 
    };

    const currentDate = getWIBDateTime();

    const foundCoupon = await db.select()
      .from(coupon)
      .where(
        and(
          eq(coupon.mitra_id, mitraId),
          eq(coupon.coupon_code, code.toUpperCase()), 
          
          or(
            gt(coupon.expired_date, new Date(currentDate)), // Drizzle butuh konversi kembali ke Date object secara eksplisit di beberapa driver
            isNull(coupon.expired_date)
          ),
          
          or(
            eq(coupon.max_use, 0),
            lt(coupon.already_used, coupon.max_use)
          )
        )
      )
      .limit(1);

    if (foundCoupon.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Kupon tidak valid, kedaluwarsa, atau kuota telah habis.',
        data: foundCoupon,
        currentDate: currentDate
      }, { status: 400 });
    }

    // ✅ DIPERBAIKI: Tambahkan
    const validCoupon = foundCoupon[0];
    
    let type = 'fixed';
    let value = Number(validCoupon.discount_price) || 0;

    if (validCoupon.discount_rate && validCoupon.discount_rate > 0) {
      type = 'percentage';
      value = validCoupon.discount_rate;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        code: validCoupon.coupon_code,
        discountRate: validCoupon.discount_rate || 0,
        discountPrice: Number(validCoupon.discount_price) || 0,
        isMemberOnly: validCoupon.is_member_only 
      } 
    });

  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat memvalidasi kupon' }, { status: 500 });
  }
}