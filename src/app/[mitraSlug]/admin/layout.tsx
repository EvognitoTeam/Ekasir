"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import type {
  LucideIcon,
} from "lucide-react";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Coffee,
  ExternalLink,
  Gift,
  Languages,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Sofa,
  Store,
  Tag,
  Users,
  X,
} from "lucide-react";

import {
  useLanguageStore,
} from "@/store/language.store";

type Locale =
  | "id"
  | "en";

type AdminRoute =
  | "dashboard"
  | "sales"
  | "ledger"
  | "menu"
  | "addon"
  | "table"
  | "promos"
  | "branch"
  | "staff"
  | "loyalty"
  | "settings";

type ParentMenuId =
  | "sales"
  | "operations"
  | "management";

type AdminUser = {
  name: string;
  email: string;
  role: string;
};

type ChildMenu = {
  id: Exclude<
    AdminRoute,
    "dashboard"
  >;
  icon: LucideIcon;
};

type ParentMenu = {
  id: ParentMenuId;
  icon: LucideIcon;
  children: ChildMenu[];
};

const PARENT_MENUS:
  ParentMenu[] = [
    {
      id: "sales",
      icon: BarChart3,
      children: [
        {
          id: "sales",
          icon: BarChart3,
        },
        {
          id: "ledger",
          icon: BookOpen,
        },
      ],
    },

    {
      id: "operations",
      icon: Store,
      children: [
        {
          id: "menu",
          icon: Coffee,
        },
        {
          id: "addon",
          icon: Package,
        },
        {
          id: "table",
          icon: Sofa,
        },
        {
          id: "promos",
          icon: Tag,
        },
      ],
    },

    {
      id: "management",
      icon: Settings,
      children: [
        {
          id: "branch",
          icon: Store,
        },
        {
          id: "staff",
          icon: Users,
        },
        {
          id: "loyalty",
          icon: Gift,
        },
        {
          id: "settings",
          icon: Settings,
        },
      ],
    },
  ];

const copy = {
  id: {
    dashboard:
      "Dashboard",

    dashboardDescription:
      "Ringkasan operasional",

    parent: {
      sales: {
        label:
          "Penjualan",
        description:
          "Analitik & transaksi",
      },

      operations: {
        label:
          "Operasional",
        description:
          "Menu, meja & promo",
      },

      management: {
        label:
          "Manajemen",
        description:
          "Outlet, tim & sistem",
      },
    },

    nav: {
      dashboard: [
        "Dashboard",
        "Ringkasan operasional",
      ],

      sales: [
        "Riwayat Penjualan",
        "Analitik & performa",
      ],

      ledger: [
        "Transaksi",
        "Riwayat & detail order",
      ],

      menu: [
        "Katalog Menu",
        "Produk & kategori",
      ],

      addon: [
        "Addon Menu",
        "Opsi & tambahan menu",
      ],

      table: [
        "Daftar Meja",
        "Meja, QR & reservasi",
      ],

      promos: [
        "Promo & Event",
        "Diskon & kampanye",
      ],

      branch: [
        "Cabang Outlet",
        "Lokasi & cabang",
      ],

      staff: [
        "Staf & PIN",
        "Akses karyawan",
      ],

      loyalty: [
        "Loyalty & Points",
        "Program pelanggan",
      ],

      settings: [
        "Konfigurasi",
        "Pajak & sistem",
      ],
    },

    titles: {
      dashboard:
        "Dashboard",

      sales:
        "Riwayat Penjualan",

      ledger:
        "Transaksi",

      menu:
        "Katalog Menu",

      addon:
        "Addon Menu",

      table:
        "Daftar Meja",

      promos:
        "Promo & Event",

      branch:
        "Cabang Outlet",

      staff:
        "Staf & PIN",

      loyalty:
        "Loyalty & Points",

      settings:
        "Konfigurasi Sistem",
    },

    admin:
      "Administrator",

    controlCenter:
      "Pusat kendali outlet",

    customerMenu:
      "Lihat menu customer",

    logout:
      "Keluar",

    ownerAccount:
      "Akun Owner",

    verifiedAccess:
      "Akses Owner terverifikasi",

    checking:
      "Memeriksa akses Owner",

    checkingDescription:
      "Menyiapkan pusat kendali KALOO POS.",

    closeSidebar:
      "Tutup sidebar",

    openSidebar:
      "Buka sidebar",

    language:
      "Bahasa",
  },

  en: {
    dashboard:
      "Dashboard",

    dashboardDescription:
      "Operational overview",

    parent: {
      sales: {
        label:
          "Sales",
        description:
          "Analytics & transactions",
      },

      operations: {
        label:
          "Operations",
        description:
          "Menu, tables & promos",
      },

      management: {
        label:
          "Management",
        description:
          "Outlets, team & system",
      },
    },

    nav: {
      dashboard: [
        "Dashboard",
        "Operational overview",
      ],

      sales: [
        "Sales History",
        "Analytics & performance",
      ],

      ledger: [
        "Transactions",
        "Order history & details",
      ],

      menu: [
        "Menu Catalog",
        "Products & categories",
      ],

      addon: [
        "Menu Add-ons",
        "Options & extras",
      ],

      table: [
        "Tables",
        "Tables, QR & reservations",
      ],

      promos: [
        "Promos & Events",
        "Discounts & campaigns",
      ],

      branch: [
        "Outlets",
        "Locations & branches",
      ],

      staff: [
        "Staff & PIN",
        "Employee access",
      ],

      loyalty: [
        "Loyalty & Points",
        "Customer program",
      ],

      settings: [
        "Configuration",
        "Tax & system",
      ],
    },

    titles: {
      dashboard:
        "Dashboard",

      sales:
        "Sales History",

      ledger:
        "Transactions",

      menu:
        "Menu Catalog",

      addon:
        "Menu Add-ons",

      table:
        "Tables",

      promos:
        "Promos & Events",

      branch:
        "Outlets",

      staff:
        "Staff & PIN",

      loyalty:
        "Loyalty & Points",

      settings:
        "System Configuration",
    },

    admin:
      "Administrator",

    controlCenter:
      "Outlet control center",

    customerMenu:
      "View customer menu",

    logout:
      "Sign out",

    ownerAccount:
      "Owner Account",

    verifiedAccess:
      "Verified Owner access",

    checking:
      "Checking Owner access",

    checkingDescription:
      "Preparing your KALOO POS control center.",

    closeSidebar:
      "Close sidebar",

    openSidebar:
      "Open sidebar",

    language:
      "Language",
  },
} as const;

