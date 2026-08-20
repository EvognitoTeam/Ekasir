'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, MoreVertical, Edit, Ban, 
  Trash2, ExternalLink, Store, CheckCircle2, XCircle, Clock, MapPin, X, Save, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

// 1. Interface Data
interface Mitra {
  id: number;
  name: string;
  slug: string;
  owner: string;
  email: string;
  phone: string;
  plan: string;
  status: 'active' | 'expired' | 'suspended';
  expiredAt: string;
  branches: string[]; // Bisa juga array of objects, disesuaikan dengan response API
}

export default function MitraManagementView() {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<Partial<Mitra>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // FETCH DATA DARI API BACKEND
  // ==========================================
  const fetchMitras = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/mitra');
      const result = await response.json();
      
      if (result.success) {
        setMitras(result.data);
      } else {
        ToastError(result.message || 'Gagal mengambil data mitra');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      ToastError('Terjadi kesalahan koneksi ke server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMitras();
  }, []);

  // Logika Filter & Search
  const filteredMitra = mitras.filter(mitra => {
    const matchSearch = mitra.name?.toLowerCase().includes(search.toLowerCase()) || 
                        mitra.slug?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || mitra.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '', slug: '', owner: '', email: '', phone: '', plan: 'Basic', status: 'active', expiredAt: '', branches: []
    });
    setIsModalOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEdit = (mitra: Mitra) => {
    setModalMode('edit');
    setFormData({ ...mitra });
    setIsModalOpen(true);
  };

  // ==========================================
  // SIMPAN DATA KE API (POST / PUT)
  // ==========================================
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const response = await fetch('/api/superadmin/mitra', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Swal.fire({ 
          title: 'Berhasil!', 
          text: modalMode === 'add' ? 'Mitra baru berhasil ditambahkan.' : 'Data mitra berhasil diperbarui.', 
          icon: 'success', 
          timer: 1500, 
          showConfirmButton: false 
        });
        setIsModalOpen(false);
        fetchMitras(); // Refresh data tabel
      } else {
        throw new Error(result.message || 'Gagal menyimpan data');
      }
    } catch (error: any) {
      Swal.fire('Gagal!', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HAPUS DATA KE API (DELETE)
  // ==========================================
  const handleDelete = (id: number, name: string) => {
    Swal.fire({
      title: 'Hapus Mitra?',
      text: `Anda yakin ingin menghapus tenant ${name} permanen? Seluruh data cabang dan pesanan mereka akan hilang.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/superadmin/mitra?id=${id}`, {
            method: 'DELETE',
          });
          
          const resJson = await response.json();

          if (response.ok && resJson.success) {
            Swal.fire('Terhapus!', 'Mitra berhasil dihapus dari sistem.', 'success');
            fetchMitras(); // Refresh data
          } else {
            throw new Error(resJson.message || 'Gagal menghapus mitra');
          }
        } catch (error: any) {
          Swal.fire('Error!', error.message, 'error');
        }
      }
    });
  };

  const ToastError = (msg: string) => {
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: msg, showConfirmButton: false, timer: 3000 });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* HEADER KHUSUS MANAJEMEN MITRA */}
      <header className="px-8 py-6 border-b border-stone-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-black text-stone-800 font-display">Manajemen Mitra & Cabang</h2>
          <p className="text-sm font-medium text-stone-500 mt-1">Kelola data tenant, cabang, status langganan, dan akses sistem.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition shadow-md shadow-emerald-900/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Mitra
        </button>
      </header>

      {/* TOOLBAR (SEARCH & FILTER) */}
      <div className="px-8 py-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari nama toko atau slug..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-sm font-medium text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-stone-200 p-1 rounded-xl">
          {['all', 'active', 'expired', 'suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filterStatus === status 
                  ? 'bg-stone-100 text-stone-800 shadow-sm' 
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
              }`}
            >
              {status === 'all' ? 'Semua' : status}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-500 text-xs font-black uppercase tracking-wider">
                <th className="p-4 pl-6">Detail Mitra</th>
                <th className="p-4">Owner / Kontak</th>
                <th className="p-4">Cabang</th>
                <th className="p-4 text-center">Status & Paket</th>
                <th className="p-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-stone-500 font-bold text-sm uppercase tracking-widest">Memuat Data Tenant...</p>
                  </td>
                </tr>
              ) : filteredMitra.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500 font-medium">
                    Tidak ada mitra yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMitra.map((mitra) => {
                  let badgeBg = 'bg-stone-100 text-stone-600';
                  let StatusIcon = Clock;
                  
                  if (mitra.status === 'active') {
                    badgeBg = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                    StatusIcon = CheckCircle2;
                  } else if (mitra.status === 'expired') {
                    badgeBg = 'bg-amber-100 text-amber-700 border border-amber-200';
                    StatusIcon = Clock;
                  } else if (mitra.status === 'suspended') {
                    badgeBg = 'bg-red-100 text-red-700 border border-red-200';
                    StatusIcon = XCircle;
                  }

                  const expiredDate = mitra.expiredAt ? new Date(mitra.expiredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                  const branchesList = Array.isArray(mitra.branches) ? mitra.branches : [];

                  return (
                    <tr key={mitra.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-stone-400" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-800">{mitra.name}</p>
                            <a href={`/${mitra.slug}`} target="_blank" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-0.5 group w-fit">
                              /{mitra.slug} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-stone-800 text-sm">{mitra.owner || '-'}</p>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">{mitra.phone || mitra.email || '-'}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-sm font-black text-stone-700">{branchesList.length} Cabang</span>
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 truncate max-w-[150px]">
                          {branchesList.join(', ') || 'Pusat Saja'}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${badgeBg}`}>
                            <StatusIcon className="w-3 h-3" /> {mitra.status}
                          </span>
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                            {mitra.plan}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Tombol Edit Mitra */}
                          <button onClick={() => handleOpenEdit(mitra)} className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Data">
                            <Edit className="w-4 h-4" />
                          </button>
                          {/* Tombol Suspend (Bisa ditaruh handler quick suspend nanti) */}
                          <button 
                            onClick={() => setFormData({...mitra, status: 'suspended'}) /* Simulasi aja */}
                            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" 
                            title="Suspend Akun"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          {/* Tombol Hapus */}
                          <button onClick={() => handleDelete(mitra.id, mitra.name)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus Permanen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-stone-800 tracking-tight">
                    {modalMode === 'add' ? 'Tambah Mitra Baru' : 'Edit Data Mitra'}
                  </h3>
                  <p className="text-xs font-bold text-stone-500 mt-1">Lengkapi informasi identitas toko dan pemilik</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSaveForm} className="overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Nama Toko *</label>
                    <input 
                      type="text" required
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold" 
                      placeholder="Contoh: Kopi Kenangan" 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Slug URL *</label>
                    <div className="flex items-center">
                      <span className="bg-stone-100 border border-r-0 border-stone-200 rounded-l-xl px-3 py-3 text-sm font-medium text-stone-400">/</span>
                      <input 
                        type="text" required
                        value={formData.slug || ''} 
                        onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        className="w-full bg-stone-50 border border-stone-200 rounded-r-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold" 
                        placeholder="kopi-kenangan" 
                      />
                    </div>
                  </div>

                  <div className="col-span-2 border-t border-stone-100 pt-4 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Informasi Pemilik (Owner)</p>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Nama Lengkap Owner *</label>
                    <input 
                      type="text" required
                      value={formData.owner || ''} 
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold" 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Email *</label>
                    <input 
                      type="email" required
                      value={formData.email || ''} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold" 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">No. WhatsApp *</label>
                    <input 
                      type="tel" required
                      value={formData.phone || ''} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold" 
                    />
                  </div>

                  <div className="col-span-2 border-t border-stone-100 pt-4 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Status & Langganan</p>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Paket SaaS</label>
                    <select 
                      value={formData.plan || 'Basic'} 
                      onChange={(e) => setFormData({...formData, plan: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold"
                    >
                      <option value="Trial">Trial (14 Hari)</option>
                      <option value="Basic">Basic Plan</option>
                      <option value="Pro Plan">Pro Plan</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Status Akun</label>
                    <select 
                      value={formData.status || 'active'} 
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'active'|'expired'|'suspended'})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white font-bold"
                    >
                      <option value="active">Active (Aktif)</option>
                      <option value="expired">Expired (Kedaluwarsa)</option>
                      <option value="suspended">Suspended (Diblokir)</option>
                    </select>
                  </div>

                  {modalMode === 'edit' && (
                     <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                        <p className="text-xs font-bold text-amber-800 mb-2">Manajemen Cabang</p>
                        <p className="text-[11px] font-medium text-amber-700">Manajemen cabang dilakukan secara spesifik pada masing-masing akun Owner Mitra.</p>
                     </div>
                  )}

                </div>

                {/* Tombol Simpan */}
                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-emerald-700 text-white font-black flex justify-center items-center gap-2 hover:bg-emerald-800 transition shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Sedang Menyimpan...</>
                    ) : (
                      <><Save className="w-5 h-5" /> Simpan Data Mitra</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}