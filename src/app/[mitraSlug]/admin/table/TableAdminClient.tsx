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
  Armchair,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Edit3,
  Loader2,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Unlink,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  useLanguageStore,
} from "@/store/language.store";

import {
  Toast,
} from "@/utils/toast";

type Locale =
  | "id"
  | "en";

type Branch = {
  id: number | string;
  name: string;
  slug?: string;
};

type TableRow = {
  id: number;
  table_code: string;
  table_name: string;
  capacity: number;
  status: number;
  branch_id?: number | null;
  branch_name?: string | null;
  branch_slug?: string | null;

  iot_registered?: boolean;
  iot_registered_count?: number;
  iot_online?: boolean;
  iot_online_count?: number;
  iot_pager_active?: boolean;
  iot_pager_source?: string | null;

  iot_device_id?: number | null;
  iot_device_hex?: string | null;
  iot_device_serial?: string | null;
  iot_device_status?:
    | "active"
    | "inactive"
    | "maintenance"
    | "banned"
    | null;
};

type Device = {
  id: number;
  tableId: number | null;
  hexId: string;
  serialNumber: string | null;
  status:
    | "active"
    | "inactive"
    | "maintenance"
    | "banned";
};

type DeviceTableStatus = {
  tableId: number;
  registered: boolean;
  registeredCount: number;
  online: boolean;
  onlineCount: number;
  pagerActive?: boolean;
  pagerSource?: string | null;
};

type TableStatusFilter =
  | "all"
  | "0"
  | "1"
  | "2"
  | "3";

const copy = {
  id: {
    eyebrow:
      "Floor workspace",

    title:
      "Daftar meja",

    subtitle:
      "Kelola meja per outlet, kapasitas, status operasional, dan assignment perangkat KALOO IoT.",

    refresh:
      "Perbarui",

    refreshing:
      "Memperbarui",

    addTables:
      "Tambah meja",

    main:
      "Pusat",

    search:
      "Cari nama atau kode meja...",

    allStatus:
      "Semua status",

    disabled:
      "Nonaktif",

    available:
      "Tersedia",

    occupied:
      "Terisi",

    reserved:
      "Reserved",

    totalTables:
      "Total meja",

    totalCapacity:
      "Total kapasitas",

    occupiedTables:
      "Meja terisi",

    deviceOnline:
      "Device online",

    device:
      "Device",

    deviceConnected:
      "Terhubung",

    deviceOffline:
      "Offline",

    deviceNotAssigned:
      "Belum ada device",

    iotAddon:
      "KALOO IoT",

    iotDescription:
      "Device meja tersinkron dengan gateway KALOO IoT.",

    tableList:
      "Floor inventory",

    tableListDesc:
      "Setiap kartu mewakili satu meja pada outlet yang sedang dipilih.",

    tables:
      "meja",

    capacity:
      "Kapasitas",

    people:
      "orang",

    edit:
      "Edit",

    tableCode:
      "Kode meja",

    copied:
      "Kode meja disalin",

    noTable:
      "Belum ada meja yang cocok dengan filter.",

    addTitle:
      "Tambah meja",

    addDesc:
      "Buat satu atau beberapa meja sekaligus.",

    count:
      "Jumlah meja",

    prefix:
      "Prefix nama",

    startNumber:
      "Nomor awal",

    initialCapacity:
      "Kapasitas awal",

    initialStatus:
      "Status awal",

    create:
      "Buat meja",

    cancel:
      "Batal",

    saving:
      "Menyimpan",

    editTitle:
      "Pengaturan meja",

    tableName:
      "Nama meja",

    status:
      "Status",

    saveChanges:
      "Simpan perubahan",

    deviceAssignment:
      "Device IoT",

    deviceAssignmentDesc:
      "Masukkan serial number device yang sudah terdaftar untuk mengikat perangkat ke meja ini.",

    deviceButton:
      "Device",

    deviceModalTitle:
      "Pasang Device",

    deviceModalDesc:
      "Masukkan serial number device yang sudah terdaftar.",

    serialInput:
      "Serial Number Device",

    serialPlaceholder:
      "Contoh: KALOO-000123",

    connectDevice:
      "Pasang Device",

    hexId:
      "HEX / MAC Device",

    hexPlaceholder:
      "Contoh: D4:8A:FC:A4:91:BC",

    assignedDevice:
      "Device saat ini",

    serial:
      "Serial",

    registered:
      "Registered",

    online:
      "Online",

    offline:
      "Offline",

    unlink:
      "Lepaskan device",

    assign:
      "Hubungkan device",

    deviceHint:
      "Gunakan serial number yang tercetak pada device.",

    assignSuccess:
      "Device berhasil dihubungkan ke meja.",

    unlinkSuccess:
      "Device berhasil dilepaskan dari meja.",

    tableUpdated:
      "Meja berhasil diperbarui.",

    tableCreated:
      "Meja berhasil dibuat.",

    loadError:
      "Gagal memuat daftar meja.",

    genericError:
      "Terjadi kesalahan sistem.",

    max30:
      "Maksimal 30 meja sekali buat.",
  },

  en: {
    eyebrow:
      "Floor workspace",

    title:
      "Tables",

    subtitle:
      "Manage tables by outlet, capacity, operational status, and KALOO IoT device assignments.",

    refresh:
      "Refresh",

    refreshing:
      "Refreshing",

    addTables:
      "Add tables",

    main:
      "Main",

    search:
      "Search table name or code...",

    allStatus:
      "All statuses",

    disabled:
      "Disabled",

    available:
      "Available",

    occupied:
      "Occupied",

    reserved:
      "Reserved",

    totalTables:
      "Total tables",

    totalCapacity:
      "Total capacity",

    occupiedTables:
      "Occupied tables",

    deviceOnline:
      "Devices online",

    device:
      "Device",

    deviceConnected:
      "Connected",

    deviceOffline:
      "Offline",

    deviceNotAssigned:
      "No device assigned",

    iotAddon:
      "KALOO IoT",

    iotDescription:
      "Table devices stay synchronized with the KALOO IoT gateway.",

    tableList:
      "Floor inventory",

    tableListDesc:
      "Each card represents one table in the selected outlet.",

    tables:
      "tables",

    capacity:
      "Capacity",

    people:
      "people",

    edit:
      "Edit",

    tableCode:
      "Table code",

    copied:
      "Table code copied",

    noTable:
      "No tables match the current filters.",

    addTitle:
      "Add tables",

    addDesc:
      "Create one or multiple tables at once.",

    count:
      "Table count",

    prefix:
      "Name prefix",

    startNumber:
      "Start number",

    initialCapacity:
      "Initial capacity",

    initialStatus:
      "Initial status",

    create:
      "Create tables",

    cancel:
      "Cancel",

    saving:
      "Saving",

    editTitle:
      "Table settings",

    tableName:
      "Table name",

    status:
      "Status",

    saveChanges:
      "Save changes",

    deviceAssignment:
      "IoT device",

    deviceAssignmentDesc:
      "Enter the serial number of a registered device to bind it to this table.",

    deviceButton:
      "Device",

    deviceModalTitle:
      "Connect Device",

    deviceModalDesc:
      "Enter the serial number of a registered device.",

    serialInput:
      "Device Serial Number",

    serialPlaceholder:
      "Example: KALOO-000123",

    connectDevice:
      "Connect Device",

    hexId:
      "Device HEX / MAC",

    hexPlaceholder:
      "Example: D4:8A:FC:A4:91:BC",

    assignedDevice:
      "Current device",

    serial:
      "Serial",

    registered:
      "Registered",

    online:
      "Online",

    offline:
      "Offline",

    unlink:
      "Unlink device",

    assign:
      "Connect device",

    deviceHint:
      "Use the serial number printed on the device. HEX ID and secret key remain managed by the system.",

    assignSuccess:
      "Device connected to table.",

    unlinkSuccess:
      "Device unlinked from table.",

    tableUpdated:
      "Table updated.",

    tableCreated:
      "Tables created.",

    loadError:
      "Failed to load tables.",

    genericError:
      "A system error occurred.",

    max30:
      "Maximum 30 tables per batch.",
  },
} as const;

