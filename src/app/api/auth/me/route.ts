import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function GET(request: Request) {
  try {
    // 1. Ambil slug dari URL request (URL katalog saat ini)
    const { searchParams } = new URL(request.url);
    const urlSlug = searchParams.get('slug');

    const cookieStore = await cookies(); 
    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Tidak ada sesi aktif' }, { status: 401 });
    }

    // 2. Dekripsi & verifikasi JWT
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // 3. 🔴 PROTEKSI MULTI-TENANT: Cek apakah slug di URL sama dengan slug hak milik akun di JWT
    // Jika user adalah 'Owner' atau 'Cashier', mereka WAJIB berada di bawah slug toko mereka sendiri.
    // Jika perannya adalah 'User' biasa (pelanggan), boleh dilewati karena pelanggan bisa belanja di banyak toko.
    if (payload.role !== 'User' && payload.slug !== urlSlug) {
      return NextResponse.json({ 
        success: false, 
        message: 'Akses ditolak. Sesi Anda tidak terdaftar di toko ini.' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: payload.name,
        role: payload.role
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Sesi tidak valid' }, { status: 401 });
  }
}