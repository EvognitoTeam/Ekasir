import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

// Helper verifikasi superadmin (sesuaikan dengan struktur token superadmin Anda)
async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value; // Atau cookie superadmin jika berbeda
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    // Sesuaikan role check dengan sistem superadmin Anda (misal: payload.role === 'Superadmin')
    return payload;
  } catch {
    return false;
  }
}

// GET: Ambil semua list post untuk superadmin
export async function GET() {
  try {
    const auth = await verifySuperadmin();
    if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const allPosts = await db
      .select()
      .from(posts)
      .where(isNull(posts.deletedAt))
      .orderBy(desc(posts.createdAt));

    return NextResponse.json({ success: true, data: allPosts });
  } catch (error) {
    console.error('Superadmin GET Posts Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Buat artikel baru
export async function POST(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, slug, content, excerpt, image, is_published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ success: false, message: 'Judul, slug, dan konten wajib diisi.' }, { status: 400 });
    }

    await db.insert(posts).values({
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      content,
      excerpt: excerpt || '',
      image: image || null,
      is_published: Boolean(is_published),
      publishedAt: is_published ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Artikel berhasil dibuat' });
  } catch (error) {
    console.error('Superadmin POST Post Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal membuat artikel (Slug mungkin sudah digunakan).' }, { status: 400 });
  }
}

// PUT: Update artikel
export async function PUT(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ success: false, message: 'ID artikel dibutuhkan' }, { status: 400 });

    const body = await request.json();
    const { title, slug, content, excerpt, image, is_published } = body;

    // Ambil status publikasi lama untuk cek apakah perlu update tanggal publish
    const [existing] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

    await db.update(posts).set({
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      content,
      excerpt: excerpt || '',
      image: image || null,
      is_published: Boolean(is_published),
      publishedAt: is_published && !existing?.publishedAt ? new Date() : existing?.publishedAt,
      updatedAt: new Date(),
    }).where(eq(posts.id, id));

    return NextResponse.json({ success: true, message: 'Artikel berhasil diperbarui' });
  } catch (error) {
    console.error('Superadmin PUT Post Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui artikel' }, { status: 400 });
  }
}

// DELETE: Hapus artikel (Soft delete)
export async function DELETE(request: Request) {
  try {
    const auth = await verifySuperadmin();
    if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ success: false, message: 'ID artikel dibutuhkan' }, { status: 400 });

    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id));

    return NextResponse.json({ success: true, message: 'Artikel berhasil dihapus' });
  } catch (error) {
    console.error('Superadmin DELETE Post Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus artikel' }, { status: 500 });
  }
}