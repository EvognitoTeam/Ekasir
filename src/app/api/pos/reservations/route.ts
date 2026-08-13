import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, reservations, reservationTableList } from '@/db/schema'; 
import { eq, and, desc, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

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

// ============================================================================
// [GET] AMBIL DAFTAR RESERVASI (Dengan Relasi Multi-Meja)
// ============================================================================
export async function GET(request: Request) {
  try {
    const authPayload = await getAuthPayload();
    if (!authPayload) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const reqBranchId = searchParams.get('branch_id'); 

    if (!slug) return NextResponse.json({ success: false, message: 'Slug wajib disertakan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const currentMitra = foundMitra[0];
    const finalBranchId = authPayload.branchId ? Number(authPayload.branchId) : (reqBranchId ? Number(reqBranchId) : null);

    const conditions = [eq(reservations.mitra_id, currentMitra.id)];
    if (finalBranchId) conditions.push(eq(reservations.branch_id, finalBranchId));

    // 1. Ambil data reservasi utama
    const data = await db.select()
      .from(reservations)
      .where(and(...conditions))
      .orderBy(desc(reservations.createdAt));

    // 2. Ambil relasi multi-meja jika ada
    const resIds = data.map(r => r.id);
    let tableMappings: any[] = [];
    
    if (resIds.length > 0) {
      tableMappings = await db.select().from(reservationTableList).where(inArray(reservationTableList.reservation_id, resIds));
    }

    // 3. Sisipkan array table_ids ke dalam masing-masing reservasi
    const formattedData = data.map(r => {
      const tIds = tableMappings.filter(m => m.reservation_id === r.id).map(m => m.table_list_id);
      return { ...r, table_ids: tIds };
    });

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("GET Reservations API Error:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// ============================================================================
// [POST] BUAT RESERVASI (Support Multi-Meja)
// ============================================================================
export async function POST(request: Request) {
  try {
    const authPayload = await getAuthPayload();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) return NextResponse.json({ success: false, message: 'Slug wajib disertakan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const currentMitra = foundMitra[0];
    const body = await request.json();

    // 🟢 Disesuaikan dengan Skema Drizzle yang baru
    const { 
      customer_name, 
      customer_phone, 
      guest_count, 
      reserved_start, 
      reserved_end, 
      table_ids, 
      notes, 
      status, 
      branch_id 
    } = body;

    if (!customer_name || !guest_count || !reserved_start || !reserved_end) {
      return NextResponse.json({ success: false, message: 'Data wajib belum lengkap' }, { status: 400 });
    }

    const finalStatus = authPayload ? (status || 'confirmed') : 'pending';
    const finalBranchId = authPayload?.branchId ? Number(authPayload.branchId) : (branch_id ? Number(branch_id) : null);

    // 🟢 Gunakan Transaction agar Insert Reservasi dan Pivot Table aman
    await db.transaction(async (tx) => {
      // 1. Simpan Reservasi Utama
      const [insertRes] = await tx.insert(reservations).values({
        mitra_id: currentMitra.id,
        branch_id: finalBranchId,
        customer_name,         // 🟢 Maps to customer_name property di schema
        customer_phone,        // 🟢 Maps to customer_phone property di schema
        guest_count: Number(guest_count),
        reserved_start: new Date(reserved_start),
        reserved_end: new Date(reserved_end),
        table_id: table_ids && table_ids.length > 0 ? Number(table_ids[0]) : null, 
        notes: notes || null,
        status: finalStatus as any,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const reservationId = (insertRes as any).insertId;

      // 2. Simpan Relasi Meja ke Pivot Table (reservationTableList)
      if (reservationId && table_ids && Array.isArray(table_ids) && table_ids.length > 0) {
        const mappings = table_ids.map((tId: any) => ({
          reservation_id: reservationId,
          table_list_id: Number(tId),
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        await tx.insert(reservationTableList).values(mappings);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: authPayload ? 'Reservasi manual berhasil dibuat' : 'Reservasi diajukan, menunggu konfirmasi' 
    });

  } catch (error) {
    console.error("POST Reservation API Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal membuat reservasi' }, { status: 500 });
  }
}

// ============================================================================
// [PUT] UPDATE STATUS RESERVASI
// ============================================================================
export async function PUT(request: Request) {
  try {
    const authPayload = await getAuthPayload();
    if (!authPayload) return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug as string)).limit(1);
    const currentMitra = foundMitra[0];
    
    const body = await request.json();
    const { id, status } = body;

    const conditions = [
      eq(reservations.id, Number(id)),
      eq(reservations.mitra_id, currentMitra.id)
    ];

    if (authPayload.branchId) conditions.push(eq(reservations.branch_id, Number(authPayload.branchId)));

    await db.update(reservations).set({ status, updatedAt: new Date() }).where(and(...conditions));

    return NextResponse.json({ success: true, message: 'Status diperbarui' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal update status' }, { status: 500 });
  }
}