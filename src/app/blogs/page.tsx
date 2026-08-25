import { db } from '@/db';
import { posts } from '@/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Calendar, ChevronRight, FileText, Store } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog & Berita | Kaloo POS',
  description: 'Informasi terbaru, tips bisnis, dan panduan penggunaan sistem kasir.',
};

export default async function BlogIndexPage() {
  const allPosts = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.is_published, true),
        isNull(posts.deletedAt)
      )
    )
    .orderBy(desc(posts.publishedAt));

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Kaloo <span className="text-blue-600">Blog</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link href="/blog" className="text-blue-600 font-semibold">Artikel</Link>
            <Link href="/#fitur" className="hover:text-blue-600 transition-colors">Fitur</Link>
            <Link href="/#paket" className="hover:text-blue-600 transition-colors">Harga</Link>
          </nav>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 pb-20">
        
        {/* HEADER STANDAR KONTEN */}
        <div className="bg-gray-50 border-b border-gray-200 pt-16 pb-12 mb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Blog & Berita</h1>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
              Temukan informasi terbaru seputar pembaruan sistem, tips mengelola bisnis F&B, dan berbagai panduan bermanfaat lainnya.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* STATE KOSONG */}
          {allPosts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-300 rounded-lg bg-gray-50">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">Belum ada artikel</h2>
              <p className="text-gray-500 mt-1">Artikel akan segera ditambahkan.</p>
            </div>
          ) : (
            /* GRID ARTIKEL KLASIK */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allPosts.map((post) => (
                <article 
                  key={post.id} 
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
                >
                  {/* Thumbnail Gambar */}
                  <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] bg-gray-100 overflow-hidden relative border-b border-gray-100">
                    {post.image ? (
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <FileText className="w-10 h-10" />
                      </div>
                    )}
                  </Link>

                  {/* Konten Teks */}
                  <div className="p-6 flex flex-col flex-1">
                    
                    {/* Meta Data */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                      </div>
                    </div>

                    {/* Judul */}
                    <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 text-sm line-clamp-3 mb-6 flex-1">
                      {post.excerpt || 'Baca selengkapnya untuk mengetahui detail pembahasan artikel ini.'}
                    </p>

                    {/* Tombol Baca */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Baca Selengkapnya <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4 opacity-90 hover:opacity-100">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={32} 
                    height={32} 
                    className="object-contain"
                  />
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