function statusLabel(
  status: number,
  locale: Locale,
) {
  const t =
    copy[locale];

  if (status === 0) return t.disabled;
  if (status === 2) return t.occupied;
  if (status === 3) return t.reserved;

  return t.available;
}

function statusClass(
  status: number,
) {
  if (status === 0) {
    return "border-black/[0.08] bg-[#f0f0ec] text-black/40";
  }

  if (status === 2) {
    return "border-black bg-black text-white";
  }

  if (status === 3) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function TableAdminClient({
  iotEnabled,
}: {
  iotEnabled: boolean;
}) {
  const params =
    useParams<{
      mitraSlug: string;
    }>();

  const slug =
    String(
      params.mitraSlug ??
        "",
    );

  const locale =
    useLanguageStore(
      (
        state,
      ) =>
        state.locale,
    ) as Locale;

  const t =
    copy[locale];

  const [
    branches,
    setBranches,
  ] =
    useState<Branch[]>(
      [],
    );

  const [
    activeBranch,
    setActiveBranch,
  ] =
    useState(
      "main",
    );

  const [
    tables,
    setTables,
  ] =
    useState<TableRow[]>(
      [],
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<TableStatusFilter>(
      "all",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    addOpen,
    setAddOpen,
  ] =
    useState(
      false,
    );

  const [
    editOpen,
    setEditOpen,
  ] =
    useState(
      false,
    );

  const [
    editingTable,
    setEditingTable,
  ] =
    useState<TableRow | null>(
      null,
    );

  const [
    deviceModalOpen,
    setDeviceModalOpen,
  ] =
    useState(
      false,
    );

  const [
    deviceTable,
    setDeviceTable,
  ] =
    useState<TableRow | null>(
      null,
    );

  const [
    deviceSerial,
    setDeviceSerial,
  ] =
    useState(
      "",
    );

  const [
    addForm,
    setAddForm,
  ] =
    useState({
      count:
        "1",
      prefix:
        locale === "id"
          ? "Meja"
          : "Table",
      startNumber:
        "1",
      capacity:
        "4",
      status:
        "1",
    });

  const [
    editForm,
    setEditForm,
  ] =
    useState({
      name:
        "",
      capacity:
        "4",
      status:
        "1",
    });

  const fetchData =
    useCallback(
      async (
        showSpinner =
          true,
      ) => {
        if (
          !slug
        ) {
          return;
        }

        if (
          showSpinner
        ) {
          setLoading(
            true,
          );
        }

        try {
          const [
            tableRes,
            branchRes,
          ] =
            await Promise.all([
              fetch(
                `/api/pos/tables?slug=${encodeURIComponent(
                  slug,
                )}&branch_id=${encodeURIComponent(
                  activeBranch,
                )}`,
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ),

              fetch(
                `/api/pos/branches?slug=${encodeURIComponent(
                  slug,
                )}`,
                {
                  cache:
                    "no-store",
                  credentials:
                    "include",
                },
              ),
            ]);

          const tableData =
            await tableRes.json();

          const branchData =
            await branchRes.json();

          if (
            !tableRes.ok ||
            !tableData.success
          ) {
            throw new Error(
              tableData.message ||
                t.loadError,
            );
          }

          const nextTables =
            Array.isArray(
              tableData.data,
            )
              ? tableData.data as
                  TableRow[]
              : [];

          setTables(
            nextTables,
          );

          if (
            branchData.success
          ) {
            setBranches(
              Array.isArray(
                branchData.data,
              )
                ? branchData.data
                : [],
            );
          }


        } catch (
          error
        ) {
          console.error(
            "[ADMIN_TABLE_LOAD_ERROR]",
            error,
          );

          Toast.fire({
            icon:
              "error",
            title:
              error instanceof
                Error
                ? error.message
                : t.loadError,
          });
        } finally {
          if (
            showSpinner
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        activeBranch,
        slug,
        t.loadError,
      ],
    );

  useEffect(() => {
    void fetchData();
  }, [
    fetchData,
  ]);

  const filteredTables =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return tables.filter(
          (
            table,
          ) => {
            const matchSearch =
              !query ||
              [
                table.table_name,
                table.table_code,
              ]
                .join(
                  " ",
                )
                .toLowerCase()
                .includes(
                  query,
                );

            const matchStatus =
              statusFilter ===
                "all" ||
              String(
                table.status,
              ) ===
                statusFilter;

            return (
              matchSearch &&
              matchStatus
            );
          },
        );
      },
      [
        search,
        statusFilter,
        tables,
      ],
    );

  const totalCapacity =
    tables.reduce(
      (
        sum,
        table,
      ) =>
        sum +
        Number(
          table.capacity ??
            0,
        ),
      0,
    );

  const occupiedCount =
    tables.filter(
      (
        table,
      ) =>
        Number(
          table.status,
        ) ===
        2,
    ).length;

  const onlineDeviceCount =
    tables.filter(
      (
        table,
      ) =>
        Boolean(
          table.iot_online,
        ),
    ).length;

  const getAssignedDevice =
    (
      tableId:
        number,
    ): Device | null => {
      const table =
        tables.find(
          (
            item,
          ) =>
            item.id ===
            tableId,
        );

      if (
        !table ||
        !table.iot_device_id
      ) {
        return null;
      }

      return {
        id:
          Number(
            table.iot_device_id,
          ),
        tableId:
          table.id,
        hexId:
          table.iot_device_hex ??
          "",
        serialNumber:
          table.iot_device_serial ??
          null,
        status:
          table.iot_device_status ===
          "inactive" ||
          table.iot_device_status ===
          "maintenance" ||
          table.iot_device_status ===
          "banned"
            ? table.iot_device_status
            : "active",
      };
    };

  const handleRefresh =
    async () => {
      if (
        refreshing
      ) {
        return;
      }

      setRefreshing(
        true,
      );

      try {
        await fetchData(
          false,
        );
      } finally {
        setRefreshing(
          false,
        );
      }
    };

  const openAdd =
    () => {
      setAddForm({
        count:
          "1",
        prefix:
          locale ===
          "id"
            ? "Meja"
            : "Table",
        startNumber:
          "1",
        capacity:
          "4",
        status:
          "1",
      });

      setAddOpen(
        true,
      );
    };

  const createTables =
    async () => {
      const count =
        Math.min(
          30,
          Math.max(
            1,
            Number(
              addForm.count ||
                1,
            ),
          ),
        );

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/pos/tables?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials:
                "include",
              body:
                JSON.stringify({
                  branch_id:
                    activeBranch ===
                    "main"
                      ? null
                      : Number(
                          activeBranch,
                        ),
                  count,
                  capacity:
                    Number(
                      addForm.capacity ||
                        4,
                    ),
                  status:
                    Number(
                      addForm.status,
                    ),
                  prefix:
                    addForm.prefix,
                  start_number:
                    Number(
                      addForm.startNumber ||
                        1,
                    ),
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              t.genericError,
          );
        }

        Toast.fire({
          icon:
            "success",
          title:
            t.tableCreated,
        });

        setAddOpen(
          false,
        );

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setSaving(
          false,
        );
      }
    };

  const openEdit =
    (
      table:
        TableRow,
    ) => {
      setEditingTable(
        table,
      );

      setEditForm({
        name:
          table.table_name ??
          "",
        capacity:
          String(
            table.capacity ??
              4,
          ),
        status:
          String(
            table.status ??
              1,
          ),
      });

      setEditOpen(
        true,
      );
    };

  const openDeviceModal =
    (
      table:
        TableRow,
    ) => {
      const device =
        getAssignedDevice(
          table.id,
        );

      setDeviceTable(
        table,
      );

      setDeviceSerial(
        device?.serialNumber ??
          "",
      );

      setDeviceModalOpen(
        true,
      );
    };

  const saveTable =
    async () => {
      if (
        !editingTable
      ) {
        return;
      }

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/pos/tables?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials:
                "include",
              body:
                JSON.stringify({
                  id:
                    editingTable.id,
                  name:
                    editForm.name.trim(),
                  capacity:
                    Number(
                      editForm.capacity ||
                        1,
                    ),
                  status:
                    Number(
                      editForm.status,
                    ),
                  branch_id:
                    activeBranch ===
                    "main"
                      ? null
                      : Number(
                          activeBranch,
                        ),
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              t.genericError,
          );
        }


        Toast.fire({
          icon:
            "success",
          title:
            t.tableUpdated,
        });

        setEditOpen(
          false,
        );

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setSaving(
          false,
        );
      }
    };

  const assignDevice =
    async () => {
      if (
        !iotEnabled ||
        !deviceTable
      ) {
        return;
      }

      const serialNumber =
        deviceSerial
          .trim()
          .toUpperCase();

      if (!serialNumber) {
        Toast.fire({
          icon:
            "error",
          title:
            locale === "id"
              ? "Serial number device wajib diisi."
              : "Device serial number is required.",
        });

        return;
      }

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/pos/tables?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials:
                "include",
              body:
                JSON.stringify({
                  id:
                    deviceTable.id,
                  action:
                    "device-bind",
                  serialNumber,
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              t.genericError,
          );
        }

        Toast.fire({
          icon:
            "success",
          title:
            t.assignSuccess,
        });

        setDeviceModalOpen(
          false,
        );

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setSaving(
          false,
        );
      }
    };

  const unlinkDevice =
    async () => {
      if (
        !iotEnabled ||
        !deviceTable
      ) {
        return;
      }

      setSaving(
        true,
      );

      try {
        const response =
          await fetch(
            `/api/pos/tables?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method:
                "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials:
                "include",
              body:
                JSON.stringify({
                  id:
                    deviceTable.id,
                  action:
                    "device-unbind",
                }),
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              t.genericError,
          );
        }

        setDeviceSerial(
          "",
        );

        Toast.fire({
          icon:
            "success",
          title:
            t.unlinkSuccess,
        });

        setDeviceModalOpen(
          false,
        );

        await fetchData(
          false,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            "error",
          title:
            error instanceof
              Error
              ? error.message
              : t.genericError,
        });
      } finally {
        setSaving(
          false,
        );
      }
    };

  const copyCode =
    async (
      code:
        string,
    ) => {
      try {
        await navigator.clipboard.writeText(
          code,
        );

        Toast.fire({
          icon:
            "success",
          title:
            t.copied,
        });
      } catch {
        // no-op
      }
    };

  if (
    loading &&
    !tables.length
  ) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/30">
          {
            t.refreshing
          }
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
            <Armchair
              size={
                13
              }
            />

            {
              t.eyebrow
            }
          </div>

          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {
              t.title
            }
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/40">
            {
              t.subtitle
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              refreshing
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-extrabold shadow-sm transition hover:border-black/20 disabled:opacity-50"
          >
            <RefreshCw
              size={
                14
              }
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {
              refreshing
                ? t.refreshing
                : t.refresh
            }
          </button>

          <button
            type="button"
            onClick={
              openAdd
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs font-extrabold text-white transition hover:bg-[#262626]"
          >
            <Plus
              size={
                14
              }
            />

            {
              t.addTables
            }
          </button>
        </div>
      </section>

      {/* BRANCH */}
      <section className="overflow-x-auto">
        <div className="flex min-w-max gap-2">
          <BranchButton
            active={
              activeBranch ===
              "main"
            }
            label={
              t.main
            }
            onClick={() =>
              setActiveBranch(
                "main",
              )
            }
          />

          {branches.map(
            (
              branch,
            ) => (
              <BranchButton
                key={
                  String(
                    branch.id,
                  )
                }
                active={
                  activeBranch ===
                  String(
                    branch.id,
                  )
                }
                label={
                  branch.name
                }
                onClick={() =>
                  setActiveBranch(
                    String(
                      branch.id,
                    ),
                  )
                }
              />
            ),
          )}
        </div>
      </section>

      {/* METRICS */}
      <section
        className={[
          "grid gap-3 sm:grid-cols-2",
          iotEnabled
            ? "xl:grid-cols-4"
            : "xl:grid-cols-3",
        ].join(
          " ",
        )}
      >
        <Metric
          icon={
            Armchair
          }
          label={
            t.totalTables
          }
          value={
            String(
              tables.length,
            )
          }
          dark
        />

        <Metric
          icon={
            Users
          }
          label={
            t.totalCapacity
          }
          value={
            String(
              totalCapacity,
            )
          }
        />

        <Metric
          icon={
            CircleDot
          }
          label={
            t.occupiedTables
          }
          value={
            String(
              occupiedCount,
            )
          }
        />

        {iotEnabled && (
          <Metric
            icon={
              Wifi
            }
            label={
              t.deviceOnline
            }
            value={
              String(
                onlineDeviceCount,
              )
            }
          />
        )}
      </section>

      {/* IOT NOTICE */}
      {iotEnabled && (
        <section className="flex flex-col gap-4 rounded-[22px] border border-black/[0.08] bg-[#f0f0eb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black/50 shadow-sm">
              <MonitorSmartphone
                size={
                  17
                }
              />
            </span>

            <div>
              <p className="text-xs font-extrabold">
                {
                  t.iotAddon
                }
              </p>

              <p className="mt-1 text-[10px] leading-4 text-black/35">
                {
                  t.iotDescription
                }
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full bg-black px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white">
            IoT_Addon = true
          </span>
        </section>
      )}

      {/* FILTER */}
      <section className="grid gap-3 rounded-[22px] border border-black/[0.08] bg-white p-4 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={
              15
            }
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25"
          />

          <input
            type="search"
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={
              t.search
            }
            className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-10 pr-4 text-xs font-semibold outline-none placeholder:text-black/25 focus:border-black/20"
          />
        </div>

        <span className="relative block">
          <SlidersHorizontal
            size={
              13
            }
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/25"
          />

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target.value as
                  TableStatusFilter,
              )
            }
            className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-9 pr-9 text-xs font-extrabold text-black/55 outline-none focus:border-black/20"
          >
            <option value="all">
              {
                t.allStatus
              }
            </option>

            <option value="1">
              {
                t.available
              }
            </option>

            <option value="2">
              {
                t.occupied
              }
            </option>

            <option value="3">
              {
                t.reserved
              }
            </option>

            <option value="0">
              {
                t.disabled
              }
            </option>
          </select>

          <ChevronDown
            size={
              14
            }
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
          />
        </span>
      </section>

      {/* TABLE LIST */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-black/30">
              {
                t.tableList
              }
            </p>

            <p className="mt-1 text-xs leading-5 text-black/35">
              {
                t.tableListDesc
              }
            </p>
          </div>

          <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.12em] text-black/30">
            {
              filteredTables.length
            }{" "}
            {
              t.tables
            }
          </span>
        </div>

        {filteredTables.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredTables.map(
              (
                table,
                index,
              ) => {
                const device =
                  getAssignedDevice(
                    table.id,
                  );

                const deviceStatus:
                  DeviceTableStatus = {
                    tableId:
                      table.id,
                    registered:
                      Boolean(
                        table.iot_registered,
                      ),
                    registeredCount:
                      Number(
                        table.iot_registered_count ??
                          0,
                      ),
                    online:
                      Boolean(
                        table.iot_online,
                      ),
                    onlineCount:
                      Number(
                        table.iot_online_count ??
                          0,
                      ),
                    pagerActive:
                      Boolean(
                        table.iot_pager_active,
                      ),
                    pagerSource:
                      table.iot_pager_source ??
                      null,
                  };

                return (
                  <motion.article
                    key={
                      table.id
                    }
                    initial={{
                      opacity:
                        0,
                      y:
                        6,
                    }}
                    animate={{
                      opacity:
                        1,
                      y:
                        0,
                    }}
                    transition={{
                      delay:
                        Math.min(
                          index *
                            0.025,
                          0.15,
                        ),
                    }}
                    className="rounded-[24px] border border-black/[0.08] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f3ef] text-black/45">
                          <Armchair
                            size={
                              18
                            }
                          />
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold">
                            {
                              table.table_name
                            }
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void copyCode(
                                table.table_code,
                              )
                            }
                            className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-black/30 hover:text-black/60"
                          >
                            {
                              table.table_code
                            }

                            <Copy
                              size={
                                10
                              }
                            />
                          </button>
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.07em]",
                          statusClass(
                            Number(
                              table.status,
                            ),
                          ),
                        ].join(
                          " ",
                        )}
                      >
                        {
                          statusLabel(
                            Number(
                              table.status,
                            ),
                            locale,
                          )
                        }
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <InfoBox
                        label={
                          t.capacity
                        }
                        value={`${table.capacity} ${t.people}`}
                      />

                      <InfoBox
                        label={
                          t.tableCode
                        }
                        value={
                          table.table_code
                        }
                      />
                    </div>

                    {iotEnabled && (
                      <div className="mt-3 rounded-[18px] border border-black/[0.07] bg-[#fafaf8] p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={[
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                deviceStatus?.online
                                  ? "bg-black text-white"
                                  : "bg-white text-black/30 ring-1 ring-black/[0.07]",
                              ].join(
                                " ",
                              )}
                            >
                              {deviceStatus?.online ? (
                                <Wifi
                                  size={
                                    14
                                  }
                                />
                              ) : (
                                <WifiOff
                                  size={
                                    14
                                  }
                                />
                              )}
                            </span>

                            <div className="min-w-0">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-black/30">
                                {
                                  t.device
                                }
                              </p>

                              <p className="mt-0.5 truncate text-[10px] font-extrabold text-black/60">
                                {device
                                  ? (
                                      device.serialNumber ||
                                      device.hexId
                                    )
                                  : t.deviceNotAssigned}
                              </p>
                            </div>
                          </div>

                          {device && (
                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className={[
                                  "rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em]",
                                  deviceStatus?.online
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-black/[0.05] text-black/35",
                                ].join(
                                  " ",
                                )}
                              >
                                {deviceStatus?.online
                                  ? t.online
                                  : t.offline}
                              </span>

                              <span className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-black/25">
                                {
                                  device.status
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-black/[0.06] pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            table,
                          )
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 text-[10px] font-extrabold text-black/55 transition hover:border-black/20 hover:text-black"
                      >
                        <Edit3
                          size={
                            12
                          }
                        />

                        {
                          t.edit
                        }
                      </button>

                      {iotEnabled && (
                        <button
                          type="button"
                          onClick={() =>
                            openDeviceModal(
                              table,
                            )
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-black px-3 text-[10px] font-extrabold text-white transition hover:bg-[#262626]"
                        >
                          <MonitorSmartphone
                            size={
                              12
                            }
                          />

                          {
                            t.deviceButton
                          }
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              },
            )}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-black/[0.08] bg-white px-6 text-center">
            <Armchair
              size={
                22
              }
              className="text-black/20"
            />

            <p className="mt-3 text-sm font-semibold text-black/35">
              {
                t.noTable
              }
            </p>
          </div>
        )}
      </section>

      {/* ADD DRAWER */}
      <SideDrawer
        open={
          addOpen
        }
        onClose={() =>
          setAddOpen(
            false,
          )
        }
        title={
          t.addTitle
        }
        subtitle={
          t.addDesc
        }
      >
        <div className="space-y-4 rounded-[22px] border border-black/[0.08] bg-white p-5">
          <Field
            label={
              t.count
            }
            type="number"
            value={
              addForm.count
            }
            onChange={(
              value,
            ) =>
              setAddForm(
                (
                  current,
                ) => ({
                  ...current,
                  count:
                    value,
                }),
              )
            }
          />

          <p className="-mt-2 text-[9px] text-black/30">
            {
              t.max30
            }
          </p>

          <Field
            label={
              t.prefix
            }
            value={
              addForm.prefix
            }
            onChange={(
              value,
            ) =>
              setAddForm(
                (
                  current,
                ) => ({
                  ...current,
                  prefix:
                    value,
                }),
              )
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                t.startNumber
              }
              type="number"
              value={
                addForm.startNumber
              }
              onChange={(
                value,
              ) =>
                setAddForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    startNumber:
                      value,
                  }),
                )
              }
            />

            <Field
              label={
                t.initialCapacity
              }
              type="number"
              value={
                addForm.capacity
              }
              onChange={(
                value,
              ) =>
                setAddForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    capacity:
                      value,
                  }),
                )
              }
            />
          </div>

          <StatusSelect
            label={
              t.initialStatus
            }
            value={
              addForm.status
            }
            onChange={(
              value,
            ) =>
              setAddForm(
                (
                  current,
                ) => ({
                  ...current,
                  status:
                    value,
                }),
              )
            }
            locale={
              locale
            }
          />
        </div>

        <DrawerFooter
          cancelLabel={
            t.cancel
          }
          submitLabel={
            saving
              ? t.saving
              : t.create
          }
          saving={
            saving
          }
          onCancel={() =>
            setAddOpen(
              false,
            )
          }
          onSubmit={() =>
            void createTables()
          }
        />
      </SideDrawer>

      {/* EDIT DRAWER */}
      <SideDrawer
        open={
          editOpen
        }
        onClose={() =>
          setEditOpen(
            false,
          )
        }
        title={
          t.editTitle
        }
        subtitle={
          editingTable
            ? `${editingTable.table_name} · ${editingTable.table_code}`
            : ""
        }
      >
        <div className="space-y-5">
          <section className="space-y-4 rounded-[22px] border border-black/[0.08] bg-white p-5">
            <Field
              label={
                t.tableName
              }
              value={
                editForm.name
              }
              onChange={(
                value,
              ) =>
                setEditForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    name:
                      value,
                  }),
                )
              }
            />

            <Field
              label={
                t.capacity
              }
              type="number"
              value={
                editForm.capacity
              }
              onChange={(
                value,
              ) =>
                setEditForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    capacity:
                      value,
                  }),
                )
              }
            />

            <StatusSelect
              label={
                t.status
              }
              value={
                editForm.status
              }
              onChange={(
                value,
              ) =>
                setEditForm(
                  (
                    current,
                  ) => ({
                    ...current,
                    status:
                      value,
                  }),
                )
              }
              locale={
                locale
              }
            />
          </section>

        </div>

        <DrawerFooter
          cancelLabel={
            t.cancel
          }
          submitLabel={
            saving
              ? t.saving
              : t.saveChanges
          }
          saving={
            saving
          }
          onCancel={() =>
            setEditOpen(
              false,
            )
          }
          onSubmit={() =>
            void saveTable()
          }
        />
      </SideDrawer>

      {iotEnabled && (
        <DeviceModal
          open={
            deviceModalOpen
          }
          table={
            deviceTable
          }
          device={
            deviceTable
              ? getAssignedDevice(
                  deviceTable.id,
                )
              : null
          }
          deviceStatus={
            deviceTable
              ? {
                  tableId:
                    deviceTable.id,
                  registered:
                    Boolean(
                      deviceTable.iot_registered,
                    ),
                  registeredCount:
                    Number(
                      deviceTable.iot_registered_count ??
                        0,
                    ),
                  online:
                    Boolean(
                      deviceTable.iot_online,
                    ),
                  onlineCount:
                    Number(
                      deviceTable.iot_online_count ??
                        0,
                    ),
                  pagerActive:
                    Boolean(
                      deviceTable.iot_pager_active,
                    ),
                  pagerSource:
                    deviceTable.iot_pager_source ??
                    null,
                }
              : undefined
          }
          value={
            deviceSerial
          }
          onChange={
            setDeviceSerial
          }
          onClose={() =>
            setDeviceModalOpen(
              false,
            )
          }
          onAssign={() =>
            void assignDevice()
          }
          onUnlink={() =>
            void unlinkDevice()
          }
          saving={
            saving
          }
          locale={
            locale
          }
        />
      )}
    </div>
  );
}

function BranchButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-extrabold transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.08] bg-white text-black/45 hover:text-black",
      ].join(
        " ",
      )}
    >
      <Store
        size={
          13
        }
      />

      {
        label
      }
    </button>
  );
}

function Metric({
  icon:
    Icon,
  label,
  value,
  dark = false,
}: {
  icon:
    React.ComponentType<{
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
      ].join(
        " ",
      )}
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          dark
            ? "bg-white/10 text-white/65"
            : "bg-[#f3f3ef] text-black/40",
        ].join(
          " ",
        )}
      >
        <Icon
          size={
            15
          }
        />
      </div>

      <p
        className={[
          "mt-6 text-[9px] font-extrabold uppercase tracking-[0.14em]",
          dark
            ? "text-white/35"
            : "text-black/30",
        ].join(
          " ",
        )}
      >
        {
          label
        }
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
        {
          value
        }
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] bg-[#f5f5f1] px-3 py-2.5">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-black/25">
        {
          label
        }
      </p>

      <p className="mt-1 truncate text-[10px] font-extrabold text-black/55">
        {
          value
        }
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
  onChange: (
    value:
      string,
  ) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
        {
          label
        }
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-xs font-semibold outline-none focus:border-black/20"
      />
    </label>
  );
}

function StatusSelect({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: string;
  onChange: (
    value:
      string,
  ) => void;
  locale:
    Locale;
}) {
  const t =
    copy[locale];

  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
        {
          label
        }
      </span>

      <span className="relative block">
        <select
          value={
            value
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target.value,
            )
          }
          className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 pr-9 text-xs font-extrabold outline-none focus:border-black/20"
        >
          <option value="1">
            {
              t.available
            }
          </option>

          <option value="2">
            {
              t.occupied
            }
          </option>

          <option value="3">
            {
              t.reserved
            }
          </option>

          <option value="0">
            {
              t.disabled
            }
          </option>
        </select>

        <ChevronDown
          size={
            14
          }
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25"
        />
      </span>
    </label>
  );
}

function DeviceLifecycleBadge({
  status,
}: {
  status:
    | "active"
    | "inactive"
    | "maintenance"
    | "banned";
}) {
  const className =
    status ===
    "active"
      ? "bg-emerald-50 text-emerald-700"
      : status ===
        "maintenance"
        ? "bg-amber-50 text-amber-700"
        : status ===
          "banned"
          ? "bg-red-50 text-red-700"
          : "bg-black/[0.05] text-black/40";

  return (
    <span
      className={[
        "rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em]",
        className,
      ].join(
        " ",
      )}
    >
      {
        status
      }
    </span>
  );
}

function DeviceModal({
  open,
  table,
  device,
  deviceStatus,
  value,
  onChange,
  onClose,
  onAssign,
  onUnlink,
  saving,
  locale,
}: {
  open:
    boolean;
  table:
    TableRow | null;
  device:
    Device | null;
  deviceStatus:
    DeviceTableStatus | undefined;
  value:
    string;
  onChange:
    (
      value:
        string,
    ) => void;
  onClose:
    () => void;
  onAssign:
    () => void;
  onUnlink:
    () => void;
  saving:
    boolean;
  locale:
    Locale;
}) {
  const t =
    copy[locale];

  return (
    <AnimatePresence>
      {open &&
        table && (
          <>
            <motion.button
              type="button"
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
              onClick={
                onClose
              }
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{
                opacity:
                  0,
                scale:
                  0.96,
                y:
                  12,
              }}
              animate={{
                opacity:
                  1,
                scale:
                  1,
                y:
                  0,
              }}
              exit={{
                opacity:
                  0,
                scale:
                  0.97,
                y:
                  8,
              }}
              transition={{
                duration:
                  0.18,
              }}
              className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-black/[0.08] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-start justify-between gap-5 border-b border-black/[0.07] px-6 py-5">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                    <MonitorSmartphone
                      size={
                        18
                      }
                    />
                  </span>

                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold tracking-[-0.035em]">
                      {
                        t.deviceModalTitle
                      }{" "}
                      {
                        table.table_name
                      }
                    </h3>

                    <p className="mt-1 text-[11px] leading-5 text-black/35">
                      {
                        t.deviceModalDesc
                      }
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-black/40 transition hover:text-black"
                >
                  <X
                    size={
                      14
                    }
                  />
                </button>
              </div>

              <div className="p-6">
                {device && (
                  <div className="mb-5 rounded-[18px] border border-black/[0.07] bg-[#f7f7f4] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-black/30">
                          {
                            t.assignedDevice
                          }
                        </p>

                        <p className="mt-1 truncate font-mono text-sm font-extrabold">
                          {
                            device.serialNumber ||
                            device.hexId
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <DeviceLifecycleBadge
                            status={
                              device.status
                            }
                          />

                          {deviceStatus?.registered && (
                            <span className="rounded-full bg-black/[0.05] px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em] text-black/35">
                              Registered
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em]",
                          deviceStatus?.online
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-black/[0.05] text-black/35",
                        ].join(
                          " ",
                        )}
                      >
                        {deviceStatus?.online ? (
                          <Wifi
                            size={
                              9
                            }
                          />
                        ) : (
                          <WifiOff
                            size={
                              9
                            }
                          />
                        )}

                        {deviceStatus?.online
                          ? t.online
                          : t.offline}
                      </span>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-black/30">
                    {
                      t.serialInput
                    }
                  </span>

                  <input
                    autoFocus
                    value={
                      value
                    }
                    onChange={(
                      event,
                    ) =>
                      onChange(
                        event.target.value
                          .toUpperCase()
                          .slice(
                            0,
                            64,
                          ),
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();
                        onAssign();
                      }
                    }}
                    placeholder={
                      t.serialPlaceholder
                    }
                    className="h-13 w-full rounded-2xl border border-black/[0.1] bg-[#fafaf8] px-4 font-mono text-sm font-bold uppercase tracking-[0.04em] outline-none transition placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-black/20 focus:border-black/30 focus:bg-white"
                  />
                </label>

                <p className="mt-2 text-[9px] leading-4 text-black/30">
                  {
                    t.deviceHint
                  }
                </p>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  {device && (
                    <button
                      type="button"
                      onClick={
                        onUnlink
                      }
                      disabled={
                        saving
                      }
                      className="mr-auto inline-flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] px-4 text-xs font-extrabold text-black/45 transition hover:text-black disabled:opacity-40"
                    >
                      <Unlink
                        size={
                          13
                        }
                      />

                      {
                        t.unlink
                      }
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={
                      onClose
                    }
                    disabled={
                      saving
                    }
                    className="h-11 rounded-xl px-4 text-xs font-extrabold text-black/40 disabled:opacity-40"
                  >
                    {
                      t.cancel
                    }
                  </button>

                  <button
                    type="button"
                    onClick={
                      onAssign
                    }
                    disabled={
                      saving ||
                      !value.trim()
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white transition hover:bg-[#262626] disabled:opacity-40"
                  >
                    {saving ? (
                      <Loader2
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Check
                        size={
                          14
                        }
                      />
                    )}

                    {
                      saving
                        ? t.saving
                        : t.connectDevice
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
    </AnimatePresence>
  );
}

function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open:
    boolean;
  onClose:
    () => void;
  title:
    string;
  subtitle:
    string;
  children:
    React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
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
            onClick={
              onClose
            }
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{
              x:
                "100%",
            }}
            animate={{
              x:
                0,
            }}
            exit={{
              x:
                "100%",
            }}
            transition={{
              type:
                "spring",
              stiffness:
                260,
              damping:
                28,
            }}
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[520px] flex-col bg-[#f7f7f4] shadow-[-24px_0_60px_rgba(0,0,0,0.14)]"
          >
            <div className="flex items-center justify-between border-b border-black/[0.08] bg-white px-5 py-5">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold tracking-[-0.03em]">
                  {
                    title
                  }
                </h3>

                <p className="mt-1 truncate text-[10px] text-black/30">
                  {
                    subtitle
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  onClose
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08]"
              >
                <X
                  size={
                    14
                  }
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {
                children
              }
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerFooter({
  cancelLabel,
  submitLabel,
  saving,
  onCancel,
  onSubmit,
}: {
  cancelLabel:
    string;
  submitLabel:
    string;
  saving:
    boolean;
  onCancel:
    () => void;
  onSubmit:
    () => void;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2 rounded-[18px] border border-black/[0.08] bg-white p-3">
      <button
        type="button"
        onClick={
          onCancel
        }
        className="h-11 rounded-xl px-4 text-xs font-extrabold text-black/45"
      >
        {
          cancelLabel
        }
      </button>

      <button
        type="button"
        onClick={
          onSubmit
        }
        disabled={
          saving
        }
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-xs font-extrabold text-white disabled:opacity-40"
      >
        {saving && (
          <Loader2
            size={
              14
            }
            className="animate-spin"
          />
        )}

        {
          submitLabel
        }
      </button>
    </div>
  );
}
