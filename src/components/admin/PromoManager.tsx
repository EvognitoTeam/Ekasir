"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Tag, Percent,
  Calendar, Save, X, Search, ShieldCheck, Loader2
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters'; 
import { Toast } from '@/utils/toast';
import './PromoManager.css';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <div className="h-[100px] w-full bg-stone-50 animate-pulse rounded-xl border border-stone-200"></div> 
});

export interface CouponData {
  id: number;
  mitra_id: number | null;
  title: string | null;
  image: string | null;
  description: string | null;
  coupon_code: string;
  is_member_only: boolean;
  discount_price: string | null; 
  discount_rate: number | null;
  max_use: number;
  already_used: number;
  start_date: string | Date | null; 
  expired_date: string | Date | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  deletedAt: string | Date | null;
}

// 🔴 Helper untuk input datetime-local (Biar waktu lokal WIB lu kebaca bener di form edit)
const getLocalDatetime = (val: string | Date | null) => {
  if (!val) return '';
  const d = new Date(val);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};

// ─── Promo Status Badge ─────────────────────────────────────────────────────────

function PromoBadge({ promo }: { promo: CouponData }) {
  const now = new Date();
  
  if (promo.deletedAt) {
    return <span className="promo-badge bg-red-100 text-red-600 border border-red-200">Dihapus</span>;
  }
  
  if (promo.start_date) {
    const start = new Date(promo.start_date);
    if (now < start) {
      return <span className="promo-badge bg-blue-100 text-blue-600 border border-blue-200">Terjadwal</span>;
    }
  }

  if (promo.expired_date) {
    const end = new Date(promo.expired_date);
    if (now > end) {
      return <span className="promo-badge bg-stone-100 text-stone-500 border border-stone-200">Expired</span>;
    }
  }

  if (promo.max_use > 0 && promo.already_used >= promo.max_use) {
    return <span className="promo-badge bg-amber-100 text-amber-600 border border-amber-200">Kuota Habis</span>;
  }

  return (
    <span className="promo-badge bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Aktif
    </span>
  );
}

// ─── Promo Form ─────────────────────────────────────────────────────────────────

