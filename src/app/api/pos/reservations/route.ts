import { NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, mitra, reservations, tableList } from '@/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

async function getAuthPayload() {
  const token = (await cookies()).get('ekasir_session')?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, SECRET_KEY)).payload as { branchId?: number | string };
  } catch {
    return null;
  }
}

async function resolveMitra(slug: string) {
  return db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
}

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const requestedBranchId = searchParams.get('branch_id');
    if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

    const foundMitra = await resolveMitra(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const conditions = [eq(reservations.mitra_id, foundMitra[0].id), isNull(reservations.deletedAt)];
    const finalBranchId = payload.branchId || requestedBranchId;
    if (finalBranchId === 'main') {
      conditions.push(isNull(reservations.branch_id));
    } else if (finalBranchId) {
      conditions.push(eq(reservations.branch_id, Number(finalBranchId)));
    }

    /* filter branch applied above */

    const data = await db
      .select({
        id: reservations.id,
        guest_name: reservations.guest_name,
        guest_phone: reservations.guest_phone,
        table_id: reservations.table_id,
        table_name: tableList.table_name,
        branch_id: reservations.branch_id,
        branch_name: branches.name,
        reserved_start: reservations.reserved_start,
        reserved_end: reservations.reserved_end,
        guest_count: reservations.guest_count,
        status: reservations.status,
        notes: reservations.notes,
      })
      .from(reservations)
      .leftJoin(tableList, eq(reservations.table_id, tableList.id))
      .leftJoin(branches, eq(reservations.branch_id, branches.id))
      .where(and(...conditions))
      .orderBy(asc(reservations.reserved_start));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil reservasi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();
    if (!slug || !body.guest_name || !body.table_id || !body.reserved_start || !body.reserved_end) {
      return NextResponse.json({ success: false, message: 'Data reservasi belum lengkap' }, { status: 400 });
    }

    const foundMitra = await resolveMitra(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const finalBranchId = payload.branchId ? Number(payload.branchId) : body.branch_id ? Number(body.branch_id) : null;

    await db.insert(reservations).values({
      mitra_id: foundMitra[0].id,
      branch_id: finalBranchId,
      table_id: Number(body.table_id),
      guest_name: String(body.guest_name).trim().slice(0, 120),
      guest_phone: body.guest_phone ? String(body.guest_phone).trim().slice(0, 30) : null,
      reserved_start: new Date(body.reserved_start),
      reserved_end: new Date(body.reserved_end),
      guest_count: Math.max(Number(body.guest_count || 1), 1),
      status: 'pending',
      notes: body.notes ? String(body.notes) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.update(tableList).set({ status: 3, updatedAt: new Date() }).where(eq(tableList.id, Number(body.table_id)));
    return NextResponse.json({ success: true, message: 'Reservasi berhasil ditambahkan' });
  } catch (error) {
    console.error('POST reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat reservasi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    if (!body.id || !['pending', 'confirmed', 'canceled', 'completed', 'no_show'].includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Status tidak valid' }, { status: 400 });
    }

    const current = await db.select().from(reservations).where(eq(reservations.id, Number(body.id))).limit(1);
    if (!current.length) return NextResponse.json({ success: false, message: 'Reservasi tidak ditemukan' }, { status: 404 });
    if (payload.branchId && Number(current[0].branch_id) !== Number(payload.branchId)) {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 });
    }

    await db.update(reservations).set({ status: body.status, updatedAt: new Date() }).where(eq(reservations.id, Number(body.id)));
    const tableStatus = body.status === 'confirmed' || body.status === 'pending' ? 3 : 1;
    if (current[0].table_id) {
      await db.update(tableList).set({ status: tableStatus, updatedAt: new Date() }).where(eq(tableList.id, current[0].table_id));
    }
    return NextResponse.json({ success: true, message: 'Status reservasi diperbarui' });
  } catch (error) {
    console.error('PUT reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui reservasi' }, { status: 500 });
  }
}
