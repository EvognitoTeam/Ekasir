import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, tableList } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug Toko diperlukan' }, { status: 400 });
  }

  try {
    // 1. Cari ID Mitra berdasarkan slug
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    const mitraId = foundMitra[0].id;

    // 2. Ambil semua meja milik mitra tersebut
    const tables = await db.select({
      id: tableList.id,
      table_code: tableList.table_code,
      table_name: tableList.table_name,
    })
    .from(tableList)
    .where(eq(tableList.mitra_id, mitraId))
    .orderBy(asc(tableList.table_code)); // Biar urut nomor mejanya

    return NextResponse.json({ 
      success: true, 
      data: tables 
    });

  } catch (error) {
    console.error("Error fetching tables for POS:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Gagal mengambil data meja' 
    }, { status: 500 });
  }
}