interface PromoFormProps {
  initial?: CouponData | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function PromoForm({ initial, onSave, onCancel, isSubmitting }: PromoFormProps) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    coupon_code: initial?.coupon_code || '',
    is_member_only: initial?.is_member_only || false,
    discountType: (initial?.discount_rate && initial.discount_rate > 0) ? 'percentage' : 'fixed',
    discount_rate: initial?.discount_rate || '',
    discount_price: initial?.discount_price || '',
    max_use: initial?.max_use || 0,
    // 🔴 Pakai format YYYY-MM-DDThh:mm untuk datetime-local
    start_date: getLocalDatetime(initial?.start_date || null),
    expired_date: getLocalDatetime(initial?.expired_date || null)
  });

  const inputClass = "promo-input w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-sans outline-none transition-all focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37]";
  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 block line-clamp-1";

  const handleSubmit = () => {
    if (!form.title || !form.coupon_code || (form.discountType === 'percentage' && !form.discount_rate) || (form.discountType === 'fixed' && !form.discount_price)) {
      Toast.fire({ icon: 'warning', title: 'Lengkapi form diskon yang wajib!' });
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      coupon_code: form.coupon_code.toUpperCase().replace(/\s/g, ''),
      is_member_only: form.is_member_only,
      discount_rate: form.discountType === 'percentage' ? Number(form.discount_rate) : null,
      discount_price: form.discount_price ? String(form.discount_price) : null,
      max_use: Number(form.max_use),
      // 🔴 Waktu akan kesimpen lengkap sama jam dan menitnya
      start_date: form.start_date ? new Date(form.start_date) : null,
      expired_date: form.expired_date ? new Date(form.expired_date) : null
    };
    onSave(payload);
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-6 space-y-5"
    >
      <div className="flex items-center justify-between mb-2 border-b border-stone-100 pb-4">
        <h3 className="text-lg font-black text-stone-800">{initial ? 'Edit Kupon' : 'Buat Kupon Baru'}</h3>
        <button onClick={onCancel} className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center hover:bg-stone-100 transition-all">
          <X className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nama Promo</label>
          <input className={inputClass} placeholder="Cth: Diskon Akhir Tahun" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Kode Kupon</label>
          <input className={`${inputClass} uppercase`} placeholder="Cth: AKHIRTAHUN20" value={form.coupon_code} onChange={e => setForm({ ...form, coupon_code: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Deskripsi Lengkap (HTML)</label>
        <div className="bg-white rounded-xl overflow-hidden border border-stone-200 focus-within:border-[#0E5C37] focus-within:ring-1 focus-within:ring-[#0E5C37] transition-all">
          <ReactQuill 
            theme="snow"
            value={form.description || ''} 
            onChange={(val) => setForm({ ...form, description: val })}
            modules={modules}
            className="w-full text-sm font-sans"
            placeholder="Penjelasan promo, syarat & ketentuan..."
          />
        </div>
        <style jsx global>{`
          .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #fafaf9; }
          .ql-container.ql-snow { border: none !important; min-height: 100px; }
          .ql-editor { font-family: inherit; font-size: 0.875rem; }
        `}</style>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
        <div>
          <label className={labelClass}>Tipe Diskon</label>
          <select className={inputClass} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value, discount_rate: '', discount_price: '' })}>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Potongan Tetap (Rp)</option>
          </select>
        </div>
        
        {form.discountType === 'percentage' ? (
          <>
            <div>
              <label className={labelClass}>Persen Diskon (%)</label>
              <input type="number" className={inputClass} placeholder="Cth: 10" value={form.discount_rate} onChange={e => setForm({ ...form, discount_rate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Maks. Potongan (Rp)</label>
              <input type="number" className={inputClass} placeholder="Kosongkan jika tanpa batas" value={form.discount_price} onChange={e => setForm({ ...form, discount_price: e.target.value })} />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label className={labelClass}>Nominal Potongan (Rp)</label>
            <input type="number" className={inputClass} placeholder="Cth: 15000" value={form.discount_price} onChange={e => setForm({ ...form, discount_price: e.target.value })} />
          </div>
        )}
      </div>

      {/* 🔴 Waktu Pelaksanaan - Menggunakan datetime-local */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-stone-100">
        <div>
          <label className={labelClass}>Waktu Mulai</label>
          <input type="datetime-local" className={inputClass} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          <p className="text-[10px] text-stone-400 mt-1">Biarkan kosong jika langsung aktif</p>
        </div>
        <div>
          <label className={labelClass}>Waktu Berakhir</label>
          <input type="datetime-local" className={inputClass} value={form.expired_date} onChange={e => setForm({ ...form, expired_date: e.target.value })} />
          <p className="text-[10px] text-stone-400 mt-1">Biarkan kosong jika aktif selamanya</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <label className={labelClass}>Batas Kuota (0 = Unlimited)</label>
          <input type="number" className={inputClass} placeholder="0" value={form.max_use} onChange={e => setForm({ ...form, max_use: Number(e.target.value) })} />
        </div>
        
        <div className="flex items-center gap-3 md:pt-4">
          <input 
            type="checkbox" 
            id="memberOnly" 
            checked={form.is_member_only} 
            onChange={e => setForm({ ...form, is_member_only: e.target.checked })}
            className="w-5 h-5 accent-[#0E5C37] rounded cursor-pointer"
          />
          <label htmlFor="memberOnly" className="text-sm font-bold text-stone-700 cursor-pointer select-none">
            Hanya untuk Member
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-stone-100">
        <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl border border-stone-200 text-stone-500 text-xs font-bold uppercase tracking-widest hover:bg-stone-50 transition-all disabled:opacity-50">Batal</button>
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl bg-[#0E5C37] text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Kupon
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function PromoManager() {
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingPromo, setEditingPromo] = useState<CouponData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const [promos, setPromos] = useState<CouponData[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pos/coupons');
      const result = await res.json();
      if (result.success) {
        setPromos(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSaveNew = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pos/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        Toast.fire({ icon: 'success', title: 'Kupon ditambahkan!' });
        setFormMode('closed');
        fetchCoupons();
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pos/coupons?id=${editingPromo?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        Toast.fire({ icon: 'success', title: 'Kupon diperbarui!' });
        setFormMode('closed');
        setEditingPromo(null);
        fetchCoupons();
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/pos/coupons?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        Toast.fire({ icon: 'success', title: 'Kupon dihapus!' });
        fetchCoupons();
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredPromos = useMemo(() => {
    return promos.filter(p => 
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.coupon_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [promos, searchQuery]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Database</p>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">Kupon & Promosi</h2>
        </div>
        <button
          onClick={() => { setFormMode('create'); setEditingPromo(null); }}
          className="px-5 py-3 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-800 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat Kupon
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
        <input
          type="text"
          placeholder="Cari nama promo atau kode voucher..."
          className="w-full bg-white border border-stone-200 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none transition-all focus:border-[#0E5C37] shadow-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <AnimatePresence>
        {formMode === 'create' && <PromoForm onSave={handleSaveNew} onCancel={() => setFormMode('closed')} isSubmitting={isSubmitting} />}
        {formMode === 'edit' && editingPromo && <PromoForm initial={editingPromo} onSave={handleSaveEdit} onCancel={() => { setFormMode('closed'); setEditingPromo(null); }} isSubmitting={isSubmitting} />}
      </AnimatePresence>

      {isLoading && promos.length === 0 ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0E5C37]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredPromos.map((promo) => {
              const isPercentage = promo.discount_rate !== null && promo.discount_rate > 0;
              let displayLabel = '';
              
              if (isPercentage) {
                displayLabel = `${promo.discount_rate}% OFF`;
                if (promo.discount_price && Number(promo.discount_price) > 0) {
                  displayLabel += ` (Maks. ${formatPrice(Number(promo.discount_price))})`;
                }
              } else {
                displayLabel = formatPrice(Number(promo.discount_price));
              }

              // 🔴 Opsi formatting buat nampilin jam di list
              const timeFormatOptions: Intl.DateTimeFormatOptions = {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              };

              return (
                <motion.div key={promo.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-[1.5rem] border shadow-sm p-5 transition-all ${promo.deletedAt ? 'opacity-60 border-stone-200 bg-stone-50' : 'border-stone-100 hover:border-emerald-100'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPercentage ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                        {isPercentage ? <Percent className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-stone-800 truncate">{promo.title}</h4>
                        <p className="text-[11px] font-bold text-stone-400 mt-0.5 truncate uppercase tracking-wider">{promo.coupon_code}</p>
                      </div>
                    </div>
                    <PromoBadge promo={promo} />
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                      Diskon {displayLabel}
                    </span>
                    <span className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${promo.is_member_only ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>
                      {promo.is_member_only ? <ShieldCheck className="w-3 h-3" /> : null}
                      {promo.is_member_only ? 'Member Eksklusif' : 'Publik'}
                    </span>
                    
                    {/* 🔴 Nampilin Jam di Sini */}
                    {(promo.start_date || promo.expired_date) && (
                      <span className="px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> 
                        {promo.start_date ? new Date(promo.start_date).toLocaleString('id-ID', timeFormatOptions) : 'Sekarang'} 
                        {' - '} 
                        {promo.expired_date ? new Date(promo.expired_date).toLocaleString('id-ID', timeFormatOptions) : 'Selamanya'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      Digunakan: <span className="text-stone-800">{promo.already_used}</span> {promo.max_use > 0 ? `/ ${promo.max_use}` : '(Tanpa Batas)'}
                    </div>
                    
                    {!promo.deletedAt && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingPromo(promo); setFormMode('edit'); }} className="p-2 text-stone-400 hover:text-[#0E5C37] hover:bg-emerald-50 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        {deleteConfirm === promo.id ? (
                          <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg">
                            <button onClick={() => handleDelete(promo.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 px-2 py-1">Hapus</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-700 px-2 py-1">Batal</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(promo.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredPromos.length === 0 && formMode === 'closed' && (
            <div className="py-20 border-2 border-dashed border-stone-200 rounded-[2rem] flex flex-col items-center justify-center bg-stone-50/50">
              <div className="w-16 h-16 rounded-2xl bg-white border border-stone-100 flex items-center justify-center mb-4 shadow-sm">
                <Tag className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-sm font-black text-stone-800">Belum Ada Kupon</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mt-1">Buat kupon pertamamu sekarang.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}