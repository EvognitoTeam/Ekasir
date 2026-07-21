import { NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, mitra } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';

// Helper: Fungsi Pengecekan Otorisasi Berbasis Cookie Session
async function isAuthorized() {
  const cookieStore = await cookies();
  const session = cookieStore.get('ekasir_session'); 
  return !!session; 
}

function createBranchCode(name: string) {
  // 1. Hapus kata-kata awalan yang tidak perlu agar kodenya lebih akurat
  let cleanName = name.replace(/(cabang|outlet|store|kedai)\s*/ig, '').trim();
  
  // Jika namanya kebetulan cuma "Cabang" doang, kembalikan nama aslinya
  if (!cleanName) cleanName = name; 

  // 2. Hapus semua huruf vokal dan karakter non-alfabet, lalu jadikan HURUF BESAR
  let code = cleanName.toUpperCase().replace(/[AEIOU\s\W]/g, '');

  // 3. Batasi maksimal 4 karakter
  code = code.substring(0, 4);

  // 4. Fallback: Jika kodenya terlalu pendek (misal nama cabangnya "Oyo", 
  // vokalnya hilang semua), maka ambil 4 huruf pertama dari nama aslinya.
  if (code.length < 2) {
    code = cleanName.toUpperCase().replace(/[\s\W]/g, '').substring(0, 4);
  }

  // 5. (Opsional tapi Disarankan) Tambahkan 2 angka acak di belakang agar pasti UNIK
  // Ini mencegah error jika ada "Tembalang" (TMBL) dan "Tambal" (TMBL)
  const randomNum = Math.floor(Math.random() * 90 + 10); // Menghasilkan angka 10-99
  
  return `${code}${randomNum}`; // Hasil akhir: GMBL42, SDRM19, dst.
}

export async function GET(request: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ success: false, message: 'Akses Ditolak' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

  try {
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const activeBranches = await db.select()
      .from(branches)
      .where(
        and(
          eq(branches.mitra_id, foundMitra[0].id),
          isNull(branches.deletedAt) // 🔴 Hanya tampilkan yang tidak di-soft delete
        )
      );

    return NextResponse.json({ success: true, data: activeBranches });
  } catch (error) {
    console.error("GET Branches Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ success: false, message: 'Akses Ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { slug, name, address, phone } = body;
    const branchCode = createBranchCode(name);

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    await db.insert(branches).values({
      mitra_id: foundMitra[0].id,
      branch_slug: branchCode,
      name,
      address,
      phone,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true, message: 'Cabang berhasil ditambahkan' });
  } catch (error) {
    console.error("POST Branches Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAuthorized()) return NextResponse.json({ success: false, message: 'Akses Ditolak' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, address, phone } = body;
    const branchCode = createBranchCode(name);

    await db.update(branches)
      .set({ branch_slug: branchCode, name, address, phone, updatedAt: new Date() })
      .where(eq(branches.id, Number(id)));

    return NextResponse.json({ success: true, message: 'Cabang berhasil diperbarui' });
  } catch (error) {
    console.error("PUT Branches Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized()) return NextResponse.json({ success: false, message: 'Akses Ditolak' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ success: false, message: 'ID diperlukan' }, { status: 400 });

  try {
    // 🔴 Melakukan SOFT DELETE (Mengisi deletedAt dengan waktu saat ini)
    await db.update(branches)
      .set({ deletedAt: new Date() })
      .where(eq(branches.id, Number(id)));

    return NextResponse.json({ success: true, message: 'Cabang berhasil dihapus' });
  } catch (error) {
    console.error("DELETE Branches Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}