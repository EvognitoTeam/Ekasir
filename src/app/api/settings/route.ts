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
  // console.log(slug);

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
      facilities: null,
      faq: null,
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
        
        wifiSSID: dbSettings.wifiSSID || '',
        wifiPassword: dbSettings.wifiPassword || '',
        facility: dbSettings.facility || null,
        faq: dbSettings.faq || null
      };
      console.log(data);
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat mengambil pengaturan' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });
  }

  try {
    const body = await request.json();
    // 🔴 1. Tangkap facilities dan faq dari body
    const { taxRate, serviceRate, is_tax_included, wifiSSID, wifiPassword, facilities, faq } = body;

    // 2. Cari Mitra berdasarkan slug untuk mendapatkan id asli
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    const mitraId = foundMitra[0].id;

    // 3. Cek apakah row settings untuk mitra ini sudah pernah dibuat
    const foundSettings = await db.select().from(settings).where(eq(settings.mitraId, mitraId)).limit(1);
    console.log("Data diterima API:", body);

    if (foundSettings.length === 0) {
      // Jika belum ada data sama sekali, lakukan INSERT
      await db.insert(settings).values({
        mitraId: mitraId,
        taxRate: Number(taxRate || 0),
        serviceRate: Number(serviceRate || 0), // 🔴 Diperbaiki: Dimasukkan ke DB
        isTaxIncluded: Number(is_tax_included || 0), // 🔴 Diperbaiki: Fallback jadi 0
        wifiSSID: wifiSSID || null,
        wifiPassword: wifiPassword || null,
        facility: facilities || [], // 🔴 2. Masukkan array fasilitas (sesuai nama kolom Drizzle)
        faq: faq || [],             // 🔴 3. Masukkan array FAQ
        createdAt: new Date()
      });
    } else {
      // Jika sudah ada, lakukan UPDATE
      await db.update(settings)
        .set({
          taxRate: Number(taxRate || 0),
          serviceRate: Number(serviceRate || 0), // 🔴 Diperbaiki: Dimasukkan ke DB
          isTaxIncluded: Number(is_tax_included || 0), // 🔴 Diperbaiki: Fallback jadi 0
          wifiSSID: wifiSSID || null,
          wifiPassword: wifiPassword || null,
          facility: facilities || [], // 🔴 2. Masukkan array fasilitas
          faq: faq || [],             // 🔴 3. Masukkan array FAQ
          updatedAt: new Date()
        })
        .where(eq(settings.mitraId, mitraId));
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil diperbarui' });

  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan pengaturan' }, { status: 500 });
  }
}