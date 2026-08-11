import { NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, mitra, tableList } from '@/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

const TABLE_STATUS = {
  available: 1,
  occupied: 2,
  cleaning: 3,
  reserved: 4,
  inactive: 0,
} as const;

function generateTableCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;

  try {
    return (await jwtVerify(token, SECRET_KEY)).payload as {
      branchId?: number | string;
    };
  } catch {
    return null;
  }
}

async function getMitra(slug: string) {
  return db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
}

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const requestedBranchId = searchParams.get('branch_id');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Slug toko diperlukan' }, { status: 400 });
    }

    const foundMitra = await getMitra(slug);
    if (!foundMitra.length) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    const conditions = [
      eq(tableList.mitra_id, foundMitra[0].id),
      isNull(tableList.deletedAt),
    ];

    const finalBranchId = payload.branchId
      ? Number(payload.branchId)
      : requestedBranchId
        ? Number(requestedBranchId)
        : null;

    if (finalBranchId) conditions.push(eq(tableList.branch_id, finalBranchId));

    const tables = await db
      .select({
        id: tableList.id,
        table_code: tableList.table_code,
        table_name: tableList.table_name,
        capacity: tableList.capacity,
        status: tableList.status,
        branch_id: tableList.branch_id,
        branch_name: branches.name,
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
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Slug toko diperlukan' }, { status: 400 });
    }

    const foundMitra = await getMitra(slug);
    if (!foundMitra.length) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    const finalBranchId = payload.branchId
      ? Number(payload.branchId)
      : body.branch_id
        ? Number(body.branch_id)
        : null;
    const capacity = Math.max(1, Number(body.capacity) || 4);
    const status = TABLE_STATUS[body.status as keyof typeof TABLE_STATUS] ?? 1;

    if (body.mode === 'bulk') {
      const count = Math.min(100, Math.max(1, Number(body.count) || 1));
      const startNumber = Math.max(1, Number(body.start_number) || 1);
      const prefix = String(body.prefix || 'Meja').trim().slice(0, 14) || 'Meja';

      await db.insert(tableList).values(
        Array.from({ length: count }, (_, index) => ({
          mitra_id: foundMitra[0].id,
          branch_id: finalBranchId,
          table_name: `${prefix} ${startNumber + index}`.slice(0, 20),
          table_code: generateTableCode(),
          capacity,
          status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );

      return NextResponse.json({ success: true, message: `${count} meja berhasil dibuat` });
    }

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, message: 'Nama meja wajib diisi' }, { status: 400 });
    }

    await db.insert(tableList).values({
      mitra_id: foundMitra[0].id,
      branch_id: finalBranchId,
      table_name: name.slice(0, 20),
      table_code: generateTableCode(),
      capacity,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Meja berhasil ditambahkan' });
  } catch (error) {
    console.error('POST tables error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan meja' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const body = await request.json();

    if (!slug || !body.id) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    const foundMitra = await getMitra(slug);
    if (!foundMitra.length) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    const conditions = [
      eq(tableList.id, Number(body.id)),
      eq(tableList.mitra_id, foundMitra[0].id),
    ];
    if (payload.branchId) conditions.push(eq(tableList.branch_id, Number(payload.branchId)));

    if (body.isDeleted) {
      await db.update(tableList).set({ deletedAt: new Date() }).where(and(...conditions));
      return NextResponse.json({ success: true, message: 'Meja berhasil dihapus' });
    }

    const updateData: Partial<typeof tableList.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.table_name = String(body.name).trim().slice(0, 20);
    if (body.capacity !== undefined) updateData.capacity = Math.max(1, Number(body.capacity));
    if (body.branch_id !== undefined && !payload.branchId) {
      updateData.branch_id = body.branch_id ? Number(body.branch_id) : null;
    }
    if (body.status !== undefined) {
      updateData.status = typeof body.status === 'string'
        ? (TABLE_STATUS[body.status as keyof typeof TABLE_STATUS] ?? 1)
        : Number(body.status);
    }

    await db.update(tableList).set(updateData).where(and(...conditions));
    return NextResponse.json({ success: true, message: 'Meja berhasil diperbarui' });
  } catch (error) {
    console.error('PUT tables error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui meja' }, { status: 500 });
  }
}
