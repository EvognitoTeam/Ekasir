"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Download,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

import { useLanguageStore } from "@/store/language.store";
import { Toast } from "@/utils/toast";

export type Role = "Owner" | "Cashier" | "Kitchen" | "User";

type BranchData = {
  id: number;
  name: string;
  slug?: string | null;
  branch_slug?: string | null;
  isActive?: boolean;
};

type StaffData = {
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
};

type StaffForm = { name: string; email: string; role: Role; branchId: number | null };
type ApiResponse<T> = { success: boolean; message?: string; data?: T };

const EMPTY_FORM: StaffForm = { name: "", email: "", role: "Cashier", branchId: null };

const copy = {
  id: {
    eyebrow: "Organization / Access",
    title: "Staf & PIN",
    subtitle: "Kelola akses staf, penempatan cabang, QR login, dan credential awal dari satu tempat.",
    total: "Total staf",
    owners: "Owner",
    outletScoped: "Terikat cabang",
    add: "Tambah staf",
    refresh: "Perbarui",
    search: "Cari nama atau email...",
    allRoles: "Semua role",
    allBranches: "Semua cabang",
    mainAdmin: "Admin utama",
    allAccess: "Semua cabang",
    branch: "Cabang kerja",
    access: "Akses",
    showQr: "QR login",
    revoke: "Cabut akses",
    empty: "Belum ada staf yang cocok.",
    addTitle: "Tambah akses staf",
    name: "Nama staf",
    email: "Email login",
    role: "Role",
    branchField: "Penempatan cabang",
    branchHint: "Kosong / Semua cabang berarti staf tidak dikunci ke satu outlet.",
    cancel: "Batal",
    save: "Buat staf",
    saving: "Membuat...",
    owner: "Owner",
    cashier: "Cashier",
    kitchen: "Kitchen",
    user: "User",
    ownerDesc: "Akses owner / administrasi",
    cashierDesc: "Akses POS kasir",
    kitchenDesc: "Akses KDS dapur",
    userDesc: "Akun user biasa",
    qrTitle: "Credential staf",
    qrSubtitle: "QR ini digunakan untuk autentikasi staf di perangkat operasional.",
    defaultPassword: "Password / PIN awal",
    noDefaultPassword: "Backend tidak mengirim credential awal untuk akun ini.",
    downloadQr: "Unduh QR",
    deleteTitle: "Cabut akses staf?",
    deleteBody: "Akses akun ini akan dicabut. Admin utama tidak dapat dihapus dari halaman ini.",
    confirmDelete: "Ya, cabut akses",
    primaryLocked: "Admin utama selalu memiliki akses semua cabang.",
    created: "Staf berhasil ditambahkan.",
    branchUpdated: "Cabang staf berhasil diperbarui.",
    deleted: "Akses staf berhasil dicabut.",
    loadError: "Gagal memuat data staf.",
    branchLoadError: "Gagal memuat daftar cabang.",
    saveError: "Gagal menambahkan staf.",
    updateError: "Gagal memperbarui cabang staf.",
    deleteError: "Gagal mencabut akses staf.",
    required: "Nama dan email wajib diisi.",
  },
  en: {
    eyebrow: "Organization / Access",
    title: "Staff & PIN",
    subtitle: "Manage staff access, outlet assignment, QR login, and initial credentials in one place.",
    total: "Total staff",
    owners: "Owners",
    outletScoped: "Outlet scoped",
    add: "Add staff",
    refresh: "Refresh",
    search: "Search name or email...",
    allRoles: "All roles",
    allBranches: "All branches",
    mainAdmin: "Primary admin",
    allAccess: "All branches",
    branch: "Work branch",
    access: "Access",
    showQr: "Login QR",
    revoke: "Revoke access",
    empty: "No matching staff found.",
    addTitle: "Add staff access",
    name: "Staff name",
    email: "Login email",
    role: "Role",
    branchField: "Branch assignment",
    branchHint: "All branches means this staff account is not locked to one outlet.",
    cancel: "Cancel",
    save: "Create staff",
    saving: "Creating...",
    owner: "Owner",
    cashier: "Cashier",
    kitchen: "Kitchen",
    user: "User",
    ownerDesc: "Owner / admin access",
    cashierDesc: "POS cashier access",
    kitchenDesc: "Kitchen KDS access",
    userDesc: "Regular user account",
    qrTitle: "Staff credential",
    qrSubtitle: "This QR is used to authenticate staff on operational devices.",
    defaultPassword: "Initial password / PIN",
    noDefaultPassword: "The backend did not return an initial credential for this account.",
    downloadQr: "Download QR",
    deleteTitle: "Revoke staff access?",
    deleteBody: "This account access will be revoked. The primary admin cannot be removed from this page.",
    confirmDelete: "Yes, revoke access",
    primaryLocked: "Primary admin always has access to all branches.",
    created: "Staff added successfully.",
    branchUpdated: "Staff branch updated successfully.",
    deleted: "Staff access revoked successfully.",
    loadError: "Failed to load staff.",
    branchLoadError: "Failed to load branches.",
    saveError: "Failed to add staff.",
    updateError: "Failed to update staff branch.",
    deleteError: "Failed to revoke staff access.",
    required: "Name and email are required.",
  },
} as const;

