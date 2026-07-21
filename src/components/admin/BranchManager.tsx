"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Phone, Trash2, Plus, Edit2, Loader2, Store, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // 🔴 Import framer-motion untuk animasi notifikasi

export default function BranchManager() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  // 🔴 STATE UNTUK NOTIFIKASI
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // 🔴 FUNGSI MENAMPILKAN NOTIFIKASI (Otomatis hilang dalam 3 detik)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/branches?slug=${slug}`);
      const json = await res.json();
      if (json.success) setBranches(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchBranches();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingBranch ? 'PUT' : 'POST';
      const body = {
        slug,
        ...formData,
        id: editingBranch?.id
      };

      const res = await fetch(`/api/pos/branches`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingBranch(null);
        setFormData({ name: '', address: '', phone: '' });
        fetchBranches();
        // 🔴 PANGGIL NOTIFIKASI SUKSES
        showToast(editingBranch ? 'Cabang berhasil diperbarui!' : 'Cabang baru berhasil ditambahkan!');
      } else {
        // 🔴 PANGGIL NOTIFIKASI ERROR
        showToast('Gagal menyimpan cabang. Periksa kembali data Anda.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Terjadi kesalahan pada server.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus cabang ini?')) return;
    try {
      const res = await fetch(`/api/pos/branches?slug=${slug}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBranches();
        // 🔴 PANGGIL NOTIFIKASI SUKSES HAPUS
        showToast('Cabang berhasil dihapus!');
      } else {
        showToast('Gagal menghapus cabang.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Terjadi kesalahan pada server.', 'error');
    }
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setFormData({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '' });
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0E5C37]" /></div>;
  }

  return (
    <div className="relative">
      
      {/* 🔴 KOMPONEN NOTIFIKASI (TOAST) MENGAMBANG DI ATAS */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-bold tracking-wide">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-stone-900">Daftar Cabang</h2>
          <p className="text-xs text-stone-500">Kelola lokasi outlet dan kontak</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0E5C37] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#0a4328] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Cabang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-stone-400 font-medium bg-white rounded-3xl border border-dashed border-stone-200">
            Belum ada data cabang.
          </div>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 bg-emerald-50 text-[#0E5C37] rounded-xl flex items-center justify-center mb-4">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-stone-800 text-lg mb-2">{branch.name} - {branch.branch_slug}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-xs text-stone-500">
                    <MapPin className="w-4 h-4 shrink-0 text-stone-400" />
                    <span className="line-clamp-2">{branch.address || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Phone className="w-4 h-4 shrink-0 text-stone-400" />
                    <span>{branch.phone || '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-stone-100">
                <button onClick={() => openEditModal(branch)} className="flex-1 py-2 text-xs font-bold text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(branch.id)} className="px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center justify-center transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-stone-900 mb-6">
              {editingBranch ? 'Edit Cabang' : 'Tambah Cabang Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Nama Cabang</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-[#0E5C37]/20 outline-none transition-all" placeholder="Contoh: Cabang Sudirman" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Nomor Telepon</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-[#0E5C37]/20 outline-none transition-all" placeholder="Contoh: 08123456789" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Alamat Lengkap</label>
                <textarea rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-[#0E5C37]/20 outline-none transition-all resize-none" placeholder="Masukkan alamat outlet..." />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 font-bold text-white bg-[#0E5C37] rounded-xl hover:bg-[#0a4328] transition-colors">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}