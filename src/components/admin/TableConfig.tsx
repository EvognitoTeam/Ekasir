'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Armchair,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Coffee,
  Download,
  Edit2,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Save,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
  Phone,
  UserX,
} from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import Swal from 'sweetalert2';
import { Toast } from '@/utils/toast';

type TableStatus = 0 | 1 | 2 | 3;
type ReservationStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'no_show';

interface Branch {
  id: number;
  name: string;
  branch_slug: string;
}

interface Table {
  id: number;
  table_name: string;
  table_code: string;
  capacity: number;
  status: TableStatus;
  branch_id: number | null;
  branch_name: string | null;
  branch_slug: string | null;
}

interface Reservation {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  table_id: number | null;
  table_ids?: number[] | string[]; // 🟢 Support multi-tables
  table_name: string | null;
  branch_id: number | null;
  branch_name: string | null;
  reserved_start: string;
  reserved_end: string;
  guest_count: number;
  status: ReservationStatus;
  notes: string | null;
}

const TABLE_STATUS: Record<TableStatus, { label: string; badge: string; dot: string }> = {
  0: { label: 'Nonaktif', badge: 'bg-stone-100 text-stone-500', dot: 'bg-stone-400' },
  1: { label: 'Tersedia', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  2: { label: 'Terisi', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  3: { label: 'Direservasi', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

const RESERVATION_STATUS: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Dikonfirmasi', className: 'bg-emerald-50 text-emerald-700' },
  canceled: { label: 'Dibatalkan', className: 'bg-rose-50 text-rose-700' },
  completed: { label: 'Selesai / Hadir', className: 'bg-stone-100 text-stone-600' },
  no_show: { label: 'Tidak Hadir', className: 'bg-violet-50 text-violet-700' },
};

const fieldClass =
  'w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-[var(--color-primary)] focus:bg-white focus:ring-4 focus:ring-emerald-500/10';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function toLocalInputValue(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export default function TableConfig() {
  const params = useParams<{ mitraSlug: string }>();
  const pathname = usePathname();
  const slug = params.mitraSlug || '';
  const pathSegments = pathname.split('/').filter(Boolean);
  const adminIndex = pathSegments.indexOf('admin');
  const activeBranchSlug = adminIndex === 2 ? pathSegments[1] : undefined;

  const [tables, setTables] = useState<Table[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'tables' | 'reservations'>('tables');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<number | 'all' | 'main'>('all');
  const [tableModal, setTableModal] = useState(false);
  const [reservationModal, setReservationModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrModal, setQrModal] = useState<Table | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const [tableForm, setTableForm] = useState({
    mode: 'bulk' as 'single' | 'bulk',
    name: '',
    prefix: 'Meja',
    count: 6,
    start_number: 1,
    capacity: 4,
    status: 1 as TableStatus,
    branch_id: '' as number | '',
  });

  const now = useMemo(() => new Date(), []);
  
  // 🟢 Form Reservasi Diperbarui (Menggunakan tableIds Array)
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_phone: '',
    tableIds: [] as string[],
    branch_id: '' as number | '',
    guest_count: 2,
    reserved_start: toLocalInputValue(new Date(now.getTime() + 60 * 60 * 1000)),
    reserved_end: toLocalInputValue(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
    notes: '',
  });

  const qrRef = useRef<HTMLDivElement>(null);
  const qrRefs = useRef<(HTMLDivElement | null)[]>([]);

  const branchQuery = useMemo(() => {
    if (branchFilter === 'all') return '';
    return `&branch_id=${branchFilter}`;
  }, [branchFilter]);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const [tableRes, branchRes, reservationRes] = await Promise.all([
        fetch(`/api/pos/tables?slug=${encodeURIComponent(slug)}${branchQuery}`),
        fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`),
        fetch(`/api/pos/reservations?slug=${encodeURIComponent(slug)}${branchQuery}`),
      ]);
      const [tableJson, branchJson, reservationJson] = await Promise.all([
        tableRes.json(),
        branchRes.json(),
        reservationRes.json(),
      ]);
      if (tableJson.success) setTables(tableJson.data || []);
      if (branchJson.success) {
        const branchData = (branchJson.data || []) as Branch[];
        setBranches(branchData);
        if (activeBranchSlug) {
          const active = branchData.find((branch) => branch.branch_slug === activeBranchSlug);
          if (active) setBranchFilter(active.id);
        }
      }
      if (reservationJson.success) setReservations(reservationJson.data || []);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: 'error', title: 'Gagal memuat data meja' });
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchSlug, branchQuery, slug]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredTables = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) =>
      [table.table_name, table.table_code, table.branch_name || '', TABLE_STATUS[table.status].label]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, tables]);

  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter((table) => table.status === 1).length,
    occupied: tables.filter((table) => table.status === 2).length,
    reserved: tables.filter((table) => table.status === 3).length,
  }), [tables]);

  // 🟢 Filter Meja untuk Modal Reservasi
  const availableReservationTables = useMemo(() => {
    const selectedBranch = reservationForm.branch_id;
    return tables.filter((table) => {
      const branchMatch = !selectedBranch || Number(table.branch_id) === Number(selectedBranch);
      return branchMatch && table.status !== 0; // Tampilkan semua kecuali Nonaktif
    });
  }, [reservationForm.branch_id, tables]);

  const openCreateTable = () => {
    setEditingTable(null);
    setTableForm({
      mode: 'bulk',
      name: '',
      prefix: 'Meja',
      count: 6,
      start_number: 1,
      capacity: 4,
      status: 1,
      branch_id: typeof branchFilter === 'number' ? branchFilter : '',
    });
    setTableModal(true);
  };

  const openEditTable = (table: Table) => {
    setEditingTable(table);
    setTableForm({
      mode: 'single',
      name: table.table_name,
      prefix: 'Meja',
      count: 1,
      start_number: 1,
      capacity: table.capacity,
      status: table.status,
      branch_id: table.branch_id || '',
    });
    setTableModal(true);
  };

  const submitTable = async () => {
    if (tableForm.mode === 'single' && !tableForm.name.trim()) {
      Toast.fire({ icon: 'warning', title: 'Nama meja wajib diisi' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pos/tables?slug=${encodeURIComponent(slug)}`, {
        method: editingTable ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingTable
            ? {
                id: editingTable.id,
                name: tableForm.name,
                capacity: tableForm.capacity,
                status: tableForm.status,
                branch_id: tableForm.branch_id || null,
              }
            : {
                name: tableForm.mode === 'single' ? tableForm.name : undefined,
                prefix: tableForm.prefix,
                count: tableForm.mode === 'bulk' ? Math.min(tableForm.count, 30) : 1,
                start_number: tableForm.start_number,
                capacity: tableForm.capacity,
                status: tableForm.status,
                branch_id: tableForm.branch_id || null,
              },
        ),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Gagal menyimpan meja');
      Toast.fire({ icon: 'success', title: result.message || 'Meja berhasil disimpan' });
      setTableModal(false);
      await fetchData();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal menyimpan meja' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTable = async (table: Table) => {
    const result = await Swal.fire({
      title: `Hapus ${table.table_name}?`,
      text: 'Meja akan disembunyikan dan QR tidak lagi dapat digunakan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Hapus meja',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      confirmButtonColor: '#dc2626',
      customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' },
    });
    if (!result.isConfirmed) return;
    await fetch(`/api/pos/tables?slug=${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: table.id, isDeleted: true }),
    });
    Toast.fire({ icon: 'success', title: 'Meja berhasil dihapus' });
    fetchData();
  };

  const openReservation = () => {
    const freshNow = new Date();
    setReservationForm({
      customer_name: '',
      customer_phone: '',
      tableIds: [], // Reset tables
      branch_id: typeof branchFilter === 'number' ? branchFilter : '',
      guest_count: 2,
      reserved_start: toLocalInputValue(new Date(freshNow.getTime() + 60 * 60 * 1000)),
      reserved_end: toLocalInputValue(new Date(freshNow.getTime() + 2 * 60 * 60 * 1000)),
      notes: '',
    });
    setReservationModal(true);
  };

  // 🟢 FUNGSI SUBMIT RESERVASI DENGAN MULTI-MEJA
  const submitReservation = async () => {
    if (!reservationForm.customer_name.trim()) {
      Toast.fire({ icon: 'warning', title: 'Nama pemesan wajib diisi' });
      return;
    }
    if (new Date(reservationForm.reserved_end) <= new Date(reservationForm.reserved_start)) {
      Toast.fire({ icon: 'warning', title: 'Waktu selesai harus setelah waktu mulai' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: reservationForm.customer_name,
        customer_phone: reservationForm.customer_phone,
        guest_count: reservationForm.guest_count,
        reserved_start: new Date(reservationForm.reserved_start).toISOString(),
        reserved_end: new Date(reservationForm.reserved_end).toISOString(),
        table_ids: reservationForm.tableIds, // Mengirimkan Array ID
        notes: reservationForm.notes,
        status: 'confirmed', // Otomatis confirmed jika dibuat Admin
        branch_id: reservationForm.branch_id || null
      };

      const response = await fetch(`/api/pos/reservations?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Gagal membuat reservasi');
      
      Toast.fire({ icon: 'success', title: 'Reservasi berhasil ditambahkan' });
      setReservationModal(false);
      setActiveSection('reservations');
      await fetchData();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal membuat reservasi' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReservationStatus = async (reservation: Reservation, status: ReservationStatus) => {
    const isCancel = status === 'canceled' || status === 'no_show';
    const actionText = status === 'confirmed' ? 'mengonfirmasi' : status === 'completed' ? 'menandai HADIR' : status === 'canceled' ? 'Membatalkan' : 'menandai TIDAK HADIR';

    const confirm = await Swal.fire({
      title: 'Apakah Anda Yakin?',
      text: `Anda akan ${actionText} reservasi ini.`,
      icon: isCancel ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isCancel ? '#DC2626' : '#0E5C37',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Ya, Lanjutkan',
      cancelButtonText: 'Batal',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      const response = await fetch(`/api/pos/reservations?slug=${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservation.id, status }),
      });
      const result = await response.json();
      if (result.success) {
        Toast.fire({ icon: 'success', title: 'Status reservasi diperbarui' });
        fetchData();
      } else {
        Toast.fire({ icon: 'error', title: result.message || 'Gagal memperbarui reservasi' });
      }
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    }
  };

  const qrUrl = (table: Table) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const customerBase = table.branch_slug ? `/${slug}/${table.branch_slug}` : `/${slug}`;
    return `${baseUrl}${customerBase}/menu?tableCode=${table.table_code}`;
  };

  const downloadQR = async () => {
    if (!qrRef.current || !qrModal) return;
    const canvas = await html2canvas(qrRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `QR_${qrModal.table_name.replace(/\W+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadAllQR = async () => {
    if (!tables.length) return;
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('QR_Meja');
      for (let index = 0; index < tables.length; index += 1) {
        const element = qrRefs.current[index];
        if (!element) continue;
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((file) => (file ? resolve(file) : reject(new Error('Gagal membuat gambar'))), 'image/png'),
        );
        folder?.file(`QR_${tables[index].table_name.replace(/\W+/g, '_')}.png`, blob);
      }
      const output = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(output);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Meja_${slug}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[#153d2d] text-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-200/70">Floor management</p>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Meja & Reservasi</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                Atur kapasitas ruang, status meja, QR ordering, dan reservasi dari satu panel operasional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadAllQR} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold backdrop-blur transition hover:bg-white/15">
                {isDownloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Unduh QR
              </button>
              <button onClick={openReservation} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-3 text-xs font-bold text-[#153d2d] transition hover:bg-emerald-50">
                <CalendarCheck2 className="h-4 w-4" /> Tambah Reservasi
              </button>
              <button onClick={openCreateTable} className="inline-flex items-center gap-2 rounded-2xl bg-[#d7f64b] px-4 py-3 text-xs font-black text-stone-900 transition hover:brightness-105">
                <Plus className="h-4 w-4" /> Tambah Meja
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total meja', value: stats.total, icon: Armchair, className: 'text-stone-900' },
          { label: 'Tersedia', value: stats.available, icon: CheckCircle2, className: 'text-emerald-600' },
          { label: 'Terisi', value: stats.occupied, icon: Coffee, className: 'text-amber-600' },
          { label: 'Reservasi', value: stats.reserved, icon: CalendarCheck2, className: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, className }) => (
          <div key={label} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">{label}</span>
              <Icon className={`h-4 w-4 ${className}`} />
            </div>
            <strong className="font-display text-3xl text-stone-900">{value}</strong>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-5 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit rounded-2xl bg-stone-100 p-1">
            <button onClick={() => setActiveSection('tables')} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${activeSection === 'tables' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>Daftar Meja</button>
            <button onClick={() => setActiveSection('reservations')} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${activeSection === 'reservations' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
              Reservasi
              {reservations.filter((item) => item.status === 'pending').length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">{reservations.filter((item) => item.status === 'pending').length}</span>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {activeSection === 'tables' && (
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari meja atau kode" className="h-11 rounded-2xl border border-stone-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-[var(--color-primary)]" />
              </label>
            )}
          </div>
        </div>

        {branches.length > 0 && !activeBranchSlug && (
          <div className="border-b border-stone-100 px-5 py-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filter cabang">
              {[
                { key: 'all' as const, label: 'Semua Outlet', icon: Building2 },
                { key: 'main' as const, label: 'Outlet Utama', icon: Coffee },
                ...branches.map((branch) => ({ key: branch.id, label: branch.name, icon: Building2 })),
              ].map(({ key, label, icon: Icon }) => {
                const active = branchFilter === key;
                return (
                  <button
                    key={String(key)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBranchFilter(key)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div>
        ) : activeSection === 'tables' ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTables.map((table) => {
              const status = TABLE_STATUS[table.status];
              return (
                <motion.article layout key={table.id} className="group rounded-3xl border border-stone-200 bg-stone-50/60 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-stone-200/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"><Armchair className="h-5 w-5 text-[var(--color-primary)]" /></div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-bold text-stone-900">{table.table_name}</h3>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{table.branch_name || 'Outlet utama'} · {table.table_code}</p>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${status.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200"><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Kapasitas</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-stone-800"><Users className="h-3.5 w-3.5" /> {table.capacity} orang</p></div>
                    <button onClick={() => setQrModal(table)} className="rounded-2xl bg-white p-3 text-left ring-1 ring-stone-200 transition hover:ring-[var(--color-primary)]"><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">QR ordering</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-stone-800"><QrCode className="h-3.5 w-3.5" /> Lihat QR</p></button>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4">
                    <select value={table.status} onChange={async (event) => {
                      await fetch(`/api/pos/tables?slug=${encodeURIComponent(slug)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: table.id, status: Number(event.target.value) }) });
                      fetchData();
                    }} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-stone-600 outline-none cursor-pointer">
                      {Object.entries(TABLE_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => openEditTable(table)} className="rounded-xl p-2 text-stone-400 transition hover:bg-white hover:text-[var(--color-primary)]"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => deleteTable(table)} className="rounded-xl p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
            {!filteredTables.length && <div className="col-span-full py-16 text-center text-sm text-stone-400">Belum ada meja yang sesuai.</div>}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {reservations.map((reservation) => {
              const status = RESERVATION_STATUS[reservation.status];
              // 🟢 Resolve Multiple Tables String
              const tableNames = reservation.table_ids && reservation.table_ids.length > 0 
                ? reservation.table_ids.map(id => tables.find(t => String(t.id) === String(id))?.table_name || `Meja ${id}`).join(', ')
                : (reservation.table_name || '-');

              return (
                <div key={reservation.id} className="grid gap-4 p-5 transition hover:bg-stone-50/70 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--color-primary)]"><CalendarCheck2 className="h-5 w-5" /></div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-base font-bold text-stone-900">{reservation.customer_name || 'Tamu'}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span></div>
                      <p className="mt-1 text-xs text-stone-500 flex items-center gap-1"><Phone className="w-3 h-3"/> {reservation.customer_phone || 'Tanpa nomor telepon'} · <Users className="w-3 h-3 ml-1"/> {reservation.guest_count} tamu</p>
                      {reservation.notes && <p className="mt-2 text-xs italic text-stone-400">“{reservation.notes}”</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Meja</p><p className="mt-1 font-bold text-stone-700 leading-tight pr-2">{tableNames} <br/><span className="font-medium text-stone-400">({reservation.branch_name || 'Outlet utama'})</span></p></div>
                    <div><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Jadwal</p><p className="mt-1 font-bold text-stone-700 leading-tight">{formatDateTime(reservation.reserved_start)}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {reservation.status === 'pending' && (
                      <>
                        <button onClick={() => updateReservationStatus(reservation, 'confirmed')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white"><Check className="h-3.5 w-3.5" /> Konfirmasi</button>
                        <button onClick={() => updateReservationStatus(reservation, 'canceled')} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-600"><XCircle className="h-3.5 w-3.5" /> Tolak</button>
                      </>
                    )}
                    {reservation.status === 'confirmed' && (
                       <>
                         <button onClick={() => updateReservationStatus(reservation, 'completed')} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-[10px] font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Hadir</button>
                         <button onClick={() => updateReservationStatus(reservation, 'no_show')} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-[10px] font-bold text-stone-500"><UserX className="h-3.5 w-3.5" /> Tidak Hadir</button>
                       </>
                    )}
                  </div>
                </div>
              );
            })}
            {!reservations.length && <div className="py-16 text-center text-sm text-stone-400">Belum ada reservasi.</div>}
          </div>
        )}
      </section>

      <div className="fixed left-[-99999px] top-0">
        {tables.map((table, index) => (
          <div key={table.id} ref={(element) => { qrRefs.current[index] = element; }} className="flex w-[400px] flex-col items-center rounded-3xl border-4 border-[#0E5C37] bg-white p-10 text-center">
            <img src="/logo.png" alt="EKASIR" className="mb-2 w-24" crossOrigin="anonymous" />
            <h1 className="mb-1 text-3xl font-black">{table.table_name}</h1>
            <p className="mb-4 text-xs font-bold text-stone-500">SCAN UNTUK PESAN & BAYAR</p>
            <div className="rounded-2xl bg-stone-100 p-3"><QRCodeSVG value={qrUrl(table)} size={180} /></div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {tableModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Floor setup</p><h3 className="font-display text-2xl font-bold text-stone-900">{editingTable ? 'Edit Meja' : 'Tambah Meja'}</h3></div><button onClick={() => setTableModal(false)} className="rounded-full bg-stone-100 p-2 text-stone-500"><X className="h-5 w-5" /></button></div>
              <div className="space-y-6 p-6">
                {!editingTable && (
                  <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
                    <button onClick={() => setTableForm((form) => ({ ...form, mode: 'bulk' }))} className={`rounded-xl py-2.5 text-xs font-bold ${tableForm.mode === 'bulk' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>Bulk Create</button>
                    <button onClick={() => setTableForm((form) => ({ ...form, mode: 'single' }))} className={`rounded-xl py-2.5 text-xs font-bold ${tableForm.mode === 'single' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>Satu Meja</button>
                  </div>
                )}

                {tableForm.mode === 'bulk' && !editingTable ? (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5">
                    <div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Jumlah meja</p><p className="mt-1 text-xs text-emerald-700/70">Maksimal 30 meja sekali buat</p></div><strong className="font-display text-4xl text-emerald-800">{tableForm.count}</strong></div>
                    <input type="range" min="1" max="30" step="1" value={tableForm.count} onChange={(event) => setTableForm((form) => ({ ...form, count: Number(event.target.value) }))} className="mt-5 h-2 w-full cursor-pointer accent-emerald-700" />
                    <div className="mt-2 flex justify-between text-[9px] font-bold text-emerald-700/60"><span>1</span><span>30</span></div>
                  </div>
                ) : (
                  <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Nama meja</span><input value={tableForm.name} onChange={(event) => setTableForm((form) => ({ ...form, name: event.target.value }))} placeholder="Contoh: Meja VIP" className={fieldClass} /></label>
                )}

                {tableForm.mode === 'bulk' && !editingTable && (
                  <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Awalan nama</span><input value={tableForm.prefix} onChange={(event) => setTableForm((form) => ({ ...form, prefix: event.target.value }))} className={fieldClass} /></label><label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Mulai nomor</span><input type="number" min="1" value={tableForm.start_number} onChange={(event) => setTableForm((form) => ({ ...form, start_number: Number(event.target.value) }))} className={fieldClass} /></label></div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Kapasitas</span><div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 p-1"><button onClick={() => setTableForm((form) => ({ ...form, capacity: Math.max(1, form.capacity - 1) }))} className="rounded-xl p-3 text-stone-500"><Minus className="h-4 w-4" /></button><div className="flex-1 text-center text-sm font-bold">{tableForm.capacity} orang</div><button onClick={() => setTableForm((form) => ({ ...form, capacity: form.capacity + 1 }))} className="rounded-xl p-3 text-[var(--color-primary)]"><Plus className="h-4 w-4" /></button></div></label>
                  <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Status awal</span><select value={tableForm.status} onChange={(event) => setTableForm((form) => ({ ...form, status: Number(event.target.value) as TableStatus }))} className={fieldClass}>{Object.entries(TABLE_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
                </div>

                {branches.length > 0 && !activeBranchSlug && <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Cabang</span><select value={tableForm.branch_id} onChange={(event) => setTableForm((form) => ({ ...form, branch_id: event.target.value ? Number(event.target.value) : '' }))} className={fieldClass}><option value="">Outlet utama</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}

                {tableForm.mode === 'bulk' && !editingTable && <div className="rounded-2xl bg-stone-50 p-4 text-xs leading-5 text-stone-500">Preview: <strong className="text-stone-800">{tableForm.prefix} {tableForm.start_number}</strong> sampai <strong className="text-stone-800">{tableForm.prefix} {tableForm.start_number + tableForm.count - 1}</strong>, masing-masing berkapasitas {tableForm.capacity} orang.</div>}

                <button onClick={submitTable} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-4 text-sm font-bold text-white disabled:opacity-50">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{editingTable ? 'Simpan Perubahan' : tableForm.mode === 'bulk' ? `Buat ${tableForm.count} Meja` : 'Tambah Meja'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reservationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/65 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Guest booking</p><h3 className="font-display text-2xl font-bold text-stone-900">Tambah Reservasi</h3></div><button onClick={() => setReservationModal(false)} className="rounded-full bg-stone-100 p-2 text-stone-500"><X className="h-5 w-5" /></button></div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Nama tamu</span><input value={reservationForm.customer_name} onChange={(event) => setReservationForm((form) => ({ ...form, customer_name: event.target.value }))} placeholder="Nama pemesan" className={fieldClass} /></label>
                <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Nomor telepon</span><input value={reservationForm.customer_phone} onChange={(event) => setReservationForm((form) => ({ ...form, customer_phone: event.target.value }))} placeholder="08xxxxxxxxxx" className={fieldClass} /></label>
                
                {branches.length > 0 && !activeBranchSlug && <label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Cabang</span><select value={reservationForm.branch_id} onChange={(event) => setReservationForm((form) => ({ ...form, branch_id: event.target.value ? Number(event.target.value) : '', tableIds: [] }))} className={fieldClass}><option value="">Outlet utama</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
                
                <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Mulai</span><input type="datetime-local" value={reservationForm.reserved_start} onChange={(event) => setReservationForm((form) => ({ ...form, reserved_start: event.target.value }))} className={fieldClass} /></label>
                <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Selesai</span><input type="datetime-local" value={reservationForm.reserved_end} onChange={(event) => setReservationForm((form) => ({ ...form, reserved_end: event.target.value }))} className={fieldClass} /></label>
                <label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Jumlah tamu</span><input type="number" min="1" value={reservationForm.guest_count} onChange={(event) => setReservationForm((form) => ({ ...form, guest_count: Number(event.target.value) }))} className={fieldClass} /></label>

                {/* 🟢 TAMPILAN PEMILIHAN MULTI-MEJA DENGAN KAPASITAS PAX */}
                <div className="sm:col-span-2">
                  <label className="mb-3 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    Pilih Meja Tersedia (Bisa Lebih Dari Satu)
                  </label>
                  {availableReservationTables.length === 0 ? (
                    <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center text-sm font-medium text-stone-400">
                      Belum ada data meja di cabang ini.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {availableReservationTables.map(t => {
                        const isSelected = reservationForm.tableIds.includes(String(t.id));
                        const paxCount = t.capacity || 4; 
                        
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setReservationForm(prev => ({
                                ...prev,
                                tableIds: isSelected 
                                  ? prev.tableIds.filter(id => id !== String(t.id))
                                  : [...prev.tableIds, String(t.id)]
                              }))
                            }}
                            className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left w-36 ${
                              isSelected 
                                ? 'bg-emerald-50 border-[var(--color-primary)] shadow-sm' 
                                : 'bg-white border-stone-200 hover:border-emerald-200'
                            }`}
                          >
                            <span className={`font-black text-sm leading-none truncate w-full ${isSelected ? 'text-[var(--color-primary)]' : 'text-stone-700'}`}>
                              {t.table_name}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                              <Armchair className="w-3 h-3" /> {paxCount} Pax
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Catatan</span><textarea value={reservationForm.notes} onChange={(event) => setReservationForm((form) => ({ ...form, notes: event.target.value }))} rows={3} placeholder="Permintaan khusus, acara ulang tahun, dan sebagainya" className={fieldClass} /></label>
                <button onClick={submitReservation} disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarCheck2 className="h-5 w-5" />} Simpan Reservasi</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {qrModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-sm rounded-[30px] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">QR ordering</p><h3 className="font-display text-xl font-bold">{qrModal.table_name}</h3></div><button onClick={() => setQrModal(null)} className="rounded-full bg-stone-100 p-2"><X className="h-5 w-5" /></button></div>
              <div ref={qrRef} className="flex flex-col items-center rounded-3xl border-4 border-[var(--color-primary)] bg-white p-7 text-center"><img src="/logo.png" alt="Mitra Logo" className="mb-2 w-20" crossOrigin="anonymous" /><h2 className="font-display text-2xl font-bold">{qrModal.table_name}</h2><p className="mb-4 mt-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">Scan untuk pesan & bayar</p><div className="rounded-2xl bg-stone-100 p-3"><QRCodeSVG value={qrUrl(qrModal)} size={170} /></div><p className="mt-4 text-[10px] font-bold text-stone-400">{qrModal.branch_name || 'Outlet utama'} · {qrModal.table_code}</p></div>
              <button onClick={downloadQR} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white"><Download className="h-4 w-4" /> Unduh QR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}