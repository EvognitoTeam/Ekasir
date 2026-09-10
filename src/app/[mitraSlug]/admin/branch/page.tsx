"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Edit3,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";

import { useLanguageStore } from "@/store/language.store";
import { Toast } from "@/utils/toast";

type Branch = {
  id: number;
  name: string;
  branch_slug?: string | null;
  slug?: string | null;
  address?: string | null;
  phone?: string | null;
  createdAt?: string | null;
};

type BranchForm = {
  name: string;
  address: string;
  phone: string;
};

const EMPTY_FORM: BranchForm = { name: "", address: "", phone: "" };

const copy = {
  id: {
    eyebrow: "Organization / Outlets",
    title: "Manajemen Cabang",
    subtitle: "Kelola outlet, alamat operasional, dan kontak cabang dari satu workspace.",
    total: "Total cabang",
    complete: "Profil lengkap",
    incomplete: "Perlu dilengkapi",
    add: "Tambah cabang",
    search: "Cari nama, kode, alamat...",
    all: "Semua outlet",
    refresh: "Perbarui",
    empty: "Belum ada cabang yang cocok.",
    center: "Outlet utama",
    branchCode: "Kode cabang",
    contact: "Kontak",
    address: "Alamat",
    edit: "Edit",
    delete: "Hapus",
    newTitle: "Tambah cabang baru",
    editTitle: "Edit cabang",
    name: "Nama cabang",
    namePlaceholder: "Contoh: Sudirman",
    addressPlaceholder: "Alamat operasional cabang",
    phone: "Nomor telepon",
    phonePlaceholder: "08xxxxxxxxxx",
    cancel: "Batal",
    save: "Simpan cabang",
    saving: "Menyimpan...",
    deleteTitle: "Hapus cabang?",
    deleteBody: "Cabang akan di-soft delete. Data historis tidak langsung hilang, tetapi outlet tidak lagi muncul sebagai cabang aktif.",
    confirmDelete: "Ya, hapus cabang",
    created: "Cabang berhasil ditambahkan.",
    updated: "Cabang berhasil diperbarui.",
    deleted: "Cabang berhasil dihapus.",
    loadError: "Gagal memuat daftar cabang.",
    saveError: "Gagal menyimpan cabang.",
    deleteError: "Gagal menghapus cabang.",
    required: "Nama cabang wajib diisi.",
  },
  en: {
    eyebrow: "Organization / Outlets",
    title: "Branch Management",
    subtitle: "Manage outlets, operating addresses, and branch contacts from one workspace.",
    total: "Total branches",
    complete: "Complete profiles",
    incomplete: "Needs attention",
    add: "Add branch",
    search: "Search name, code, address...",
    all: "All outlets",
    refresh: "Refresh",
    empty: "No matching branches found.",
    center: "Main outlet",
    branchCode: "Branch code",
    contact: "Contact",
    address: "Address",
    edit: "Edit",
    delete: "Delete",
    newTitle: "Add new branch",
    editTitle: "Edit branch",
    name: "Branch name",
    namePlaceholder: "Example: Sudirman",
    addressPlaceholder: "Branch operating address",
    phone: "Phone number",
    phonePlaceholder: "08xxxxxxxxxx",
    cancel: "Cancel",
    save: "Save branch",
    saving: "Saving...",
    deleteTitle: "Delete branch?",
    deleteBody: "The branch will be soft-deleted. Historical data remains, but this outlet will no longer appear as an active branch.",
    confirmDelete: "Yes, delete branch",
    created: "Branch added successfully.",
    updated: "Branch updated successfully.",
    deleted: "Branch deleted successfully.",
    loadError: "Failed to load branches.",
    saveError: "Failed to save branch.",
    deleteError: "Failed to delete branch.",
    required: "Branch name is required.",
  },
} as const;

