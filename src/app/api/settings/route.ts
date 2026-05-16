import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });
  }

  try {
    // 1. Cari Mitra berdasarkan Slug
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);

    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    const mitraId = foundMitra[0].id;

    // 2. Ambil Settings berdasarkan mitraId (Sesuai dengan properti di schema kamu)
    const foundSettings = await db.select()
      .from(settings)
      .where(eq(settings.mitraId, mitraId))
      .limit(1);

    // 3. Fallback Data: Jika toko belum punya data settings, beri nilai default
    let data: any = {
      // Asumsi 'mitra_name' adalah kolom untuk nama kafe. Sesuaikan jika nama kolomnya berbeda.
      cafeName: foundMitra[0].mitra_name || '',
      taxRate: 0,
      serviceRate: 0,
      isTaxIncluded: 0,
      // 🔴 Tambahan nilai default untuk WiFi & Fasilitas
      wifiSSID: '',
      wifiPassword: '',
      facilities: null
    };

    // Jika data settings ditemukan, timpa nilai default dengan data asli
    if (foundSettings.length > 0) {
      const dbSettings = foundSettings[0];
      data = {
        // Asumsi 'mitra_name' adalah kolom untuk nama kafe. Sesuaikan jika nama kolomnya berbeda.
        cafeName: foundMitra[0].mitra_name || '',
        // Gunakan properti camelCase sesuai yang dideklarasikan sebelum fungsi tipe Drizzle
        taxRate: dbSettings.taxRate ?? 0,
        serviceRate: dbSettings.serviceRate ?? 0,
        isTaxIncluded: dbSettings.isTaxIncluded ?? 0,
        
        // 🔴 Tangkap data WiFi dan Fasilitas
        // (Pastikan properti ini pakai nama yang sesuai dengan di src/db/schema.ts)
        // Saya buat fallback nama jika kamu pakai camelCase atau snake_case di schema.
        wifiSSID: dbSettings.wifiSSID || '',
        wifiPassword: dbSettings.wifiPassword || '',
        facilities: dbSettings.facility || null
      };
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat mengambil pengaturan' }, { status: 500 });
  }
}