function normalizeRole(value: unknown): Role {
  const role = String(value ?? "").trim().toLowerCase();
  if (role === "owner") return "Owner";
  if (role === "kitchen") return "Kitchen";
  if (role === "user") return "User";
  return "Cashier";
}

function getStaffBranchId(staff: StaffData): number | null {
  const raw = staff.branchId ?? staff.branch_id ?? null;
  const value = Number(raw);
  return raw !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function getStaffBranchName(staff: StaffData): string | null {
  return staff.branchName ?? staff.branch_name ?? null;
}

function isPrimaryAdmin(staff: StaffData): boolean {
  return Boolean(staff.isPrimaryAdmin ?? staff.is_primary_admin ?? staff.isMainAdmin ?? staff.is_main_admin ?? false);
}

export default function AdminStaffPage() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = String(params.mitraSlug ?? "");
  const locale = useLanguageStore((state) => state.locale);
  const t = copy[locale];

  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedQR, setSelectedQR] = useState<StaffData | null>(null);
  const [updatingBranchFor, setUpdatingBranchFor] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeBranches = useMemo(() => branches.filter((branch) => branch.isActive !== false), [branches]);

  const fetchStaff = useCallback(async () => {
    const response = await fetch("/api/pos/staff", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = (await response.json()) as ApiResponse<StaffData[]>;
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message ?? t.loadError);
    setStaffList(result.data.map((staff) => ({ ...staff, role: normalizeRole(staff.role) })));
  }, [t.loadError]);

  const fetchBranches = useCallback(async () => {
    if (!slug) return;
    const response = await fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = (await response.json()) as ApiResponse<BranchData[]>;
    if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error(result.message ?? t.branchLoadError);
    setBranches(result.data);
  }, [slug, t.branchLoadError]);

  const loadAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      await Promise.all([fetchStaff(), fetchBranches()]);
    } catch (error) {
      console.error("[ADMIN_STAFF_LOAD]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.loadError });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [fetchBranches, fetchStaff, t.loadError]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((staff) => {
      const matchesRole = roleFilter === "all" || staff.role === roleFilter;
      const matchesSearch = !q || `${staff.name} ${staff.email} ${getStaffBranchName(staff) ?? ""}`.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, staffList]);

  const metrics = useMemo(() => ({
    total: staffList.length,
    owners: staffList.filter((staff) => staff.role === "Owner").length,
    scoped: staffList.filter((staff) => getStaffBranchId(staff) !== null).length,
  }), [staffList]);

  const handleAddStaff = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      Toast.fire({ icon: "warning", title: t.required });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/pos/staff", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role: form.role, branchId: form.branchId, branch_id: form.branchId }),
      });
      const result = (await response.json()) as ApiResponse<StaffData>;
      if (!response.ok || !result.success || !result.data) throw new Error(result.message ?? t.saveError);

      const newStaff: StaffData = {
        ...result.data,
        id: result.data.id ?? Date.now(),
        name: result.data.name ?? name,
        email: result.data.email ?? email,
        token: result.data.token,
        role: normalizeRole(result.data.role ?? form.role),
        branchId: result.data.branchId ?? result.data.branch_id ?? form.branchId,
        branchName: result.data.branchName ?? result.data.branch_name ?? activeBranches.find((branch) => branch.id === form.branchId)?.name ?? null,
      };

      Toast.fire({ icon: "success", title: result.message ?? t.created });
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setSelectedQR(newStaff);
      await fetchStaff();
    } catch (error) {
      console.error("[ADMIN_STAFF_CREATE]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.saveError });
    } finally {
      setSaving(false);
    }
  };

  const handleBranchChange = async (staff: StaffData, branchId: number | null) => {
    if (isPrimaryAdmin(staff)) {
      Toast.fire({ icon: "warning", title: t.primaryLocked });
      return;
    }

    const previousBranchId = getStaffBranchId(staff);
    const previousBranchName = getStaffBranchName(staff);
    const nextBranchName = activeBranches.find((branch) => branch.id === branchId)?.name ?? null;
    setUpdatingBranchFor(staff.id);

    setStaffList((current) => current.map((item) => item.id === staff.id ? {
      ...item,
      branchId,
      branch_id: branchId,
      branchName: nextBranchName,
      branch_name: nextBranchName,
    } : item));

    try {
      const response = await fetch("/api/pos/staff", {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ id: staff.id, branchId, branch_id: branchId, action: "update-branch" }),
      });
      const result = (await response.json()) as ApiResponse<StaffData>;
      if (!response.ok || !result.success) throw new Error(result.message ?? t.updateError);
      Toast.fire({ icon: "success", title: result.message ?? t.branchUpdated });
    } catch (error) {
      setStaffList((current) => current.map((item) => item.id === staff.id ? {
        ...item,
        branchId: previousBranchId,
        branch_id: previousBranchId,
        branchName: previousBranchName,
        branch_name: previousBranchName,
      } : item));
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.updateError });
    } finally {
      setUpdatingBranchFor(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    if (isPrimaryAdmin(deleteTarget)) {
      Toast.fire({ icon: "warning", title: t.primaryLocked });
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/pos/staff?id=${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const result = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !result.success) throw new Error(result.message ?? t.deleteError);
      Toast.fire({ icon: "success", title: result.message ?? t.deleted });
      setDeleteTarget(null);
      await fetchStaff();
    } catch (error) {
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.deleteError });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadQR = () => {
    if (!selectedQR) return;
    const canvas = document.getElementById("staff-qr-code-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    link.download = `KALOO_QR_${selectedQR.name.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roleLabel = (role: Role) => ({ Owner: t.owner, Cashier: t.cashier, Kitchen: t.kitchen, User: t.user }[role]);
  const roleDescription = (role: Role) => ({ Owner: t.ownerDesc, Cashier: t.cashierDesc, Kitchen: t.kitchenDesc, User: t.userDesc }[role]);

  return (
    <div className="min-h-full bg-[#f7f7f4] text-[#111]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/35">{t.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={async () => { setRefreshing(true); await loadAll(false); setRefreshing(false); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold shadow-sm">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {t.refresh}
            </button>
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-bold text-white shadow-sm">
              <Plus size={15} /> {t.add}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Metric icon={Users} label={t.total} value={metrics.total} />
          <Metric icon={ShieldCheck} label={t.owners} value={metrics.owners} />
          <Metric icon={Building2} label={t.outletScoped} value={metrics.scoped} />
        </div>

        <div className="mt-6 grid gap-3 rounded-[24px] border border-black/[0.07] bg-white p-3 shadow-sm md:grid-cols-[1fr_210px] sm:p-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/25" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="h-11 w-full rounded-xl bg-[#f5f5f1] pl-10 pr-4 text-sm font-medium outline-none" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | Role)} className="h-11 rounded-xl border-0 bg-[#f5f5f1] px-3 text-xs font-bold outline-none">
            <option value="all">{t.allRoles}</option>
            <option value="Owner">{t.owner}</option>
            <option value="Cashier">{t.cashier}</option>
            <option value="Kitchen">{t.kitchen}</option>
            <option value="User">{t.user}</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-black/35" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm font-semibold text-black/35">{t.empty}</div>
          ) : (
            <div className="divide-y divide-black/[0.055]">
              {filtered.map((staff) => {
                const primary = isPrimaryAdmin(staff);
                const branchId = getStaffBranchId(staff);
                return (
                  <div key={staff.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_150px_minmax(210px,.8fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white"><UserRound size={16} /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold">{staff.name}</p>
                          {primary && <span className="rounded-full bg-[#efefe9] px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.1em] text-black/45">{t.mainAdmin}</span>}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-black/40"><Mail size={11} /><span className="truncate">{staff.email}</span></div>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex rounded-full bg-[#f2f2ee] px-2.5 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-black/55">{roleLabel(staff.role)}</span>
                      <p className="mt-1.5 text-[9px] leading-4 text-black/30">{roleDescription(staff.role)}</p>
                    </div>

                    <div className="relative">
                      <p className="mb-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30">{t.branch}</p>
                      <select
                        value={primary ? "" : branchId ?? ""}
                        disabled={primary || updatingBranchFor === staff.id}
                        onChange={(event) => void handleBranchChange(staff, event.target.value ? Number(event.target.value) : null)}
                        className="h-10 w-full rounded-xl border border-black/[0.07] bg-[#f7f7f4] px-3 text-[10px] font-bold outline-none disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <option value="">{t.allAccess}</option>
                        {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                      {updatingBranchFor === staff.id && <Loader2 size={13} className="absolute bottom-3 right-3 animate-spin text-black/35" />}
                    </div>

                    <div className="flex gap-2 lg:justify-end">
                      <button type="button" onClick={() => setSelectedQR(staff)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white"><QrCode size={13} /> {t.showQr}</button>
                      <button type="button" disabled={primary} onClick={() => setDeleteTarget(staff)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f1] text-red-500 disabled:cursor-not-allowed disabled:opacity-25" aria-label={t.revoke}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 290 }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[#f7f7f4] shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/[0.07] bg-white px-5 py-4">
                <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">{t.eyebrow}</p><h2 className="mt-1 text-lg font-semibold">{t.addTitle}</h2></div>
                <button type="button" onClick={() => !saving && setDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f2ee] text-black/45"><X size={16} /></button>
              </div>
              <form onSubmit={handleAddStaff} className="flex flex-1 flex-col overflow-y-auto">
                <div className="flex-1 space-y-5 p-5 sm:p-6">
                  <Field label={t.name}><input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="input-control" /></Field>
                  <Field label={t.email}><input type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="input-control" /></Field>
                  <Field label={t.role}>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Owner", "Cashier", "Kitchen", "User"] as Role[]).map((role) => (
                        <button key={role} type="button" onClick={() => setForm((v) => ({ ...v, role }))} className={`rounded-2xl border p-3 text-left transition ${form.role === role ? "border-black bg-black text-white" : "border-black/[0.07] bg-white"}`}>
                          <p className="text-xs font-extrabold">{roleLabel(role)}</p><p className={`mt-1 text-[9px] leading-4 ${form.role === role ? "text-white/45" : "text-black/35"}`}>{roleDescription(role)}</p>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={t.branchField}>
                    <select value={form.branchId ?? ""} onChange={(e) => setForm((v) => ({ ...v, branchId: e.target.value ? Number(e.target.value) : null }))} className="input-control">
                      <option value="">{t.allAccess}</option>
                      {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                    <p className="mt-2 text-[10px] leading-5 text-black/35">{t.branchHint}</p>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-black/[0.07] bg-white p-5">
                  <button type="button" disabled={saving} onClick={() => setDrawerOpen(false)} className="h-12 rounded-xl bg-[#f2f2ee] text-sm font-bold text-black/55">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? t.saving : t.save}</button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="relative w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
              <button type="button" onClick={() => setSelectedQR(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f2ee] text-black/45"><X size={15} /></button>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white"><QrCode size={17} /></div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.035em]">{t.qrTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-black/40">{t.qrSubtitle}</p>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f6f6f2] p-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{selectedQR.name}</p><p className="mt-0.5 truncate text-[10px] text-black/40">{selectedQR.email}</p></div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.09em] text-black/45 ring-1 ring-black/[0.06]">{roleLabel(selectedQR.role)}</span>
              </div>
              <div className="mx-auto mt-5 w-fit rounded-[22px] border border-dashed border-black/15 bg-white p-3"><QRCodeCanvas id="staff-qr-code-canvas" value={selectedQR.token} size={205} level="Q" includeMargin /></div>
              <div className="mt-4 rounded-2xl border border-black/[0.07] bg-[#f7f7f4] p-4">
                <div className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/30"><KeyRound size={11} />{t.defaultPassword}</div>
                {selectedQR.defaultPassword ? <p className="mt-2 font-mono text-lg font-extrabold tracking-[0.08em]">{selectedQR.defaultPassword}</p> : <p className="mt-2 text-[10px] leading-5 text-black/35">{t.noDefaultPassword}</p>}
              </div>
              <button type="button" onClick={handleDownloadQR} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-xs font-extrabold uppercase tracking-[0.08em] text-white"><Download size={14} /> {t.downloadQr}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={17} /></div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{t.deleteTitle}</h3>
              <p className="mt-2 text-sm font-extrabold">{deleteTarget.name}</p>
              <p className="mt-2 text-xs leading-5 text-black/45">{t.deleteBody}</p>
              <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="h-11 rounded-xl bg-[#f2f2ee] text-xs font-bold text-black/55">{t.cancel}</button><button type="button" disabled={deleting} onClick={() => void handleDelete()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-bold text-white disabled:opacity-50">{deleting && <Loader2 size={14} className="animate-spin" />}{t.confirmDelete}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`.input-control{width:100%;min-height:48px;border-radius:14px;border:1px solid rgba(0,0,0,.08);background:#fff;padding:0 14px;font-size:14px;font-weight:600;outline:none;transition:.2s}.input-control:focus{border-color:rgba(0,0,0,.22);box-shadow:0 0 0 3px rgba(0,0,0,.035)}`}</style>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">{label}</span><Icon size={15} className="text-black/25" /></div><p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/35">{label}</span>{children}</label>;
}
