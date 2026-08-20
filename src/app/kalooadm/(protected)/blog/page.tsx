"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Edit3, Trash2, Eye, EyeOff, Save, Loader2, BookOpen, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-2xl border border-stone-200 bg-stone-50" />,
});

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [currentPost, setCurrentPost] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);


  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/posts');
      const json = await res.json();
      if (json.success) setPosts(json.data);
    } catch (err) {
      console.error('Gagal memuat artikel');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Fungsi universal untuk upload gambar ke server
  const uploadImageToServer = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/superadmin/upload', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Gagal upload');
    return json.url;
  };

  // Handler khusus untuk tombol gambar di dalam Quill Editor
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          alert('Mengunggah gambar ke server...');
          const url = await uploadImageToServer(file);
          
          const quill = quillRef.current?.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
        } catch (error) {
          alert('Gagal mengunggah gambar ke editor.');
        }
      }
    };
  };

  // Konfigurasi Toolbar Quill dengan kustomisasi image handler
  const quillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'blockquote', 'code-block', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
      },
    },
  };

  // Handler untuk Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const url = await uploadImageToServer(file);
      setCurrentPost({ ...currentPost, image: url });
    } catch (error) {
      alert('Gagal mengunggah cover image.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost.title || !currentPost.slug || !currentPost.content) {
      alert('Judul, slug, dan konten wajib diisi.');
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

      alert(json.message);
      setViewMode('list');
      setCurrentPost(null);
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Yakin ingin menghapus artikel "${title}"?`)) return;
    try {
      const res = await fetch(`/api/superadmin/posts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchPosts();
      else alert(json.message);
    } catch (err) {
      alert('Gagal menghapus artikel.');
    }
  };

  if (viewMode === 'editor' && currentPost) {
    return (
      <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] border border-stone-200 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewMode('list'); setCurrentPost(null); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-black text-stone-900">{currentPost.id ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h2>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-0.5">Blog Editor</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
          </button>
        </div>

        <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kolom Kiri: Metadata & Cover Upload */}
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
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm font-bold text-stone-800 outline-none focus:border-emerald-500"
                  placeholder="Masukkan judul..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Slug URL</label>
                <input
                  type="text"
                  value={currentPost.slug}
                  onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                  className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3.5 text-xs font-mono text-stone-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Ringkasan (SEO)</label>
                <textarea
                  rows={3}
                  value={currentPost.excerpt}
                  onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-500"
                />
              </div>

              {/* UPLOAD FILE COVER IMAGE */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Cover Image</label>
                <div className="flex flex-col gap-3">
                  <label className="border-2 border-dashed border-stone-200 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer bg-stone-50 transition-colors flex flex-col items-center justify-center">
                    {isUploadingCover ? (
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 my-2" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-stone-400 mb-1" />
                        <span className="text-xs font-bold text-stone-600">Klik untuk Pilih Gambar</span>
                        <span className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, WEBP</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>

                  {currentPost.image && (
                    <div className="relative rounded-xl overflow-hidden border border-stone-200 h-36 bg-stone-100 group">
                      <img src={currentPost.image} alt="Cover Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setCurrentPost({ ...currentPost, image: '' })}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs shadow hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-stone-800">Publikasikan</p>
                  <p className="text-[10px] text-stone-500">Tampilkan ke halaman blog?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={currentPost.is_published}
                    onChange={(e) => setCurrentPost({ ...currentPost, is_published: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-stone-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Kolom Kanan: Quill Editor dengan Image Handler */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Konten Artikel (Bisa Insert Gambar)</label>
              <div className="rounded-2xl border border-stone-200 overflow-hidden focus-within:border-emerald-500 transition-all">
                <ReactQuill 
                  theme="snow" 
                  value={currentPost.content} 
                  onChange={(content) => setCurrentPost({ ...currentPost, content })}
                  modules={quillModules}
                  placeholder="Tulis artikel atau masukkan gambar langsung via toolbar..."
                  className="bg-white [&_.ql-editor]:min-h-[500px] [&_.ql-editor]:text-base [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-stone-200"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900">Kelola Blog & Artikel</h2>
          <p className="text-xs text-stone-500 mt-0.5">Terbitkan wawasan dan informasi ke halaman publik.</p>
        </div>
        <button
          onClick={() => {
            setCurrentPost({ title: '', slug: '', excerpt: '', content: '', image: '', is_published: true });
            setViewMode('editor');
          }}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
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
                  <h3 className="text-base font-black text-stone-900 truncate">{post.title}</h3>
                  <p className="text-xs text-stone-500 truncate mt-0.5">{post.excerpt || 'Tanpa ringkasan'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setCurrentPost(post); setViewMode('editor'); }}
                    className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="w-9 h-9 rounded-xl border border-red-100 bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors"
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