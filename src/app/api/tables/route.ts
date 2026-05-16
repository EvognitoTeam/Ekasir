import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, tableList } from '@/db/schema'; // Sesuaikan import 'tables' dengan skema kamu
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const code = searchParams.get('code');

  if (!slug || !code) {
    return NextResponse.json({ success: false, message: 'Slug dan Code diperlukan' }, { status: 400 });
  }

  try {
    // 1. Cari Mitra
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    const mitraId = foundMitra[0].id;

    // 2. Cari Meja berdasarkan mitra_id dan table_code
    const foundTable = await db.select()
      .from(tableList)
      .where(
        and(
          eq(tableList.mitra_id, mitraId),
          eq(tableList.table_code, code) // Sesuaikan nama kolom table_code kamu
        )
      )
      .limit(1);

    if (foundTable.length > 0) {
        console.log(foundTable[0]);
      return NextResponse.json({ success: true, data: foundTable[0] });
    }

    return NextResponse.json({ success: false, message: 'Meja tidak ditemukan' }, { status: 404 });

  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}