import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026'
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: 'Slug diperlukan',
        },
        { status: 400 }
      );
    }

    // =========================
    // AUTH USER
    // =========================

    const cookieStore = await cookies();

    const token =
      cookieStore.get('ekasir_session')
        ?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tidak ada sesi aktif',
        },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      SECRET_KEY
    );

    // Multi tenant protection
    if (
      payload.role !== 'User' &&
      payload.slug !== slug
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Akses ditolak. Sesi Anda tidak terdaftar di toko ini.',
        },
        { status: 403 }
      );
    }

    // =========================
    // GET MITRA
    // =========================

    const foundMitra = await db
      .select()
      .from(mitra)
      .where(eq(mitra.mitra_slug, slug))
      .limit(1);

    if (foundMitra.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mitra tidak ditemukan',
        },
        { status: 404 }
      );
    }

    const mitraData = foundMitra[0];

    // =========================
    // GET SETTINGS
    // =========================

    const foundSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.mitraId, mitraData.id)
      )
      .limit(1);

    const dbSettings =
      foundSettings.length > 0
        ? foundSettings[0]
        : null;

    // =========================
    // RESPONSE
    // =========================

    const data = {
      // MITRA
      cafeName:
        mitraData.mitra_name || '',

      mitraAddress:
        mitraData.mitra_address || '',

      mitraWelcome:
        mitraData.mitra_welcome || '',

      bankName:
        mitraData.bank_name || '',

      bankNumber:
        mitraData.no_rek || '',

      bankOwner:
        mitraData.nama_rek || '',

      // USER LOGIN
      email:
        typeof payload.email === 'string'
          ? payload.email
          : '',

      // SETTINGS
      taxRate:
        dbSettings?.taxRate ?? 0,

      serviceRate:
        dbSettings?.serviceRate ?? 0,

      isTaxIncluded:
        dbSettings?.isTaxIncluded ?? 0,

      wifiSSID:
        dbSettings?.wifiSSID || '',

      wifiPassword:
        dbSettings?.wifiPassword || '',

      facilities:
        dbSettings?.facility || [],

      faq:
        dbSettings?.faq || [],
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      'Error fetching settings:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Sesi tidak valid',
      },
      { status: 401 }
    );
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