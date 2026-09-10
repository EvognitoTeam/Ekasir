'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CalendarDays, 
  Users, 
  Armchair, 
  CheckCircle2, 
  Loader2, 
  Info,
  User,
  AlignLeft
} from 'lucide-react';
import { Toast } from '@/utils/toast';

interface Table {
  id: number;
  table_name: string;
  capacity: number;
  status: number;
}

// 🟢 MENGHAPUS CAFENAME DARI STATE INTERNAL, MENGGUNAKAN PROPS
interface ReservationViewProps {
  onBack: () => void;
  cafeName?: string;
}

export default function ReservationView({ onBack, cafeName = "Restoran Kami" }: ReservationViewProps) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";
  const branchSegments = Array.isArray(params.branchSlug)
    ? params.branchSlug
    : [];
  const reservedViews = new Set([
    'menu',
    'checkout',
    'tracking',
    'history',
    'help',
    'profile',
    'coupons',
    'roasts',
    'reservation',
  ]);
  const branchSlug =
    branchSegments[0] &&
    !reservedViews.has(branchSegments[0])
      ? branchSegments[0]
      : undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    date: '',
    startTime: '',
    endTime: '',
    pax: 2,
    tableIds: [] as string[],
    notes: ''
  });

  useEffect(() => {
    if (!slug) return;
    const fetchInitialData = async () => {
      try {
        let tableUrl = `/api/pos/tables?slug=${slug}`;
        if (branchSlug) tableUrl += `&branch_slug=${branchSlug}`;
        
        const resTables = await fetch(tableUrl);
        const dataTables = await resTables.json();
        
        if (dataTables.success) {
          const availableTables = dataTables.data.filter((t: Table) => t.status !== 0);
          setTables(availableTables);
        }
      } catch (error) {
        console.error("Gagal memuat data meja:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [slug, branchSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.date || !form.startTime || !form.endTime) {
      Toast.fire({ icon: 'warning', title: 'Mohon lengkapi semua kolom wajib!' });
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = `${form.date}T${form.startTime}:00`;
      const endDateTime = `${form.date}T${form.endTime}:00`;

      if (new Date(endDateTime) <= new Date(startDateTime)) {
        Toast.fire({ icon: 'warning', title: 'Waktu selesai harus setelah waktu datang.' });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        customer_name: form.name,
        customer_phone: form.phone,
        guest_count: form.pax,
        reserved_start: startDateTime,
        reserved_end: endDateTime,
        table_ids: form.tableIds,
        notes: form.notes,
      };

      const response = await fetch(`/api/pos/reservations?slug=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal membuat reservasi");
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      Toast.fire({ icon: 'error', title: error.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTable = (id: string) => {
    setForm(prev => ({
      ...prev,
      tableIds: prev.tableIds.includes(id) 
        ? prev.tableIds.filter(tid => tid !== id)
        : [...prev.tableIds, id]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center bg-stone-50 px-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-black" />
        <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Menyiapkan Halaman...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center bg-stone-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-[30px] border border-black/[0.07] bg-white p-7 text-center shadow-sm"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="mb-2 text-2xl font-black tracking-[-0.045em] text-neutral-950">Reservasi Diterima!</h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-8">
            Terima kasih, <strong>{form.name}</strong>. Permintaan reservasi Anda telah kami terima dan berstatus <strong>Menunggu Konfirmasi</strong>. Pihak restoran akan menghubungi Anda.
          </p>
          <button 
            onClick={onBack}
            className="w-full py-4 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition"
          >
            Selesai
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-stone-50 pb-32">
      <header className="sticky top-0 z-40 flex min-h-[72px] items-center gap-3 border-b border-black/[0.06] bg-stone-50/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <button 
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black leading-none tracking-[-0.035em] text-neutral-950">Pesan Meja</h1>
          <p className="text-xs font-medium text-stone-500 mt-1">{cafeName}</p>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5">
        <div className="flex items-start gap-3 rounded-2xl border border-black/[0.07] bg-stone-200/70 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-black/55" />
          <p className="text-xs leading-5 text-black/55">
            Lengkapi form di bawah ini. Reservasi Anda akan masuk ke daftar tunggu untuk dikonfirmasi restoran.
          </p>
        </div>

        <form id="reservationForm" onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <User className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black tracking-[-0.035em] text-neutral-950">Informasi Pemesan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Nama Lengkap *</label>
                <input 
                  type="text" 
                  required
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full rounded-2xl border border-black/[0.08] bg-stone-100/70 px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-black focus:bg-white"
                  placeholder="Masukkan nama Anda"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">No. WhatsApp *</label>
                <input 
                  type="tel" 
                  required
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full rounded-2xl border border-black/[0.08] bg-stone-100/70 px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-black focus:bg-white"
                  placeholder="Contoh: 081234567890"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <CalendarDays className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black tracking-[-0.035em] text-neutral-950">Jadwal Kedatangan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Tanggal *</label>
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-black focus:bg-white transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Datang *</label>
                  <input 
                    type="time" 
                    required
                    value={form.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      let newEnd = form.endTime;
                      if (newStart && !newEnd) {
                        const [h, m] = newStart.split(':');
                        newEnd = `${String((parseInt(h) + 2) % 24).padStart(2, '0')}:${m}`;
                      }
                      setForm({...form, startTime: newStart, endTime: newEnd});
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-black focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Selesai *</label>
                  <input 
                    type="time" 
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({...form, endTime: e.target.value})}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-black focus:bg-white transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 block">Jumlah Tamu <small>(minimal 2 pax)</small>*</label>
                <div className="flex items-center justify-between gap-4 bg-stone-50 border border-stone-200 rounded-xl p-2 max-w-[160px]">
                  <button type="button" onClick={() => setForm({...form, pax: Math.max(2, form.pax - 1)})} className="w-10 h-10 bg-white rounded-lg border border-stone-200 text-stone-600 font-bold hover:bg-stone-100 flex items-center justify-center">-</button>
                  <span className="text-lg font-black tracking-[-0.035em] text-neutral-950">{form.pax}</span>
                  <button type="button" onClick={() => setForm({...form, pax: form.pax + 1})} className="w-10 h-10 bg-black rounded-lg text-white font-bold hover:opacity-90 flex items-center justify-center shadow-sm">+</button>
                </div>
              </div>
            </div>
          </section>

          {/* <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <Armchair className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black tracking-[-0.035em] text-neutral-950">Pilihan Meja</h2>
            </div>
            <p className="text-[10px] font-medium text-stone-500 mb-5 ml-10">Bisa pilih lebih dari satu meja.</p>

            {tables.length === 0 ? (
              <div className="text-center p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <p className="text-stone-500 text-sm font-medium">Belum ada meja tersedia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tables.map((t) => {
                  const isSelected = form.tableIds.includes(String(t.id));
                  const paxCount = t.capacity || 4;
                  return (
                    <div 
                      key={t.id} onClick={() => toggleTable(String(t.id))}
                      className={`relative flex flex-col items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-black bg-emerald-50' : 'border-stone-100 bg-white hover:border-emerald-200'}`}
                    >
                      {isSelected && <div className="absolute top-2 right-2 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center shadow-sm"><CheckCircle2 className="w-3 h-3" /></div>}
                      <span className={`font-black text-sm line-clamp-1 ${isSelected ? 'text-emerald-900' : 'text-stone-700'}`}>{t.table_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1 ${isSelected ? 'text-black' : 'text-stone-400'}`}><Armchair className="w-3 h-3" /> {paxCount} Kursi</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section> */}

          <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
             <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <AlignLeft className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black tracking-[-0.035em] text-neutral-950">Catatan Tambahan</h2>
            </div>
            <textarea 
              value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}
              placeholder="Contoh: Tolong siapkan kursi bayi, request outdoor, dll."
              className="w-full h-28 resize-none bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-black focus:bg-white transition"
            ></textarea>
          </section>

        </form>
      </div>

      <div className="border-t border-stone-200 bg-white p-4 shrink-0 sm:sticky sm:bottom-0">
        <button 
          form="reservationForm"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-black text-white font-black text-base flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
        >
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</> : 'Ajukan Reservasi'}
        </button>
      </div>
    </div>
  );
}