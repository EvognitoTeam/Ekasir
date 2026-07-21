import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, mitra } from '@/db/schema'; 
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import crypto from 'crypto'; 
import bcrypt from 'bcryptjs'; 
import { generateUniqueMemberId } from '@/lib/member/memberId';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const conditions = [
      eq(users.mitra_id, Number(payload.mitraId)),
      isNull(users.deletedAt),
      inArray(users.role, ['Owner', 'Cashier', 'Kitchen'])
    ];

    // 🔴 Filter berdasarkan cabang jika dia bukan Owner pusat
    if (payload.branchId) {
      conditions.push(eq(users.branch_id, Number(payload.branchId)));
    }

    const data = await db.select()
      .from(users)
      .where(and(...conditions))
      .orderBy(users.createdAt);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET Staff Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, role, branch_id } = body;

    const allowedRoles = ['Owner', 'Cashier', 'Kitchen'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, message: 'Role tidak valid!' }, { status: 400 });
    }

    if (!name || !email) {
      return NextResponse.json({ success: false, message: 'Nama dan Email wajib diisi!' }, { status: 400 });
    }

    // 🔴 Tentukan branch_id
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (branch_id ? Number(branch_id) : null);

    const generatedToken = crypto.randomUUID();
    const rawPassword = email.split('@')[0];
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const [currentMitra] = await db
      .select({ name: mitra.mitra_name })
      .from(mitra)
      .where(eq(mitra.id, Number(payload.mitraId)))
      .limit(1);

    if (!currentMitra) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }

    const memberId = await generateUniqueMemberId(db, currentMitra.name);

    await db.insert(users).values({
      mitra_id: Number(payload.mitraId),
      branch_id: finalBranchId, // 🔴 Masukkan branch_id
      name: name,
      email: email,            
      password: hashedPassword, 
      memberId,
      role: role,              
      token: generatedToken,   
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Karyawan berhasil ditambahkan!',
      data: {
        name, email, role, memberId, token: generatedToken, defaultPassword: rawPassword 
      }
    });
  } catch (error) {
    console.error("POST Staff Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal membuat staf, mungkin email sudah terdaftar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: 'ID Karyawan dibutuhkan' }, { status: 400 });

    const conditions = [
      eq(users.id, Number(id)),
      eq(users.mitra_id, Number(payload.mitraId))
    ];

    if (payload.branchId) {
      conditions.push(eq(users.branch_id, Number(payload.branchId)));
    }

    await db.update(users).set({ deletedAt: new Date() })
      .where(and(...conditions));

    return NextResponse.json({ success: true, message: 'Akses karyawan dicabut!' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal menghapus staf' }, { status: 500 });
  }
}