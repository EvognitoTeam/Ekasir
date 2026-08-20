import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return String(payload.role ?? '').trim().toLowerCase() === 'superadmin';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Buat nama unik berformat .webp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}.webp`;
    
    const uploadDir = path.join(process.cwd(), 'public/uploads/blog');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Direktori sudah ada
    }

    const filepath = path.join(uploadDir, filename);

    // 🔴 PROSES KOMPRESI MENGGUNAKAN SHARP & KONVERSI KE WEBP
    await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Batasi lebar maks 1200px agar tidak boros server
      .webp({ quality: 80 }) // Kompres kualitas ke 80% (sangat tajam tapi ukuran file sangat kecil)
      .toFile(filepath);

    // URL akses publik
    const fileUrl = `/uploads/blog/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Compression & Upload Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses dan mengunggah gambar.' }, { status: 500 });
  }
}