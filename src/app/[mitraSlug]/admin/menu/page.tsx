"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "quill/dist/quill.snow.css";

import {
  useParams,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Check,
  ChevronDown,
  CircleDollarSign,
  Coffee,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
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

import type {
  LucideIcon,
} from 'lucide-react';

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  useMenuStore,
} from "@/store/menu.store";

import {
  Toast,
} from "@/utils/toast";

import type {
  Category,
  MenuItem,
} from "@/types/menu";

type Locale = "id" | "en";
type AvailabilityFilter = "all" | "available" | "unavailable";
type MenuMode = "add" | "edit";

type Branch = {
  id: number | string;
  name: string;
  slug?: string;
};

type AddonGroup = {
  id: number | string;
  name: string;
};

type AddonItem = {
  id: number | string;
  name: string;
  price?: number | string;
  category_id?: number | string | null;
  stock?: number | string | null;
  is_track_stock?: number | string | boolean | null;
};

type RecipePayload = {
  materialId?: string;
  material_id?: string;
  amountNeeded?: string;
  amount_needed?: string;
  materialName?: string;
  material_name?: string;
  unit?: string;
};

const copy = {
  id: {
    eyebrow: "Catalog workspace",
    title: "Katalog menu",
    subtitle:
      "Kelola produk, harga, ketersediaan, kategori, dan addon langsung dari satu workspace.",

    refresh: "Perbarui",
    refreshing: "Memperbarui",
    addMenu: "Tambah menu",
    manageCategory: "Kelola kategori",

    center: "Pusat",
    outlet: "Outlet",
    allCategories: "Semua kategori",
    allAvailability: "Semua status",
    available: "Tersedia",
    unavailable: "Habis",
    searchPlaceholder: "Cari nama menu...",

    totalMenu: "Total menu",
    activeMenu: "Menu tersedia",
    soldOutMenu: "Menu habis",
    categories: "Kategori",

    catalog: "Daftar produk",
    catalogDesc:
      "Klik Edit untuk mengubah detail menu, atau ubah status ketersediaan langsung dari kartu.",
    products: "produk",
    noProduct: "Belum ada menu yang cocok dengan filter.",

    stock: "Stok",
    category: "Kategori",
    uncategorized: "Tanpa kategori",
    edit: "Edit",
    markAvailable: "Aktifkan",
    markUnavailable: "Tandai habis",
    saving: "Menyimpan",

    addTitle: "Tambah menu baru",
    editTitle: "Edit menu",
    menuIdentity: "Informasi menu",
    menuIdentityDesc: "Nama, kategori, harga, stok, dan deskripsi.",
    menuImage: "Foto menu",
    imageHint: "JPG, PNG, atau WEBP.",
    chooseImage: "Pilih foto",
    menuName: "Nama menu",
    price: "Harga",
    description: "Deskripsi",
    addonAssignment: "Addon yang tersedia",
    addonAssignmentDesc:
      "Pilih addon yang boleh ditambahkan customer pada menu ini.",
    noAddon: "Belum ada addon tersedia.",
    cancel: "Batal",
    save: "Simpan menu",
    update: "Update menu",

    categoryManager: "Kategori menu",
    categoryManagerDesc:
      "Kategori membantu customer menemukan menu lebih cepat.",
    categoryName: "Nama kategori",
    addCategory: "Tambah kategori",
    saveCategory: "Simpan kategori",
    updateCategory: "Update kategori",
    editCategory: "Edit kategori",
    noCategory: "Belum ada kategori.",

    successMenuCreated: "Menu berhasil disimpan!",
    successMenuUpdated: "Menu berhasil diperbarui!",
    successStatus: "Status menu berhasil diperbarui!",
    successCategory: "Kategori berhasil disimpan!",
    genericError: "Terjadi kesalahan sistem.",
    loadError: "Gagal memuat data menu.",
  },

  en: {
    eyebrow: "Catalog workspace",
    title: "Menu catalog",
    subtitle:
      "Manage products, pricing, availability, categories, and add-ons from one workspace.",

    refresh: "Refresh",
    refreshing: "Refreshing",
    addMenu: "Add menu",
    manageCategory: "Manage categories",

    center: "Main",
    outlet: "Outlet",
    allCategories: "All categories",
    allAvailability: "All statuses",
    available: "Available",
    unavailable: "Sold out",
    searchPlaceholder: "Search menu name...",

    totalMenu: "Total menu",
    activeMenu: "Available menu",
    soldOutMenu: "Sold out",
    categories: "Categories",

    catalog: "Product catalog",
    catalogDesc:
      "Use Edit to change menu details, or change availability directly from the card.",
    products: "products",
    noProduct: "No menu matches the current filters.",

    stock: "Stock",
    category: "Category",
    uncategorized: "Uncategorized",
    edit: "Edit",
    markAvailable: "Activate",
    markUnavailable: "Mark sold out",
    saving: "Saving",

    addTitle: "Add new menu",
    editTitle: "Edit menu",
    menuIdentity: "Menu information",
    menuIdentityDesc: "Name, category, price, stock, and description.",
    menuImage: "Menu photo",
    imageHint: "JPG, PNG, or WEBP.",
    chooseImage: "Choose image",
    menuName: "Menu name",
    price: "Price",
    description: "Description",
    addonAssignment: "Available add-ons",
    addonAssignmentDesc:
      "Choose which add-ons customers can add to this menu.",
    noAddon: "No add-ons available yet.",
    cancel: "Cancel",
    save: "Save menu",
    update: "Update menu",

    categoryManager: "Menu categories",
    categoryManagerDesc:
      "Categories help customers find menu items faster.",
    categoryName: "Category name",
    addCategory: "Add category",
    saveCategory: "Save category",
    updateCategory: "Update category",
    editCategory: "Edit category",
    noCategory: "No categories yet.",

    successMenuCreated: "Menu saved successfully!",
    successMenuUpdated: "Menu updated successfully!",
    successStatus: "Menu status updated!",
    successCategory: "Category saved successfully!",
    genericError: "A system error occurred.",
    loadError: "Failed to load menu data.",
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

function resolveImage(
  image: string | null | undefined,
) {
  if (!image) return "";

  if (
    image.startsWith("blob:") ||
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("/")
  ) {
    return image;
  }

  return `/${image}`;
}

/*
 * Description menu disimpan dalam bentuk HTML.
 *
 * Kita buang tag/atribut yang paling berisiko sebelum dirender.
 * Untuk HTML yang sepenuhnya berasal dari editor internal KALOO,
 * helper ini cukup menjaga tampilan card tetap aman tanpa
 * mengubah struktur data di backend.
 */
function sanitizeMenuHtml(
  html: string | null | undefined,
) {
  if (!html) return "";

  return String(html)
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    )
    .replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      "",
    )
    .replace(
      /\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      "",
    )
    .replace(
      /javascript\s*:/gi,
      "",
    );
}

