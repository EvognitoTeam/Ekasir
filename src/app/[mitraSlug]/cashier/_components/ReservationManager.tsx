'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  Armchair,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
  Save,
  Search,
  UserCircle,
  UserX,
  X,
} from 'lucide-react';

import { Toast } from '@/utils/toast';
import { useCashier } from '../_providers/CashierProvider';
import type { NewReservationForm } from '../types';

function emptyForm(): NewReservationForm {
  return {
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    pax: 1,
    tableIds: [],
    notes: '',
  };
}

export default function ReservationManager() {
  const { slug, branchId, tables, fetchTables } = useCashier();
  const [reservations, setReservations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewReservationForm>(emptyForm);

  const fetchReservations = useCallback(async () => {
    if (!slug) return;
    try {
      const query = new URLSearchParams({ slug });
      if (branchId) query.set('branch_id', String(branchId));
      const response = await fetch(`/api/pos/reservations?${query.toString()}`, { cache: 'no-store', credentials: 'include' });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.success && Array.isArray(result.data)) setReservations(result.data);
    } catch (error) {
      console.error('[CASHIER_RESERVATIONS_FETCH_ERROR]', error);
    }
  }, [branchId, slug]);

  useEffect(() => {
    void Promise.all([fetchReservations(), fetchTables()]);
    const timer = window.setInterval(fetchReservations, 5000);
    return () => window.clearInterval(timer);
  }, [fetchReservations, fetchTables]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reservations;
    return reservations.filter((reservation) =>
      `${reservation.customer_name || ''} ${reservation.customer_phone || ''}`.toLowerCase().includes(term),
    );
  }, [reservations, search]);

  const updateStatus = async (id: string | number, status: string) => {
    const confirmation = await Swal.fire({
      title: 'Perbarui Reservasi?',
      text: `Status akan diubah menjadi ${status}.`,
      icon: status === 'canceled' || status === 'no_show' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: '#111111',
      confirmButtonText: 'Ya, lanjutkan',
      cancelButtonText: 'Batal',
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await fetch(`/api/pos/reservations?slug=${encodeURIComponent(slug)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), status }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Gagal memperbarui reservasi');
      Toast.fire({ icon: 'success', title: 'Status reservasi diperbarui', topLayer: true });
      await Promise.all([fetchReservations(), fetchTables()]);
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal memperbarui reservasi', topLayer: true });
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.date || !form.startTime || !form.endTime) {
      Toast.fire({ icon: 'warning', title: 'Informasi waktu wajib diisi', topLayer: true });
      return;
    }
    if (form.tableIds.length === 0) {
      Toast.fire({ icon: 'warning', title: 'Pilih minimal satu meja', topLayer: true });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/pos/reservations?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          guest_count: form.pax,
          reserved_start: `${form.date}T${form.startTime}:00`,
          reserved_end: `${form.date}T${form.endTime}:00`,
          table_ids: form.tableIds,
          notes: form.notes,
          status: 'confirmed',
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || 'Gagal menyimpan reservasi');
      Toast.fire({ icon: 'success', title: 'Reservasi dibuat & meja menjadi RESERVED', topLayer: true });
      setShowModal(false);
      setForm(emptyForm());
      await Promise.all([fetchReservations(), fetchTables()]);
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal membuat reservasi', topLayer: true });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const formatTime = (value: string) => value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Floor booking</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">Reservasi</h1>
            <p className="mt-2 text-[10px] leading-5 text-black/40">Kelola booking meja dan kedatangan tamu.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama / HP..." className="h-11 w-56 rounded-xl bg-[#f2f2ee] pl-9 pr-3 text-xs font-bold outline-none" /></div>
            <button type="button" onClick={() => setShowModal(true)} className="flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-[9px] font-black text-white"><Plus className="h-4 w-4" /> Tambah</button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center"><CalendarDays className="h-9 w-9 text-black/20" /><h2 className="mt-4 text-lg font-black">Belum ada reservasi</h2></div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.map((reservation) => {
              const tableText = reservation.table_ids?.length
                ? reservation.table_ids.map((id: any) => tables.find((table) => String(table.id) === String(id))?.table_name || `Meja ${id}`).join(', ')
                : reservation.tables || reservation.table_name || reservation.table_id || 'Belum dipilih';
              return (
                <article key={reservation.id} className="rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black tracking-[-.03em]">{reservation.customer_name || '-'}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[9px] text-black/35"><Phone className="h-3 w-3" />{reservation.customer_phone || '-'}</p>
                    </div>
                    <StatusBadge status={reservation.status} />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Info label="Tanggal" value={formatDate(reservation.reserved_start)} />
                    <Info label="Waktu" value={`${formatTime(reservation.reserved_start)} - ${formatTime(reservation.reserved_end)}`} />
                    <Info label="Pax" value={`${reservation.guest_count || 0}`} />
                  </div>
                  <div className="mt-2 rounded-xl bg-[#f5f5f1] p-3"><p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">Meja</p><p className="mt-1 text-[9px] font-black">{tableText}</p></div>

                  <div className="mt-4 flex gap-2">
                    {reservation.status === 'pending' && <><SmallAction label="Konfirmasi" icon={CheckCircle2} onClick={() => void updateStatus(reservation.id, 'confirmed')} /><SmallAction label="Batalkan" icon={X} danger onClick={() => void updateStatus(reservation.id, 'canceled')} /></>}
                    {reservation.status === 'confirmed' && <><SmallAction label="Tamu Hadir" icon={UserCircle} onClick={() => void updateStatus(reservation.id, 'completed')} /><SmallAction label="No Show" icon={UserX} danger onClick={() => void updateStatus(reservation.id, 'no_show')} /></>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(event) => event.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] bg-white sm:rounded-[30px]">
              <header className="flex items-center justify-between border-b border-black/[0.06] p-5"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-black/30">Manual booking</p><h3 className="mt-1 text-xl font-black">Tambah Reservasi</h3></div><button type="button" onClick={() => setShowModal(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f2ee]"><X className="h-4 w-4" /></button></header>
              <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nama pelanggan *"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /></Field>
                  <Field label="No. HP"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" /></Field>
                  <Field label="Tanggal *"><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field" /></Field>
                  <Field label="Pax *"><input type="number" min="1" required value={form.pax} onChange={(event) => setForm({ ...form, pax: Number(event.target.value) || 1 })} className="field" /></Field>
                  <Field label="Mulai *"><input type="time" required value={form.startTime} onChange={(event) => { const start = event.target.value; let end = form.endTime; if (start && !end) { const [h, m] = start.split(':'); end = `${String((Number(h) + 2) % 24).padStart(2, '0')}:${m}`; } setForm({ ...form, startTime: start, endTime: end }); }} className="field" /></Field>
                  <Field label="Selesai *"><input type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="field" /></Field>
                </div>

                <Field label="Pilih meja *">
                  <div className="flex flex-wrap gap-2">
                    {tables.map((table) => {
                      const selected = form.tableIds.includes(String(table.id));
                      return <button key={table.id} type="button" onClick={() => setForm((current) => ({ ...current, tableIds: selected ? current.tableIds.filter((id) => id !== String(table.id)) : [...current.tableIds, String(table.id)] }))} className={`rounded-xl border px-3 py-2 text-left ${selected ? 'border-black bg-black text-white' : 'border-black/[0.08] bg-white'}`}><p className="text-[10px] font-black">{table.table_name}</p><p className="mt-1 flex items-center gap-1 text-[8px] opacity-45"><Armchair className="h-3 w-3" />{table.capacity || 4} Pax</p></button>;
                    })}
                  </div>
                </Field>

                <Field label="Catatan"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="field min-h-20 resize-none" /></Field>

                <button type="submit" disabled={submitting} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-black py-4 text-xs font-black text-white disabled:opacity-40">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Reservasi</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .field { width: 100%; height: 44px; border-radius: 12px; background: #f2f2ee; padding: 0 12px; font-size: 12px; font-weight: 700; outline: none; }
        textarea.field { height: auto; padding-top: 12px; padding-bottom: 12px; }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status === 'pending' ? 'Menunggu' : status === 'confirmed' ? 'Dikonfirmasi' : status === 'completed' ? 'Hadir' : status === 'canceled' ? 'Dibatalkan' : status === 'no_show' ? 'No Show' : status;
  return <span className="rounded-full bg-[#f2f2ee] px-2.5 py-1 text-[7px] font-black uppercase tracking-[.1em]">{label}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f5f5f1] p-3"><p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">{label}</p><p className="mt-1 truncate text-[9px] font-black">{value}</p></div>;
}

function SmallAction({ label, icon: Icon, danger = false, onClick }: any) {
  return <button type="button" onClick={onClick} className={`flex h-10 items-center gap-2 rounded-xl px-3 text-[9px] font-black ${danger ? 'bg-red-50 text-red-600' : 'bg-black text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function Field({ label, children }: any) {
  return <label className="block"><span className="mb-2 block text-[8px] font-black uppercase tracking-[.11em] text-black/30">{label}</span>{children}</label>;
}