export default function AdminBranchPage() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = String(params.mitraSlug ?? "");
  const locale = useLanguageStore((state) => state.locale);
  const t = copy[locale];

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBranches = useCallback(async (silent = false) => {
    if (!slug) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || t.loadError);
      }
      setBranches(result.data);
    } catch (error) {
      console.error("[ADMIN_BRANCH_LOAD]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.loadError });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug, t.loadError]);

  useEffect(() => { void fetchBranches(); }, [fetchBranches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((branch) =>
      [branch.name, branch.branch_slug, branch.slug, branch.address, branch.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [branches, search]);

  const completeCount = useMemo(
    () => branches.filter((branch) => Boolean(branch.address?.trim()) && Boolean(branch.phone?.trim())).length,
    [branches],
  );

  const openAdd = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({ name: branch.name ?? "", address: branch.address ?? "", phone: branch.phone ?? "" });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditingBranch(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      Toast.fire({ icon: "warning", title: t.required });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/pos/branches", {
        method: editingBranch ? "PUT" : "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          id: editingBranch?.id,
          name,
          address: form.address.trim(),
          phone: form.phone.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || t.saveError);
      }
      Toast.fire({ icon: "success", title: result.message || (editingBranch ? t.updated : t.created) });
      closeDrawer();
      await fetchBranches(true);
    } catch (error) {
      console.error("[ADMIN_BRANCH_SAVE]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.saveError });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/pos/branches?slug=${encodeURIComponent(slug)}&id=${deleteTarget.id}`,
        { method: "DELETE", credentials: "include", headers: { Accept: "application/json" } },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || t.deleteError);
      }
      Toast.fire({ icon: "success", title: result.message || t.deleted });
      setDeleteTarget(null);
      await fetchBranches(true);
    } catch (error) {
      console.error("[ADMIN_BRANCH_DELETE]", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : t.deleteError });
    } finally {
      setDeleting(false);
    }
  };

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
            <button
              type="button"
              onClick={async () => { setRefreshing(true); await fetchBranches(true); setRefreshing(false); }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold shadow-sm"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {t.refresh}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              <Plus size={15} /> {t.add}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Metric icon={Store} label={t.total} value={branches.length} />
          <Metric icon={Building2} label={t.complete} value={completeCount} />
          <Metric icon={MoreHorizontal} label={t.incomplete} value={Math.max(0, branches.length - completeCount)} />
        </div>

        <div className="mt-6 rounded-[24px] border border-black/[0.07] bg-white p-3 shadow-sm sm:p-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/25" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              className="h-11 w-full rounded-xl bg-[#f5f5f1] pl-10 pr-4 text-sm font-medium outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-black/10"
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center rounded-[28px] border border-black/[0.07] bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-black/35" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-white text-sm font-semibold text-black/35">{t.empty}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((branch, index) => (
                <motion.article
                  key={branch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.15) }}
                  className="group overflow-hidden rounded-[26px] border border-black/[0.07] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.035)]"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                        <Store size={17} />
                      </div>
                      <span className="rounded-full bg-[#f2f2ee] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.13em] text-black/40">
                        {branch.branch_slug || branch.slug || t.center}
                      </span>
                    </div>

                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.035em]">{branch.name}</h2>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-black/25">{t.branchCode}</p>

                    <div className="mt-5 space-y-3">
                      <InfoLine icon={MapPin} label={t.address} value={branch.address || "—"} />
                      <InfoLine icon={Phone} label={t.contact} value={branch.phone || "—"} />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-black/[0.06] bg-[#fafaf7] p-3">
                    <button
                      type="button"
                      onClick={() => openEdit(branch)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold ring-1 ring-black/[0.07] transition hover:ring-black/15"
                    >
                      <Edit3 size={13} /> {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(branch)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-500 ring-1 ring-black/[0.07] transition hover:bg-red-50"
                      aria-label={t.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 290 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[#f7f7f4] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/[0.07] bg-white px-5 py-4">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">{t.eyebrow}</p>
                  <h2 className="mt-1 text-lg font-semibold">{editingBranch ? t.editTitle : t.newTitle}</h2>
                </div>
                <button type="button" onClick={closeDrawer} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f2ee] text-black/45"><X size={16} /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
                <div className="flex-1 space-y-5 p-5 sm:p-6">
                  <Field label={t.name}>
                    <input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder={t.namePlaceholder} className="input-control" />
                  </Field>
                  <Field label={t.phone}>
                    <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder={t.phonePlaceholder} className="input-control" />
                  </Field>
                  <Field label={t.address}>
                    <textarea value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} placeholder={t.addressPlaceholder} rows={5} className="input-control resize-none py-3" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-black/[0.07] bg-white p-5">
                  <button type="button" onClick={closeDrawer} disabled={saving} className="h-12 rounded-xl bg-[#f2f2ee] text-sm font-bold text-black/55 disabled:opacity-50">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white disabled:opacity-50">
                    {saving && <Loader2 size={15} className="animate-spin" />} {saving ? t.saving : t.save}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 size={17} /></div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{t.deleteTitle}</h3>
              <p className="mt-2 text-sm font-semibold">{deleteTarget.name}</p>
              <p className="mt-2 text-xs leading-5 text-black/45">{t.deleteBody}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="h-11 rounded-xl bg-[#f2f2ee] text-xs font-bold text-black/55">{t.cancel}</button>
                <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-bold text-white disabled:opacity-50">
                  {deleting && <Loader2 size={14} className="animate-spin" />} {t.confirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .input-control { width:100%; min-height:48px; border-radius:14px; border:1px solid rgba(0,0,0,.08); background:#fff; padding:0 14px; font-size:14px; font-weight:600; outline:none; transition:.2s; }
        .input-control:focus { border-color:rgba(0,0,0,.22); box-shadow:0 0 0 3px rgba(0,0,0,.035); }
      `}</style>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number }) {
  return <div className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">{label}</span><Icon size={15} className="text-black/25" /></div><p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</p></div>;
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f2f2ee] text-black/35"><Icon size={13} /></span><div className="min-w-0"><p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-black/25">{label}</p><p className="mt-0.5 break-words text-xs leading-5 text-black/55">{value}</p></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/35">{label}</span>{children}</label>;
}
