'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Armchair,
  BellRing,
  Bluetooth,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
} from 'lucide-react';

import { Toast } from '@/utils/toast';
import { useCashier } from '../_providers/CashierProvider';

export default function TableManager() {
  const { slug, tables, isLoadingTables, fetchTables } = useCashier();
  const [search, setSearch] = useState('');
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [pagingId, setPagingId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<number | null>(null);

  useEffect(() => {
    void fetchTables();
    const timer = window.setInterval(fetchTables, 5000);
    return () => window.clearInterval(timer);
  }, [fetchTables]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tables
      .filter((table) => {
        if (!term) return true;
        return [table.table_name, table.tableName, table.table_code, table.tableCode, table.id]
          .filter((value) => value !== null && value !== undefined)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [search, tables]);

  const counts = useMemo(() => {
    const value = { available: 0, occupied: 0, reserved: 0, disabled: 0 };
    for (const table of tables) {
      const status = Number(table.status ?? table.table_status ?? 1);
      if (status === 1) value.available += 1;
      else if (status === 2) value.occupied += 1;
      else if (status === 3) value.reserved += 1;
      else value.disabled += 1;
    }
    return value;
  }, [tables]);

  const putTable = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/pos/tables?slug=${encodeURIComponent(slug)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      throw new Error(result?.message || 'Gagal memperbarui meja');
    }
    return result;
  };

  const release = async (table: any) => {
    const id = Number(table.id);
    const name = String(table.table_name || table.tableName || `Meja ${id}`);
    const confirmation = await Swal.fire({
      title: 'Kosongkan Meja?',
      text: `${name} akan menjadi AVAILABLE.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#111111',
      cancelButtonColor: '#A8A29E',
      confirmButtonText: 'Ya, kosongkan meja',
      cancelButtonText: 'Batal',
    });
    if (!confirmation.isConfirmed) return;

    setReleasingId(id);
    try {
      await putTable({ id, action: 'release' });
      Toast.fire({ icon: 'success', title: `${name} sekarang tersedia`, topLayer: true });
      await fetchTables();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal mengosongkan meja', topLayer: true });
    } finally {
      setReleasingId(null);
    }
  };

  const changeStatus = async (table: any) => {
    const id = Number(table.id);
    const current = Number(table.status ?? table.table_status ?? 1);
    if (current === 3) {
      Toast.fire({ icon: 'info', title: 'Meja RESERVED dikelola melalui Reservasi', topLayer: true });
      return;
    }

    const name = String(table.table_name || table.tableName || `Meja ${id}`);
    const result = await Swal.fire({
      title: `Ubah Status ${name}`,
      input: 'select',
      inputOptions: {
        '1': 'AVAILABLE — meja kosong',
        '2': 'OCCUPIED — meja digunakan',
        '0': 'DISABLED — nonaktif',
      },
      inputValue: String(current),
      showCancelButton: true,
      confirmButtonColor: '#111111',
      confirmButtonText: 'Simpan status',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    const next = Number(result.value);
    setStatusId(id);
    try {
      const action = current === 2 && next === 1 ? 'release' : 'set-status';
      await putTable({ id, action, status: next });
      Toast.fire({ icon: 'success', title: 'Status meja diperbarui', topLayer: true });
      await fetchTables();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal mengubah status', topLayer: true });
    } finally {
      setStatusId(null);
    }
  };

  const manageDevice = async (table: any) => {
    const id = Number(table.id);
    const name = String(table.table_name || table.tableName || `Meja ${id}`);
    const currentSerial = String(table.iot_device_serial || '');

    const result = await Swal.fire({
      title: currentSerial ? `Kelola Device ${name}` : `Pasang Device ${name}`,
      input: 'text',
      inputValue: currentSerial,
      inputPlaceholder: 'Contoh: KALOO-000123',
      showCancelButton: true,
      showDenyButton: Boolean(currentSerial),
      confirmButtonColor: '#111111',
      denyButtonColor: '#DC2626',
      confirmButtonText: currentSerial ? 'Simpan / Ganti' : 'Pasang Device',
      denyButtonText: 'Lepas Device',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        const serial = String(value || '').trim();
        if (!serial) return 'Serial number wajib diisi';
        if (serial.length > 50) return 'Serial maksimal 50 karakter';
        return null;
      },
    });

    if (result.isDismissed) return;
    setDeviceId(id);

    try {
      if (result.isDenied) {
        await putTable({ id, action: 'device-unbind' });
        Toast.fire({ icon: 'success', title: 'Device berhasil dilepas', topLayer: true });
      } else if (result.isConfirmed) {
        await putTable({
          id,
          action: 'device-bind',
          serialNumber: String(result.value || '').trim().toUpperCase(),
        });
        Toast.fire({ icon: 'success', title: 'Device berhasil dipasang', topLayer: true });
      }
      await fetchTables();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal mengelola device', topLayer: true });
    } finally {
      setDeviceId(null);
    }
  };

  const togglePager = async (table: any) => {
    const id = Number(table.id);
    if (!table.iot_online) return;
    const next = !Boolean(table.iot_pager_active);
    setPagingId(id);
    try {
      await putTable({ id, action: 'pager', pagerActive: next });
      Toast.fire({ icon: 'success', title: next ? 'Pager dinyalakan' : 'Pager dimatikan', topLayer: true });
      await fetchTables();
    } catch (error) {
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal mengubah pager', topLayer: true });
    } finally {
      setPagingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-black/[0.06] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Floor operation</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">Daftar Meja</h1>
            <p className="mt-2 text-[10px] leading-5 text-black/40">Pantau status meja, IoT device, pager, dan release meja.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari meja..." className="h-11 w-56 rounded-xl bg-[#f2f2ee] pl-9 pr-3 text-xs font-bold outline-none" />
            </div>
            <button type="button" onClick={() => void fetchTables()} className="flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-[9px] font-black text-white">
              <RefreshCw className={`h-4 w-4 ${isLoadingTables ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CountCard label="Available" value={counts.available} />
          <CountCard label="Occupied" value={counts.occupied} />
          <CountCard label="Reserved" value={counts.reserved} />
          <CountCard label="Disabled" value={counts.disabled} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {isLoadingTables && tables.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center"><Armchair className="h-9 w-9 text-black/20" /><p className="mt-4 text-sm font-black">Meja tidak ditemukan</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((table) => {
              const status = Number(table.status ?? table.table_status ?? 1);
              const name = String(table.table_name || table.tableName || table.table_code || `Meja ${table.id}`);
              const statusInfo =
                status === 1
                  ? ['AVAILABLE', 'Tersedia']
                  : status === 2
                    ? ['OCCUPIED', 'Sedang digunakan']
                    : status === 3
                      ? ['RESERVED', 'Reservasi']
                      : ['DISABLED', 'Nonaktif'];

              return (
                <article key={table.id} className="rounded-[24px] border border-black/[0.07] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f2ee]"><Armchair className="h-5 w-5" /></span>
                    <div className="text-right">
                      <span className="rounded-full bg-black px-2.5 py-1 text-[7px] font-black tracking-[.1em] text-white">{statusInfo[0]}</span>
                      <p className={`mt-2 text-[8px] font-black ${table.iot_online ? 'text-emerald-600' : 'text-black/25'}`}>
                        {table.iot_registered ? (table.iot_online ? 'IOT ONLINE' : 'IOT OFFLINE') : 'NO DEVICE'}
                      </p>
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-.04em]">{name}</h2>
                  <p className="mt-1 text-[10px] text-black/35">{statusInfo[1]}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniInfo label="Kode" value={String(table.table_code || '-')} />
                    <MiniInfo label="Kapasitas" value={table.capacity ? `${table.capacity} Pax` : '-'} />
                  </div>
                  <div className="mt-2 rounded-xl bg-[#f5f5f1] p-3">
                    <p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">Device serial</p>
                    <p className="mt-1 truncate font-mono text-[9px] font-black">{table.iot_device_serial || 'Belum dipasang'}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {status !== 3 && (
                      <button type="button" disabled={statusId === Number(table.id)} onClick={() => void changeStatus(table)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f2f2ee] text-[9px] font-black disabled:opacity-40">
                        {statusId === Number(table.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings2 className="h-3.5 w-3.5" />} Status
                      </button>
                    )}
                    <button type="button" disabled={deviceId === Number(table.id)} onClick={() => void manageDevice(table)} className={`${status === 3 ? 'col-span-2' : ''} flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] text-[9px] font-black disabled:opacity-40`}>
                      {deviceId === Number(table.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bluetooth className="h-3.5 w-3.5" />} Device
                    </button>
                  </div>

                  {table.iot_online && (
                    <button type="button" disabled={pagingId === Number(table.id)} onClick={() => void togglePager(table)} className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-black text-white ${table.iot_pager_active ? 'bg-red-600' : 'bg-black'}`}>
                      {pagingId === Number(table.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} {table.iot_pager_active ? 'Matikan Pager' : 'Panggil Pager'}
                    </button>
                  )}

                  {status === 2 && (
                    <button type="button" disabled={releasingId === Number(table.id)} onClick={() => void release(table)} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[10px] font-black text-white">
                      {releasingId === Number(table.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Kosongkan meja
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[#f5f5f1] p-3"><p className="text-[7px] font-black uppercase tracking-[.11em] text-black/25">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f5f5f1] p-3"><p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">{label}</p><p className="mt-1 truncate text-[9px] font-black">{value}</p></div>;
}
