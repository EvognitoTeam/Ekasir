"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Edit3, Trash2, Eye, EyeOff, Save, Loader2, BookOpen, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Toast } from '@/utils/toast';
import 'react-quill-new/dist/quill.snow.css'; // Import CSS bawaan langsung di sini

// Render dinamis agar tidak error saat Server-Side Rendering (SSR) di Next.js
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-2xl border border-stone-200 bg-stone-50" />,
});

// Konfigurasi Toolbar Quill
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ],
};

export default function BlogManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State navigasi tampilan
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/posts');
      const json = await res.json();
      if (json.success) setPosts(json.data);
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Gagal memuat artikel' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost.title || !currentPost.slug || !currentPost.content) {
      Toast.fire({ icon: 'error', title: 'Judul, slug, dan konten wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const method = currentPost.id ? 'PUT' : 'POST';
      const url = currentPost.id ? `/api/superadmin/posts?id=${currentPost.id}` : '/api/superadmin/posts';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPost),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      Toast.fire({ icon: 'success', title: json.message });
      setViewMode('list');
      setCurrentPost(null);
      fetchPosts();
    } catch (err: any) {
      Toast.fire({ icon: 'error', title: err.message || 'Terjadi kesalahan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus artikel ini?')) return;
    try {
      const res = await fetch(`/api/superadmin/posts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      Toast.fire({ icon: 'success', title: 'Artikel dihapus' });
      fetchPosts();
    } catch (err: any) {
      Toast.fire({ icon: 'error', title: err.message || 'Gagal menghapus' });
    }
  };

  // -----------------------------------------------------
  // RENDER TAMPILAN EDITOR (FULL LAYOUT)
  // -----------------------------------------------------
  if (viewMode === 'editor' && currentPost) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
        
        {/* Header Navigasi Editor */}
        <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] border border-stone-200 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewMode('list'); setCurrentPost(null); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display text-lg font-black text-stone-900">
                {currentPost.id ? 'Edit Artikel' : 'Tulis Artikel Baru'}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-0.5">Blog Editor</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            Simpan & Terbitkan
          </button>
        </div>

        {/* Area Form Editor */}
        <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kolom Kiri: Metadata Artikel */}
            <div className="space-y-6 lg:col-span-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Judul Artikel</label>
                <input
                  type="text"
                  value={currentPost.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    setCurrentPost({ ...currentPost, title, slug });
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm font-bold text-stone-800 outline-none focus:border-[var(--color-primary)]"
                  placeholder="Masukkan judul menarik..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Slug URL (Otomatis)</label>
                <input
                  type="text"
                  value={currentPost.slug}
                  onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                  className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3.5 text-xs font-mono text-stone-500 outline-none"
                  placeholder="contoh-slug-artikel"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Ringkasan (Excerpt SEO)</label>
                <textarea
                  rows={4}
                  value={currentPost.excerpt}
                  onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 outline-none focus:border-[var(--color-primary)]"
                  placeholder="Tulis 1-2 kalimat menarik untuk SEO dan preview..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Cover Image URL</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={currentPost.image || ''}
                    onChange={(e) => setCurrentPost({ ...currentPost, image: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm text-stone-800 outline-none focus:border-[var(--color-primary)]"
                    placeholder="https://..."
                  />
                </div>
                {currentPost.image && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-stone-200 h-32 bg-stone-100">
                    <img src={currentPost.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-stone-800">Status Publikasi</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Tampilkan di halaman publik?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={currentPost.is_published}
                    onChange={(e) => setCurrentPost({ ...currentPost, is_published: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            </div>

            {/* Kolom Kanan: Rich Text Editor Quill */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Konten Artikel</label>
              <div className="rounded-2xl border border-stone-200 overflow-hidden focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
                <ReactQuill 
                  theme="snow" 
                  value={currentPost.content} 
                  onChange={(content) => setCurrentPost({ ...currentPost, content })}
                  modules={quillModules}
                  placeholder="Mulai menulis cerita Anda di sini..."
                  className="bg-white [&_.ql-editor]:min-h-[500px] [&_.ql-editor]:text-base [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-stone-200 [&_.ql-container]:border-none"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // RENDER TAMPILAN DAFTAR ARTIKEL (LIST)
  // -----------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm">
        <div>
          <h2 className="font-display text-xl font-black text-stone-900">Kelola Blog & Artikel</h2>
          <p className="text-xs text-stone-500 mt-0.5">Terbitkan wawasan dan informasi publik ke halaman /blog.</p>
        </div>
        <button
          onClick={() => {
            setCurrentPost({ title: '', slug: '', excerpt: '', content: '', image: '', is_published: true });
            setViewMode('editor');
          }}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tulis Artikel
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-stone-300 mb-3" />
            <p className="text-sm font-bold uppercase tracking-widest text-stone-500">Belum ada artikel</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {posts.map((post) => (
              <div key={post.id} className="p-5 flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${post.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {post.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">/blog/{post.slug}</span>
                  </div>
                  <h3 className="font-display text-base font-black text-stone-900 truncate">{post.title}</h3>
                  <p className="text-xs text-stone-500 truncate mt-0.5">{post.excerpt || 'Tanpa ringkasan'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setCurrentPost(post); setViewMode('editor'); }}
                    className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}