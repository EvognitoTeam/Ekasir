import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, tableList } from '@/db/schema'; 
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const code = searchParams.get('code');
  const branchId = searchParams.get('branch_id'); // 🔴 Tangkap branch

  if (!slug || !code) {
    return NextResponse.json({ success: false, message: 'Slug dan Code diperlukan' }, { status: 400 });
  }

  try {
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    
    const mitraId = foundMitra[0].id;
    const conds = [eq(tableList.mitra_id, mitraId), eq(tableList.table_code, code)];
    
    if (branchId) conds.push(eq(tableList.branch_id, Number(branchId))); // 🔴 Filter

    const foundTable = await db.select().from(tableList).where(and(...conds)).limit(1);

    if (foundTable.length > 0) {
      return NextResponse.json({ success: true, data: foundTable[0] });
    }

    return NextResponse.json({ success: false, message: 'Meja tidak ditemukan' }, { status: 404 });

  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}