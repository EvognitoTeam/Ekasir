import { NextResponse } from 'next/server';
import { db } from '@/db'; // Path database Drizzle kamu
import { mitra, users, settings } from '@/db/schema'; // Path skema kamu
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateUniqueMemberId } from '@/lib/member/memberId';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessName, tagline, address, ownerName, email, password } = body;

    // 1. Validasi Input Dasar
    if (!businessName || !address || !ownerName || !email || !password) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    // 2. Cek apakah Email sudah pernah digunakan
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return NextResponse.json({ success: false, message: 'Email sudah terdaftar. Gunakan email lain.' }, { status: 400 });
    }

    // 3. Generate "Slug" dengan format underscore (_)
    let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
    let slugToSave = baseSlug;

    // Proteksi jika ada nama slug kembar di database
    const existingMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slugToSave)).limit(1);
    if (existingMitra.length > 0) {
      slugToSave = `${baseSlug}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 4. Enkripsi Kata Sandi (Hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Generate Token Unik untuk User
    const userToken = crypto.randomUUID();

    // 6. Jalankan Database Transaction (Aman & Sinkron)
    await db.transaction(async (tx) => {
      
      // LANGKAH 1: Masukkan data ke tabel Mitra terlebih dahulu
      const [mitraResult] = await tx.insert(mitra).values({
        mitra_slug: slugToSave,
        mitra_name: businessName,
        mitra_address: address,
        mitra_welcome: tagline || null,
        createdAt: new Date()
      });

      // Ambil ID Mitra yang baru saja digenerate oleh MySQL
      const newMitraId = mitraResult.insertId;

      const memberId = await generateUniqueMemberId(tx, businessName);

      // LANGKAH 2: Masukkan data ke tabel User menggunakan mitra_id dari Langkah 1
      await tx.insert(users).values({
        name: ownerName,
        email: email,
        password: hashedPassword,
        memberId,
        mitra_id: newMitraId,
        role: 'Owner', // Default 'Owner' sesuai spesifikasi kamu
        token: userToken,
        createdAt: new Date()
      });

      await tx.insert(settings).values({
        mitraId: newMitraId,
        createdAt: new Date()
      });
      
    });

    // Kembalikan response sukses beserta slug untuk pengalihan ke /slug/cashier di frontend
    return NextResponse.json({ 
      success: true, 
      message: 'Registrasi akun bisnis berhasil',
      slug: slugToSave 
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Register Transaction Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan pada server saat memproses pendaftaran.' 
    }, { status: 500 });
  }
}