function getActiveRoute(
  pathname: string,
): AdminRoute {
  const segments =
    pathname
      .split("/")
      .filter(Boolean);

  const adminIndex =
    segments.indexOf(
      "admin",
    );

  const candidate =
    adminIndex >= 0
      ? segments[
          adminIndex + 1
        ]
      : "dashboard";

  const allowed:
    AdminRoute[] = [
      "dashboard",
      "sales",
      "ledger",
      "menu",
      "addon",
      "table",
      "promos",
      "branch",
      "staff",
      "loyalty",
      "settings",
    ];

  return allowed.includes(
    candidate as AdminRoute,
  )
    ? (
        candidate as
          AdminRoute
      )
    : "dashboard";
}

function getParentForRoute(
  route:
    AdminRoute,
):
  | ParentMenuId
  | null {
  if (
    route ===
      "sales" ||
    route ===
      "ledger"
  ) {
    return "sales";
  }

  if (
    route ===
      "menu" ||
    route ===
      "addon" ||
    route ===
      "table" ||
    route ===
      "promos"
  ) {
    return "operations";
  }

  if (
    route ===
      "branch" ||
    route ===
      "staff" ||
    route ===
      "loyalty" ||
    route ===
      "settings"
  ) {
    return "management";
  }

  return null;
}

