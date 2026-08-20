import { NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, mitra, reservations, tableList } from '@/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

async function getPayload() {
  const token = (await cookies()).get('ekasir_session')?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, SECRET_KEY)).payload as { branchId?: number | string };
  } catch {
    return null;
  }
}

async function findMitra(slug: string) {
  return db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const requestedBranchId = searchParams.get('branch_id');
    if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

    const foundMitra = await findMitra(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const conditions = [eq(reservations.mitra_id, foundMitra[0].id), isNull(reservations.deletedAt)];
    const finalBranchId = payload.branchId
      ? Number(payload.branchId)
      : requestedBranchId
        ? Number(requestedBranchId)
        : null;
    if (finalBranchId) conditions.push(eq(reservations.branch_id, finalBranchId));

    const data = await db
      .select({
        id: reservations.id,
        customer_name: reservations.customer_name,
        customer_phone: reservations.customer_phone,
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
      .orderBy(desc(reservations.reserved_start));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil reservasi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();
    if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

    const foundMitra = await findMitra(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const finalBranchId = payload.branchId
      ? Number(payload.branchId)
      : body.branch_id
        ? Number(body.branch_id)
        : null;

    if (!body.customer_name || !body.table_id || !body.reserved_start) {
      return NextResponse.json({ success: false, message: 'Nama, meja, dan waktu wajib diisi' }, { status: 400 });
    }

    const start = new Date(body.reserved_start);
    const durationMinutes = Math.max(30, Number(body.duration_minutes) || 90);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    await db.insert(reservations).values({
      customer_name: String(body.customer_name).trim(),
      customer_phone: body.customer_phone ? String(body.customer_phone).trim() : null,
      mitra_id: foundMitra[0].id,
      branch_id: finalBranchId,
      reserved_start: start,
      reserved_end: end,
      guest_count: Math.max(1, Number(body.guest_count) || 1),
      status: 'pending',
      notes: body.notes ? String(body.notes).trim() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.update(tableList).set({ status: 4, updatedAt: new Date() }).where(eq(tableList.id, Number(body.table_id)));

    return NextResponse.json({ success: true, message: 'Reservasi berhasil ditambahkan' });
  } catch (error) {
    console.error('POST reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan reservasi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();
    if (!slug || !body.id || !body.status) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    const foundMitra = await findMitra(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const allowed = ['pending', 'confirmed', 'canceled', 'completed', 'no_show'] as const;
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ success: false, message: 'Status tidak valid' }, { status: 400 });
    }

    const target = await db.select().from(reservations).where(and(
      eq(reservations.id, Number(body.id)),
      eq(reservations.mitra_id, foundMitra[0].id),
    )).limit(1);
    if (!target.length) return NextResponse.json({ success: false, message: 'Reservasi tidak ditemukan' }, { status: 404 });

    await db.update(reservations).set({ status: body.status, updatedAt: new Date() }).where(eq(reservations.id, Number(body.id)));

    if (body.status === 'confirmed') {
      await db.update(tableList).set({ status: 4, updatedAt: new Date() }).where(eq(tableList.id, target[0].table_id!));
    }
    if (['canceled', 'completed', 'no_show'].includes(body.status)) {
      await db.update(tableList).set({ status: 1, updatedAt: new Date() }).where(eq(tableList.id, target[0].table_id!));
    }

    return NextResponse.json({ success: true, message: 'Status reservasi diperbarui' });
  } catch (error) {
    console.error('PUT reservations error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui reservasi' }, { status: 500 });
  }
}
