import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, mitra } from '@/db/schema'; 
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { generateUniqueMemberId } from '@/lib/member/memberId';

// Kunci rahasia untuk enkripsi JWT
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, slug } = body; // 'slug' sekarang bersifat opsional di request body

    // 1. Validasi Input Utama
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan kata sandi wajib diisi' }, 
        { status: 400 }
      );
    }

    // 2. Cari User berdasarkan Email terlebih dahulu
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (foundUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak terdaftar. Silakan periksa kembali email Anda.' }, 
        { status: 401 }
      );
    }

    const user = foundUsers[0];

    // 3. Verifikasi Password dengan Bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Password salah' }, 
        { status: 401 }
      );
    }

    // 4. Ambil data Mitra berdasarkan mitra_id milik user untuk mendapatkan slug aslinya
    const foundMitra = await db
      .select()
      .from(mitra)
      .where(eq(mitra.id, user.mitra_id))
      .limit(1);

    if (foundMitra.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Toko/Mitra tidak ditemukan untuk akun ini' }, 
        { status: 404 }
      );
    }

    const currentMitra = foundMitra[0];

    // Akun lama akan memperoleh member ID saat login pertama setelah migrasi.
    let memberId = user.memberId;
    if (!memberId) {
      memberId = await generateUniqueMemberId(db, currentMitra.mitra_name);
      await db.update(users)
        .set({ memberId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    // 5. PROTEKSI MULTI-TENANT
    // Jika login dilakukan dari halaman spesifik toko (slug ada), pastikan kecocokannya.
    // Aturan ini dikecualikan untuk role 'User' biasa (pelanggan) agar bisa fleksibel bertransaksi.
    if (slug && currentMitra.mitra_slug !== slug && user.role !== 'User') {
      return NextResponse.json(
        { success: false, message: 'Akun Anda tidak terdaftar sebagai staf di toko ini.' }, 
        { status: 403 }
      );
    }

    // 6. Buat JWT dengan menyertakan slug asli dari database
    const token = await new SignJWT({
      userId: user.id,
      mitraId: user.mitra_id,
      slug: currentMitra.mitra_slug, 
      role: user.role,
      name: user.name,
      email: user.email,
      memberId,
      branchId: user.branch_id ?? null
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Sesi aktif selama 7 hari
      .sign(SECRET_KEY);

    // 7. Buat Objek Response (Sertakan properti slug untuk kebutuhan redirect frontend global)
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mitra_id: user.mitra_id,
        memberId,
        branchId: user.branch_id ?? null,
        branch_id: user.branch_id ?? null,
        slug: currentMitra.mitra_slug // Dikembalikan agar LoginView global tahu arah redirect
      }
    });

    // 8. Suntikkan JWT ke dalam HTTP-Only Cookie browser
    response.cookies.set('ekasir_session', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      maxAge: 60 * 60 * 24 * 7, 
      path: '/', 
    });

    return response;

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' }, 
      { status: 500 }
    );
  }
}