export default function AdminLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  const params =
    useParams<{
      mitraSlug:
        string;
    }>();

  const pathname =
    usePathname();

  const router =
    useRouter();

  const slug =
    String(
      params.mitraSlug ??
        "",
    );

  const activeRoute =
    getActiveRoute(
      pathname,
    );

  const activeParent =
    getParentForRoute(
      activeRoute,
    );

  const locale =
    useLanguageStore(
      (
        state,
      ) =>
        state.locale,
    ) as Locale;

  const setLocale =
    useLanguageStore(
      (
        state,
      ) =>
        state.setLocale,
    );

  const t =
    copy[locale];

  const [
    sidebarOpen,
    setSidebarOpen,
  ] =
    useState(false);

  const [
    isCheckingAuth,
    setIsCheckingAuth,
  ] =
    useState(true);

  const [
    isAuthorized,
    setIsAuthorized,
  ] =
    useState(false);

  const [
    adminUser,
    setAdminUser,
  ] =
    useState<AdminUser>({
      name:
        "",

      email:
        "",

      role:
        "Owner",
    });

  /*
   * Accordion sidebar:
   * hanya satu parent category yang boleh terbuka.
   *
   * - /admin/sales atau /admin/ledger -> Penjualan terbuka.
   * - /admin/menu, /addon, /table, /promos -> Operasional terbuka.
   * - /admin/branch, /staff, /loyalty, /settings -> Manajemen terbuka.
   * - /admin/dashboard -> semua parent tertutup.
   */
  const [
    openMenu,
    setOpenMenu,
  ] =
    useState<
      ParentMenuId |
      null
    >(
      activeParent,
    );

  /*
   * Saat berpindah route, sidebar mengikuti category route aktif.
   * Category sebelumnya otomatis tertutup.
   */
  useEffect(() => {
    setOpenMenu(
      activeParent,
    );
  }, [
    activeParent,
    pathname,
  ]);

  useEffect(() => {
    if (
      !slug
    ) {
      return;
    }

    let cancelled =
      false;

    const verifyAccess =
      async () => {
        setIsCheckingAuth(
          true,
        );

        try {
          const response =
            await fetch(
              `/api/auth/me?slug=${encodeURIComponent(
                slug,
              )}`,
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              },
            );

          const data =
            await response.json();

          if (
            cancelled
          ) {
            return;
          }

          if (
            response.ok &&
            data.success &&
            data.user
          ) {
            const role =
              String(
                data.user
                  .role ??
                  "",
              ).toLowerCase();

            if (
              role ===
              "owner"
            ) {
              setAdminUser({
                name:
                  String(
                    data.user
                      .name ??
                      "",
                  ),

                email:
                  String(
                    data.user
                      .email ??
                      "",
                  ),

                role:
                  String(
                    data.user
                      .role ??
                      "Owner",
                  ),
              });

              setIsAuthorized(
                true,
              );

              return;
            }
          }

          setIsAuthorized(
            false,
          );

          router.replace(
            `/${slug}/profile`,
          );
        } catch (
          error
        ) {
          console.error(
            "[ADMIN_AUTH_ERROR]",
            error,
          );

          if (
            !cancelled
          ) {
            setIsAuthorized(
              false,
            );

            router.replace(
              `/${slug}/profile`,
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setIsCheckingAuth(
              false,
            );
          }
        }
      };

    void verifyAccess();

    return () => {
      cancelled =
        true;
    };
  }, [
    router,
    slug,
  ]);

  const navigateTo =
    (
      route:
        AdminRoute,
    ) => {
      setSidebarOpen(
        false,
      );

      router.push(
        `/${slug}/admin/${route}`,
      );
    };

  const toggleMenu =
    (
      menuId:
        ParentMenuId,
    ) => {
      setOpenMenu(
        (
          current,
        ) =>
          current ===
          menuId
            ? null
            : menuId,
      );
    };

  const handleLogout =
    async () => {
      await fetch(
        "/api/auth/logout",
        {
          method:
            "POST",

          credentials:
            "include",
        },
      ).catch(
        () =>
          undefined,
      );

      document.cookie =
        "ekasir_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      router.replace(
        "/login",
      );

      router.refresh();
    };

  if (
    isCheckingAuth
  ) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f4] px-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 h-14 w-14 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="KALOO POS"
              fill
              priority
              sizes="56px"
              className="object-contain p-2"
            />
          </div>

          <Loader2 className="mb-4 h-6 w-6 animate-spin text-black" />

          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/55">
            {
              t.checking
            }
          </p>

          <p className="mt-2 text-xs text-black/35">
            {
              t.checkingDescription
            }
          </p>
        </div>
      </div>
    );
  }

  if (
    !isAuthorized
  ) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f7f7f4] text-[#111111]">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label={
              t.closeSidebar
            }
            initial={{
              opacity:
                0,
            }}
            animate={{
              opacity:
                1,
            }}
            exit={{
              opacity:
                0,
            }}
            onClick={() =>
              setSidebarOpen(
                false,
              )
            }
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[286px] flex-col border-r border-black/[0.08] bg-white transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(
          " ",
        )}
      >
        {/* BRAND */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-black/[0.08] px-5">
          <button
            type="button"
            onClick={() =>
              navigateTo(
                "dashboard",
              )
            }
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#f7f7f4]">
              <Image
                src="/logo.png"
                alt="KALOO POS"
                fill
                priority
                sizes="40px"
                className="object-contain p-1.5"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold tracking-[0.16em]">
                KALOO POS
              </p>

              <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-black/35">
                {
                  t.controlCenter
                }
              </p>
            </div>
          </button>

          <button
            type="button"
            aria-label={
              t.closeSidebar
            }
            onClick={() =>
              setSidebarOpen(
                false,
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8 text-black/45 transition hover:bg-black/4 hover:text-black lg:hidden"
          >
            <X
              size={
                16
              }
            />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* DASHBOARD: STANDALONE */}
          <button
            type="button"
            onClick={() =>
              navigateTo(
                "dashboard",
              )
            }
            className={[
              "group mb-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
              activeRoute ===
              "dashboard"
                ? "bg-black text-white"
                : "text-black/55 hover:bg-[#f4f4f0] hover:text-black",
            ].join(
              " ",
            )}
          >
            <span
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
                activeRoute ===
                "dashboard"
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-black/8 bg-white text-black/45 group-hover:text-black",
              ].join(
                " ",
              )}
            >
              <LayoutDashboard
                size={
                  16
                }
                strokeWidth={
                  1.8
                }
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold">
                {
                  t.dashboard
                }
              </span>

              <span
                className={[
                  "mt-0.5 block truncate text-[10px]",
                  activeRoute ===
                  "dashboard"
                    ? "text-white/50"
                    : "text-black/35",
                ].join(
                  " ",
                )}
              >
                {
                  t.dashboardDescription
                }
              </span>
            </span>
          </button>

          <div className="mb-4 h-px bg-black/6" />

          {/* MULTILEVEL */}
          <div className="space-y-2">
            {PARENT_MENUS.map(
              (
                parent,
              ) => {
                const ParentIcon =
                  parent.icon;

                const isOpen =
                  openMenu ===
                  parent.id;

                const containsActiveRoute =
                  parent.children.some(
                    (
                      child,
                    ) =>
                      child.id ===
                      activeRoute,
                  );

                const parentCopy =
                  t.parent[
                    parent.id
                  ];

                return (
                  <div
                    key={
                      parent.id
                    }
                    className={[
                      "overflow-hidden rounded-2xl border transition",
                      containsActiveRoute
                        ? "border-black/9 bg-[#f8f8f5]"
                        : "border-transparent",
                    ].join(
                      " ",
                    )}
                  >
                    {/* PARENT BUTTON */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleMenu(
                          parent.id,
                        )
                      }
                      className={[
                        "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                        containsActiveRoute
                          ? "text-black"
                          : "text-black/55 hover:bg-[#f4f4f0] hover:text-black",
                      ].join(
                        " ",
                      )}
                    >
                      <span
                        className={[
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
                          containsActiveRoute
                            ? "border-black bg-black text-white"
                            : "border-black/8 bg-white text-black/45 group-hover:text-black",
                        ].join(
                          " ",
                        )}
                      >
                        <ParentIcon
                          size={
                            16
                          }
                          strokeWidth={
                            1.8
                          }
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">
                          {
                            parentCopy.label
                          }
                        </span>

                        <span className="mt-0.5 block truncate text-[10px] text-black/35">
                          {
                            parentCopy.description
                          }
                        </span>
                      </span>

                      <motion.span
                        initial={
                          false
                        }
                        animate={{
                          rotate:
                            isOpen
                              ? 180
                              : 0,
                        }}
                        transition={{
                          duration:
                            0.18,
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black/30"
                      >
                        <ChevronDown
                          size={
                            14
                          }
                        />
                      </motion.span>
                    </button>

                    {/* CHILDREN */}
                    <AnimatePresence
                      initial={
                        false
                      }
                    >
                      {isOpen && (
                        <motion.div
                          initial={{
                            height:
                              0,
                            opacity:
                              0,
                          }}
                          animate={{
                            height:
                              "auto",
                            opacity:
                              1,
                          }}
                          exit={{
                            height:
                              0,
                            opacity:
                              0,
                          }}
                          transition={{
                            height: {
                              duration:
                                0.22,
                            },
                            opacity: {
                              duration:
                                0.15,
                            },
                          }}
                          className="overflow-hidden"
                        >
                          <div className="mx-3 mb-2 ml-6.75 border-l border-black/8 pl-4">
                            <div className="space-y-1 py-1">
                              {parent.children.map(
                                (
                                  child,
                                ) => {
                                  const ChildIcon =
                                    child.icon;

                                  const active =
                                    child.id ===
                                    activeRoute;

                                  const [
                                    label,
                                    description,
                                  ] =
                                    t.nav[
                                      child.id
                                    ];

                                  return (
                                    <button
                                      type="button"
                                      key={
                                        child.id
                                      }
                                      onClick={() =>
                                        navigateTo(
                                          child.id,
                                        )
                                      }
                                      className={[
                                        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                                        active
                                          ? "bg-white text-black shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.07]"
                                          : "text-black/48 hover:bg-white hover:text-black",
                                      ].join(
                                        " ",
                                      )}
                                    >
                                      {active && (
                                        <motion.span
                                          layoutId="admin-sidebar-active-dot"
                                          className="absolute -left-[21px] h-2 w-2 rounded-full bg-black ring-4 ring-[#f8f8f5]"
                                        />
                                      )}

                                      <span
                                        className={[
                                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                                          active
                                            ? "bg-black text-white"
                                            : "bg-black/[0.035] text-black/38 group-hover:text-black/70",
                                        ].join(
                                          " ",
                                        )}
                                      >
                                        <ChildIcon
                                          size={
                                            14
                                          }
                                          strokeWidth={
                                            1.8
                                          }
                                        />
                                      </span>

                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[11px] font-extrabold">
                                          {
                                            label
                                          }
                                        </span>

                                        <span className="mt-0.5 block truncate text-[9px] text-black/32">
                                          {
                                            description
                                          }
                                        </span>
                                      </span>

                                      {active ? (
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                                      ) : (
                                        <ChevronRight
                                          size={
                                            12
                                          }
                                          className="shrink-0 text-black/15 transition group-hover:translate-x-0.5 group-hover:text-black/40"
                                        />
                                      )}
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              },
            )}
          </div>
        </nav>

        {/* ACCOUNT */}
        <div className="shrink-0 border-t border-black/[0.08] p-3">
          <div className="mb-2 rounded-2xl bg-[#f4f4f0] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-extrabold text-white">
                {(
                  adminUser.name ||
                  "O"
                )
                  .slice(
                    0,
                    1,
                  )
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold">
                  {
                    adminUser.name ||
                    t.ownerAccount
                  }
                </p>

                <p className="mt-0.5 truncate text-[10px] text-black/35">
                  {
                    adminUser.email ||
                    t.verifiedAccess
                  }
                </p>
              </div>

              <ShieldCheck
                size={
                  15
                }
                className="shrink-0 text-black/35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/${slug}/profile`,
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-black/50 transition hover:bg-black/[0.04] hover:text-black"
          >
            <PanelLeftClose
              size={
                16
              }
            />

            <span className="flex-1 text-left">
              {
                t.customerMenu
              }
            </span>

            <ExternalLink
              size={
                13
              }
            />
          </button>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
          >
            <LogOut
              size={
                16
              }
            />

            {
              t.logout
            }
          </button>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-black/[0.08] bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={
                t.openSidebar
              }
              onClick={() =>
                setSidebarOpen(
                  true,
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-black/60 lg:hidden"
            >
              <Menu
                size={
                  17
                }
              />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">
                <ShieldCheck
                  size={
                    12
                  }
                />

                <span>
                  {
                    t.admin
                  }
                </span>

                <ChevronRight
                  size={
                    11
                  }
                />

                {activeParent && (
                  <>
                    <span className="hidden sm:inline">
                      {
                        t.parent[
                          activeParent
                        ].label
                      }
                    </span>

                    <ChevronRight
                      size={
                        11
                      }
                      className="hidden sm:block"
                    />
                  </>
                )}

                <span className="truncate">
                  {
                    t.titles[
                      activeRoute
                    ]
                  }
                </span>
              </div>

              <h1 className="mt-0.5 truncate text-lg font-extrabold tracking-[-0.025em]">
                {
                  t.titles[
                    activeRoute
                  ]
                }
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                t.language
              }
              onClick={() =>
                setLocale(
                  locale ===
                    "id"
                    ? "en"
                    : "id",
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-extrabold transition hover:border-black/25"
            >
              <Languages
                size={
                  15
                }
              />

              {
                locale.toUpperCase()
              }
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${slug}/profile`,
                )
              }
              className="hidden h-10 items-center gap-2 rounded-full bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#252525] sm:inline-flex"
            >
              {
                t.customerMenu
              }

              <ExternalLink
                size={
                  13
                }
              />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {
              children
            }
          </div>
        </main>
      </div>
    </div>
  );
}
