import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema'; // Sesuaikan tabel Anda
import { and, eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026');

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    // Cari user di database yang role-nya adalah 'superadmin' (atau 'admin')
    const [adminUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.role, 'Superadmin'), // Pastikan role ini cocok dengan data Anda
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (!adminUser) {
      return NextResponse.json({ success: false, message: 'Kredensial tidak valid atau akun bukan Superadmin.' }, { status: 401 });
    }

    // Verifikasi password (asumsi menggunakan bcrypt)
    const isPasswordMatch = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ success: false, message: 'Kredensial tidak valid.' }, { status: 401 });
    }

    // Buat JWT Token
    const token = await new SignJWT({ 
        userId: adminUser.id, 
        role: adminUser.role,
        email: adminUser.email 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h') // Token berlaku 12 jam
      .sign(SECRET_KEY);

    // Set Cookie
    const response = NextResponse.json({ success: true, message: 'Login berhasil.' });
    response.cookies.set({
      name: 'ekasir_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 jam dalam hitungan detik
    });

    return response;
  } catch (error) {
    console.error('Superadmin Login Error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}