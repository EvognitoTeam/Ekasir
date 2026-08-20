import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
// 🔴 Import tabel mitra dan settings dari skema
import { mitra, settings, branches } from '@/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

// Helper verifikasi otentikasi Superadmin
async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  
  if (!token) return false;
  
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = String(payload.role ?? '').trim().toLowerCase();
    
    if (role !== 'superadmin') return false;
    
    return payload;
  } catch {
    return false;
  }
}

// ==========================================
// GET: Ambil Daftar Seluruh Mitra + Settings
// ==========================================
export async function GET() {
  try {
    const auth = await verifySuperadmin();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Akses ditolak. Sesi tidak valid.' }, { status: 401 });
    }

    // Join tabel mitra dengan settings agar data keuangan ikut terambil di dashboard
    const allMitra = await db
      .select({
        id: mitra.id,
        mitra_name: mitra.mitra_name,
        mitra_slug: mitra.mitra_slug,
        status: mitra.status,
        createdAt: mitra.createdAt,
        // Data dari tabel settings
        mitraAddress: mitra.mitra_address,
        bankName: mitra.bank_name,
        bankNumber: mitra.no_rek,
        bankOwner: mitra.nama_rek,
        taxRate: settings.taxRate,
        serviceRate: settings.serviceRate,
        cashout: mitra.cashout,
      })
      .from(mitra)
      .leftJoin(settings, eq(mitra.id, settings.mitraId))
      .where(isNull(mitra.deletedAt))
      .orderBy(desc(mitra.createdAt));
    
    // 2. Ambil SEMUA data Cabang (Branches) yang aktif
    const allBranches = await db
      .select()
      .from(branches)
      .where(isNull(branches.deletedAt));

    // 3. Kelompokkan cabang berdasarkan mitra_id
    const branchesByMitra = allBranches.reduce((acc: any, branch) => {
      if (!acc[branch.mitra_id]) {
        acc[branch.mitra_id] = [];
      }
      acc[branch.mitra_id].push(branch);
      return acc;
    }, {});

    // 4. Gabungkan (Map) data cabang ke dalam array Mitra
    const dataWithBranches = allMitra.map((m) => ({
      ...m,
      branches: branchesByMitra[m.id] || [], // Jika tidak ada cabang, beri array kosong
    }));

    // console.log(dataWithBranches);

    return NextResponse.json({ success: true, data: dataWithBranches });
  } catch (error) {
    console.error('Superadmin GET Mitra Error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// ==========================================
// POST: Tambah Mitra Baru (Manual)
// ==========================================
export async function POST(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    const body = await request.json();
    const { mitra_name, mitra_slug } = body;

    if (!mitra_name || !mitra_slug) {
      return NextResponse.json({ success: false, message: 'Nama Mitra dan Slug wajib diisi.' }, { status: 400 });
    }

    const safeSlug = mitra_slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const [existing] = await db.select().from(mitra).where(eq(mitra.mitra_slug, safeSlug)).limit(1);
    if (existing) {
      return NextResponse.json({ success: false, message: 'Slug URL sudah digunakan oleh mitra lain.' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // 1. Insert ke tabel mitra
      const [insertedMitra] = await tx.insert(mitra).values({
        mitra_name,
        mitra_slug: safeSlug,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).$returningId();

      const newMitraId = insertedMitra?.id;

      // 2. Buat default settings untuk mitra baru tersebut
      if (newMitraId) {
        await tx.insert(settings).values({
          mitraId: newMitraId,
          taxRate: 0,
          serviceRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Mitra berhasil ditambahkan.' });
  } catch (error) {
    console.error('Superadmin POST Mitra Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menambahkan mitra.' }, { status: 500 });
  }
}

// ==========================================
// PUT: Update Data Mitra & Settings Terpisah
// ==========================================
export async function PUT(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });

    // 🔴 Ambil ID dari searchParams URL
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID Mitra tidak ditemukan pada URL.' }, { status: 400 });
    }

    const body = await request.json();
    const { mitra_name, mitraAddress, bankName, bankNumber, bankOwner, taxRate, serviceRate, cashout } = body;

    await db.transaction(async (tx) => {
      // 1. Update tabel mitra
      if (mitra_name) {
        await tx.update(mitra)
          .set({ 
            mitra_name,
            mitra_address: mitraAddress || null,
            bank_name: bankName || null,
            no_rek: bankNumber || null,
            nama_rek: bankOwner || null,
            cashout: cashout !== undefined && cashout !== '' ? Number(cashout) : 0,
            updatedAt: new Date() })
          .where(eq(mitra.id, id));
      }

      // 2. Update atau Insert ke tabel settings
      const [existingSettings] = await tx.select().from(settings).where(eq(settings.mitraId, id)).limit(1);

      const settingsPayload = {
        tax_rate: taxRate !== undefined && taxRate !== '' ? Number(taxRate) : 0,
        service_rate: serviceRate !== undefined && serviceRate !== '' ? Number(serviceRate) : 0,
        updatedAt: new Date(),
      };

      if (existingSettings) {
        await tx.update(settings).set(settingsPayload).where(eq(settings.mitraId, id));
      } else {
        await tx.insert(settings).values({ mitraId: id, ...settingsPayload, createdAt: new Date() });
      }
    });

    return NextResponse.json({ success: true, message: 'Data mitra berhasil diperbarui.' });
  } catch (error) {
    console.error('Superadmin PUT Mitra Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui data mitra.' }, { status: 500 });
  }
}

// ==========================================
// DELETE: Hapus Mitra (Soft Delete)
// ==========================================
export async function DELETE(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID Mitra tidak ditemukan.' }, { status: 400 });
    }

    await db
      .update(mitra)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mitra.id, id));

    return NextResponse.json({ success: true, message: 'Mitra berhasil dinonaktifkan/dihapus.' });
  } catch (error) {
    console.error('Superadmin DELETE Mitra Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus mitra.' }, { status: 500 });
  }
}