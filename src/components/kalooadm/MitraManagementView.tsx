"use client";

import { useState, useEffect } from 'react';
import { Store, Edit3, Trash2, Search, Plus, Loader2, X, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function MitraManagementView() {
  const [mitras, setMitras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk form & modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMitra, setCurrentMitra] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Data dari API
  const fetchMitras = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/mitra');
      const json = await res.json();
      if (json.success) {
        setMitras(json.data); // 🔴 Memasukkan data ke state
      }
    } catch (error) {
      console.error("Gagal memuat mitra", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMitras();
  }, []);

  // 2. Handle Simpan (POST/PUT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const method = currentMitra.id ? 'PUT' : 'POST';
      const url = currentMitra.id ? `/api/superadmin/mitra?id=${currentMitra.id}` : '/api/superadmin/mitra';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentMitra),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchMitras();
      } else {
        alert(json.message || 'Gagal menyimpan data');
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Hapus (DELETE)
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Yakin ingin menonaktifkan mitra "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/superadmin/mitra?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      
      if (json.success) {
        fetchMitras();
      } else {
        alert(json.message);
      }
    } catch (error) {
      alert('Gagal menghapus mitra.');
    }
  };

  // Filter pencarian
  const filteredMitras = mitras.filter(m => 
    m.mitra_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.mitra_slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-stone-50/50">
      
      {/* HEADER TAB */}
      <div className="p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-800">Manajemen Mitra (Tenants)</h2>
          <p className="text-xs text-stone-500 font-medium mt-1">Kelola data penyewa, pengaturan biaya platform, dan akses POS.</p>
        </div>
        <button
          onClick={() => {
            setCurrentMitra({ mitra_name: '', mitra_slug: '', cashout: 0, taxRate: 0, serviceRate: 0 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Mitra Baru
        </button>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="px-8 pb-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau slug mitra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <th className="p-4 pl-6">Identitas Mitra</th>
                <th className="p-4">Platform Fee (Cashout)</th>
                <th className="p-4">Pajak / Service</th>
                <th className="p-4">Bergabung Sejak</th>
                <th className="p-4 text-right pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-stone-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                    Memuat data mitra...
                  </td>
                </tr>
              ) : filteredMitras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-stone-400">
                    <Store className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    Belum ada mitra yang terdaftar.
                  </td>
                </tr>
              ) : (
                filteredMitras.map((mitra) => (
                  <tr key={mitra.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{mitra.mitra_name}</p>
                          <p className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            /{mitra.mitra_slug}
                          </p>
                          
                          {/* 🔴 RENDER DAFTAR CABANG DI SINI */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {mitra.branches && mitra.branches.length > 0 ? (
                              mitra.branches.map((branch: any) => (
                                <span 
                                  key={branch.id} 
                                  className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full"
                                >
                                  {branch.branch_name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-stone-400 italic">Belum ada cabang</span>
                            )}
                          </div>

                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {/* 🔴 Menampilkan Platform Fee (cashout) dari database */}
                      {Number(mitra.cashout) > 100 ? (
                         <span className="font-bold text-red-600">Rp {Number(mitra.cashout).toLocaleString('id-ID')}</span>
                      ) : (
                         <span className="font-bold text-red-600">{mitra.cashout}%</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-stone-600">Pajak: <span className="font-bold">{mitra.taxRate || 0}%</span></p>
                      <p className="text-xs text-stone-600 mt-0.5">SVC: <span className="font-bold">{mitra.serviceRate || 0}%</span></p>
                    </td>
                    <td className="p-4 text-xs text-stone-500">
                      {new Date(mitra.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setCurrentMitra(mitra); setIsModalOpen(true); }}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-700 flex items-center justify-center transition-colors"
                          title="Edit Mitra"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(mitra.id, mitra.mitra_name)}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-700 flex items-center justify-center transition-colors"
                          title="Nonaktifkan Mitra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT / TAMBAH MITRA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-black text-stone-800 text-lg">
                  {currentMitra.id ? 'Edit Data Mitra' : 'Daftarkan Mitra Baru'}
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-0.5">Konfigurasi Sistem</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="mitraForm" onSubmit={handleSave} className="space-y-6">
                
                {/* IDENTITAS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3 border-b border-emerald-100 pb-2 flex items-center gap-2">
                    <Store className="w-4 h-4" /> Identitas Dasar
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Nama Bisnis / Kafe</label>
                      <input 
                        type="text" required
                        value={currentMitra.mitra_name}
                        onChange={(e) => setCurrentMitra({...currentMitra, mitra_name: e.target.value})}
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Slug URL</label>
                      <input 
                        type="text" required disabled={!!currentMitra.id}
                        value={currentMitra.mitra_slug}
                        onChange={(e) => setCurrentMitra({...currentMitra, mitra_slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 disabled:bg-stone-100 disabled:text-stone-400"
                        placeholder="kopi-senja"
                      />
                      {!currentMitra.id && <p className="text-[10px] text-amber-600">Slug tidak dapat diubah setelah disimpan.</p>}
                    </div>
                  </div>
                  
                  {/* Hanya tampil jika sedang edit (karena alamat/bank ada di tabel settings) */}
                  {currentMitra.id && (
                    <div className="mt-4 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Alamat Fisik</label>
                      <textarea 
                        rows={2}
                        value={currentMitra.mitraAddress || ''}
                        onChange={(e) => setCurrentMitra({...currentMitra, mitraAddress: e.target.value})}
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* KONFIGURASI KEUANGAN (Hanya bisa diset setelah mitra jadi / saat PUT) */}
                {currentMitra.id && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 border-b border-amber-100 pb-2 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> Pengaturan Keuangan
                    </h4>
                    
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1.5 mb-2">
                        Platform Fee / Payout Potongan
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" step="0.01"
                          value={currentMitra.cashout || 0}
                          onChange={(e) => setCurrentMitra({...currentMitra, cashout: e.target.value})}
                          className="w-full border border-red-200 bg-white rounded-xl px-4 py-2.5 text-sm font-black text-red-700 outline-none focus:border-red-500"
                        />
                        <span className="text-xs font-bold text-red-600 w-1/3">Persen (%) atau Rupiah</span>
                      </div>
                      <p className="text-[10px] text-red-500 mt-1.5 leading-relaxed">
                        Nilai ini adalah fee yang akan ditarik oleh Evognito dari setiap pesanan. Jika &lt; 100, dianggap Persen (%).
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Pajak Resto / PPN (%)</label>
                        <input 
                          type="number" step="1"
                          value={currentMitra.taxRate || 0}
                          onChange={(e) => setCurrentMitra({...currentMitra, taxRate: e.target.value})}
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Service Charge (%)</label>
                        <input 
                          type="number" step="1"
                          value={currentMitra.serviceRate || 0}
                          onChange={(e) => setCurrentMitra({...currentMitra, serviceRate: e.target.value})}
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3 bg-stone-50">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-200 transition-colors"
              >
                Batal
              </button>
              <button 
                form="mitraForm"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Konfigurasi
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}