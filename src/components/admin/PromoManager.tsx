'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Edit3,
  Globe2,
  Loader2,
  MapPin,
  Percent,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
  Ticket,
  Layers
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import 'react-quill-new/dist/quill.snow.css';

import { formatPrice } from '@/utils/formatters';
import { Toast } from '@/utils/toast';
import './PromoManager.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-[130px] animate-pulse rounded-2xl border border-stone-200 bg-stone-50" />,
});

type Branch = {
  id: number;
  name: string;
  branch_slug: string;
};

export interface CouponData {
  id: number;
  mitra_id: number | null;
  branch_id: number | null;
  branch_ids: number[];
  title: string | null;
  image: string | null;
  description: string | null;
  coupon_code: string;
  is_member_only: boolean;
  discount_price: string | null;
  discount_rate: number | null;
  max_use: number;
  already_used: number;
  is_auto_apply: boolean;
  applicable_items: number[];
  max_use_per_user: number;
  daily_user_limit: number;
  monthly_user_limit: number;
  yearly_user_limit: number;
  is_claimable: boolean;
  valid_days_after_claim: number;
  claimed_by_user_id: number | null;
  campaign_group_id: string | null;
  start_date: string | Date | null;
  expired_date: string | Date | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  deletedAt: string | Date | null;
}

type PromoPayload = {
  branch_ids: number[];
  title: string;
  description: string;
  coupon_code: string; // Akan jadi "Prefix" jika bulk_count > 1
  is_member_only: boolean;
  discount_rate: number | null;
  discount_price: string | null;
  max_use: number;
  is_auto_apply: boolean;
  applicable_items: number[];
  max_use_per_user: number;
  daily_user_limit: number;
  monthly_user_limit: number;
  yearly_user_limit: number;
  is_claimable: boolean;
  valid_days_after_claim: number;
  bulk_count: number; // Jumlah voucher yang akan dicetak
  start_date: Date | null;
  expired_date: Date | null;
};