function MenuDescription({
  html,
}: {
  html: string | null | undefined;
}) {
  if (!html?.trim()) {
    return (
      <span className="text-black/25">
        —
      </span>
    );
  }

  return (
    <div
      className={[
        "line-clamp-2 min-h-10 text-xs leading-5 text-black/35",
        "[&_a]:font-bold [&_a]:text-black/55 [&_a]:underline",
        "[&_b]:font-bold [&_strong]:font-bold",
        "[&_br]:block",
        "[&_em]:italic [&_i]:italic",
        "[&_li]:ml-4 [&_li]:list-disc",
        "[&_ol]:space-y-1 [&_ul]:space-y-1",
        "[&_p]:m-0",
      ].join(" ")}
      dangerouslySetInnerHTML={{
        __html:
          sanitizeMenuHtml(
            html,
          ),
      }}
    />
  );
}

export default function AdminMenuPage() {
  const params = useParams<{ mitraSlug: string }>();
  const slug = String(params.mitraSlug ?? "");

  const locale = useLanguageStore((state) => state.locale) as Locale;
  const t = copy[locale];

  const {
    items,
    setMenu,
  } = useMenuStore();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [addons, setAddons] = useState<AddonItem[]>([]);

  const [activeBranchId, setActiveBranchId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<MenuMode>("add");
  const [editItemId, setEditItemId] = useState<string | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] =
    useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const [preservedRecipes, setPreservedRecipes] = useState<
    Array<{
      materialId: string;
      amount: string;
      materialName: string;
      unit: string;
    }>
  >([]);

  const [form, setForm] = useState({
    name: "",
    image: "",
    imageFile: null as File | null,
    price: "",
    stock: "",
    category: "",
    description: "",
    addonIds: [] as number[],
  });

  const fetchData = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);

    try {
      const menuUrl = activeBranchId
        ? `/api/menu?slug=${encodeURIComponent(
            slug,
          )}&branch_id=${encodeURIComponent(activeBranchId)}`
        : `/api/menu?slug=${encodeURIComponent(slug)}`;

      const [menuRes, branchRes] = await Promise.all([
        fetch(menuUrl, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/pos/branches?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const menuData = await menuRes.json();
      const branchData = await branchRes.json();

      if (!menuRes.ok || !menuData.success) {
        throw new Error(menuData.message || t.loadError);
      }

      const loadedItems: MenuItem[] = Array.isArray(menuData.items)
        ? (menuData.items as MenuItem[])
        : [];

      const loadedCategories: Category[] = Array.isArray(menuData.categories)
        ? (menuData.categories as Category[])
        : [];

      setMenu(loadedItems, loadedCategories);
      setCategories(loadedCategories);
      setAddonGroups(
        Array.isArray(menuData.addonCategories)
          ? menuData.addonCategories
          : [],
      );
      setAddons(
        Array.isArray(menuData.addons)
          ? menuData.addons
          : [],
      );

      if (branchData.success) {
        setBranches(
          Array.isArray(branchData.data)
            ? branchData.data
            : [],
        );
      }
    } catch (error) {
      console.error("[ADMIN_MENU_LOAD_ERROR]", error);

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
    setMenu,
    slug,
    t.loadError,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelectedCategory("all");
  }, [activeBranchId]);

  const scopedItems = useMemo(() => {
    return items.filter((item) => {
      if (activeBranchId === "") {
        return !item.branch_id;
      }

      return String(item.branch_id ?? "") === activeBranchId;
    });
  }, [
    activeBranchId,
    items,
  ]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scopedItems.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "all" ||
        String(item.categoryId ?? "") === selectedCategory;

      const itemAvailable = Boolean(item.isAvailable);

      const matchesAvailability =
        availability === "all" ||
        (availability === "available" && itemAvailable) ||
        (availability === "unavailable" && !itemAvailable);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [
    availability,
    scopedItems,
    search,
    selectedCategory,
  ]);

  const availableCount = scopedItems.filter(
    (item) => Boolean(item.isAvailable),
  ).length;

  const unavailableCount =
    scopedItems.length - availableCount;

  const getCategoryName = (
    categoryId: string | number | null | undefined,
  ) => {
    return (
      categories.find(
        (category) =>
          String(category.id) === String(categoryId ?? ""),
      )?.name ?? t.uncategorized
    );
  };

  const resetForm = () => {
    setEditItemId(null);
    setPreservedRecipes([]);
    setForm({
      name: "",
      image: "",
      imageFile: null,
      price: "",
      stock: "",
      category: "",
      description: "",
      addonIds: [],
    });
  };

  const openAddMenu = () => {
    setMenuMode("add");
    resetForm();
    setMenuOpen(true);
  };

  const openEditMenu = async (item: MenuItem) => {
    setMenuMode("edit");
    setEditItemId(item.id);

    setForm({
      name: item.name ?? "",
      image: item.image ?? "",
      imageFile: null,
      price: String(item.basePrice ?? ""),
      stock: String(item.stock ?? ""),
      category: String(item.categoryId ?? ""),
      description: item.description ?? "",
      addonIds: Array.isArray(item.addonGroups)
        ? item.addonGroups.map(Number).filter(Number.isFinite)
        : [],
    });

    setPreservedRecipes([]);

    try {
      const response = await fetch(
        `/api/recipes?productId=${encodeURIComponent(item.id)}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setPreservedRecipes(
          result.data.map((recipe: RecipePayload) => ({
            materialId: String(
              recipe.materialId ??
                recipe.material_id ??
                "",
            ),
            amount: String(
              recipe.amountNeeded ??
                recipe.amount_needed ??
                "",
            ),
            materialName: String(
              recipe.materialName ??
                recipe.material_name ??
                "",
            ),
            unit: String(recipe.unit ?? ""),
          })),
        );
      }
    } catch (error) {
      console.error("[MENU_RECIPE_LOAD_ERROR]", error);
    }

    setMenuOpen(true);
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const preview = URL.createObjectURL(file);

    setForm((current) => ({
      ...current,
      image: preview,
      imageFile: file,
    }));
  };

  const toggleAddon = (addonId: number) => {
    setForm((current) => ({
      ...current,
      addonIds: current.addonIds.includes(addonId)
        ? current.addonIds.filter((id) => id !== addonId)
        : [...current.addonIds, addonId],
    }));
  };

  const saveMenu = async () => {
    if (!form.name.trim() || !form.price.trim()) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("entity", "menu");
      formData.append("name", form.name.trim());
      formData.append("price", form.price);
      formData.append("stock", form.stock);
      formData.append("category_id", form.category);
      formData.append("description", form.description);
      formData.append("addon_id", JSON.stringify(form.addonIds));

      /*
       * Inventory/recipe UI sengaja tidak dibawa ke desain baru karena
       * inventory KALOO sedang tidak digunakan.
       * Saat edit, recipe lama dikirim kembali agar tidak terhapus.
       */
      formData.append(
        "recipes",
        JSON.stringify(
          menuMode === "edit"
            ? preservedRecipes
            : [],
        ),
      );

      if (activeBranchId) {
        formData.append("branch_id", activeBranchId);
      }

      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      if (menuMode === "edit" && editItemId) {
        formData.append("id", editItemId);
      }

      const response = await fetch("/api/menu", {
        method: menuMode === "edit" ? "PUT" : "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t.genericError);
      }

      Toast.fire({
        icon: "success",
        title:
          menuMode === "edit"
            ? t.successMenuUpdated
            : t.successMenuCreated,
      });

      setMenuOpen(false);
      resetForm();
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

  const toggleAvailability = async (
    item: MenuItem,
  ) => {
    setSavingId(item.id);

    try {
      const response = await fetch("/api/menu", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: item.id,
          isAvailable: !Boolean(item.isAvailable),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t.genericError);
      }

      const nextItems = items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              isAvailable: !Boolean(item.isAvailable),
            }
          : current,
      );

      setMenu(nextItems, categories);

      Toast.fire({
        icon: "success",
        title: t.successStatus,
      });
    } catch (error) {
      Toast.fire({
        icon: "error",
        title:
          error instanceof Error
            ? error.message
            : t.genericError,
      });
    } finally {
      setSavingId(null);
    }
  };

  const openCategoryManager = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryOpen(true);
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(String(category.id));
    setCategoryName(category.name);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("entity", "category");
      formData.append("name", categoryName.trim());

      if (activeBranchId) {
        formData.append("branch_id", activeBranchId);
      }

      if (editingCategoryId) {
        formData.append("id", editingCategoryId);
      }

      const response = await fetch("/api/menu", {
        method: editingCategoryId ? "PUT" : "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t.genericError);
      }

      Toast.fire({
        icon: "success",
        title: t.successCategory,
      });

      setEditingCategoryId(null);
      setCategoryName("");
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

  if (isLoading && !items.length) {
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
            <Coffee size={13} />
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
            onClick={openCategoryManager}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20"
          >
            <Layers3 size={14} />
            {t.manageCategory}
          </button>

          <button
            type="button"
            onClick={openAddMenu}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#262626]"
          >
            <Plus size={14} />
            {t.addMenu}
          </button>
        </div>
      </section>

      {/* BRANCH SWITCHER */}
      <section className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
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
        <MetricCard
          icon={Package}
          label={t.totalMenu}
          value={String(scopedItems.length)}
          dark
        />

        <MetricCard
          icon={Eye}
          label={t.activeMenu}
          value={String(availableCount)}
        />

        <MetricCard
          icon={EyeOff}
          label={t.soldOutMenu}
          value={String(unavailableCount)}
        />

        <MetricCard
          icon={Layers3}
          label={t.categories}
          value={String(categories.length)}
        />
      </section>

      {/* FILTER WORKSPACE */}
      <section className="grid gap-4 rounded-[24px] border border-black/[0.08] bg-white p-4 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-10 pr-4 text-xs font-semibold outline-none transition placeholder:text-black/25 focus:border-black/20 focus:bg-white"
          />
        </div>

        <SelectControl
          value={selectedCategory}
          onChange={setSelectedCategory}
          icon={Layers3}
        >
          <option value="all">{t.allCategories}</option>
          {categories.map((category) => (
            <option
              key={String(category.id)}
              value={String(category.id)}
            >
              {category.name}
            </option>
          ))}
        </SelectControl>

        <SelectControl
          value={availability}
          onChange={(value) =>
            setAvailability(value as AvailabilityFilter)
          }
          icon={SlidersHorizontal}
        >
          <option value="all">{t.allAvailability}</option>
          <option value="available">{t.available}</option>
          <option value="unavailable">{t.unavailable}</option>
        </SelectControl>
      </section>

      {/* CATALOG */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {t.catalog}
            </p>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-black/35">
              {t.catalogDesc}
            </p>
          </div>

          <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-black/30">
            {filteredItems.length} {t.products}
          </span>
        </div>

        {filteredItems.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.map((item, index) => {
              const image = resolveImage(item.image);
              const isAvailable = Boolean(item.isAvailable);
              const saving = savingId === item.id;

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.025, 0.15),
                  }}
                  className="group overflow-hidden rounded-[24px] border border-black/[0.08] bg-white"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#efefe9]">
                    {image ? (
                      <img
                        src={image}
                        alt={item.name}
                        className={[
                          "h-full w-full object-cover transition duration-300",
                          isAvailable
                            ? "group-hover:scale-[1.02]"
                            : "grayscale opacity-50",
                        ].join(" ")}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon
                          size={28}
                          className="text-black/15"
                        />
                      </div>
                    )}

                    <div className="absolute left-3 top-3 flex gap-2">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em]",
                          isAvailable
                            ? "bg-white text-black shadow-sm"
                            : "bg-black text-white",
                        ].join(" ")}
                      >
                        {isAvailable
                          ? t.available
                          : t.unavailable}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void openEditMenu(item)}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:scale-105"
                      aria-label={t.edit}
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-black">
                          {item.name}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black/30">
                          {getCategoryName(item.categoryId)}
                        </p>
                      </div>

                      <p className="whitespace-nowrap text-sm font-extrabold">
                        {formatCurrency(item.basePrice, locale)}
                      </p>
                    </div>

                    <div className="mt-4">
                      <MenuDescription
                        html={
                          item.description
                        }
                      />
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-black/[0.06] pt-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-black/35">
                        <Package size={13} />
                        {t.stock}: {item.stock ?? 0}
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void toggleAvailability(item)}
                        className={[
                          "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[10px] font-extrabold transition disabled:opacity-50",
                          isAvailable
                            ? "bg-[#f3f3ef] text-black/50 hover:text-black"
                            : "bg-black text-white",
                        ].join(" ")}
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isAvailable ? (
                          <EyeOff size={12} />
                        ) : (
                          <Eye size={12} />
                        )}

                        {saving
                          ? t.saving
                          : isAvailable
                            ? t.markUnavailable
                            : t.markAvailable}
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/[0.08] bg-white px-6 text-center">
            <Package size={22} className="text-black/20" />
            <p className="mt-3 text-sm font-semibold text-black/35">
              {t.noProduct}
            </p>
          </div>
        )}
      </section>

      {/* MENU DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t.cancel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
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
              className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[620px] flex-col bg-[#f7f7f4] shadow-[-24px_0_60px_rgba(0,0,0,0.14)]"
            >
              <div className="flex items-center justify-between border-b border-black/[0.08] bg-white px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
                    {menuMode === "edit" ? t.edit : t.addMenu}
                  </p>

                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                    {menuMode === "edit"
                      ? t.editTitle
                      : t.addTitle}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/45"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="space-y-5">
                  {/* IMAGE */}
                  <section className="rounded-[22px] border border-black/[0.08] bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-extrabold">
                          {t.menuImage}
                        </p>

                        <p className="mt-1 text-[10px] text-black/30">
                          {t.imageHint}
                        </p>
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-black px-3 py-2 text-[10px] font-extrabold text-white">
                        <ImageIcon size={12} />
                        {t.chooseImage}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="mt-4 aspect-[16/8] overflow-hidden rounded-[16px] bg-[#efefe9]">
                      {form.image ? (
                        <img
                          src={resolveImage(form.image)}
                          alt={form.name || "Preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon
                            size={26}
                            className="text-black/15"
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* FORM */}
                  <section className="rounded-[22px] border border-black/[0.08] bg-white p-4 sm:p-5">
                    <div>
                      <p className="text-xs font-extrabold">
                        {t.menuIdentity}
                      </p>

                      <p className="mt-1 text-[10px] text-black/30">
                        {t.menuIdentityDesc}
                      </p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <Field
                        label={t.menuName}
                        value={form.name}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            name: value,
                          }))
                        }
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label={t.price}
                          type="number"
                          value={form.price}
                          onChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              price: value,
                            }))
                          }
                        />

                        <Field
                          label={t.stock}
                          type="number"
                          value={form.stock}
                          onChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              stock: value,
                            }))
                          }
                        />
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                          {t.category}
                        </span>

                        <span className="relative block">
                          <select
                            value={form.category}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                category: event.target.value,
                              }))
                            }
                            className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 pr-9 text-xs font-extrabold outline-none focus:border-black/20"
                          >
                            <option value="">
                              {t.uncategorized}
                            </option>

                            {categories.map((category) => (
                              <option
                                key={String(category.id)}
                                value={String(category.id)}
                              >
                                {category.name}
                              </option>
                            ))}
                          </select>

                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
                          />
                        </span>
                      </label>

                      <div className="block">
                        <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                          {t.description}
                        </span>

                        <QuillSnowEditor
                          value={form.description}
                          onChange={(html) =>
                            setForm((current) => ({
                              ...current,
                              description: html,
                            }))
                          }
                          placeholder={
                            locale === "id"
                              ? "Tulis deskripsi menu..."
                              : "Write menu description..."
                          }
                        />
                      </div>
                    </div>
                  </section>

                  {/* ADDON ASSIGNMENT */}
                  <section className="rounded-[22px] border border-black/[0.08] bg-white p-4 sm:p-5">
                    <div>
                      <p className="text-xs font-extrabold">
                        {t.addonAssignment}
                      </p>

                      <p className="mt-1 text-[10px] leading-4 text-black/30">
                        {t.addonAssignmentDesc}
                      </p>
                    </div>

                    {addons.length ? (
                      <div className="mt-5 space-y-4">
                        {addonGroups.map((group) => {
                          const groupItems = addons.filter(
                            (addon) =>
                              String(addon.category_id ?? "") ===
                              String(group.id),
                          );

                          if (!groupItems.length) return null;

                          return (
                            <div key={String(group.id)}>
                              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                                {group.name}
                              </p>

                              <div className="grid gap-2 sm:grid-cols-2">
                                {groupItems.map((addon) => {
                                  const addonId = Number(addon.id);
                                  const selected =
                                    form.addonIds.includes(addonId);

                                  return (
                                    <button
                                      type="button"
                                      key={String(addon.id)}
                                      onClick={() =>
                                        Number.isFinite(addonId) &&
                                        toggleAddon(addonId)
                                      }
                                      className={[
                                        "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                                        selected
                                          ? "border-black bg-black text-white"
                                          : "border-black/[0.08] bg-[#fafaf8] text-black",
                                      ].join(" ")}
                                    >
                                      <span
                                        className={[
                                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                          selected
                                            ? "border-white/20 bg-white/10"
                                            : "border-black/[0.08] bg-white",
                                        ].join(" ")}
                                      >
                                        {selected && <Check size={12} />}
                                      </span>

                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[11px] font-extrabold">
                                          {addon.name}
                                        </span>

                                        <span
                                          className={[
                                            "mt-0.5 block text-[9px]",
                                            selected
                                              ? "text-white/45"
                                              : "text-black/30",
                                          ].join(" ")}
                                        >
                                          + {formatCurrency(addon.price, locale)}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-[#fafaf8] px-4 py-8 text-center text-xs text-black/30">
                        {t.noAddon}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.08] bg-white p-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="h-11 rounded-xl px-4 text-xs font-extrabold text-black/45 hover:bg-black/[0.04]"
                >
                  {t.cancel}
                </button>

                <button
                  type="button"
                  onClick={() => void saveMenu()}
                  disabled={
                    isSubmitting ||
                    !form.name.trim() ||
                    !form.price.trim()
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting && (
                    <Loader2 size={14} className="animate-spin" />
                  )}

                  {menuMode === "edit"
                    ? t.update
                    : t.save}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* CATEGORY MANAGER */}
      <AnimatePresence>
        {categoryOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoryOpen(false)}
              className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[26px] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">
                    {t.categoryManager}
                  </h3>

                  <p className="mt-1 text-[10px] text-black/30">
                    {t.categoryManagerDesc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCategoryOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                <div className="flex gap-2">
                  <input
                    value={categoryName}
                    onChange={(event) =>
                      setCategoryName(event.target.value)
                    }
                    placeholder={t.categoryName}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-xs font-semibold outline-none focus:border-black/20"
                  />

                  <button
                    type="button"
                    onClick={() => void saveCategory()}
                    disabled={
                      isSubmitting || !categoryName.trim()
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white disabled:opacity-40"
                  >
                    {isSubmitting && (
                      <Loader2 size={13} className="animate-spin" />
                    )}

                    {editingCategoryId
                      ? t.updateCategory
                      : t.addCategory}
                  </button>
                </div>

                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCategoryName("");
                    }}
                    className="mt-2 text-[10px] font-extrabold text-black/35"
                  >
                    {t.cancel}
                  </button>
                )}

                <div className="mt-5 divide-y divide-black/[0.06] rounded-[18px] border border-black/[0.07]">
                  {categories.length ? (
                    categories.map((category) => (
                      <div
                        key={String(category.id)}
                        className="flex items-center justify-between gap-4 px-4 py-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f3ef] text-black/40">
                            <Tag size={14} />
                          </div>

                          <p className="truncate text-xs font-extrabold">
                            {category.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEditCategory(category)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] text-black/35"
                          aria-label={t.editCategory}
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center text-xs text-black/30">
                      {t.noCategory}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuillSnowEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const hostRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const quillRef =
    useRef<any>(
      null,
    );

  const onChangeRef =
    useRef(
      onChange,
    );

  const syncingRef =
    useRef(
      false,
    );

  useEffect(() => {
    onChangeRef.current =
      onChange;
  }, [
    onChange,
  ]);

  useEffect(() => {
    let disposed =
      false;

    const initialize =
      async () => {
        if (
          !hostRef.current ||
          quillRef.current
        ) {
          return;
        }

        const module =
          await import(
            "quill"
          );

        if (
          disposed ||
          !hostRef.current
        ) {
          return;
        }

        const Quill =
          module.default;

        const quill =
          new Quill(
            hostRef.current,
            {
              theme:
                "snow",

              placeholder,

              modules: {
                toolbar: [
                  [
                    {
                      header: [
                        2,
                        3,
                        false,
                      ],
                    },
                  ],

                  [
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                  ],

                  [
                    {
                      list:
                        "ordered",
                    },
                    {
                      list:
                        "bullet",
                    },
                  ],

                  [
                    "blockquote",
                    "link",
                  ],

                  [
                    {
                      align: [],
                    },
                  ],

                  [
                    "clean",
                  ],
                ],
              },

              formats: [
                "header",
                "bold",
                "italic",
                "underline",
                "strike",
                "list",
                "blockquote",
                "link",
                "align",
              ],
            },
          );

        quillRef.current =
          quill;

        /*
         * Isi HTML lama dari database saat editor pertama kali dibuka.
         * Jangan trigger state update saat initial sync.
         */
        syncingRef.current =
          true;

        quill.root.innerHTML =
          value || "";

        syncingRef.current =
          false;

        quill.on(
          "text-change",
          () => {
            if (
              syncingRef.current
            ) {
              return;
            }

            const html =
              quill.root.innerHTML;

            /*
             * Quill menggunakan <p><br></p> untuk editor kosong.
             * Simpan sebagai string kosong agar database lebih bersih.
             */
            const normalized =
              html ===
              "<p><br></p>"
                ? ""
                : html;

            onChangeRef.current(
              normalized,
            );
          },
        );
      };

    void initialize();

    return () => {
      disposed =
        true;

      /*
       * Quill tidak membutuhkan destroy(),
       * cukup lepas reference saat component unmount.
       */
      quillRef.current =
        null;
    };
    // Editor cukup dibuat satu kali per mount drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Sinkronkan HTML ketika user berpindah dari Add -> Edit
   * atau membuka produk lain tanpa memaksa re-create Quill.
   */
  useEffect(() => {
    const quill =
      quillRef.current;

    if (
      !quill
    ) {
      return;
    }

    const incoming =
      value || "";

    const current =
      quill.root.innerHTML ===
      "<p><br></p>"
        ? ""
        : quill.root.innerHTML;

    if (
      current ===
      incoming
    ) {
      return;
    }

    syncingRef.current =
      true;

    quill.root.innerHTML =
      incoming;

    syncingRef.current =
      false;
  }, [
    value,
  ]);

  return (
    <div className="kaloo-quill overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafaf8] transition focus-within:border-black/20 focus-within:bg-white">
      <div
        ref={
          hostRef
        }
        className="min-h-[150px]"
      />

      <style jsx global>{`
        .kaloo-quill .ql-toolbar.ql-snow {
          border: 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
          background: #ffffff;
          padding: 10px 12px;
        }

        .kaloo-quill .ql-container.ql-snow {
          border: 0;
          background: #fafaf8;
          font-family: inherit;
          font-size: 13px;
        }

        .kaloo-quill .ql-editor {
          min-height: 150px;
          padding: 14px 16px;
          line-height: 1.65;
          color: #111111;
        }

        .kaloo-quill .ql-editor.ql-blank::before {
          left: 16px;
          right: 16px;
          color: rgba(0, 0, 0, 0.28);
          font-style: normal;
        }

        .kaloo-quill .ql-snow .ql-stroke {
          stroke: rgba(0, 0, 0, 0.58);
        }

        .kaloo-quill .ql-snow .ql-fill {
          fill: rgba(0, 0, 0, 0.58);
        }

        .kaloo-quill .ql-snow .ql-picker {
          color: rgba(0, 0, 0, 0.58);
        }

        .kaloo-quill .ql-toolbar button:hover .ql-stroke,
        .kaloo-quill .ql-toolbar button.ql-active .ql-stroke {
          stroke: #111111;
        }

        .kaloo-quill .ql-toolbar button:hover .ql-fill,
        .kaloo-quill .ql-toolbar button.ql-active .ql-fill {
          fill: #111111;
        }

        .kaloo-quill .ql-toolbar .ql-picker-label:hover,
        .kaloo-quill .ql-toolbar .ql-picker-label.ql-active,
        .kaloo-quill .ql-toolbar .ql-picker-item:hover,
        .kaloo-quill .ql-toolbar .ql-picker-item.ql-selected {
          color: #111111;
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  dark = false,
}: {
  icon: LucideIcon;
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

function SelectControl({
  value,
  onChange,
  icon: Icon,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="relative block">
      <Icon
        size={13}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/25"
      />

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-9 pr-9 text-xs font-extrabold text-black/55 outline-none focus:border-black/20"
      >
        {children}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
      />
    </span>
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
