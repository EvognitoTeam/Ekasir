import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateUniqueMemberId } from '@/lib/member/memberId';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, slug } = body;

    // 1. Validasi Input Dasar
    if (!name || !email || !password || !slug) {
      return NextResponse.json(
        { success: false, message: 'Data tidak lengkap. Mohon isi kolom wajib.' }, 
        { status: 400 }
      );
    }

    // 2. Cari Mitra ID berdasarkan slug dari URL toko
    const existingMitra = await db
      .select()
      .from(mitra)
      .where(eq(mitra.mitra_slug, slug))
      .limit(1);

    if (existingMitra.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Toko/Mitra tidak ditemukan.' }, 
        { status: 404 }
      );
    }

    const targetMitra = existingMitra[0];
    const mitraId = targetMitra.id;

    // 3. Cek duplikasi HANYA pada Email di dalam 1 Mitra yang sama
    // Jika daftar di Mitra B dengan email yang sama seperti di Mitra A, tetap diizinkan.
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.mitra_id, mitraId),
          eq(users.email, email)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Email sudah terdaftar di toko ini. Silakan gunakan email lain atau masuk akun.' }, 
        { status: 400 }
      );
    }

    // 4. Enkripsi Kata Sandi (Hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Generate Token Unik untuk Sesi Customer
    const userToken = crypto.randomUUID();

    // 6. Jalankan Database Transaction (Aman & Sinkron)
    await db.transaction(async (tx) => {
      
      // Generate ID Member unik menggunakan nama bisnis mitra
      const memberId = await generateUniqueMemberId(tx, targetMitra.mitra_name);

      // Masukkan data ke tabel User sebagai pelanggan
      await tx.insert(users).values({
        name: name,
        email: email,
        phone: phone || null, // Telepon disimpan, tapi tidak divalidasi keunikannya
        password: hashedPassword,
        memberId: memberId,
        mitra_id: mitraId,
        role: 'User', // Role default untuk pelanggan
        token: userToken,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Registrasi pelanggan berhasil'
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Register Customer Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan pada server saat memproses pendaftaran.' 
    }, { status: 500 });
  }
}