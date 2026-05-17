import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, mitra } from '@/db/schema'; 
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// 🔴 1. Import jose dan cookies
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// 🔴 2. Kunci rahasia untuk enkripsi JWT
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, slug } = body;

    // 1. Validasi Input Dasar
    if (!email || !password || !slug) {
      return NextResponse.json(
        { success: false, message: 'Data login tidak lengkap' }, 
        { status: 400 }
      );
    }

    // 2. Cari Mitra berdasarkan slug dari URL
    const foundMitra = await db
      .select()
      .from(mitra)
      .where(eq(mitra.mitra_slug, slug))
      .limit(1);

    if (foundMitra.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Toko/Mitra tidak ditemukan' }, 
        { status: 404 }
      );
    }

    const currentMitra = foundMitra[0];

    // 3. Cari User berdasarkan Email DAN Mitra ID
    const foundUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.mitra_id, currentMitra.id) 
        )
      )
      .limit(1);

    if (foundUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak terdaftar di toko ini. Silakan daftar terlebih dahulu.' }, 
        { status: 401 }
      );
    }

    const user = foundUsers[0];

    // 4. Verifikasi Password dengan Bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Password salah' }, 
        { status: 401 }
      );
    }

    // 🔴 5. Buat JWT (Session Data yang akan disimpan di Cookie)
    const token = await new SignJWT({
      userId: user.id,
      mitraId: user.mitra_id,
      slug: slug, // Sisipkan slug ke dalam session untuk identifikasi toko
      role: user.role,
      name: user.name,
      email: user.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Sesi aktif selama 7 hari
      .sign(SECRET_KEY);

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mitra_id: user.mitra_id 
      }
    });

    // 🔴 6. Suntikkan JWT ke dalam HTTP-Only Cookie browser
    response.cookies.set('ekasir_session', token, {
      httpOnly: true, // Tidak bisa diakses oleh JavaScript frontend (Anti-XSS)
      secure: process.env.NODE_ENV === 'production', // Wajib HTTPS di production
      sameSite: 'lax', // Anti-CSRF
      maxAge: 60 * 60 * 24 * 7, // 7 hari dalam format detik
      path: '/', // Cookie berlaku di seluruh halaman aplikasi
    });

    // 7. Kembalikan data sukses (Frontend tidak perlu menyimpan token ini, karena cookie sudah bekerja otomatis)
    return response;

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' }, 
      { status: 500 }
    );
  }
}