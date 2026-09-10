"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Check,
  ChevronRight,
  CircleDot,
  Edit3,
  Layers3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Tag,
  X,
} from "lucide-react";

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  Toast,
} from "@/utils/toast";

type Locale = "id" | "en";
type DrawerType = "group" | "item";

type Branch = {
  id: number | string;
  name: string;
};

type AddonGroup = {
  id: number | string;
  name: string;
  isRequired?: number | string | boolean;
  maxSelected?: number | string;
};

type AddonItem = {
  id: number | string;
  name: string;
  price: number | string;
  category_id: number | string;
  stock?: number | string | null;
  is_track_stock?: number | string | boolean | null;
};

const copy = {
  id: {
    eyebrow: "Modifier studio",
    title: "Addon menu",
    subtitle:
      "Susun grup pilihan dan item tambahan yang dapat digunakan di seluruh katalog menu.",

    refresh: "Perbarui",
    refreshing: "Memperbarui",
    newGroup: "Grup baru",
    newItem: "Item baru",

    center: "Pusat",
    groups: "Grup addon",
    items: "Item addon",
    requiredGroups: "Grup wajib",
    trackedItems: "Stok terlacak",

    searchGroup: "Cari grup addon...",
    selectGroup: "Pilih grup",
    selectGroupDesc:
      "Pilih grup di sebelah kiri untuk melihat dan mengelola item di dalamnya.",
    emptyGroup: "Belum ada grup addon.",
    emptyItem: "Belum ada item di grup ini.",

    optional: "Opsional",
    required: "Wajib",
    max: "Maks",
    selection: "pilihan",
    stock: "Stok",
    unlimited: "Tanpa batas",

    groupDetail: "Isi grup",
    groupDetailDesc:
      "Item addon yang tersedia pada grup terpilih.",

    editGroup: "Edit grup",
    addItemToGroup: "Tambah item",
    editItem: "Edit item",

    createGroup: "Buat grup addon",
    updateGroup: "Update grup addon",
    createItem: "Buat item addon",
    updateItem: "Update item addon",

    groupName: "Nama grup",
    behavior: "Sifat pilihan",
    maxSelected: "Maksimal pilihan",
    itemName: "Nama item",
    price: "Harga tambahan",
    parentGroup: "Grup induk",
    trackStock: "Lacak stok item",
    currentStock: "Jumlah stok",

    optionalChoice: "Opsional",
    requiredChoice: "Wajib dipilih",

    cancel: "Batal",
    save: "Simpan",
    saving: "Menyimpan",

    noGroupForItem:
      "Buat grup addon terlebih dahulu sebelum menambahkan item.",

    saved: "Data addon berhasil disimpan!",
    loadError: "Gagal memuat data addon.",
    genericError: "Terjadi kesalahan sistem.",
  },

  en: {
    eyebrow: "Modifier studio",
    title: "Menu add-ons",
    subtitle:
      "Build option groups and extra items that can be used across your menu catalog.",

    refresh: "Refresh",
    refreshing: "Refreshing",
    newGroup: "New group",
    newItem: "New item",

    center: "Main",
    groups: "Add-on groups",
    items: "Add-on items",
    requiredGroups: "Required groups",
    trackedItems: "Tracked stock",

    searchGroup: "Search add-on groups...",
    selectGroup: "Select a group",
    selectGroupDesc:
      "Choose a group on the left to view and manage the items inside it.",
    emptyGroup: "No add-on groups yet.",
    emptyItem: "No items in this group yet.",

    optional: "Optional",
    required: "Required",
    max: "Max",
    selection: "choices",
    stock: "Stock",
    unlimited: "Unlimited",

    groupDetail: "Group contents",
    groupDetailDesc:
      "Add-on items available in the selected group.",

    editGroup: "Edit group",
    addItemToGroup: "Add item",
    editItem: "Edit item",

    createGroup: "Create add-on group",
    updateGroup: "Update add-on group",
    createItem: "Create add-on item",
    updateItem: "Update add-on item",

    groupName: "Group name",
    behavior: "Selection behavior",
    maxSelected: "Maximum selections",
    itemName: "Item name",
    price: "Extra price",
    parentGroup: "Parent group",
    trackStock: "Track item stock",
    currentStock: "Current stock",

    optionalChoice: "Optional",
    requiredChoice: "Required",

    cancel: "Cancel",
    save: "Save",
    saving: "Saving",

    noGroupForItem:
      "Create an add-on group before adding an item.",

    saved: "Add-on data saved!",
    loadError: "Failed to load add-on data.",
    genericError: "A system error occurred.",
  },
} as const;

