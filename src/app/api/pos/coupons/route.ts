import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import crypto from 'crypto';

import { db } from '@/db';
import { branches, coupon, couponBranches } from '@/db/schema';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026');
export const dynamic = 'force-dynamic';

type AuthPayload = { role?: string; mitraId?: number | string; branchId?: number | string | null };

async function getAuthPayload(): Promise<AuthPayload | null> {
  const token = (await cookies()).get('ekasir_session')?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, SECRET_KEY)).payload as AuthPayload; } catch { return null; }
}

async function resolveBranchIds(payload: AuthPayload, requested: unknown): Promise<number[]> {
  if (payload.branchId) return [Number(payload.branchId)];
  if (!Array.isArray(requested)) return [];
  const ids = [...new Set(requested.map(Number).filter(Number.isInteger))];
  if (ids.length === 0) return [];
  const valid = await db.select({ id: branches.id }).from(branches).where(and(
    eq(branches.mitra_id, Number(payload.mitraId)),
    inArray(branches.id, ids),
    isNull(branches.deletedAt),
  ));
  if (valid.length !== ids.length) throw new Error('Salah satu cabang tidak valid');
  return ids;
}

async function attachBranchIds(rows: Array<typeof coupon.$inferSelect>) {
  if (rows.length === 0) return [];
  const mappings = await db.select().from(couponBranches).where(inArray(couponBranches.coupon_id, rows.map((row) => row.id)));
  const map = new Map<number, number[]>();
  for (const item of mappings) map.set(item.coupon_id, [...(map.get(item.coupon_id) || []), item.branch_id]);
  return rows.map((row) => ({ ...row, branch_ids: map.get(row.id) || [] }));
}

// Fungsi helper untuk generate kode acak
function generateRandomCode(prefix: string) {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  return `${prefix}${suffix}`;
}

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User' || !payload.mitraId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    let rows = await db.select().from(coupon).where(and(eq(coupon.mitra_id, Number(payload.mitraId)), isNull(coupon.deletedAt))).orderBy(coupon.id);
    let data = await attachBranchIds(rows);
    if (payload.branchId) {
      const branchId = Number(payload.branchId);
      data = data.filter((item) => item.branch_ids.length === 0 || item.branch_ids.includes(branchId));
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET Coupons Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User' || !payload.mitraId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const branchIds = await resolveBranchIds(payload, body.branch_ids);
    
    const isClaimable = Boolean(body.is_claimable);
    const bulkCount = Number(body.bulk_count) || 1;
    const campaignGroupId = isClaimable && bulkCount > 1 ? crypto.randomUUID() : null;
    const prefixOrCode = String(body.coupon_code).toUpperCase();

    // Persiapkan data dasar kupon
    const baseCouponData = {
      mitra_id: Number(payload.mitraId), 
      branch_id: null, 
      title: body.title, 
      description: body.description,
      is_member_only: Boolean(body.is_member_only),
      is_auto_apply: Boolean(body.is_auto_apply),
      applicable_items: Array.isArray(body.applicable_items) ? body.applicable_items : [],
      discount_rate: body.discount_rate || null, 
      discount_price: body.discount_price || null,
      max_use: Number(body.max_use) || 0, 
      already_used: 0,
      
      // Limit Pengguna Baru
      max_use_per_user: Number(body.max_use_per_user) || 0,
      daily_user_limit: Number(body.daily_user_limit) || 0,
      monthly_user_limit: Number(body.monthly_user_limit) || 0,
      yearly_user_limit: Number(body.yearly_user_limit) || 0,
      
      // Pengaturan Voucher Klaim
      is_claimable: isClaimable,
      valid_days_after_claim: Number(body.valid_days_after_claim) || 0,
      campaign_group_id: campaignGroupId,

      start_date: body.start_date ? new Date(body.start_date) : null,
      expired_date: body.expired_date ? new Date(body.expired_date) : null,
      createdAt: new Date(), 
      updatedAt: new Date(),
    };

    // Eksekusi Insert (Bisa 1 kupon, bisa bulk ratusan kupon)
    await db.transaction(async (tx) => {
       const generateCount = isClaimable ? bulkCount : 1;

       for (let i = 0; i < generateCount; i++) {
          const finalCode = isClaimable && bulkCount > 1 ? generateRandomCode(prefixOrCode) : prefixOrCode;
          
          const inserted = await tx.insert(coupon).values({
            ...baseCouponData,
            coupon_code: finalCode
          }).$returningId();
          
          const couponId = inserted[0]?.id;
          
          if (couponId && branchIds.length > 0) {
            await tx.insert(couponBranches).values(
              branchIds.map((branchId) => ({ coupon_id: couponId, branch_id: branchId }))
            );
          }
       }
    });

    return NextResponse.json({ success: true, message: isClaimable && bulkCount > 1 ? `${bulkCount} Voucher berhasil dicetak` : 'Promo berhasil dibuat' });
  } catch (error) {
    console.error('POST Coupon Error:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat promo' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User' || !payload.mitraId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ success: false, message: 'ID promo dibutuhkan' }, { status: 400 });
    
    const body = await request.json();
    const branchIds = await resolveBranchIds(payload, body.branch_ids);
    
    await db.update(coupon).set({
      branch_id: null, 
      title: body.title, 
      description: body.description,
      coupon_code: String(body.coupon_code).toUpperCase(), 
      is_member_only: Boolean(body.is_member_only),
      is_auto_apply: Boolean(body.is_auto_apply),
      applicable_items: Array.isArray(body.applicable_items) ? body.applicable_items : [],
      discount_rate: body.discount_rate || null, 
      discount_price: body.discount_price || null,
      max_use: Number(body.max_use) || 0,
      
      // Update Limit
      max_use_per_user: Number(body.max_use_per_user) || 0,
      daily_user_limit: Number(body.daily_user_limit) || 0,
      monthly_user_limit: Number(body.monthly_user_limit) || 0,
      yearly_user_limit: Number(body.yearly_user_limit) || 0,

      // Update Klaim (Hati-hati jika mode edit)
      is_claimable: Boolean(body.is_claimable),
      valid_days_after_claim: Number(body.valid_days_after_claim) || 0,

      start_date: body.start_date ? new Date(body.start_date) : null,
      expired_date: body.expired_date ? new Date(body.expired_date) : null,
      updatedAt: new Date(),
    }).where(and(eq(coupon.id, id), eq(coupon.mitra_id, Number(payload.mitraId)), isNull(coupon.deletedAt)));
    
    await db.delete(couponBranches).where(eq(couponBranches.coupon_id, id));
    
    if (branchIds.length > 0) {
      await db.insert(couponBranches).values(branchIds.map((branchId) => ({ coupon_id: id, branch_id: branchId })));
    }
    
    return NextResponse.json({ success: true, message: 'Promo berhasil diperbarui' });
  } catch (error) {
    console.error('PUT Coupon Error:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal memperbarui promo' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User' || !payload.mitraId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ success: false, message: 'ID promo dibutuhkan' }, { status: 400 });
    
    await db.update(coupon).set({ deletedAt: new Date() }).where(and(eq(coupon.id, id), eq(coupon.mitra_id, Number(payload.mitraId))));
    return NextResponse.json({ success: true, message: 'Promo berhasil dihapus' });
  } catch (error) {
    console.error('DELETE Coupon Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus promo' }, { status: 500 });
  }
}