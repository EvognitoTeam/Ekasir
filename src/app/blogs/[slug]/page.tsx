import { db } from '@/db';
import { posts } from '@/db/schema';
import { and, eq, isNull, ne, desc, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Calendar, ArrowLeft, User, ChevronRight, Store, Eye } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

// Import komponen Client untuk tombol share
import ShareButtons from '@/components/kalooadm/ShareButtons';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 1. GENERATE METADATA UNTUK SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.is_published, true), isNull(posts.deletedAt)))
    .limit(1);

  if (!post) return { title: 'Artikel Tidak Ditemukan' };

  return {
    title: `${post.title} | Blog Kaloo POS`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || '',
      type: 'article',
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  // 2. FETCH ARTIKEL SAAT INI
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.is_published, true), isNull(posts.deletedAt)))
    .limit(1);

  if (!post) notFound();

  // 3. Increment Jumlah Views (Update ke Database)
  await db
    .update(posts)
    .set({ views: sql`${posts.views} + 1` })
    .where(eq(posts.id, post.id));

  // Menyiapkan variabel view agar langsung ter-update di layar pembaca
  const currentViews = (post.views || 0) + 1;

  // 4. FETCH ARTIKEL LAINNYA (Mengecualikan artikel yang sedang dibaca)
  const otherPosts = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.is_published, true),
        isNull(posts.deletedAt),
        ne(posts.id, post.id)
      )
    )
    .orderBy(desc(posts.publishedAt))
    .limit(3);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Kaloo <span className="text-blue-600">Blog</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link href="/blog" className="text-blue-600 font-semibold">Artikel</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Fitur</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Harga</Link>
          </nav>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
          
          {/* Breadcrumb / Navigasi Kembali */}
          <div className="mb-8">
            <Link 
              href="/blog"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Semua Artikel
            </Link>
          </div>

          {/* Header Artikel */}
          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-gray-900">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 border-y border-gray-100 py-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Admin Kaloo POS</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
              
              {/* Indikator Jumlah Views */}
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <Eye className="w-4 h-4" />
                <span>{currentViews.toLocaleString('id-ID')}x dibaca</span>
              </div>
            </div>
          </header>

          {/* Gambar Utama (Hero Image) */}
          {post.image && (
            <figure className="mb-12">
              <img 
                src={post.image} 
                alt={post.title} 
                className="w-full h-auto max-h-[450px] object-cover rounded-xl border border-gray-200 shadow-sm" 
              />
            </figure>
          )}

          {/* Konten Artikel (Quill JS Output) */}
          <div 
            className="prose prose-lg prose-blue max-w-none prose-img:rounded-xl prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-headings:font-bold prose-p:text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* FOOTER ARTIKEL: Tombol Share/Copy */}
          <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 mb-1">Bagikan artikel ini</p>
              <p className="text-sm text-gray-500">Berikan wawasan ini kepada tim atau rekan bisnis Anda.</p>
            </div>
            
            {/* Komponen Client ShareButtons */}
            <ShareButtons title={post.title} slug={post.slug} />
          </div>
        </article>

        {/* ================= ARTIKEL LAINNYA (RELATED POSTS) ================= */}
        {otherPosts.length > 0 && (
          <section className="bg-gray-50 border-t border-gray-200 py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Baca Juga Artikel Lainnya</h2>
                <Link href="/blog" className="hidden sm:inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {otherPosts.map((other) => (
                  <Link 
                    key={other.id} 
                    href={`/blog/${other.slug}`}
                    className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 group"
                  >
                    <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative border-b border-gray-100">
                      {other.image ? (
                        <img 
                          src={other.image} 
                          alt={other.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Store className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-xs text-gray-500 mb-2">
                        {other.publishedAt ? new Date(other.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {other.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mt-auto">
                        {other.excerpt || 'Klik untuk membaca selengkapnya.'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              
              <div className="mt-8 text-center sm:hidden">
                <Link href="/blog" className="inline-flex items-center text-sm font-semibold text-blue-600">
                  Lihat Semua Artikel <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4 opacity-90 hover:opacity-100">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-white">Kaloo POS</span>
              </Link>
              <p className="text-sm max-w-sm leading-relaxed">
                Platform manajemen bisnis dan Point of Sales (POS) terbaik untuk membantu UMKM, kafe, dan restoran berkembang lebih cepat.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Tautan</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Beranda</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog & Update</Link></li>
                {/* <li><Link href="#" className="hover:text-white transition-colors">Harga SaaS</Link></li> */}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Bantuan</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Pusat Bantuan</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Hubungi Kami</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Kebijakan Privasi</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between text-xs">
            <p>&copy; {new Date().getFullYear()} Kaloo POS / Evognito. Hak Cipta Dilindungi.</p>
            <p className="mt-2 md:mt-0">Dibuat dengan ❤️ oleh Evognito Team</p>
          </div>
        </div>
      </footer>

    </div>
  );
}