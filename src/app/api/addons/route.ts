import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, addonCategories, addons } from '@/db/schema'; 
import { eq, and, isNull } from 'drizzle-orm';
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
  } catch (err) { return null; }
}

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const reqBranchId = searchParams.get('branch_id'); 

    if (!slug) return NextResponse.json({ success: false, message: 'Slug toko wajib disertakan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Toko tidak ditemukan' }, { status: 404 });

    const currentMitra = foundMitra[0];
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (reqBranchId ? Number(reqBranchId) : null);

    // Filter Branch ID
    const groupConds = [eq(addonCategories.mitra_id, currentMitra.id)];
    const itemConds = [eq(addons.mitra_id, currentMitra.id), isNull(addons.deletedAt)];
    
    if (finalBranchId) {
      groupConds.push(eq(addonCategories.branch_id, finalBranchId));
      itemConds.push(eq(addons.branch_id, finalBranchId));
    } else {
      groupConds.push(isNull(addonCategories.branch_id));
      itemConds.push(isNull(addons.branch_id));
    }

    const [dbAddonCategories, dbAddons] = await Promise.all([
      db.select().from(addonCategories).where(and(...groupConds)), 
      db.select().from(addons).where(and(...itemConds)) 
    ]);

    return NextResponse.json({ success: true, groups: dbAddonCategories, items: dbAddons });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (body.branch_id ? Number(body.branch_id) : null);

    if (body.type === 'group') {
      await db.insert(addonCategories).values({
        mitra_id: Number(payload.mitraId),
        branch_id: finalBranchId, 
        name: body.name,
        isRequired: Number(body.isRequired) || 0,
        maxSelected: Number(body.maxSelected) || 1,
        createdAt: new Date()
      });
    } else {
      await db.insert(addons).values({
        mitra_id: Number(payload.mitraId),
        branch_id: finalBranchId, 
        name: body.name,
        price: String(body.price),
        category_id: Number(body.groupId),
        stock: Number(body.stock) || 0,
        is_track_stock: body.isTrackStock === '1',
        createdAt: new Date()
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal menambah data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (body.branch_id ? Number(body.branch_id) : null);
    
    if (body.type === 'group') {
      const conds = [eq(addonCategories.id, Number(body.id)), eq(addonCategories.mitra_id, Number(payload.mitraId))];
      if (finalBranchId) conds.push(eq(addonCategories.branch_id, finalBranchId));
      else conds.push(isNull(addonCategories.branch_id));

      await db.update(addonCategories).set({
        name: body.name,
        isRequired: Number(body.isRequired) || 0,
        maxSelected: Number(body.maxSelected) || 1,
      }).where(and(...conds));
    } else {
      const conds = [eq(addons.id, Number(body.id)), eq(addons.mitra_id, Number(payload.mitraId))];
      if (finalBranchId) conds.push(eq(addons.branch_id, finalBranchId));
      else conds.push(isNull(addons.branch_id));

      await db.update(addons).set({
        name: body.name,
        price: String(body.price),
        category_id: Number(body.groupId),
        stock: Number(body.stock) || 0,
        is_track_stock: body.isTrackStock === '1',
      }).where(and(...conds));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal update data' }, { status: 500 });
  }
}