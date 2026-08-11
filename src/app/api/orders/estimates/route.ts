import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, mitra } from '@/db/schema';
import { eq, desc, isNotNull, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });
  }

  try {
    // 1. Cari ID Mitra
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' });
    const mitraId = foundMitra[0].id;

    // 2. Ambil 20 pesanan terakhir yang sudah punya timestamp lengkap
    // Kita ambil sampel dari pesanan yang sudah 'completed' atau 'ready'
    const recentOrders = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.mitra_id, mitraId),
          isNotNull(orders.createdAt),
          isNotNull(orders.confirmedAt),
          isNotNull(orders.preparingAt),
          isNotNull(orders.readyAt)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(20); // 20 pesanan terakhir sudah sangat cukup untuk rata-rata real-time

    // Fallback jika belum ada pesanan sama sekali
    if (recentOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: { avgConfirm: 1, avgPrepare: 5, avgReady: 10 }
      });
    }

    let totalConfirm = 0;
    let totalPrepare = 0;
    let totalReady = 0;

    // 3. Hitung selisih waktu dalam Menit
    recentOrders.forEach(order => {
      const created = new Date(order.createdAt!).getTime();
      const confirmed = new Date(order.confirmedAt!).getTime();
      const preparing = new Date(order.preparingAt!).getTime();
      const ready = new Date(order.readyAt!).getTime();

      // Selisih dalam milidetik diubah ke Menit (/ 60000)
      totalConfirm += (confirmed - created) / 60000;
      totalPrepare += (preparing - confirmed) / 60000;
      totalReady += (ready - preparing) / 60000;
    });

    const count = recentOrders.length;
    
    // Pembulatan ke atas (Math.ceil) agar ekspektasi pelanggan tidak terlalu cepat
    const avgConfirm = Math.ceil(totalConfirm / count) || 1;
    const avgPrepare = Math.ceil(totalPrepare / count) || 5;
    // Waktu Ready = (Waktu dari Confirmed ke Preparing) + (Waktu Preparing ke Ready)
    const avgReady = avgPrepare + Math.ceil(totalReady / count) || 10;

    return NextResponse.json({
      success: true,
      data: {
        avgConfirm,
        avgPrepare,
        avgReady,
      }
    });

  } catch (error) {
    console.error("Estimate Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}