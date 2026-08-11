'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Download,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  QrCode,
  Save,
  Shield,
  Trash2,
  User,
  UserCog,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { Toast } from '@/utils/toast';

export type Role = 'Owner' | 'Cashier' | 'Kitchen' | 'User';

export interface BranchData {
  id: number;
  name: string;
  slug?: string | null;
  isActive?: boolean;
}

export interface StaffData {
  id: number;
  name: string;
  email: string;
  token: string;
  role: Role;
  defaultPassword?: string;

  branchId?: number | null;
  branch_id?: number | null;
  branchName?: string | null;
  branch_name?: string | null;

  isPrimaryAdmin?: boolean;
  is_primary_admin?: boolean;
  isMainAdmin?: boolean;
  is_main_admin?: boolean;
}

type StaffFormData = {
  name: string;
  email: string;
  role: Role;
  branchId: number | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const EMPTY_FORM: StaffFormData = {
  name: '',
  email: '',
  role: 'Cashier',
  branchId: null,
};

function normalizeRole(value: unknown): Role {
  const role = String(value ?? '').trim().toLowerCase();

  if (role === 'owner') return 'Owner';
  if (role === 'kitchen') return 'Kitchen';
  if (role === 'user') return 'User';
  return 'Cashier';
}

function getStaffBranchId(staff: StaffData): number | null {
  const value = staff.branchId ?? staff.branch_id ?? null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getStaffBranchName(staff: StaffData): string | null {
  return staff.branchName ?? staff.branch_name ?? null;
}

/**
 * Admin utama harus ditandai oleh backend dengan salah satu flag berikut:
 * isPrimaryAdmin / is_primary_admin / isMainAdmin / is_main_admin.
 *
 * Jangan hanya memakai role Owner sebagai penentu, karena owner tambahan
 * masih boleh ditempatkan ke cabang.
 */
function isPrimaryAdmin(staff: StaffData): boolean {
  return Boolean(
    staff.isPrimaryAdmin ??
      staff.is_primary_admin ??
      staff.isMainAdmin ??
      staff.is_main_admin ??
      false,
  );
}

export default function StaffManager() {
  const params = useParams();

  const mitraSlug = useMemo(() => {
    const value = params?.mitraSlug ?? params?.slug;
    return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
  }, [params]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQR, setSelectedQR] = useState<StaffData | null>(null);

  const [formData, setFormData] = useState<StaffFormData>(EMPTY_FORM);

  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [branches, setBranches] = useState<BranchData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [updatingBranchFor, setUpdatingBranchFor] = useState<number | null>(null);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.isActive !== false),
    [branches],
  );

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch('/api/pos/staff', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      });

      const result = (await response.json()) as ApiResponse<StaffData[]>;

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message ?? 'Gagal memuat data karyawan.');
      }

      setStaffList(
        result.data.map((staff) => ({
          ...staff,
          role: normalizeRole(staff.role),
        })),
      );
    } catch (error) {
      console.error('Fetch staff error:', error);
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal memuat data karyawan.',
      });
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    if (!mitraSlug) {
      setBranches([]);
      setIsLoadingBranches(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/pos/branches?slug=${encodeURIComponent(mitraSlug)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
          cache: 'no-store',
        },
      );

      const result = (await response.json()) as ApiResponse<BranchData[]>;

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message ?? 'Gagal memuat daftar cabang.');
      }

      setBranches(result.data);
    } catch (error) {
      console.error('Fetch branches error:', error);
      setBranches([]);
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal memuat daftar cabang.',
      });
    } finally {
      setIsLoadingBranches(false);
    }
  }, [mitraSlug]);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setIsLoading(true);
      setIsLoadingBranches(true);

      await Promise.all([fetchStaff(), fetchBranches()]);

      if (active) setIsLoading(false);
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [fetchBranches, fetchStaff]);

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'Owner':
        return 'Owner (Full Akses)';
      case 'Cashier':
        return 'Cashier (Akses POS)';
      case 'Kitchen':
        return 'Kitchen (Akses KDS)';
      case 'User':
        return 'User Biasa';
      default:
        return 'Staff';
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Owner':
        return 'bg-[#0E5C37]/10 text-[#0E5C37] border-[#0E5C37]/20';
      case 'Cashier':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Kitchen':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'User':
        return 'bg-stone-50 text-stone-600 border-stone-200';
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  const handleDownloadQR = () => {
    if (!selectedQR) return;

    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');

    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_Login_${selectedQR.name.replace(/\s+/g, '_')}.png`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    Toast.fire({ icon: 'success', title: 'QR Code berhasil diunduh!' });
  };

  const handleAddStaff = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !email) {
      Toast.fire({ icon: 'warning', title: 'Nama dan email wajib diisi.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pos/staff', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          role: formData.role,
          branchId: formData.branchId,
          branch_id: formData.branchId,
        }),
      });

      const result = (await response.json()) as ApiResponse<StaffData>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message ?? 'Gagal menambahkan staf.');
      }

      const newStaff: StaffData = {
        ...result.data,
        id: result.data.id ?? Date.now(),
        name: result.data.name ?? name,
        email: result.data.email ?? email,
        token: result.data.token,
        role: normalizeRole(result.data.role ?? formData.role),
        branchId:
          result.data.branchId ?? result.data.branch_id ?? formData.branchId,
        branchName:
          result.data.branchName ??
          result.data.branch_name ??
          activeBranches.find((branch) => branch.id === formData.branchId)?.name ??
          null,
      };

      Toast.fire({
        icon: 'success',
        title: result.message ?? 'Staf berhasil ditambahkan.',
      });

      setIsFormOpen(false);
      setFormData(EMPTY_FORM);
      setSelectedQR(newStaff);

      await fetchStaff();
    } catch (error) {
      console.error('Add staff error:', error);
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal menambahkan staf.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBranchChange = async (staff: StaffData, branchId: number | null) => {
    if (isPrimaryAdmin(staff)) {
      Toast.fire({
        icon: 'warning',
        title: 'Admin utama tidak dapat ditempatkan ke cabang tertentu.',
      });
      return;
    }

    const previousBranchId = getStaffBranchId(staff);
    const previousBranchName = getStaffBranchName(staff);
    const nextBranchName =
      activeBranches.find((branch) => branch.id === branchId)?.name ?? null;

    setUpdatingBranchFor(staff.id);

    // Optimistic update.
    setStaffList((current) =>
      current.map((item) =>
        item.id === staff.id
          ? {
              ...item,
              branchId,
              branch_id: branchId,
              branchName: nextBranchName,
              branch_name: nextBranchName,
            }
          : item,
      ),
    );

    try {
      const response = await fetch('/api/pos/staff', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: staff.id,
          branchId,
          branch_id: branchId,
          action: 'update-branch',
        }),
      });

      const result = (await response.json()) as ApiResponse<StaffData>;

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? 'Gagal memperbarui cabang staf.');
      }

      Toast.fire({
        icon: 'success',
        title: branchId
          ? `Cabang ${staff.name} berhasil diperbarui.`
          : `${staff.name} sekarang dapat mengakses semua cabang.`,
      });
    } catch (error) {
      console.error('Update branch error:', error);

      // Rollback jika API gagal.
      setStaffList((current) =>
        current.map((item) =>
          item.id === staff.id
            ? {
                ...item,
                branchId: previousBranchId,
                branch_id: previousBranchId,
                branchName: previousBranchName,
                branch_name: previousBranchName,
              }
            : item,
        ),
      );

      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal memperbarui cabang staf.',
      });
    } finally {
      setUpdatingBranchFor(null);
    }
  };

  const handleDelete = async (staff: StaffData) => {
    if (isPrimaryAdmin(staff)) {
      Toast.fire({ icon: 'warning', title: 'Admin utama tidak dapat dihapus.' });
      return;
    }

    try {
      const response = await fetch(`/api/pos/staff?id=${staff.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? 'Gagal mencabut akses karyawan.');
      }

      Toast.fire({ icon: 'success', title: 'Akses karyawan dicabut.' });
      await fetchStaff();
    } catch (error) {
      console.error('Delete staff error:', error);
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Terjadi kesalahan sistem.',
      });
    }
  };

  return (
    <div className="relative w-full space-y-6">
      <AnimatePresence>
        {selectedQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-6 text-center shadow-2xl md:p-8"
            >
              <button
                type="button"
                onClick={() => setSelectedQR(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#0E5C37]">
                <QrCode className="h-6 w-6" />
              </div>

              <h3 className="text-xl font-black tracking-tight text-stone-800">
                {selectedQR.name}
              </h3>

              <span
                className={`mt-2 rounded-md border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${getRoleColor(selectedQR.role)}`}
              >
                {getRoleLabel(selectedQR.role)}
              </span>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                <Building2 className="h-3.5 w-3.5" />
                {isPrimaryAdmin(selectedQR)
                  ? 'Admin Utama · Semua Cabang'
                  : getStaffBranchName(selectedQR) ?? 'Semua Cabang'}
              </div>

              <div className="mb-2 mt-6 inline-block rounded-2xl border-2 border-dashed border-stone-200 bg-white p-4">
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={selectedQR.token}
                  size={200}
                  level="Q"
                  includeMargin
                />
              </div>

              <div className="mb-5 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left">
                <div className="mb-1 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Email Login
                  </p>
                </div>

                <p className="break-all text-sm font-semibold text-stone-800">
                  {selectedQR.email}
                </p>

                {selectedQR.defaultPassword && (
                  <div className="mt-2 border-t border-stone-200 pt-2">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Password Default
                    </p>
                    <p className="font-mono text-sm font-bold text-[#0E5C37]">
                      {selectedQR.defaultPassword}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E5C37] py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800"
              >
                <Download className="h-4 w-4" />
                Unduh QR Code
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">
            Pengaturan Akses
          </p>
          <h2 className="text-xl font-black tracking-tight text-stone-800">
            Manajemen Karyawan
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Tentukan cabang kerja setiap staf. Admin utama selalu memiliki akses semua cabang.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((value) => !value)}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-widest shadow-sm transition ${
            isFormOpen
              ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              : 'bg-[#0E5C37] text-white hover:bg-emerald-800'
          }`}
        >
          {isFormOpen ? (
            <>
              <X className="h-4 w-4" /> Batal
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Tambah Staf
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 rounded-[2rem] border border-stone-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 border-b border-stone-100 pb-3 text-sm font-black text-stone-800">
                Informasi Karyawan Baru
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Nama Karyawan
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Contoh: Budi"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Email Login
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      placeholder="Contoh: budi@evognito.com"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Peran / Akses
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <select
                      value={formData.role}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          role: event.target.value as Role,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37]"
                    >
                      <option value="Owner">Owner (Full Akses)</option>
                      <option value="Cashier">Cashier (Akses POS)</option>
                      <option value="Kitchen">Kitchen (Akses Dapur KDS)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Cabang
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <select
                      value={formData.branchId ?? ''}
                      disabled={isLoadingBranches}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          branchId: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Semua Cabang</option>
                      {activeBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleAddStaff()}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-[#0E5C37] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan & Buat QR
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-[1.5rem] border border-stone-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Karyawan
                </th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Peran & Akses
                </th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Cabang Kerja
                </th>
                <th className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Akses Login POS
                </th>
                <th className="p-4 text-right text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#0E5C37]" />
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => {
                  const primaryAdmin = isPrimaryAdmin(staff);
                  const branchId = getStaffBranchId(staff);
                  const updating = updatingBranchFor === staff.id;

                  return (
                    <tr
                      key={staff.id}
                      className="group transition-colors hover:bg-stone-50/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                            <UserCog className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-stone-800">
                                {staff.name}
                              </span>
                              {primaryAdmin && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
                                  <LockKeyhole className="h-3 w-3" /> Admin Utama
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-stone-400">
                              {staff.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${getRoleColor(staff.role)}`}
                        >
                          {getRoleLabel(staff.role)}
                        </span>
                      </td>

                      <td className="p-4">
                        {primaryAdmin ? (
                          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                            <Building2 className="h-4 w-4" />
                            Semua Cabang
                          </div>
                        ) : (
                          <div className="relative min-w-[210px] max-w-[280px]">
                            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <select
                              value={branchId ?? ''}
                              disabled={updating || isLoadingBranches}
                              onChange={(event) =>
                                void handleBranchChange(
                                  staff,
                                  event.target.value ? Number(event.target.value) : null,
                                )
                              }
                              className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-9 text-xs font-semibold text-stone-700 outline-none transition focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="">Semua Cabang</option>
                              {activeBranches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                  {branch.name}
                                </option>
                              ))}
                            </select>

                            {updating && (
                              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#0E5C37]" />
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedQR(staff)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600 transition hover:border-[#0E5C37] hover:bg-[#0E5C37] hover:text-white"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Lihat QR
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(staff)}
                          disabled={primaryAdmin}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                          title={
                            primaryAdmin
                              ? 'Admin utama tidak dapat dihapus'
                              : 'Cabut Akses Karyawan'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {!isLoading && staffList.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm font-medium text-stone-400"
                  >
                    Belum ada data staf yang terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}