function formatCurrency(
  value: number | string | null | undefined,
  locale: Locale,
) {
  const numeric = Number(value ?? 0);

  return new Intl.NumberFormat(
    locale === "id" ? "id-ID" : "en-US",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(Number.isFinite(numeric) ? numeric : 0);
}

function boolValue(
  value: unknown,
) {
  return (
    value === true ||
    value === 1 ||
    value === "1"
  );
}

export default function AdminAddonPage() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = String(params.mitraSlug ?? "");

  const locale = useLanguageStore((state) => state.locale) as Locale;
  const t = copy[locale];

  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState("");

  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [items, setItems] = useState<AddonItem[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>("group");
  const [editId, setEditId] = useState<string | null>(null);

  const [groupForm, setGroupForm] = useState({
    name: "",
    isRequired: "0",
    maxSelected: "1",
  });

  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    groupId: "",
    stock: "",
    isTrackStock: "1",
  });

  const fetchData = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);

    try {
      const [branchRes, addonRes] = await Promise.all([
        fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(
          `/api/addons?slug=${encodeURIComponent(slug)}${
            activeBranchId
              ? `&branch_id=${encodeURIComponent(activeBranchId)}`
              : ""
          }`,
          {
            cache: "no-store",
            credentials: "include",
          },
        ),
      ]);

      const branchData = await branchRes.json();
      const addonData = await addonRes.json();

      if (branchData.success) {
        setBranches(
          Array.isArray(branchData.data)
            ? branchData.data
            : [],
        );
      }

      if (!addonRes.ok || !addonData.success) {
        throw new Error(addonData.message || t.loadError);
      }

      const nextGroups = Array.isArray(addonData.groups)
        ? addonData.groups
        : [];

      const nextItems = Array.isArray(addonData.items)
        ? addonData.items
        : [];

      setGroups(nextGroups);
      setItems(nextItems);

      setSelectedGroupId((current) => {
        if (
          current &&
          nextGroups.some(
            (group: AddonGroup) =>
              String(group.id) === current,
          )
        ) {
          return current;
        }

        return nextGroups.length
          ? String(nextGroups[0].id)
          : "";
      });
    } catch (error) {
      console.error("[ADMIN_ADDON_LOAD_ERROR]", error);

      Toast.fire({
        icon: "error",
        title:
          error instanceof Error
            ? error.message
            : t.loadError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeBranchId,
    slug,
    t.loadError,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return groups;

    return groups.filter((group) =>
      group.name.toLowerCase().includes(query),
    );
  }, [
    groups,
    search,
  ]);

  const selectedGroup = groups.find(
    (group) =>
      String(group.id) === selectedGroupId,
  );

  const selectedItems = items.filter(
    (item) =>
      String(item.category_id) === selectedGroupId,
  );

  const requiredGroups = groups.filter(
    (group) => boolValue(group.isRequired),
  ).length;

  const trackedItems = items.filter(
    (item) => boolValue(item.is_track_stock),
  ).length;

  const openGroupDrawer = (
    group?: AddonGroup,
  ) => {
    setDrawerType("group");
    setEditId(group ? String(group.id) : null);

    setGroupForm(
      group
        ? {
            name: group.name,
            isRequired: boolValue(group.isRequired) ? "1" : "0",
            maxSelected: String(group.maxSelected ?? "1"),
          }
        : {
            name: "",
            isRequired: "0",
            maxSelected: "1",
          },
    );

    setDrawerOpen(true);
  };

  const openItemDrawer = (
    groupId?: string,
    item?: AddonItem,
  ) => {
    if (!groups.length) {
      Toast.fire({
        icon: "info",
        title: t.noGroupForItem,
      });
      return;
    }

    setDrawerType("item");
    setEditId(item ? String(item.id) : null);

    setItemForm(
      item
        ? {
            name: item.name,
            price: String(item.price ?? ""),
            groupId: String(item.category_id ?? ""),
            stock: String(item.stock ?? "0"),
            isTrackStock: boolValue(item.is_track_stock)
              ? "1"
              : "0",
          }
        : {
            name: "",
            price: "",
            groupId:
              groupId ||
              selectedGroupId ||
              String(groups[0].id),
            stock: "",
            isTrackStock: "1",
          },
    );

    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (drawerType === "group" && !groupForm.name.trim()) {
      return;
    }

    if (
      drawerType === "item" &&
      (!itemForm.name.trim() || !itemForm.groupId)
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const body =
        drawerType === "group"
          ? {
              ...groupForm,
              name: groupForm.name.trim(),
              type: "group",
            }
          : {
              ...itemForm,
              name: itemForm.name.trim(),
              type: "item",
            };

      const payload = {
        ...body,
        branch_id: activeBranchId,
        id: editId,
      };

      const response = await fetch("/api/addons", {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t.genericError);
      }

      Toast.fire({
        icon: "success",
        title: t.saved,
      });

      setDrawerOpen(false);
      await fetchData();
    } catch (error) {
      Toast.fire({
        icon: "error",
        title:
          error instanceof Error
            ? error.message
            : t.genericError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !groups.length && !items.length) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
          {t.refreshing}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER */}
      <section className="flex flex-col gap-5 border-b border-black/[0.08] pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
            <Tag size={13} />
            {t.eyebrow}
          </div>

          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {t.title}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/40">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />

            {isLoading ? t.refreshing : t.refresh}
          </button>

          <button
            type="button"
            onClick={() => openGroupDrawer()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20"
          >
            <Plus size={14} />
            {t.newGroup}
          </button>

          <button
            type="button"
            onClick={() => openItemDrawer(selectedGroupId)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#262626]"
          >
            <Plus size={14} />
            {t.newItem}
          </button>
        </div>
      </section>

      {/* BRANCH */}
      <section className="overflow-x-auto">
        <div className="flex min-w-max gap-2">
          <button
            type="button"
            onClick={() => setActiveBranchId("")}
            className={[
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-extrabold transition",
              activeBranchId === ""
                ? "border-black bg-black text-white"
                : "border-black/[0.08] bg-white text-black/45 hover:text-black",
            ].join(" ")}
          >
            <Store size={13} />
            {t.center}
          </button>

          {branches.map((branch) => (
            <button
              type="button"
              key={String(branch.id)}
              onClick={() => setActiveBranchId(String(branch.id))}
              className={[
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-extrabold transition",
                activeBranchId === String(branch.id)
                  ? "border-black bg-black text-white"
                  : "border-black/[0.08] bg-white text-black/45 hover:text-black",
              ].join(" ")}
            >
              <Store size={13} />
              {branch.name}
            </button>
          ))}
        </div>
      </section>

      {/* METRICS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Layers3}
          label={t.groups}
          value={String(groups.length)}
          dark
        />

        <Metric
          icon={Tag}
          label={t.items}
          value={String(items.length)}
        />

        <Metric
          icon={Check}
          label={t.requiredGroups}
          value={String(requiredGroups)}
        />

        <Metric
          icon={Package}
          label={t.trackedItems}
          value={String(trackedItems)}
        />
      </section>

      {/* STUDIO */}
      <section className="grid min-h-[520px] overflow-hidden rounded-[26px] border border-black/[0.08] bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* GROUP RAIL */}
        <aside className="border-b border-black/[0.08] bg-[#f4f4f0] p-4 lg:border-b-0 lg:border-r">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/25"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchGroup}
              className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-black/20"
            />
          </div>

          <div className="mt-4 space-y-2">
            {filteredGroups.length ? (
              filteredGroups.map((group) => {
                const selected =
                  String(group.id) === selectedGroupId;

                const itemCount = items.filter(
                  (item) =>
                    String(item.category_id) ===
                    String(group.id),
                ).length;

                return (
                  <button
                    type="button"
                    key={String(group.id)}
                    onClick={() =>
                      setSelectedGroupId(String(group.id))
                    }
                    className={[
                      "flex w-full items-center gap-3 rounded-[16px] border p-3 text-left transition",
                      selected
                        ? "border-black bg-black text-white"
                        : "border-black/[0.06] bg-white text-black hover:border-black/15",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        selected
                          ? "bg-white/10 text-white/65"
                          : "bg-[#f3f3ef] text-black/40",
                      ].join(" ")}
                    >
                      <Layers3 size={14} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold">
                        {group.name}
                      </span>

                      <span
                        className={[
                          "mt-1 block text-[9px]",
                          selected
                            ? "text-white/35"
                            : "text-black/30",
                        ].join(" ")}
                      >
                        {itemCount} {t.items.toLowerCase()} ·{" "}
                        {boolValue(group.isRequired)
                          ? t.required
                          : t.optional}
                      </span>
                    </span>

                    <ChevronRight
                      size={13}
                      className={
                        selected
                          ? "text-white/30"
                          : "text-black/20"
                      }
                    />
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-xs text-black/30">
                {t.emptyGroup}
              </div>
            )}
          </div>
        </aside>

        {/* GROUP CONTENT */}
        <div className="p-5 sm:p-6">
          {selectedGroup ? (
            <>
              <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                      {selectedGroup.name}
                    </h3>

                    <span className="rounded-full bg-[#f3f3ef] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-black/45">
                      {boolValue(selectedGroup.isRequired)
                        ? t.required
                        : t.optional}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-black/35">
                    {t.max}: {selectedGroup.maxSelected ?? 1}{" "}
                    {t.selection}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openGroupDrawer(selectedGroup)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 text-[10px] font-extrabold text-black/50"
                  >
                    <Edit3 size={13} />
                    {t.editGroup}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openItemDrawer(String(selectedGroup.id))
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-[10px] font-extrabold text-white"
                  >
                    <Plus size={13} />
                    {t.addItemToGroup}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                    {t.groupDetail}
                  </p>

                  <p className="mt-1 text-xs text-black/35">
                    {t.groupDetailDesc}
                  </p>
                </div>

                {selectedItems.length ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {selectedItems.map((item, index) => {
                      const trackStock = boolValue(
                        item.is_track_stock,
                      );

                      return (
                        <motion.article
                          key={String(item.id)}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: Math.min(index * 0.03, 0.15),
                          }}
                          className="rounded-[20px] border border-black/[0.07] bg-[#fafaf8] p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black/40 ring-1 ring-black/[0.07]">
                                <CircleDot size={14} />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold">
                                  {item.name}
                                </p>

                                <p className="mt-1 text-[10px] font-bold text-black/35">
                                  + {formatCurrency(item.price, locale)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openItemDrawer(
                                  String(selectedGroup.id),
                                  item,
                                )
                              }
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-black/35"
                              aria-label={t.editItem}
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-black/30">
                              {t.stock}
                            </span>

                            <span className="text-[10px] font-extrabold text-black/50">
                              {trackStock
                                ? item.stock ?? 0
                                : t.unlimited}
                            </span>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-dashed border-black/[0.08] bg-[#fafaf8] text-center">
                    <Tag size={20} className="text-black/20" />
                    <p className="mt-3 text-xs text-black/35">
                      {t.emptyItem}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        openItemDrawer(String(selectedGroup.id))
                      }
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-black px-3 text-[10px] font-extrabold text-white"
                    >
                      <Plus size={12} />
                      {t.addItemToGroup}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f3ef] text-black/25">
                <Layers3 size={19} />
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                {t.selectGroup}
              </h3>

              <p className="mt-2 max-w-sm text-xs leading-5 text-black/35">
                {t.selectGroupDesc}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* DRAWER */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
              }}
              className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[500px] flex-col bg-[#f7f7f4] shadow-[-24px_0_60px_rgba(0,0,0,0.14)]"
            >
              <div className="flex items-center justify-between border-b border-black/[0.08] bg-white px-5 py-5">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                    {drawerType === "group"
                      ? t.groups
                      : t.items}
                  </p>

                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                    {drawerType === "group"
                      ? editId
                        ? t.updateGroup
                        : t.createGroup
                      : editId
                        ? t.updateItem
                        : t.createItem}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {drawerType === "group" ? (
                  <div className="space-y-4 rounded-[22px] border border-black/[0.08] bg-white p-5">
                    <Field
                      label={t.groupName}
                      value={groupForm.name}
                      onChange={(value) =>
                        setGroupForm((current) => ({
                          ...current,
                          name: value,
                        }))
                      }
                    />

                    <label className="block">
                      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                        {t.behavior}
                      </span>

                      <span className="relative block">
                        <select
                          value={groupForm.isRequired}
                          onChange={(event) =>
                            setGroupForm((current) => ({
                              ...current,
                              isRequired: event.target.value,
                            }))
                          }
                          className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 pr-9 text-xs font-extrabold outline-none focus:border-black/20"
                        >
                          <option value="0">
                            {t.optionalChoice}
                          </option>

                          <option value="1">
                            {t.requiredChoice}
                          </option>
                        </select>

                        <SlidersHorizontal
                          size={13}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
                        />
                      </span>
                    </label>

                    <Field
                      label={t.maxSelected}
                      type="number"
                      value={groupForm.maxSelected}
                      onChange={(value) =>
                        setGroupForm((current) => ({
                          ...current,
                          maxSelected: value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4 rounded-[22px] border border-black/[0.08] bg-white p-5">
                    <label className="block">
                      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                        {t.parentGroup}
                      </span>

                      <select
                        value={itemForm.groupId}
                        onChange={(event) =>
                          setItemForm((current) => ({
                            ...current,
                            groupId: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-xs font-extrabold outline-none focus:border-black/20"
                      >
                        {groups.map((group) => (
                          <option
                            key={String(group.id)}
                            value={String(group.id)}
                          >
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Field
                      label={t.itemName}
                      value={itemForm.name}
                      onChange={(value) =>
                        setItemForm((current) => ({
                          ...current,
                          name: value,
                        }))
                      }
                    />

                    <Field
                      label={t.price}
                      type="number"
                      value={itemForm.price}
                      onChange={(value) =>
                        setItemForm((current) => ({
                          ...current,
                          price: value,
                        }))
                      }
                    />

                    <div className="rounded-[18px] bg-[#f3f3ef] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-extrabold">
                            {t.trackStock}
                          </p>

                          <p className="mt-1 text-[10px] text-black/30">
                            {itemForm.isTrackStock === "1"
                              ? `${t.stock}: ${itemForm.stock || 0}`
                              : t.unlimited}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setItemForm((current) => ({
                              ...current,
                              isTrackStock:
                                current.isTrackStock === "1"
                                  ? "0"
                                  : "1",
                            }))
                          }
                          className={[
                            "relative h-6 w-11 rounded-full transition",
                            itemForm.isTrackStock === "1"
                              ? "bg-black"
                              : "bg-black/15",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                              itemForm.isTrackStock === "1"
                                ? "left-6"
                                : "left-1",
                            ].join(" ")}
                          />
                        </button>
                      </div>

                      {itemForm.isTrackStock === "1" && (
                        <div className="mt-4 border-t border-black/[0.07] pt-4">
                          <Field
                            label={t.currentStock}
                            type="number"
                            value={itemForm.stock}
                            onChange={(value) =>
                              setItemForm((current) => ({
                                ...current,
                                stock: value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-black/[0.08] bg-white p-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="h-11 rounded-xl px-4 text-xs font-extrabold text-black/45"
                >
                  {t.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white disabled:opacity-40"
                >
                  {isSubmitting && (
                    <Loader2 size={14} className="animate-spin" />
                  )}

                  {isSubmitting ? t.saving : t.save}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  dark = false,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[22px] border p-5",
        dark
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          dark
            ? "bg-white/10 text-white/65"
            : "bg-[#f3f3ef] text-black/40",
        ].join(" ")}
      >
        <Icon size={15} />
      </div>

      <p
        className={[
          "mt-6 text-[9px] font-extrabold uppercase tracking-[0.14em]",
          dark ? "text-white/35" : "text-black/30",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-xs font-semibold outline-none focus:border-black/20"
      />
    </label>
  );
}
