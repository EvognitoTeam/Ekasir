import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema'; 
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import crypto from 'crypto'; 
import bcrypt from 'bcryptjs'; // 🔴 Tambahan untuk hash password

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

    const data = await db.select()
      .from(users)
      .where(
        and(
          eq(users.mitra_id, Number(payload.mitraId)),
          isNull(users.deletedAt),
          inArray(users.role, ['Owner', 'Cashier', 'Kitchen'])
        )
      )
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
    const { name, email, role } = body;

    const allowedRoles = ['Owner', 'Cashier', 'Kitchen'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, message: 'Role tidak valid!' }, { status: 400 });
    }

    if (!name || !email) {
      return NextResponse.json({ success: false, message: 'Nama dan Email wajib diisi!' }, { status: 400 });
    }

    // 🔴 1. Generate Token UUID untuk QR Code POS
    const generatedToken = crypto.randomUUID();

    // 🔴 2. Ekstrak password default dari email (sebelum huruf @)
    const rawPassword = email.split('@')[0];
    
    // 🔴 3. Hash password agar aman di database
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Insert ke Database
    await db.insert(users).values({
      mitra_id: Number(payload.mitraId),
      name: name,
      email: email,            // Masukkan email asli
      password: hashedPassword, // Masukkan password yang sudah di-hash
      role: role,              
      token: generatedToken,   
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Karyawan berhasil ditambahkan!',
      data: {
        name: name,
        email: email,
        role: role,
        token: generatedToken,
        defaultPassword: rawPassword // Kirim balik untuk notif di frontend
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

    await db.update(users).set({ deletedAt: new Date() })
      .where(and(eq(users.id, Number(id)), eq(users.mitra_id, Number(payload.mitraId))));

    return NextResponse.json({ success: true, message: 'Akses karyawan dicabut!' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal menghapus staf' }, { status: 500 });
  }
}