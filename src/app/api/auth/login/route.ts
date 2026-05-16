import { NextResponse } from 'next/server';
import { db } from '@/db';
// 🔴 1. Pastikan meng-import tabel 'mitra' (sesuaikan namanya dengan schema kamu)
import { users, mitra } from '@/db/schema'; 
// 🔴 2. Import 'and' untuk mengecek banyak kondisi sekaligus
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
    // 🔴 INI ADALAH INTI KEAMANAN MULTI-TENANT
    const foundUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          // Sesuaikan 'mitraId' ini dengan penamaan di schema.ts kamu (mitraId atau mitra_id)
          eq(users.mitra_id, currentMitra.id) 
        )
      )
      .limit(1);

    // Jika array kosong, berarti email tersebut tidak terdaftar di toko ini
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

    // 5. Kembalikan data sukses
    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mitra_id: user.mitra_id // (Opsional) Mengirimkan mitra ID ke frontend
      }
    });

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' }, 
      { status: 500 }
    );
  }
}