const getLocalDatetime = (value: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

function PromoBadge({ promo }: { promo: CouponData }) {
  const now = new Date();
  
  if (promo.is_claimable) {
    if (promo.claimed_by_user_id) {
       return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">Telah Diklaim</span>;
    }
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-700">Belum Diklaim</span>;
  }

  if (promo.start_date && now < new Date(promo.start_date)) {
    return <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-600">Terjadwal</span>;
  }
  if (promo.expired_date && now > new Date(promo.expired_date)) {
    return <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-500">Berakhir</span>;
  }
  if (promo.max_use > 0 && promo.already_used >= promo.max_use) {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-red-600">Kuota habis</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Aktif
    </span>
  );
}

function BranchBadge({ branchIds, branches }: { branchIds: number[]; branches: Branch[] }) {
  const names = branches.filter((item) => branchIds.includes(item.id)).map((item) => item.name);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-500">
      {branchIds.length === 0 ? <Globe2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
      {branchIds.length === 0 ? 'Semua cabang' : names.join(', ') || `${branchIds.length} cabang`}
    </span>
  );
}

interface PromoFormProps {
  initial?: CouponData | null;
  branches: Branch[];
  onSave: (data: PromoPayload) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function PromoForm({ initial, branches, onSave, onCancel, isSubmitting }: PromoFormProps) {
  const [form, setForm] = useState({
    all_branches: !initial || !initial.branch_ids || initial.branch_ids.length === 0,
    branch_ids: initial?.branch_ids || [],
    title: initial?.title || '',
    description: initial?.description || '',
    coupon_code: initial?.coupon_code || '',
    is_member_only: initial?.is_member_only || false,
    is_auto_apply: initial?.is_auto_apply || false,
    discountType: initial?.discount_rate && initial.discount_rate > 0 ? 'percentage' : 'fixed',
    discount_rate: initial?.discount_rate ? String(initial.discount_rate) : '',
    discount_price: initial?.discount_price || '',
    max_use: initial?.max_use || 0,
    max_use_per_user: initial?.max_use_per_user || 0,
    daily_user_limit: initial?.daily_user_limit || 0,
    monthly_user_limit: initial?.monthly_user_limit || 0,
    yearly_user_limit: initial?.yearly_user_limit || 0,
    applicable_items: initial?.applicable_items || [],
    is_claimable: initial?.is_claimable || false,
    valid_days_after_claim: initial?.valid_days_after_claim || 0,
    bulk_count: 1, // Default 1 kupon
    start_date: getLocalDatetime(initial?.start_date || null),
    expired_date: getLocalDatetime(initial?.expired_date || null),
  });
  const [error, setError] = useState('');

  const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10';
  const labelClass = 'mb-1.5 block text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400';

  const submit = () => {
    if (!form.title.trim() || !form.coupon_code.trim()) {
      setError('Nama promo dan kode kupon/prefix wajib diisi.');
      return;
    }
    if (form.discountType === 'percentage' && (!form.discount_rate || Number(form.discount_rate) <= 0 || Number(form.discount_rate) > 100)) {
      setError('Persentase diskon harus berada di antara 1 sampai 100.');
      return;
    }
    if (form.discountType === 'fixed' && (!form.discount_price || Number(form.discount_price) <= 0)) {
      setError('Nominal potongan wajib lebih dari Rp0.');
      return;
    }
    if (form.start_date && form.expired_date && new Date(form.expired_date) <= new Date(form.start_date)) {
      setError('Waktu berakhir harus setelah waktu mulai.');
      return;
    }
    if (form.is_claimable && form.bulk_count < 1) {
      setError('Jumlah cetak massal minimal 1 voucher.');
      return;
    }

    setError('');
    onSave({
      branch_ids: form.all_branches ? [] : form.branch_ids,
      title: form.title.trim(),
      description: form.description,
      coupon_code: form.coupon_code.toUpperCase().replace(/\s+/g, ''),
      is_member_only: form.is_member_only,
      is_auto_apply: form.is_auto_apply,
      discount_rate: form.discountType === 'percentage' ? Number(form.discount_rate) : null,
      discount_price: form.discount_price ? String(form.discount_price) : null,
      max_use: Number(form.max_use) || 0,
      max_use_per_user: Number(form.max_use_per_user) || 0,
      daily_user_limit: Number(form.daily_user_limit) || 0,
      monthly_user_limit: Number(form.monthly_user_limit) || 0,
      yearly_user_limit: Number(form.yearly_user_limit) || 0,
      applicable_items: form.applicable_items,
      is_claimable: form.is_claimable,
      valid_days_after_claim: Number(form.valid_days_after_claim) || 0,
      bulk_count: Number(form.bulk_count) || 1,
      start_date: form.start_date ? new Date(form.start_date) : null,
      expired_date: form.expired_date ? new Date(form.expired_date) : null,
    });
  };

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-stone-100 px-5 py-5 md:px-7">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--color-primary)]">Campaign editor</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-stone-900">{initial ? 'Edit promosi' : 'Buat promosi baru'}</h3>
          <p className="mt-1 text-xs text-stone-400">Atur nilai diskon, limitasi pengguna, voucher klaim, dan auto-apply.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-6 p-5 md:p-7">
        {error && <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={labelClass}>Nama promo</label><input className={inputClass} placeholder="Contoh: Payday Treat" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <label className={labelClass}>{form.is_claimable && !initial ? 'Prefix Kode Kupon' : 'Kode kupon'}</label>
            <input className={`${inputClass} uppercase tracking-widest`} placeholder={form.is_claimable && !initial ? "GIFT" : "PAYDAY20"} value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} />
            {form.is_claimable && !initial && <p className="mt-1 text-[10px] text-stone-400">Kode akhir akan berbentuk: {form.coupon_code || 'PREFIX'}-XXXXX</p>}
          </div>
        </div>

        {/* FITUR VOUCHER KLAIM */}
        <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
           <label className="flex cursor-pointer items-center justify-between">
              <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600"><Ticket className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-stone-800">Voucher Klaim Eksklusif (Targeted)</span><span className="block text-[10px] text-stone-500">Kode unik sekali pakai yang akan mengikat ke akun 1 pelanggan.</span></span></span>
              <input type="checkbox" checked={form.is_claimable} onChange={(e) => setForm({ ...form, is_claimable: e.target.checked, is_auto_apply: false, is_member_only: true })} className="h-5 w-5 accent-amber-600" />
            </label>

            {form.is_claimable && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid gap-4 border-t border-amber-200/60 pt-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Jumlah Dicetak (Bulk Generate)</label>
                  <input type="number" min="1" max="1000" className={inputClass} value={form.bulk_count} onChange={(e) => setForm({ ...form, bulk_count: Number(e.target.value) })} disabled={!!initial} />
                  <p className="mt-1 text-[10px] text-stone-500">Sistem akan membuat banyak voucher acak secara massal. (Nonaktif saat mode Edit)</p>
                </div>
                <div>
                  <label className={labelClass}>Masa Aktif Setelah Diklaim</label>
                  <div className="flex items-center rounded-xl border border-stone-200 bg-white px-4">
                    <input type="number" min="0" className="w-full bg-transparent py-3 text-sm font-bold text-stone-900 outline-none" value={form.valid_days_after_claim} onChange={(e) => setForm({ ...form, valid_days_after_claim: Number(e.target.value) })} />
                    <span className="text-xs font-bold text-stone-400">Hari</span>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500">Dihitung sejak hari pelanggan mengklaim voucher.</p>
                </div>
              </motion.div>
            )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          <label className={labelClass}>Berlaku di outlet</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.all_branches ? 'border-[var(--color-primary)] bg-emerald-50/60' : 'border-stone-200 bg-white'}`}>
              <input type="checkbox" checked={form.all_branches} onChange={(e) => setForm({ ...form, all_branches: e.target.checked, branch_ids: e.target.checked ? [] : form.branch_ids })} className="h-4 w-4 accent-[var(--color-primary)]" />
              <Globe2 className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs font-bold text-stone-800">Semua cabang</span>
            </label>
            {branches.map((branch) => {
              const checked = form.branch_ids.includes(branch.id);
              return (
                <label key={branch.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checked ? 'border-[var(--color-primary)] bg-emerald-50/60' : 'border-stone-200 bg-white'} ${form.all_branches ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={form.all_branches}
                    checked={checked}
                    onChange={() => setForm({ ...form, branch_ids: checked ? form.branch_ids.filter((id) => id !== branch.id) : [...form.branch_ids, branch.id] })}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <MapPin className="h-4 w-4 text-stone-400" />
                  <span className="min-w-0 truncate text-xs font-bold text-stone-800">{branch.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelClass}>Deskripsi & ketentuan</label>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white focus-within:border-[var(--color-primary)]">
            <ReactQuill theme="snow" value={form.description} onChange={(description) => setForm({ ...form, description })} modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] }} placeholder="Jelaskan benefit dan syarat promo..." />
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl bg-stone-950 p-4 text-white md:grid-cols-3">
          <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-white/45">Tipe diskon</label><select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm outline-none" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value, discount_rate: '', discount_price: '' })}><option className="text-stone-900" value="percentage">Persentase</option><option className="text-stone-900" value="fixed">Nominal tetap</option></select></div>
          {form.discountType === 'percentage' ? <>
            <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-white/45">Diskon (%)</label><input type="number" min="1" max="100" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm outline-none" placeholder="20" value={form.discount_rate} onChange={(e) => setForm({ ...form, discount_rate: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-white/45">Maks. potongan</label><input type="number" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm outline-none" placeholder="50000" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} /></div>
          </> : <div className="md:col-span-2"><label className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-white/45">Nominal potongan</label><input type="number" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm outline-none" placeholder="25000" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} /></div>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>{form.is_claimable ? 'Tanggal Mulai Promo Publikasi' : 'Mulai berlaku'}</label>
            <input type="datetime-local" className={inputClass} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{form.is_claimable ? 'Batas Akhir Klaim Voucher' : 'Berakhir'}</label>
            <input type="datetime-local" className={inputClass} value={form.expired_date} onChange={(e) => setForm({ ...form, expired_date: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Batas Kuota Kupon (Global)</label>
            <input type="number" min="0" className={inputClass} value={form.max_use} onChange={(e) => setForm({ ...form, max_use: Number(e.target.value) })} disabled={form.is_claimable} />
            <p className="mt-1 text-[10px] text-stone-400">Total maksimal kupon bisa dipakai. (Nonaktif untuk jenis voucher klaim unik).</p>
          </div>
          
          <div className="space-y-3">
             <label className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${form.is_claimable ? 'opacity-50 border-stone-200 bg-stone-100' : 'border-stone-200 bg-stone-50'}`}>
              <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600"><Users className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-stone-800">Member Eksklusif</span><span className="block text-[10px] text-stone-500">Kupon khusus pelanggan terdaftar.</span></span></span>
              <input type="checkbox" disabled={form.is_claimable} checked={form.is_member_only || form.is_claimable} onChange={(e) => setForm({ ...form, is_member_only: e.target.checked })} className="h-5 w-5 accent-violet-600" />
            </label>
            
            <label className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${form.is_claimable ? 'opacity-50 border-stone-200 bg-stone-100' : 'border-stone-200 bg-stone-50'}`}>
              <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-sky-600"><Zap className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-stone-800">Auto-Apply</span><span className="block text-[10px] text-stone-500">Terapkan otomatis ke keranjang.</span></span></span>
              <input type="checkbox" disabled={form.is_claimable} checked={form.is_auto_apply && !form.is_claimable} onChange={(e) => setForm({ ...form, is_auto_apply: e.target.checked })} className="h-5 w-5 accent-sky-600" />
            </label>
          </div>
        </div>

        {/* BATASAN PENGGUNAAN PER AKUN */}
        {!form.is_claimable && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
             <p className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-500">Limit Penggunaan per Pelanggan</p>
             <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
               <div><label className={labelClass}>Limit Harian</label><input type="number" min="0" className={inputClass} value={form.daily_user_limit} onChange={(e) => setForm({ ...form, daily_user_limit: Number(e.target.value) })} /></div>
               <div><label className={labelClass}>Limit Bulanan</label><input type="number" min="0" className={inputClass} value={form.monthly_user_limit} onChange={(e) => setForm({ ...form, monthly_user_limit: Number(e.target.value) })} /></div>
               <div><label className={labelClass}>Limit Tahunan</label><input type="number" min="0" className={inputClass} value={form.yearly_user_limit} onChange={(e) => setForm({ ...form, yearly_user_limit: Number(e.target.value) })} /></div>
               <div><label className={labelClass}>Total (Lifetime)</label><input type="number" min="0" className={inputClass} value={form.max_use_per_user} onChange={(e) => setForm({ ...form, max_use_per_user: Number(e.target.value) })} /></div>
             </div>
             <p className="mt-3 text-[10px] text-stone-400">*Isi 0 jika tidak ada batasan. Mengisi salah satu limit otomatis mewajibkan pelanggan untuk melakukan login.</p>
          </div>
        )}

      </div>

      <div className="flex gap-3 border-t border-stone-100 bg-stone-50/70 px-5 py-4 md:justify-end md:px-7">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 rounded-xl border border-stone-200 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500 md:flex-none">Batal</button>
        <button type="button" onClick={submit} disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm disabled:opacity-50 md:flex-none">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan promo</button>
      </div>
    </motion.section>
  );
}

export default function PromoManager() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = params?.mitraSlug;
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingPromo, setEditingPromo] = useState<CouponData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBranch, setActiveBranch] = useState<'all' | 'global' | number>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [promos, setPromos] = useState<CouponData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [couponResponse, branchResponse] = await Promise.all([
        fetch('/api/pos/coupons', { cache: 'no-store' }),
        slug ? fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }) : Promise.resolve(null),
      ]);
      const couponResult = await couponResponse.json();
      if (couponResult.success) setPromos(couponResult.data);
      if (branchResponse?.ok) {
        const branchResult = await branchResponse.json();
        if (branchResult.success) setBranches(branchResult.data);
      }
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: 'error', title: 'Gagal memuat data promosi' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, [slug]);

  const save = async (data: PromoPayload, id?: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(id ? `/api/pos/coupons?id=${id}` : '/api/pos/coupons', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Gagal menyimpan promo');
      Toast.fire({ icon: 'success', title: id ? 'Promo diperbarui' : 'Promo ditambahkan' });
      setFormMode('closed');
      setEditingPromo(null);
      await fetchData();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Terjadi kesalahan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePromo = async (id: number) => {
    try {
      const response = await fetch(`/api/pos/coupons?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Gagal menghapus promo');
      Toast.fire({ icon: 'success', title: 'Promo dihapus' });
      await fetchData();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Terjadi kesalahan' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredPromos = useMemo(() => promos.filter((promo) => {
    const queryMatch = `${promo.title || ''} ${promo.coupon_code}`.toLowerCase().includes(searchQuery.toLowerCase());
    const branchMatch = activeBranch === 'all' || (activeBranch === 'global' ? promo.branch_ids.length === 0 : promo.branch_ids.includes(activeBranch));
    return queryMatch && branchMatch;
  }), [activeBranch, promos, searchQuery]);

  const activeCount = promos.filter((promo) => (!promo.expired_date || new Date(promo.expired_date) > new Date()) && (promo.max_use === 0 || promo.already_used < promo.max_use)).length;
  const claimableCount = promos.filter((promo) => promo.is_claimable).length;

  return (
    <div className="w-full space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white md:p-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-white/60"><Sparkles className="h-3.5 w-3.5 text-emerald-300" />Marketing studio</div><h2 className="max-w-xl font-display text-3xl font-semibold leading-tight md:text-4xl">Promosi yang tepat, untuk outlet yang tepat.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">Kelola kupon diskon global, voucher fisik, dan kampanye cabang.</p></div>
          <button type="button" onClick={() => { setEditingPromo(null); setFormMode('create'); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-stone-950 transition hover:bg-emerald-50"><Plus className="h-4 w-4" /> Buat promo</button>
        </div>
        <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          <div><p className="text-2xl font-semibold">{promos.length}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Total Kampanye</p></div>
          <div><p className="text-2xl font-semibold">{activeCount}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Sedang aktif</p></div>
          <div><p className="text-2xl font-semibold">{claimableCount}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Voucher Fisik</p></div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {formMode !== 'closed' && <PromoForm key={editingPromo?.id || 'new'} initial={editingPromo} branches={branches} onSave={(data) => save(data, editingPromo?.id)} onCancel={() => { setFormMode('closed'); setEditingPromo(null); }} isSubmitting={isSubmitting} />}
      </AnimatePresence>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama, grup, atau kode promo..." className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--color-primary)]" /></div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[{ id: 'all' as const, label: 'Semua' }, { id: 'global' as const, label: 'Semua cabang' }, ...branches.map((branch) => ({ id: branch.id, label: branch.name }))].map((tab) => <button key={tab.id} type="button" onClick={() => setActiveBranch(tab.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition ${activeBranch === tab.id ? 'bg-[var(--color-primary)] text-white' : 'border border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}>{tab.label}</button>)}
          </div>
        </div>
      </section>

      {isLoading ? <div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div> : filteredPromos.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-[2rem] border-2 border-dashed border-stone-200 bg-stone-50/60 p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm"><Tag className="h-6 w-6 text-stone-300" /></div><h3 className="mt-4 font-display text-lg font-semibold text-stone-800">Promo tidak ditemukan</h3><p className="mt-1 text-xs text-stone-400">Ubah filter atau buat kampanye baru.</p></div></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <AnimatePresence>
            {filteredPromos.map((promo, index) => {
              const percentage = Boolean(promo.discount_rate && promo.discount_rate > 0);
              const benefit = percentage ? `${promo.discount_rate}% OFF` : formatPrice(Number(promo.discount_price || 0));
              const selectedBranches = branches.filter((item) => promo.branch_ids.includes(item.id));
              
              // Cek apakah ada batasan limit user
              const hasUserLimit = promo.max_use_per_user > 0 || promo.daily_user_limit > 0 || promo.monthly_user_limit > 0 || promo.yearly_user_limit > 0;

              return (
                <motion.article key={promo.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ delay: index * .025 }} className="group overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="grid grid-cols-[92px_1fr] md:grid-cols-[120px_1fr]">
                    <div className={`relative flex min-h-[190px] flex-col items-center justify-between p-4 text-white ${percentage ? 'bg-[var(--color-primary)]' : 'bg-stone-900'}`}><span className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/50">Benefit</span><div className="text-center">{percentage ? <Percent className="mx-auto mb-2 h-6 w-6" /> : <Tag className="mx-auto mb-2 h-6 w-6" />}<p className="font-display text-xl font-semibold leading-tight">{benefit}</p></div><span className="text-[8px] font-bold uppercase tracking-widest text-white/50">EKASIR</span></div>
                    <div className="min-w-0 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <PromoBadge promo={promo} />
                          <h3 className="mt-3 truncate font-display text-xl font-semibold text-stone-900">{promo.title}</h3>
                          <div className="mt-1 flex items-center gap-2">
                             <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-[var(--color-primary)]">{promo.coupon_code}</p>
                             {promo.campaign_group_id && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-stone-400" title="Campaign Group"><Layers className="mb-0.5 mr-1 inline h-2.5 w-2.5" />{promo.campaign_group_id.slice(-6)}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1"><button type="button" onClick={() => { setEditingPromo(promo); setFormMode('edit'); }} className="grid h-9 w-9 place-items-center rounded-full text-stone-400 hover:bg-emerald-50 hover:text-[var(--color-primary)]"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => setDeleteConfirm(promo.id)} className="grid h-9 w-9 place-items-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        <BranchBadge branchIds={promo.branch_ids} branches={branches} />
                        {(promo.is_member_only || hasUserLimit) && !promo.is_claimable && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-600"><ShieldCheck className="h-3 w-3" /> Member</span>}
                        {promo.is_auto_apply && <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-600"><Zap className="h-3 w-3" /> Auto-Apply</span>}
                        {promo.is_claimable && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-700"><Ticket className="h-3 w-3" /> Voucher Targeted</span>}
                      </div>

                      <div className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-[10px] text-stone-400">
                        {promo.is_claimable ? (
                          <p>Masa aktif <strong className="text-stone-700">{promo.valid_days_after_claim} Hari</strong> setelah diklaim oleh User.</p>
                        ) : (
                          <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{promo.start_date ? new Date(promo.start_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Aktif sekarang'} <ChevronRight className="h-3 w-3" /> {promo.expired_date ? new Date(promo.expired_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Tanpa batas'}</p>
                        )}
                        {!promo.is_claimable && <p>Digunakan <strong className="text-stone-700">{promo.already_used}</strong>{promo.max_use > 0 ? ` dari ${promo.max_use}` : ' kali · tanpa kuota'}</p>}
                        {selectedBranches.length > 0 && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Khusus {selectedBranches.map((item) => item.name).join(', ')}</p>}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>{deleteConfirm === promo.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-red-100 bg-red-50"><div className="flex items-center justify-between gap-3 px-5 py-3"><p className="text-xs font-semibold text-red-700">Hapus promo ini?</p><div className="flex gap-2"><button onClick={() => setDeleteConfirm(null)} className="rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-stone-500">Batal</button><button onClick={() => void removePromo(promo.id)} className="rounded-lg bg-red-600 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white">Hapus</button></div></div></motion.div>}</AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}