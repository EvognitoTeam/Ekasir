import { NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, mitra, tableList } from '@/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

const MAX_BULK_TABLES = 30;

function generateTableCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, SECRET_KEY)).payload as {
      branchId?: number | string;
      role?: string;
    };
  } catch {
    return null;
  }
}

async function getMitraBySlug(slug: string) {
  return db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
}

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const requestedBranchId = searchParams.get('branch_id');
    if (!slug) return NextResponse.json({ success: false, message: 'Slug toko diperlukan' }, { status: 400 });

    const foundMitra = await getMitraBySlug(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const conditions = [eq(tableList.mitra_id, foundMitra[0].id), isNull(tableList.deletedAt)];
    const finalBranchId = payload.branchId || requestedBranchId;
    if (finalBranchId === 'main') {
      conditions.push(isNull(tableList.branch_id));
    } else if (finalBranchId) {
      conditions.push(eq(tableList.branch_id, Number(finalBranchId)));
    }

    /* filter branch applied above */

    const tables = await db
      .select({
        id: tableList.id,
        table_code: tableList.table_code,
        table_name: tableList.table_name,
        capacity: tableList.capacity,
        status: tableList.status,
        branch_id: tableList.branch_id,
        branch_name: branches.name,
        branch_slug: branches.branch_slug,
      })
      .from(tableList)
      .leftJoin(branches, eq(tableList.branch_id, branches.id))
      .where(and(...conditions))
      .orderBy(asc(tableList.table_name));

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error('GET tables error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data meja' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();
    if (!slug) return NextResponse.json({ success: false, message: 'Slug toko diperlukan' }, { status: 400 });

    const foundMitra = await getMitraBySlug(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const count = Math.min(Math.max(Number(body.count || 1), 1), MAX_BULK_TABLES);
    const capacity = Math.max(Number(body.capacity || 4), 1);
    const status = [0, 1, 2, 3].includes(Number(body.status)) ? Number(body.status) : 1;
    const prefix = String(body.prefix || body.name || 'Meja').trim().slice(0, 15) || 'Meja';
    const startNumber = Math.max(Number(body.start_number || 1), 1);
    const finalBranchId = payload.branchId ? Number(payload.branchId) : body.branch_id ? Number(body.branch_id) : null;

    const values = Array.from({ length: count }, (_, index) => ({
      mitra_id: foundMitra[0].id,
      branch_id: finalBranchId,
      table_name: count === 1 && body.name ? String(body.name).trim().slice(0, 20) : `${prefix} ${startNumber + index}`.slice(0, 20),
      table_code: generateTableCode(),
      capacity,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(tableList).values(values);
    return NextResponse.json({ success: true, count: values.length, message: `${values.length} meja berhasil dibuat` });
  } catch (error) {
    console.error('POST tables error:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat meja' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();
    if (!slug || !body.id) return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });

    const foundMitra = await getMitraBySlug(slug);
    if (!foundMitra.length) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });

    const conditions = [eq(tableList.id, Number(body.id)), eq(tableList.mitra_id, foundMitra[0].id)];
    if (payload.branchId) conditions.push(eq(tableList.branch_id, Number(payload.branchId)));

    if (body.isDeleted) {
      await db.update(tableList).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(...conditions));
      return NextResponse.json({ success: true, message: 'Meja berhasil dihapus' });
    }

    const update: Partial<typeof tableList.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.name === 'string') update.table_name = body.name.trim().slice(0, 20);
    if (body.capacity !== undefined) update.capacity = Math.max(Number(body.capacity), 1);
    if (body.status !== undefined && [0, 1, 2, 3].includes(Number(body.status))) update.status = Number(body.status);
    if (!payload.branchId && body.branch_id !== undefined) update.branch_id = body.branch_id ? Number(body.branch_id) : null;

    await db.update(tableList).set(update).where(and(...conditions));
    return NextResponse.json({ success: true, message: 'Meja berhasil diperbarui' });
  } catch (error) {
    console.error('PUT tables error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui meja' }, { status: 500 });
  }
}
