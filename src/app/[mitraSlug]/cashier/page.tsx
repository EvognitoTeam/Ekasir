'use client';

import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMenuStore } from "@/store/menu.store";
import { Order } from "@/types/menu";
import OrderCard from "@/components/cashier/OrderCard";
import { formatPrice } from "@/utils/formatters";
import CashierPOS from "@/components/cashier/CashierPOS";
import {
  ArrowLeft,
  BellRing,
  ReceiptText,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  Coffee,
  Plus,
  Loader2,
  QrCode,
  Camera,
  X,
  Printer,
  UserCircle,
  Bluetooth,
  Save,
  Scissors,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Settings2,
  Copy,
  AlignCenter,
  Trash2,
  Store,
  LayoutDashboard,
  ChefHat,
  LogOut,
  Clock,
  CheckCircle,
  Package, 
  Search,
  CalendarDays,
  Users,
  Phone,
  UserX,
  Armchair
} from "lucide-react";
import AdminDashboardView from "@/components/views/AdminDashboardView";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Toast } from "@/utils/toast";
import { PrinterManager } from "@/lib/printer/PrinterManager";
import { PrinterDevice } from "@/lib/printer/types";
import { printOrder } from "@/lib/printer/orderPrint";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";
import Swal from "sweetalert2";

type PaperWidth = "58mm" | "80mm";
type ReceiptLogoSize = "small" | "medium" | "large";

type CashierPrinterSettings = {
  paperWidth: PaperWidth;
  copies: number;
  autoPrint: boolean;
  autoCut: boolean;
  showLogo: boolean;
  logoUrl: string;
  logoSize: ReceiptLogoSize;
  headerText: string;
  footerText: string;
  thankYouText: string;
  showStoreName: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showOrderNumber: boolean;
  showOrderType: boolean;
  showTable: boolean;
  showAddons: boolean;
  showNotes: boolean;
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showServiceCharge: boolean;
  showPaymentMethod: boolean;
  showCashReceived: boolean;
  showChange: boolean;
  feedLines: number;
};

const DEFAULT_PRINTER_SETTINGS: CashierPrinterSettings = {
  paperWidth: "58mm",
  copies: 1,
  autoPrint: true,
  autoCut: true,
  showLogo: true,
  logoUrl: "/logo.png",
  logoSize: "medium",
  headerText: "",
  footerText: "",
  thankYouText: "Terima kasih atas kunjungan Anda.",
  showStoreName: true,
  showCashier: true,
  showCustomer: true,
  showOrderNumber: true,
  showOrderType: true,
  showTable: true,
  showAddons: true,
  showNotes: true,
  showSubtotal: true,
  showDiscount: true,
  showTax: true,
  showServiceCharge: true,
  showPaymentMethod: true,
  showCashReceived: true,
  showChange: true,
  feedLines: 3,
};

type PrinterSettingsTab = "device" | "receipt" | "content" | "automation" | "preview";

export default function CashierApp() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<"cashier" | "owner" | "kitchen" | null>(null);
  const [activeStaffName, setActiveStaffName] = useState("");

  const [isScanning, setIsScanning] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const physicalScannerBuffer = useRef("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [mitraProfile, setMitraProfile] = useState<{ name: string }>({ name: "Kasir" });
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [tables, setTables] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"pos" | "stock" | "reservation" | "pending" | "preparing" | "ready" | "completed">("pending");
  const [notification, setNotification] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{
    orderId: string;
    oldStatus: Order["status"];
    oldPaymentStatus?: Order["paymentStatus"];
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [cashPaymentPopup, setCashPaymentPopup] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [savedPrinters, setSavedPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [isScanningPrinter, setIsScanningPrinter] = useState(false);
  const [scanningTransport, setScanningTransport] = useState<"usb" | "bluetooth" | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [printerSettings, setPrinterSettings] = useState<CashierPrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [printerSettingsTab, setPrinterSettingsTab] = useState<PrinterSettingsTab>("device");
  const [isSavingPrinterSettings, setIsSavingPrinterSettings] = useState(false);

  // States untuk tab Kelola Stok Menu
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("");

  // States untuk tab Daftar Reservasi
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  
  const [showAddReservationModal, setShowAddReservationModal] = useState(false);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  
  // 🟢 State form diperbarui dengan pemisahan startTime dan endTime
  const [newResForm, setNewResForm] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    pax: 1,
    tableIds: [] as string[],
    notes: ''
  });

  const isNative = Capacitor.isNativePlatform();
  const { items, categories, setMenu } = useMenuStore();

  useEffect(() => {
    if (!slug) return;

    const settingsKey = `evo_printer_settings_${slug}`;
    let reconnectController: ReturnType<typeof PrinterManager.startAutoReconnect> | null = null;

    try {
      const storedSettings = localStorage.getItem(settingsKey);
      if (storedSettings) {
        setPrinterSettings({
          ...DEFAULT_PRINTER_SETTINGS,
          ...JSON.parse(storedSettings),
        });
      }

      const storedPrinters = PrinterManager.getPrinters(slug);
      const activePrinter = PrinterManager.getPrinter(slug);

      setSavedPrinters(storedPrinters);
      setPrinters(storedPrinters);
      setSelectedPrinter(activePrinter);

      reconnectController = PrinterManager.startAutoReconnect(slug, 15000);
    } catch (error) {
      console.error("Gagal memulihkan pengaturan printer:", error);
    }

    return () => {
      reconnectController?.stop();
    };
  }, [slug]);

  const updatePrinterSetting = <K extends keyof CashierPrinterSettings>(
    key: K,
    value: CashierPrinterSettings[K],
  ) => {
    setPrinterSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const saveAllPrinterSettings = async () => {
    if (!slug) return;
    setIsSavingPrinterSettings(true);
    try {
      localStorage.setItem(`evo_printer_settings_${slug}`, JSON.stringify(printerSettings));

      if (selectedPrinter) {
        await PrinterManager.savePrinter(selectedPrinter, slug);
        await PrinterManager.setActivePrinter(selectedPrinter, slug);
        setSavedPrinters(PrinterManager.getPrinters(slug));
      }

      Toast.fire({ icon: "success", title: "Pengaturan printer disimpan", topLayer: true });
    } catch (error) {
      console.error("Gagal menyimpan pengaturan printer:", error);
      Toast.fire({ icon: "error", title: "Pengaturan printer gagal disimpan", topLayer: true });
    } finally {
      setIsSavingPrinterSettings(false);
    }
  };

  const handleScanPrinter = async (transport?: "usb" | "bluetooth") => {
    setIsScanningPrinter(true);
    setScanningTransport(transport || null);
    try {
      const devices = transport ? await PrinterManager.scanByType(transport) : await PrinterManager.scan();
      setPrinters((current) => {
        const merged = [...current, ...devices];
        return Array.from(new Map(merged.map((printer) => [`${printer.type}:${printer.id}`, printer])).values());
      });

      if (devices.length === 0) {
        Toast.fire({
          icon: "info",
          title: transport === "usb" ? "Printer USB belum ditemukan" : transport === "bluetooth" ? "Printer Bluetooth belum ditemukan" : "Printer belum ditemukan",
          topLayer: true,
        });
      }
    } catch (error) {
      console.error("Gagal mendeteksi printer:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Gagal mendeteksi printer", topLayer: true });
    } finally {
      setIsScanningPrinter(false);
      setScanningTransport(null);
    }
  };

  const selectPrinter = async (printer: PrinterDevice) => {
    setSelectedPrinter(printer);
    await PrinterManager.setActivePrinter(printer, slug);
  };

  const saveSelectedPrinter = async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu", topLayer: true });
      return;
    }
    await PrinterManager.savePrinter(selectedPrinter, slug);
    await PrinterManager.setActivePrinter(selectedPrinter, slug);
    setSavedPrinters(PrinterManager.getPrinters(slug));
    Toast.fire({ icon: "success", title: `${selectedPrinter.name} disimpan`, topLayer: true });
  };

  const removeSavedPrinter = (printer: PrinterDevice) => {
    PrinterManager.removePrinter(printer, slug);
    const remaining = PrinterManager.getPrinters(slug);
    setSavedPrinters(remaining);

    setPrinters((current) => current.filter((item) => !(item.id === printer.id && item.type === printer.type)));
    if (selectedPrinter?.id === printer.id && selectedPrinter.type === printer.type) {
      const next = PrinterManager.getPrinter(slug);
      setSelectedPrinter(next);
    }
    Toast.fire({ icon: "success", title: "Printer dihapus dari daftar tersimpan", topLayer: true });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      Toast.fire({ icon: "error", title: "Logo hanya boleh PNG, JPG, JPEG, atau WEBP", topLayer: true });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Toast.fire({ icon: "error", title: "Ukuran logo maksimal 2 MB", topLayer: true });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("slug", slug);
      formData.append("logo", file);

      const response = await fetch("/api/pos/printer-logo", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok || !result.success) throw new Error(result.message || "Logo gagal diunggah");

      const logoUrl = String(result.data?.logoUrl || result.data?.banner || "");
      updatePrinterSetting("logoUrl", logoUrl);
      updatePrinterSetting("showLogo", true);

      Toast.fire({ icon: "success", title: "Logo berhasil disimpan pada banner mitra", topLayer: true });
    } catch (error) {
      console.error("Upload logo gagal:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Logo gagal diunggah", topLayer: true });
    }
  };

  const handleSavePrinter = async () => {
    await saveAllPrinterSettings();
  };

  const handleConnectPrinter = async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu", topLayer: true });
      return;
    }

    try {
      await PrinterManager.savePrinter(selectedPrinter, slug);
      await PrinterManager.setActivePrinter(selectedPrinter, slug);
      setSavedPrinters(PrinterManager.getPrinters(slug));
      await PrinterManager.connect(selectedPrinter, slug);

      Toast.fire({ icon: "success", title: `Terhubung ke ${selectedPrinter.name}`, topLayer: true });
    } catch (error) {
      console.error("Gagal menghubungkan printer Bluetooth:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Gagal menghubungkan printer", topLayer: true });
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu", topLayer: true });
      return;
    }
    try {
      await PrinterManager.savePrinter(selectedPrinter, slug);
      await PrinterManager.setActivePrinter(selectedPrinter, slug);
      setSavedPrinters(PrinterManager.getPrinters(slug));
      await PrinterManager.testPrint(selectedPrinter, slug);
      Toast.fire({ icon: "success", title: "Test print berhasil dikirim", topLayer: true });
    } catch (error) {
      console.error("Test print gagal:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Printer belum terhubung", topLayer: true });
    }
  };

  const handleNativeScan = async () => {
    try {
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0 && barcodes[0].rawValue) {
        handleTokenScan(barcodes[0].rawValue);
      }
    } catch (error) {
      console.error("Scan gagal:", error);
    }
  };

  const requestCameraPermission = async () => {
    const status = await BarcodeScanner.requestPermissions();
    return status.camera === "granted" || status.camera === "limited";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/notification.mp3");
    }
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    const restoreCashierSession = async () => {
      const storageKey = `evo_cashier_session_${slug}`;
      const storedSession = localStorage.getItem(storageKey);
      if (!storedSession) return;

      try {
        const parsed = JSON.parse(storedSession);
        if (!parsed?.token) {
          localStorage.removeItem(storageKey);
          return;
        }

        const response = await fetch("/api/pos/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: parsed.token, slug }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          localStorage.removeItem(storageKey);
          return;
        }

        const restoredRole = String(result.data.role || "").toLowerCase();
        if (restoredRole !== "cashier" && restoredRole !== "owner") {
          localStorage.removeItem(storageKey);
          return;
        }

        setActiveStaffName(result.data.name);
        setRole(restoredRole);
        setIsAuthenticated(true);
        localStorage.setItem(storageKey, JSON.stringify({ ...parsed, name: result.data.name, role: restoredRole, branchId: result.data.branchId ?? null }));
      } catch {
        localStorage.removeItem(storageKey);
      }
    };
    void restoreCashierSession();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const fetchInitialData = async () => {
      try {
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();
        if (dataSettings.success && dataSettings.data) {
          setMitraProfile({ name: dataSettings.data.cafeName || "Kasir" });

          const storedBanner = dataSettings.data.banner || dataSettings.data.logo || dataSettings.data.logoUrl;
          if (storedBanner) {
            setPrinterSettings((current) => ({ ...current, logoUrl: String(storedBanner), showLogo: true }));
          }
        }

        const resTables = await fetch(`/api/pos/tables?slug=${slug}`);
        const dataTables = await resTables.json();
        if (dataTables.success) setTables(dataTables.data);

      } catch (e) {
        console.error("Gagal load data awal:", e);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, [slug]);

  useEffect(() => {
    if (!slug || !isAuthenticated) return;
    const fetchMenu = async () => {
      try {
        const sessionStr = localStorage.getItem(`evo_cashier_session_${slug}`);
        const sessionObj = sessionStr ? JSON.parse(sessionStr) : {};
        const activeBranchId = sessionObj.branchId || '';

        const resMenu = await fetch(`/api/menu?slug=${slug}${activeBranchId ? `&branch_id=${activeBranchId}` : ''}`);
        const dataMenu = await resMenu.json();

        if (dataMenu.success) {
          const rawItems = dataMenu.items || [];
          const menuCategories = dataMenu.categories || [];
          const allAddons = dataMenu.addons || [];
          const enrichedItems = rawItems.map((item: any) => ({
            ...item,
            categorizedAddons: [{ addons: allAddons }],
          }));
          setMenu(enrichedItems, menuCategories);
        }
      } catch (e) {
        console.error("Gagal load menu cabang:", e);
      }
    };
    fetchMenu();
  }, [slug, isAuthenticated, setMenu]);

  const fetchOrders = useCallback(async () => {
    if (!slug || !isAuthenticated) return;
    try {
      const res = await fetch(`/api/orders/history?slug=${slug}`);
      const result = await res.json();

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(`evo_cashier_session_${slug}`);
        setIsAuthenticated(false);
        setRole(null);
        setActiveStaffName("");
        Toast.fire({ icon: "error", title: result.message || "Sesi kasir berakhir", topLayer: true });
        return;
      }

      if (result.success && Array.isArray(result.data)) {
        setOrders((prev) => {
          if (prev.length > 0 && result.data.length > prev.length) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch((e) => console.warn("Audio diblokir", e));
            }
            Toast.fire({ icon: "info", title: "Ada Pesanan Baru!", topLayer: true });
            setNotification("Pesanan baru masuk!");
            setTimeout(() => setNotification(null), 5000);
          }
          return result.data;
        });
      }
    } catch (e) {
      console.error("Gagal load orders:", e);
    }
  }, [slug, isAuthenticated]);

  const fetchReservations = useCallback(async () => {
    if (!slug || !isAuthenticated || activeTab !== "reservation") return;
    try {
      const sessionStr = localStorage.getItem(`evo_cashier_session_${slug}`);
      const sessionObj = sessionStr ? JSON.parse(sessionStr) : {};
      const activeBranchId = sessionObj.branchId || '';

      const res = await fetch(`/api/pos/reservations?slug=${slug}${activeBranchId ? `&branch_id=${activeBranchId}` : ''}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        setReservations(result.data);
      }
    } catch (e) {
      console.error("Gagal load reservasi:", e);
    }
  }, [slug, isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();
    if (activeTab === "reservation") fetchReservations();
    
    const interval = setInterval(() => { 
      fetchOrders(); 
      if (activeTab === "reservation") fetchReservations();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchReservations, isAuthenticated, activeTab]);

  const handleUpdateStock = async (
    itemId: number | string, 
    newAvailableStatus: boolean, 
    newStockValue: number | null,
    changedField: 'status' | 'stock'
  ) => {
    const updatedItems = items.map(item => {
      if (String(item.id) === String(itemId)) {
        return { 
          ...item, 
          isAvailable: newAvailableStatus, 
          status: newAvailableStatus ? 1 : 0, 
          stock: newStockValue as any 
        };
      }
      return item;
    });
    setMenu(updatedItems as any[], categories);

    try {
      const apiPromises = [];

      if (changedField === 'status') {
        apiPromises.push(
          fetch(`/api/menu?slug=${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(itemId), isAvailable: newAvailableStatus })
          })
        );
      }

      if (changedField === 'stock') {
        const formData = new FormData();
        formData.append('entity', 'menu');
        formData.append('id', String(itemId));
        formData.append('stock', newStockValue !== null ? String(newStockValue) : ''); 
        
        apiPromises.push(fetch(`/api/menu?slug=${slug}`, { method: 'PUT', body: formData }));
      }

      const results = await Promise.all(apiPromises);
      for (const res of results) {
        if (!res.ok) {
          const resultData = await res.json();
          throw new Error(resultData.message || "Gagal menyimpan ke server");
        }
      }
      
      Toast.fire({ icon: 'success', title: changedField === 'stock' ? 'Stok diperbarui' : 'Status diperbarui', topLayer: true });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: 'error', title: 'Gagal memperbarui data', topLayer: true });
      
      const sessionStr = localStorage.getItem(`evo_cashier_session_${slug}`);
      const sessionObj = sessionStr ? JSON.parse(sessionStr) : {};
      const activeBranchId = sessionObj.branchId || '';

      const originalRes = await fetch(`/api/menu?slug=${slug}${activeBranchId ? `&branch_id=${activeBranchId}` : ''}`);
      const dataMenu = await originalRes.json();
      if (dataMenu.success) setMenu(dataMenu.items, dataMenu.categories);
    }
  };

  const handleUpdateReservationStatus = async (resId: string | number, newStatus: string) => {
    const isCancel = newStatus === 'canceled' || newStatus === 'no_show';
    const actionText = newStatus === 'confirmed' ? 'mengonfirmasi' : newStatus === 'completed' ? 'menandai HADIR' : newStatus === 'canceled' ? 'Membatalkan' : 'menandai TIDAK HADIR';

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

    setReservations(prev => prev.map(r => String(r.id) === String(resId) ? { ...r, status: newStatus } : r));

    try {
      const res = await fetch(`/api/pos/reservations?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(resId), status: newStatus })
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);

      Toast.fire({ icon: 'success', title: 'Status Reservasi Diperbarui', topLayer: true });
    } catch (error) {
      console.error("Gagal update reservasi:", error);
      Toast.fire({ icon: 'error', title: 'Gagal memperbarui reservasi', topLayer: true });
      fetchReservations(); 
    }
  };

  // 🟢 FUNGSI TAMBAH RESERVASI (DIPERBARUI UNTUK WAKTU SELESAI)
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResForm.name || !newResForm.date || !newResForm.startTime || !newResForm.endTime) {
      Toast.fire({ icon: 'warning', title: 'Semua informasi waktu wajib diisi', topLayer: true });
      return;
    }

    setIsSubmittingReservation(true);
    try {
      // 🟢 Format: YYYY-MM-DDTHH:mm:00
      const startDateTime = `${newResForm.date}T${newResForm.startTime}:00`;
      const endDateTime = `${newResForm.date}T${newResForm.endTime}:00`;

      const payload = {
        customer_name: newResForm.name,
        customer_phone: newResForm.phone,
        guest_count: newResForm.pax,
        reserved_start: startDateTime,
        reserved_end: endDateTime,
        table_ids: newResForm.tableIds, 
        notes: newResForm.notes,
        status: 'confirmed' 
      };

      const res = await fetch(`/api/pos/reservations?slug=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Gagal menyimpan reservasi");

      Toast.fire({ icon: 'success', title: 'Reservasi Manual Berhasil Dibuat', topLayer: true });
      setShowAddReservationModal(false);
      setNewResForm({ name: '', phone: '', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '', pax: 1, tableIds: [], notes: '' });
      fetchReservations();
    } catch (error: any) {
      console.error("Add reservation error:", error);
      Toast.fire({ icon: 'error', title: error.message || 'Gagal membuat reservasi', topLayer: true });
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  const handleTokenScan = async (token: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setIsScanning(false);

    try {
      const res = await fetch("/api/pos/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slug }),
      });
      const result = await res.json();

      if (result.success) {
        const staffRole = result.data.role.toLowerCase();

        if (staffRole !== "cashier" && staffRole !== "owner") {
          Toast.fire({ icon: "error", title: "Akses Ditolak! QR ini tidak memiliki izin Kasir.", topLayer: true });
          return;
        }

        const staffName = result.data.name;
        setRole(staffRole);
        setActiveStaffName(staffName);
        setIsAuthenticated(true);

        localStorage.setItem(
          `evo_cashier_session_${slug}`,
          JSON.stringify({
            name: staffName,
            role: staffRole,
            token: token,
            branchId: result.data.branchId ?? null,
          }),
        );

        Toast.fire({ icon: "success", title: `Selamat Bekerja, ${staffName}!`, topLayer: true });
      } else {
        Toast.fire({ icon: "error", title: result.message, topLayer: true });
      }
    } catch (error) {
      Toast.fire({ icon: "error", title: "Gagal menghubungi server", topLayer: true });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Enter") {
        if (physicalScannerBuffer.current.length > 10) handleTokenScan(physicalScannerBuffer.current);
        physicalScannerBuffer.current = "";
      } else if (e.key.length === 1) {
        physicalScannerBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated]);

  const logout = async () => {
    try {
      const sessionData = localStorage.getItem(`evo_cashier_session_${slug}`);
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: parsedSession.token }),
        });
      }
    } catch (error) {
      console.error("Gagal melakukan logout dari server:", error);
    } finally {
      localStorage.removeItem(`evo_cashier_session_${slug}`);
      setIsAuthenticated(false);
      setRole(null);
      setActiveStaffName("");
      setIsScanning(true);
    }
  };

  const executeUpdate = async (
    orderId: string,
    newStatus: Order["status"],
    newPaymentStatus?: Order["paymentStatus"],
    extraData?: any,
  ) => {
    try {
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === orderId
            ? { ...o, status: newStatus, paymentStatus: newPaymentStatus || o.paymentStatus, ...extraData }
            : o,
        ),
      );
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: newStatus,
          paymentStatus: newPaymentStatus,
          ...extraData,
        }),
      });
    } catch (e) {
      console.error("Gagal update status:", e);
    }
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: Order["status"],
    newPaymentStatus?: Order["paymentStatus"],
  ) => {
    const cur = orders.find((o) => String(o.id) === String(orderId));
    if (!cur) return;

    if (newStatus === "confirmed" && cur.paymentMethod === "cash" && !cur.getPayment) {
      setCashPaymentPopup(cur);
      setReceivedAmount("");
      return;
    }

    if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
    executeUpdate(orderId, newStatus, newPaymentStatus);
    const timeoutId = setTimeout(() => setUndoAction(null), 4000);
    setUndoAction({
      orderId,
      oldStatus: cur.status,
      oldPaymentStatus: cur.paymentStatus,
      timeoutId,
    });
  };

  const handleConfirmCashPayment = () => {
    if (!cashPaymentPopup) return;

    const totalBill = Number(
      cashPaymentPopup.totalAfterDiscount ||
        cashPaymentPopup.total_after_discount ||
        cashPaymentPopup.totalPrice ||
        cashPaymentPopup.total_price ||
        0,
    );
    const received = Number(receivedAmount.replace(/\D/g, ""));

    if (received < totalBill) {
      Toast.fire({ icon: "error", title: "Nominal uang kurang!", topLayer: true });
      return;
    }

    const change = received - totalBill;

    executeUpdate(String(cashPaymentPopup.id), "confirmed", "1", {
      getPayment: received,
      cashChange: change,
    });

    Toast.fire({ icon: "success", title: `Lunas! Kembalian: ${formatPrice(change)}`, topLayer: true });
    setCashPaymentPopup(null);
  };

  const updateOrderNote = async (orderId: string, note: string) => {
    try {
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === orderId ? { ...o, adminNotes: note } : o,
        ),
      );
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminNotes: note }),
      });
    } catch (e) {
      console.error("Gagal update note:", e);
    }
  };

  const handlePrintOrder = async (order: Order, target: "kitchen" | "customer") => {
    const printer = PrinterManager.getPrinter(slug);
    if (!printer) {
      throw new Error("Printer aktif belum dipilih. Buka Pengaturan Printer terlebih dahulu.");
    }

    let receiptSettings: Record<string, unknown> = {};
    try {
      receiptSettings = JSON.parse(localStorage.getItem(`evo_printer_settings_${slug}`) || "{}");
    } catch {
      receiptSettings = {};
    }

    await printOrder({
      order,
      target,
      printer,
      slug,
      storeName: mitraProfile.name,
      cashierName: activeStaffName,
      menuItems: useMenuStore.getState().items as any,
      settings: receiptSettings as any,
    });

    Toast.fire({ icon: "success", title: target === "kitchen" ? "Tiket dapur berhasil dicetak" : "Struk customer berhasil dicetak", topLayer: true });
  };

  const handlePOSSubmit = async (newOrder: Order) => {
    setOrders((previous) => {
      const alreadyExists = previous.some(
        (order) =>
          String(order.id) === String(newOrder.id) ||
          (Boolean(order.order_code) &&
            String(order.order_code) === String(newOrder.order_code)),
      );

      return alreadyExists
        ? previous.map((order) =>
            String(order.id) === String(newOrder.id) ||
            (Boolean(order.order_code) &&
              String(order.order_code) === String(newOrder.order_code))
              ? { ...order, ...newOrder }
              : order,
          )
        : [newOrder, ...previous];
    });

    try {
      if (printerSettings.autoPrint) {
        await handlePrintOrder(newOrder, "customer");
      } else {
        Toast.fire({ icon: "success", title: "Pesanan berhasil dibuat", topLayer: true });
      }
    } catch (error) {
      console.error("[AUTO_PRINT_CUSTOMER_ERROR]", error);
      Toast.fire({
        icon: "warning",
        title: error instanceof Error ? `Pesanan dibuat, tapi cetak gagal: ${error.message}` : "Pesanan dibuat, tapi struk gagal dicetak",
        topLayer: true,
      });
    }
  };

  const handleUndo = () => {
    if (!undoAction) return;
    clearTimeout(undoAction.timeoutId);
    executeUpdate(undoAction.orderId, undoAction.oldStatus, undoAction.oldPaymentStatus);
    setUndoAction(null);
  };

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);
  const preparingCount = useMemo(() => orders.filter((o) => o.status === "confirmed" || o.status === "preparing").length, [orders]);
  const readyCount = useMemo(() => orders.filter((o) => o.status === "ready").length, [orders]);
  const completedCount = useMemo(() => orders.filter((o) => o.status === "completed" || o.status === "cancelled").length, [orders]);

  const todayOrders = useMemo(() => {
    const t = new Date().toDateString();
    return orders.filter((o) => new Date(o.createdAt || o.created_at || 0).toDateString() === t);
  }, [orders]);
  const totalRevenue = useMemo(() => todayOrders.reduce((s, o) => s + (Number(o.totalPrice || o.total_price) || 0), 0), [todayOrders]);
  const totalProfit = useMemo(() => totalRevenue * 0.45, [totalRevenue]);

  const filteredOrders = useMemo(
    () =>
      orders
        .filter((o) => {
          if (activeTab === "pending") return o.status === "pending";
          if (activeTab === "preparing") return o.status === "confirmed" || o.status === "preparing";
          if (activeTab === "ready") return o.status === "ready";
          if (activeTab === "completed") return o.status === "completed" || o.status === "cancelled";
          return true;
        })
        .sort((a, b) => {
          const idA = Number(a.id) || 0;
          const idB = Number(b.id) || 0;
          if (idA !== 0 && idB !== 0) return idB - idA;
          const dateA = String(a.createdAt || a.created_at || 0).replace(" ", "T");
          const dateB = String(b.createdAt || b.created_at || 0).replace(" ", "T");
          return (new Date(dateB).getTime() || 0) - (new Date(dateA).getTime() || 0);
        }),
    [orders, activeTab],
  );

  const filteredStockItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase());
      const matchCat = stockCategoryFilter ? String(item.categoryId) === stockCategoryFilter : true;
      return matchSearch && matchCat;
    });
  }, [items, stockSearch, stockCategoryFilter]);

  const groupedStock = useMemo(() => {
    const groups = categories.map(cat => ({
      category: cat,
      items: filteredStockItems.filter(item => String(item.categoryId) === String(cat.id))
    })).filter(g => g.items.length > 0);

    const uncategorized = filteredStockItems.filter(item => !categories.some(c => String(c.id) === String(item.categoryId)));
    if (uncategorized.length > 0) {
      groups.push({
        category: { id: 'uncategorized', name: 'Tanpa Kategori' } as any,
        items: uncategorized
      });
    }

    return groups;
  }, [filteredStockItems, categories]);


  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      if (!reservationSearch) return true;
      const term = reservationSearch.toLowerCase();
      const name = String(res.customer_name || '').toLowerCase();
      const phone = String(res.customer_phone || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [reservations, reservationSearch]);

  const formatResDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatResTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };


  // --- RENDERING ---

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-700" />
        <p className="mt-4 text-sm font-bold text-stone-400 uppercase tracking-widest">Menyiapkan Sistem...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100 p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-900/5 blur-[120px] rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-amber-500/5 blur-[100px] rounded-tr-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2rem] border border-stone-200 shadow-2xl p-8 flex flex-col items-center relative z-10"
        >
          <div className="w-20 h-20 rounded-[1.5rem] bg-emerald-700 flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/20">
            <QrCode className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-stone-800 tracking-tight text-center font-display leading-tight mb-2">
            {mitraProfile.name}
          </h2>
          <p className="text-sm text-stone-500 text-center px-4 mb-8">
            Silakan scan QR Code identitas staf Anda untuk memulai sesi.
          </p>

          <div className="w-full">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center p-12 bg-stone-50 rounded-2xl border border-stone-100">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-700 mb-4" />
                <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Memverifikasi Akses</p>
              </div>
            ) : (
              <>
                {!isNative && isScanning ? (
                  <div className="rounded-3xl overflow-hidden border-4 border-dashed border-emerald-700/50 p-1 relative bg-black aspect-square max-h-[300px] mx-auto w-full max-w-[300px] mb-6">
                    <Scanner
                      onScan={(result) => { if (result && result.length > 0) handleTokenScan(result[0].rawValue); }}
                      components={{ finder: false }}
                    />
                    <button
                      onClick={() => setIsScanning(false)}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-500/90 backdrop-blur text-white text-sm font-bold rounded-full shadow-lg hover:bg-red-600 transition"
                    >
                      Tutup Kamera
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if (isNative) {
                        const granted = await requestCameraPermission();
                        if (!granted) { alert("Izin kamera ditolak"); return; }
                        await handleNativeScan();
                        return;
                      }
                      setIsScanning(true);
                    }}
                    className="w-full py-5 mb-6 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-700 font-black text-base flex justify-center items-center gap-3 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Camera className="w-6 h-6" />
                    {isNative ? "Scan QR Code" : "Aktifkan Kamera Web"}
                  </button>
                )}

                <div className="text-center p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                    <strong className="font-bold">Mode Scanner Fisik Aktif.</strong><br />
                    Fokuskan kursor dan tembak QR Code langsung ke layar.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (role === "owner") {
    return <AdminDashboardView onBack={logout} />;
  }

  const TABS = [
    { id: "pos", label: "Buat Pesanan", icon: Plus, count: 0 }, 
    { id: "pending", label: "Pesanan Baru", icon: BellRing, count: pendingCount },
    { id: "preparing", label: "Proses Dapur", icon: ChefHat, count: preparingCount },
    { id: "ready", label: "Siap Saji", icon: CheckCircle, count: readyCount },
    { id: "completed", label: "Riwayat", icon: Clock, count: completedCount },
    { id: "reservation", label: "Daftar Reservasi", icon: CalendarDays, count: 0 }, 
    { id: "stock", label: "Kelola Stok", icon: Package, count: 0 },
  ];

  const popupTotalBill = cashPaymentPopup ? Number(cashPaymentPopup.totalAfterDiscount || cashPaymentPopup.total_after_discount || cashPaymentPopup.totalPrice || cashPaymentPopup.total_price || 0) : 0;
  const popupReceived = Number(receivedAmount.replace(/\D/g, "")) || 0;
  const popupChange = popupReceived - popupTotalBill;

  return (
    <div className="flex h-screen w-full bg-stone-100 overflow-hidden font-sans text-stone-800">
      
      <aside className="w-72 bg-white border-r border-stone-200 flex flex-col justify-between flex-shrink-0 z-20 shadow-sm relative">
        <div>
          <div className="h-20 flex items-center px-6 border-b border-stone-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-none text-stone-900">{mitraProfile.name}</h1>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Sistem POS</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {TABS.map((tab) => {
              if ((tab.id === "pos" || tab.id === "stock" || tab.id === "reservation") && role !== "cashier") return null;

              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                    active 
                      ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/20" 
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold text-sm">
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </div>
                  {tab.count > 0 && tab.id !== "pos" && tab.id !== "stock" && tab.id !== "reservation" && (
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                      active ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => fetchOrders()}
              className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-white border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 hover:border-stone-300 transition"
            >
              <RefreshCw className="w-4 h-4" /> Segarkan
            </button>
            <button
              onClick={() => setShowPrinterModal(true)}
              className="flex-1 flex justify-center items-center gap-2 py-3 rounded-xl bg-white border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 hover:border-stone-300 transition"
            >
              <Printer className="w-4 h-4" /> Pengaturan
            </button>
          </div>
          
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-black text-stone-800">{activeStaffName}</p>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition"
              title="Akhiri Sesi"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-stone-50/50 relative overflow-hidden">
        {activeTab === "pos" ? (
          <div className="flex-1 w-full h-full bg-white overflow-hidden">
            <CashierPOS
              onClose={() => setActiveTab("pending")}
              onSubmitOrder={(order) => {
                handlePOSSubmit(order);
                setActiveTab("pending");
              }}
            />
          </div>
        ) : activeTab === "stock" ? (
          <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
            
            <header className="px-8 py-5 border-b border-stone-200 bg-white flex flex-col gap-4 flex-shrink-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-stone-800 font-display leading-tight">
                    Kelola Stok & Ketersediaan
                  </h2>
                  <p className="text-sm font-medium text-stone-500 mt-1">
                    Ubah ketersediaan menu secara real-time.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama menu..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-sm font-medium text-stone-800 w-64"
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setStockCategoryFilter("")}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    stockCategoryFilter === ""
                      ? 'bg-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-900/20'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  Semua Kategori
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setStockCategoryFilter(String(cat.id))}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      stockCategoryFilter === String(cat.id)
                        ? 'bg-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-900/20'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
              {groupedStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-stone-500">
                  <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <Search className="w-7 h-7 text-stone-300" />
                  </div>
                  <p className="text-stone-600 font-bold">Menu tidak ditemukan</p>
                  <p className="text-xs text-stone-400 mt-1">Tidak ada menu yang sesuai dengan pencarian.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {groupedStock.map((group) => (
                    <div key={group.category.id} className="flex flex-col gap-3">
                      <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
                        <div className="w-2.5 h-6 bg-emerald-600 rounded-full"></div>
                        {group.category.name}
                        <span className="text-xs font-bold text-stone-400 bg-stone-200 px-2 py-0.5 rounded-md ml-2">
                          {group.items.length} Menu
                        </span>
                      </h3>

                      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-500 text-xs font-black uppercase tracking-wider">
                              <th className="p-4 pl-6">Menu</th>
                              <th className="p-4 w-32">Harga</th>
                              <th className="p-4 w-32">Stok</th>
                              <th className="p-4 w-32 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map(item => {
                              let isAvail = true;

                              if (item.isAvailable !== undefined && item.isAvailable !== null) {
                                isAvail = Boolean(item.isAvailable);
                              } else if (item.status !== undefined && item.status !== null) {
                                isAvail = Number(item.status) === 1;
                              }
                              
                              const stockValue = item.stock ?? null;
                              const priceValue = item.basePrice ?? 0;
                              const imageUrl = item.image ? String(item.image).startsWith("http") ? item.image : `/${String(item.image).replace(/^\/+/, "")}` : null;

                              return (
                                <tr key={item.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0">
                                        {imageUrl ? (
                                          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Coffee className="w-5 h-5 text-stone-300" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-stone-800 truncate">{item.name}</p>
                                        {!isAvail && (
                                          <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-black">
                                            HABIS
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 text-sm font-black text-emerald-700">{formatPrice(Number(priceValue))}</td>
                                  <td className="p-4">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="∞"
                                      defaultValue={stockValue ?? ""}
                                      onBlur={(e) => {
                                        const value = e.target.value.trim();
                                        const newStock = value === "" ? null : Math.max(0, Number(value));
                                        if (newStock !== stockValue) {
                                          handleUpdateStock(item.id, isAvail, newStock, 'stock');
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                      }}
                                      className="w-20 p-2 border border-stone-200 rounded-lg text-sm text-center outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 font-bold bg-white"
                                    />
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStock(item.id, !isAvail, stockValue, 'status')}
                                      className={`inline-flex items-center gap-2 min-w-[118px] justify-center px-3 py-2 rounded-xl border transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isAvail ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 focus:ring-emerald-500/30' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 focus:ring-red-500/30'}`}
                                    >
                                      <span className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${isAvail ? "bg-emerald-600" : "bg-stone-300"}`}>
                                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isAvail ? "translate-x-4" : "translate-x-0.5"}`} />
                                      </span>
                                      <span className="text-[11px] font-black tracking-wide">{isAvail ? "TERSEDIA" : "HABIS"}</span>
                                    </button>
                                    <p className="mt-1.5 text-[10px] font-medium text-stone-400">Klik untuk mengubah</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        ) : activeTab === "reservation" ? (
          
          <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
            <header className="h-20 px-8 border-b border-stone-200 bg-white flex items-center justify-between flex-shrink-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-stone-800 font-display leading-tight">
                  Daftar Reservasi Meja
                </h2>
                <p className="text-sm font-medium text-stone-500 mt-1">
                  Kelola jadwal kedatangan pelanggan dan booking meja.
                </p>
              </div>
              <div className="flex items-center gap-3">
                
                <button 
                  onClick={() => setShowAddReservationModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition shadow-md shadow-emerald-900/20"
                >
                  <Plus className="w-4 h-4" /> Tambah Manual
                </button>

                <div className="relative ml-2">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama/no HP..."
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-sm font-medium text-stone-800 w-64"
                  />
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
              {filteredReservations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-stone-500">
                  <div className="w-20 h-20 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                    <CalendarDays className="w-10 h-10 text-stone-300" />
                  </div>
                  <p className="text-lg text-stone-700 font-black">Belum Ada Reservasi</p>
                  <p className="text-sm text-stone-400 mt-1 text-center max-w-sm">Daftar pelanggan yang mem-booking meja untuk hari ini atau mendatang akan muncul di sini.</p>
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 text-sm font-black uppercase tracking-wider">
                        <th className="p-4 pl-6">Pelanggan</th>
                        <th className="p-4">Waktu</th>
                        <th className="p-4 text-center">Tamu (Pax)</th>
                        <th className="p-4 max-w-[200px]">Meja</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map((res: any) => {
                         let badgeBg = 'bg-stone-100 text-stone-600';
                         let badgeText = res.status;
                         
                         switch(res.status) {
                           case 'pending': badgeBg = 'bg-amber-100 text-amber-700'; badgeText = 'Menunggu'; break;
                           case 'confirmed': badgeBg = 'bg-emerald-100 text-emerald-700'; badgeText = 'Dikonfirmasi'; break;
                           case 'completed': badgeBg = 'bg-blue-100 text-blue-700'; badgeText = 'Hadir / Selesai'; break;
                           case 'canceled': badgeBg = 'bg-red-100 text-red-700'; badgeText = 'Dibatalkan'; break;
                           case 'no_show': badgeBg = 'bg-stone-200 text-stone-600'; badgeText = 'Tidak Hadir'; break;
                         }

                         return (
                          <tr key={res.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <td className="p-4 pl-6">
                              <p className="font-bold text-stone-800">{res.customer_name || "-"}</p>
                              <p className="text-xs text-stone-500 font-medium flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" /> {res.customer_phone || "-"}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-stone-800">{formatResDate(res.reserved_start)}</p>
                              <p className="text-xs text-emerald-600 font-black mt-1">
                                {formatResTime(res.reserved_start)} - {formatResTime(res.reserved_end)} WIB
                              </p>
                            </td>
                            <td className="p-4 text-center font-bold text-stone-700">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="w-4 h-4 text-stone-400" /> {res.guest_count}
                              </div>
                            </td>
                            <td className="p-4 font-black text-amber-700 text-xs leading-relaxed max-w-[200px]">
                              {res.table_ids && res.table_ids.length > 0 
                                ? res.table_ids.map((id: any) => tables.find((t: any) => String(t.id) === String(id))?.table_name || `Meja ${id}`).join(', ')
                                : (res.tables || res.table_name || res.table_id || "Belum dipilih")
                              }
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {res.status === 'pending' && (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-600 hover:text-white transition" title="Konfirmasi Reservasi">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleUpdateReservationStatus(res.id, 'canceled')} className="p-2 bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-500 hover:text-white transition" title="Tolak / Batalkan">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {res.status === 'confirmed' && (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleUpdateReservationStatus(res.id, 'completed')} className="p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition" title="Tandai Tamu Hadir">
                                    <UserCircle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleUpdateReservationStatus(res.id, 'no_show')} className="p-2 bg-stone-100 text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-500 hover:text-white transition" title="Tamu Tidak Hadir (No Show)">
                                    <UserX className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              
                              {(res.status === 'completed' || res.status === 'canceled' || res.status === 'no_show') && (
                                <span className="text-xs text-stone-400 italic">Selesai</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        ) : (

          <>

            <header className="
              h-20
              px-8
              border-b
              border-stone-200
              bg-white
              flex
              items-center
              justify-between
              flex-shrink-0
              z-10
            ">

              <div>
                <h2 className="
                  text-2xl
                  font-black
                  text-stone-800
                  font-display
                ">
                  {TABS.find(
                    (tab) =>
                      tab.id === activeTab
                  )?.label}
                </h2>

                <p className="
                  text-xs
                  text-stone-400
                  font-medium
                  mt-1
                ">
                  Kelola pesanan KALOO POS
                </p>
              </div>

              <div className="flex items-center gap-4">

                {role === "cashier" && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("pos")
                    }
                    className="
                      flex
                      items-center
                      gap-2
                      px-6
                      py-3
                      bg-emerald-700
                      hover:bg-emerald-800
                      text-white
                      rounded-xl
                      font-bold
                      shadow-lg
                      shadow-emerald-900/20
                      transition-all
                      active:scale-95
                    "
                  >
                    <Plus className="w-5 h-5" />

                    Buat Pesanan
                  </button>
                )}

              </div>

            </header>

            <div className="
              absolute
              top-24
              left-1/2
              -translate-x-1/2
              z-50
              flex
              flex-col
              gap-2
              w-full
              max-w-lg
              pointer-events-none
            ">

              <AnimatePresence>

                {notification && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -20,
                      scale: 0.9,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      scale: 0.9,
                    }}
                    className="
                      bg-emerald-700
                      text-white
                      px-5
                      py-3
                      rounded-2xl
                      shadow-xl
                      flex
                      items-center
                      gap-3
                      font-bold
                      pointer-events-auto
                    "
                  >
                    <BellRing className="w-5 h-5" />

                    <span className="flex-1">
                      {notification}
                    </span>

                  </motion.div>
                )}

                {undoAction && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -20,
                      scale: 0.9,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      scale: 0.9,
                    }}
                    className="
                      bg-stone-900
                      text-white
                      px-5
                      py-3.5
                      rounded-2xl
                      shadow-2xl
                      flex
                      items-center
                      justify-between
                      pointer-events-auto
                      border
                      border-stone-700
                    "
                  >

                    <div>
                      <p className="
                        text-sm
                        font-bold
                      ">
                        Status Diperbarui
                      </p>

                      <p className="
                        text-[11px]
                        text-stone-400
                      ">
                        Order #{undoAction.orderId}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUndo}
                      className="
                        flex
                        items-center
                        gap-2
                        px-4
                        py-2
                        bg-stone-800
                        hover:bg-stone-700
                        border
                        border-stone-600
                        rounded-xl
                        text-xs
                        font-bold
                        transition
                      "
                    >
                      <RotateCcw className="w-4 h-4" />

                      Batalkan
                    </button>

                  </motion.div>
                )}

              </AnimatePresence>

            </div>

            <div className="
              flex-1
              overflow-y-auto
              p-8
            ">

              {filteredOrders.length === 0 ? (

                <div className="
                  h-full
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-stone-400
                ">

                  <div className="
                    w-24
                    h-24
                    bg-white
                    border-2
                    border-dashed
                    border-stone-200
                    rounded-3xl
                    flex
                    items-center
                    justify-center
                    mb-6
                  ">
                    <ShoppingBag className="
                      w-10
                      h-10
                      text-stone-300
                    " />
                  </div>

                  <h3 className="
                    text-xl
                    font-black
                    text-stone-600
                    mb-2
                  ">
                    Area Kosong
                  </h3>

                  <p className="
                    text-sm
                    font-medium
                  ">
                    Tidak ada pesanan di kategori ini.
                  </p>

                  {role === "cashier" && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab("pos")
                      }
                      className="
                        mt-5
                        px-5
                        py-2.5
                        rounded-xl
                        bg-emerald-700
                        hover:bg-emerald-800
                        text-white
                        text-sm
                        font-bold
                        transition
                      "
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Buat Pesanan
                      </span>
                    </button>
                  )}

                </div>

              ) : (

                <div className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  lg:grid-cols-3
                  xl:grid-cols-4
                  gap-6
                  auto-rows-max
                ">

                  <AnimatePresence mode="popLayout">

                    {filteredOrders.map((order) => (

                      <motion.div
                        layout
                        key={order.id}
                        initial={{
                          opacity: 0,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                        }}
                        transition={{
                          duration: 0.2,
                        }}
                      >

                        <OrderCard
                          order={order}
                          onUpdateStatus={
                            updateOrderStatus
                          }
                          onUpdateNote={
                            updateOrderNote
                          }
                          onPrintOrder={
                            handlePrintOrder
                          }
                          role={
                            role === "kitchen"
                              ? "kitchen"
                              : "cashier"
                          }
                        />

                      </motion.div>

                    ))}

                  </AnimatePresence>

                </div>

              )}

            </div>

          </>

        )}

</main>

      {/* 3. RIGHT PANEL (Hanya tampil jika bukan di mode POS / Kelola Stok / Reservasi) */}
      {role === "cashier" && activeTab !== "pos" && activeTab !== "stock" && activeTab !== "reservation" && (
        <aside className="w-80 bg-white border-l border-stone-200 flex flex-col z-20 flex-shrink-0 shadow-sm">
          <div className="h-20 flex items-center px-6 border-b border-stone-100">
            <h3 className="text-base font-black text-stone-800">Ringkasan Hari Ini</h3>
          </div>
          
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6">
              <div className="flex items-center gap-3 text-stone-500 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Pendapatan</span>
              </div>
              <p className="text-3xl font-black text-stone-900 font-display tracking-tight">
                {formatPrice(totalRevenue)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5">
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <ReceiptText className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Penjualan</span>
                </div>
                <p className="text-2xl font-black text-emerald-900">{todayOrders.length} <span className="text-sm">nota</span></p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Est. Laba</span>
                </div>
                <p className="text-lg font-black text-amber-900">{formatPrice(totalProfit)}</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* --- POPUPS & MODALS --- */}
      <AnimatePresence>
        {cashPaymentPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-xl font-black text-stone-800 tracking-tight">Terima Tunai</h3>
                  <p className="text-xs font-bold text-stone-400 mt-1">Order #{cashPaymentPopup.id}</p>
                </div>
                <button
                  onClick={() => setCashPaymentPopup(null)}
                  className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="text-center p-6 rounded-3xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Total Tagihan</p>
                  <p className="text-4xl font-black text-amber-600 font-display">{formatPrice(popupTotalBill)}</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 block">Uang Diterima (Rp)</label>
                  <input
                    type="text"
                    autoFocus
                    inputMode="numeric"
                    value={receivedAmount ? formatPrice(Number(receivedAmount.replace(/\D/g, ""))).replace("Rp", "").trim() : ""}
                    onChange={(e) => setReceivedAmount(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white border-2 border-stone-200 rounded-2xl py-4 px-6 text-3xl font-black text-stone-800 outline-none transition-all focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 text-center"
                    placeholder="0"
                  />
                  <div className="flex justify-center gap-3 mt-4">
                    <button onClick={() => setReceivedAmount(String(popupTotalBill))} className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition">Uang Pas</button>
                    <button onClick={() => setReceivedAmount("50000")} className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition">50.000</button>
                    <button onClick={() => setReceivedAmount("100000")} className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition">100.000</button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-5 rounded-2xl border border-stone-100 bg-stone-50">
                  <span className="text-sm font-bold text-stone-500">Kembalian</span>
                  <span className={`text-2xl font-black ${popupChange < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {popupChange < 0 ? "Uang Kurang" : formatPrice(popupChange)}
                  </span>
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 bg-white">
                <button
                  onClick={handleConfirmCashPayment}
                  disabled={popupReceived < popupTotalBill}
                  className="w-full py-5 rounded-2xl bg-emerald-700 text-white text-lg font-black flex justify-center items-center gap-3 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-900/20"
                >
                  <CheckCircle2 className="w-6 h-6" /> Konfirmasi & Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 MODAL TAMBAH RESERVASI MANUAL DENGAN INPUT WAKTU SELESAI */}
      <AnimatePresence>
        {showAddReservationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-xl font-black text-stone-800 tracking-tight">Tambah Reservasi</h3>
                  <p className="text-xs font-bold text-stone-500 mt-1">Pilih satu meja atau lebih untuk tamu ini</p>
                </div>
                <button 
                  onClick={() => setShowAddReservationModal(false)} 
                  className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <form onSubmit={handleCreateReservation} className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Nama Pelanggan *</label>
                    <input 
                      type="text" 
                      required 
                      value={newResForm.name} 
                      onChange={e => setNewResForm({...newResForm, name: e.target.value})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                      placeholder="Contoh: Budi Santoso" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">No. HP</label>
                    <input 
                      type="tel" 
                      value={newResForm.phone} 
                      onChange={e => setNewResForm({...newResForm, phone: e.target.value})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                      placeholder="Contoh: 08123456789" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Tanggal *</label>
                    <input 
                      type="date" 
                      required 
                      value={newResForm.date} 
                      onChange={e => setNewResForm({...newResForm, date: e.target.value})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                    />
                  </div>

                  {/* 🟢 DUA KOLOM UNTUK WAKTU KEDATANGAN & WAKTU SELESAI */}
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Waktu Kedatangan *</label>
                    <input 
                      type="time" 
                      required 
                      value={newResForm.startTime} 
                      onChange={e => {
                         const newStart = e.target.value;
                         let newEnd = newResForm.endTime;
                         
                         // Otomatis +2 jam jika endTime masih kosong
                         if (newStart && !newEnd) {
                           const [h, m] = newStart.split(':');
                           newEnd = `${String((parseInt(h) + 2) % 24).padStart(2, '0')}:${m}`;
                         }
                         
                         setNewResForm({...newResForm, startTime: newStart, endTime: newEnd});
                      }} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Waktu Selesai *</label>
                    <input 
                      type="time" 
                      required 
                      value={newResForm.endTime} 
                      onChange={e => setNewResForm({...newResForm, endTime: e.target.value})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Jumlah Tamu (Pax) *</label>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      value={newResForm.pax} 
                      onChange={e => setNewResForm({...newResForm, pax: parseInt(e.target.value) || 1})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white" 
                    />
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 block">
                      Pilih Meja (Bisa Lebih Dari Satu)
                    </label>
                    {tables.length === 0 ? (
                      <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center text-sm font-medium text-stone-400">
                        Belum ada data meja di cabang ini.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tables.map(t => {
                          const isSelected = newResForm.tableIds.includes(String(t.id));
                          const paxCount = t.capacity || t.pax || t.seat_capacity || 4; 
                          
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setNewResForm(prev => ({
                                  ...prev,
                                  tableIds: isSelected 
                                    ? prev.tableIds.filter(id => id !== String(t.id))
                                    : [...prev.tableIds, String(t.id)]
                                }))
                              }}
                              className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                                isSelected 
                                  ? 'bg-emerald-50 border-emerald-600 shadow-sm' 
                                  : 'bg-white border-stone-200 hover:border-emerald-300'
                              }`}
                            >
                              <span className={`font-black text-sm leading-none ${isSelected ? 'text-emerald-800' : 'text-stone-700'}`}>
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

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Catatan Tambahan</label>
                    <textarea 
                      value={newResForm.notes} 
                      onChange={e => setNewResForm({...newResForm, notes: e.target.value})} 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white resize-none h-20" 
                      placeholder="Misal: Minta kursi bayi"
                    ></textarea>
                  </div>
                </div>

                <div className="mt-6 border-t border-stone-100 pt-6">
                  <button 
                    type="submit" 
                    disabled={isSubmittingReservation} 
                    className="w-full py-4 rounded-xl bg-emerald-700 text-white font-black flex justify-center items-center gap-2 hover:bg-emerald-800 disabled:opacity-50 transition shadow-lg shadow-emerald-900/20"
                  >
                    {isSubmittingReservation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Reservasi
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrinterModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-stone-900/80 backdrop-blur-sm sm:items-center sm:p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.97 }}
                className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
              >
                <header className="flex items-center justify-between border-b border-stone-200 bg-emerald-700 px-6 py-5 text-white">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                      <Printer className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-xl font-black">Pengaturan Printer & Struk</h3>
                      <p className="mt-1 text-sm text-emerald-100">Kelola koneksi perangkat dan tampilan cetak</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPrinterModal(false)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition">
                    <X className="h-6 w-6" />
                  </button>
                </header>

                <nav className="flex gap-2 border-b border-stone-200 bg-stone-50 px-6 py-4">
                  {[
                    { id: "device", label: "Perangkat", icon: Printer },
                    { id: "receipt", label: "Teks Struk", icon: FileText },
                    { id: "content", label: "Konten", icon: AlignCenter },
                    { id: "automation", label: "Otomatisasi", icon: Settings2 },
                    { id: "preview", label: "Preview", icon: ReceiptText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = printerSettingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setPrinterSettingsTab(tab.id as PrinterSettingsTab)}
                        className={`flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                          active ? "bg-emerald-700 text-white shadow-md" : "border border-stone-200 bg-white text-stone-500 hover:bg-stone-100"
                        }`}
                      >
                        <Icon className="h-4 w-4" /> {tab.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="min-h-0 flex-1 overflow-y-auto p-8 bg-stone-50/50">
                  {printerSettingsTab === "device" && (
                    <div className="space-y-6">
                      <section>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h4 className="text-base font-black text-stone-800">Printer aktif</h4>
                            <p className="mt-1 text-sm text-stone-500">Deteksi printer thermal melalui USB atau Bluetooth.</p>
                          </div>
                          <div className="flex shrink-0 gap-3">
                            <button
                              type="button"
                              disabled={isScanningPrinter}
                              onClick={() => handleScanPrinter("usb")}
                              className="flex min-h-12 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 disabled:opacity-50 hover:bg-emerald-100 transition"
                            >
                              {scanningTransport === "usb" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} USB
                            </button>
                            <button
                              type="button"
                              disabled={isScanningPrinter}
                              onClick={() => handleScanPrinter("bluetooth")}
                              className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-50 hover:bg-emerald-800 transition"
                            >
                              {scanningTransport === "bluetooth" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bluetooth className="h-5 w-5" />} Bluetooth
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {savedPrinters.length > 0 && (
                            <div>
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-widest text-stone-400">Printer tersimpan ({savedPrinters.length})</p>
                              </div>
                              <div className="space-y-3">
                                {savedPrinters.map((printer) => (
                                  <PrinterDeviceCard
                                    key={`saved-${printer.type}-${printer.id}`}
                                    printer={printer}
                                    selected={selectedPrinter?.id === printer.id && selectedPrinter?.type === printer.type}
                                    saved
                                    onSelect={() => void selectPrinter(printer)}
                                    onRemove={() => removeSavedPrinter(printer)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="mb-3 text-xs font-black uppercase tracking-widest text-stone-400">Perangkat terdeteksi</p>
                            {printers.length === 0 && !isScanningPrinter && (
                              <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white px-6 py-10 text-center">
                                <Printer className="mx-auto h-10 w-10 text-stone-300" />
                                <p className="mt-4 text-base font-bold text-stone-600">Belum ada printer terdeteksi</p>
                                <p className="mt-1 text-sm text-stone-400">Sambungkan kabel USB atau aktifkan Bluetooth, lalu tekan tombol deteksi.</p>
                              </div>
                            )}
                            <div className="space-y-3">
                              {printers.filter((printer) => !savedPrinters.some((saved) => saved.id === printer.id && saved.type === printer.type)).map((printer) => (
                                <PrinterDeviceCard
                                  key={`detected-${printer.type}-${printer.id}`}
                                  printer={printer}
                                  selected={selectedPrinter?.id === printer.id && selectedPrinter?.type === printer.type}
                                  onSelect={() => void selectPrinter(printer)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-6 border-t border-stone-200">
                        <button type="button" disabled={!selectedPrinter} onClick={saveSelectedPrinter} className="min-h-14 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 disabled:opacity-50 hover:bg-emerald-100 transition">
                          Simpan Printer
                        </button>
                        <button type="button" disabled={!selectedPrinter} onClick={handleConnectPrinter} className="min-h-14 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:bg-stone-300 hover:bg-emerald-800 transition">
                          Hubungkan Printer
                        </button>
                        <button type="button" disabled={!selectedPrinter} onClick={handleTestPrint} className="min-h-14 rounded-xl border-2 border-stone-200 bg-white px-5 text-sm font-black text-stone-700 disabled:opacity-50 hover:bg-stone-50 transition">
                          Test Print
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-stone-200">
                        <SettingGroup title="Ukuran kertas" description="Sesuaikan dengan roll thermal printer.">
                          <div className="grid grid-cols-2 gap-3">
                            {["58mm", "80mm"].map((width) => (
                              <button
                                key={width}
                                type="button"
                                onClick={() => updatePrinterSetting("paperWidth", width as PaperWidth)}
                                className={`min-h-14 rounded-xl border-2 text-base font-black transition ${printerSettings.paperWidth === width ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"}`}
                              >
                                {width}
                              </button>
                            ))}
                          </div>
                        </SettingGroup>

                        <SettingGroup title="Jumlah salinan" description="Jumlah struk yang dicetak setiap transaksi.">
                          <NumberStepper value={printerSettings.copies} min={1} max={5} onChange={(value: number) => updatePrinterSetting("copies", value)} />
                        </SettingGroup>
                      </div>
                    </div>
                  )}

                  {printerSettingsTab === "receipt" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <SettingToggle icon={ImageIcon} title="Tampilkan logo" description="Cetak logo usaha di bagian paling atas struk." checked={printerSettings.showLogo} onChange={(checked: boolean) => updatePrinterSetting("showLogo", checked)} />
                      {printerSettings.showLogo && (
                        <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                          <SettingGroup title="File logo" description="Format PNG, JPG, JPEG, WEBP. Max 2 MB.">
                            <input ref={logoFileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                            <div className="flex flex-col gap-4">
                              <button type="button" onClick={() => logoFileInputRef.current?.click()} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100">
                                <ImageIcon className="h-5 w-5" /> Pilih File Logo
                              </button>
                              {printerSettings.logoUrl && (
                                <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                                  <img src={printerSettings.logoUrl} alt="Preview" className="h-14 w-14 rounded-lg bg-white object-contain p-1 border border-stone-200" onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
                                  <button type="button" onClick={() => updatePrinterSetting("logoUrl", "")} className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Hapus logo"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              )}
                            </div>
                          </SettingGroup>
                          <SettingGroup title="Ukuran logo" description="Ukuran logo pada hasil cetak.">
                            <div className="flex flex-col gap-3">
                              {[{ id: "small", label: "Kecil" }, { id: "medium", label: "Sedang" }, { id: "large", label: "Besar" }].map((option) => (
                                <button key={option.id} type="button" onClick={() => updatePrinterSetting("logoSize", option.id as ReceiptLogoSize)} className={`min-h-12 rounded-xl border-2 text-sm font-black transition ${printerSettings.logoSize === option.id ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </SettingGroup>
                        </div>
                      )}
                      <SettingGroup title="Teks header" description="Tampil sebelum informasi transaksi.">
                        <textarea value={printerSettings.headerText} onChange={(e) => updatePrinterSetting("headerText", e.target.value)} placeholder="Contoh: Selamat datang di toko kami" className="min-h-24 w-full resize-none rounded-2xl border-2 border-stone-200 bg-white p-5 text-base outline-none focus:border-emerald-600 transition" />
                      </SettingGroup>
                      <SettingGroup title="Teks footer" description="Tampil setelah rincian pembayaran.">
                        <textarea value={printerSettings.footerText} onChange={(e) => updatePrinterSetting("footerText", e.target.value)} placeholder="Contoh: Barang yang sudah dibeli tidak dapat dikembalikan" className="min-h-24 w-full resize-none rounded-2xl border-2 border-stone-200 bg-white p-5 text-base outline-none focus:border-emerald-600 transition" />
                      </SettingGroup>
                      <SettingGroup title="Ucapan terima kasih" description="Kalimat penutup utama pada struk.">
                        <input type="text" value={printerSettings.thankYouText} onChange={(e) => updatePrinterSetting("thankYouText", e.target.value)} className="min-h-14 w-full rounded-2xl border-2 border-stone-200 bg-white px-5 text-base font-semibold outline-none focus:border-emerald-600 transition" />
                      </SettingGroup>
                    </div>
                  )}

                  {printerSettingsTab === "content" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["showStoreName", "Nama toko"], ["showCashier", "Nama kasir"], ["showCustomer", "Pelanggan"], ["showOrderNumber", "Nomor pesanan"],
                        ["showOrderType", "Tipe layanan"], ["showTable", "Nomor meja"], ["showAddons", "Add-on produk"], ["showNotes", "Catatan pesanan"],
                        ["showSubtotal", "Subtotal"], ["showDiscount", "Diskon"], ["showTax", "Pajak"], ["showServiceCharge", "Biaya layanan"],
                        ["showPaymentMethod", "Metode pembayaran"], ["showCashReceived", "Uang diterima"], ["showChange", "Kembalian"],
                      ].map(([key, label]) => (
                        <CompactToggle key={key} label={label} checked={Boolean(printerSettings[key as keyof CashierPrinterSettings])} onChange={(checked: boolean) => updatePrinterSetting(key as keyof CashierPrinterSettings, checked as never)} />
                      ))}
                    </div>
                  )}

                  {printerSettingsTab === "automation" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <SettingToggle icon={Printer} title="Cetak otomatis" description="Cetak struk otomatis setelah transaksi berhasil." checked={printerSettings.autoPrint} onChange={(checked: boolean) => updatePrinterSetting("autoPrint", checked)} />
                      <SettingToggle icon={Scissors} title="Auto-cutter" description="Kirim perintah potong kertas setelah cetak. Printer harus mendukung ESC/POS cutter." checked={printerSettings.autoCut} onChange={(checked: boolean) => updatePrinterSetting("autoCut", checked)} />
                      <SettingGroup title="Baris kosong setelah cetak" description="Memberi jarak sebelum kertas dipotong.">
                        <NumberStepper value={printerSettings.feedLines} min={0} max={10} onChange={(value: number) => updatePrinterSetting("feedLines", value)} />
                      </SettingGroup>
                    </div>
                  )}

                  {printerSettingsTab === "preview" && (
                    <ReceiptPreview storeName={mitraProfile.name} cashierName={activeStaffName} settings={printerSettings} />
                  )}
                </div>
                
                <footer className="flex items-center justify-end gap-4 border-t border-stone-200 bg-white p-6">
                  <button type="button" onClick={() => setShowPrinterModal(false)} className="min-h-12 rounded-xl border border-stone-200 bg-white px-8 text-sm font-black text-stone-600 hover:bg-stone-50 transition">Batal</button>
                  <button type="button" disabled={isSavingPrinterSettings} onClick={handleSavePrinter} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-8 text-sm font-black text-white hover:bg-emerald-800 transition disabled:bg-stone-300">
                    {isSavingPrinterSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan Pengaturan
                  </button>
                </footer>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function PrinterDeviceCard({ printer, selected, saved = false, onSelect, onRemove }: any) {
  return (
    <div className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 transition ${selected ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-stone-100 bg-white hover:border-stone-200"}`}>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center justify-between gap-4 p-2 text-left">
        <div className="flex min-w-0 items-center gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"}`}>
            <Printer className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="truncate text-base font-black text-stone-800">{printer.name}</p>
              {saved && <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">Tersimpan</span>}
              {selected && <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Aktif</span>}
            </div>
            <p className="mt-1 truncate text-sm text-stone-500">{printer.address || "Alamat tidak tersedia"}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">{printer.type}</p>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />}
      </button>
      {saved && onRemove && (
        <button type="button" onClick={onRemove} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-600" title="Hapus printer">
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function SettingGroup({ title, description, children }: any) {
  return (
    <section className="flex flex-col">
      <h4 className="text-sm font-black text-stone-800">{title}</h4>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-stone-500">{description}</p>
      {children}
    </section>
  );
}

function SettingToggle({ icon: Icon, title, description, checked, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-6 rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-200">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span>
        <div>
          <p className="text-base font-black text-stone-800">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>
        </div>
      </div>
      <ToggleIndicator checked={checked} />
    </button>
  );
}

function CompactToggle({ label, checked, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border-2 border-stone-100 bg-white px-5 text-left transition hover:border-stone-200">
      <span className="text-sm font-bold text-stone-700">{label}</span>
      <ToggleIndicator checked={checked} />
    </button>
  );
}

function ToggleIndicator({ checked }: { checked: boolean }) {
  return (
    <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-emerald-600" : "bg-stone-300"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? "translate-x-7" : "translate-x-1"}`} />
    </span>
  );
}

function NumberStepper({ value, min, max, onChange }: any) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-stone-100 p-2 max-w-[200px]">
      <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-stone-700 shadow-sm disabled:opacity-40 hover:bg-stone-50 transition">−</button>
      <span className="min-w-12 text-center text-xl font-black text-stone-800">{value}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-xl font-black text-white disabled:opacity-40 hover:bg-emerald-800 transition">+</button>
    </div>
  );
}

function ReceiptPreview({ storeName, cashierName, settings }: any) {
  const previewWidth = settings.paperWidth === "80mm" ? "max-w-[400px]" : "max-w-[300px]";
  return (
    <div className="rounded-3xl bg-stone-200 p-8 flex justify-center">
      <div className={`w-full bg-white px-6 py-8 font-mono text-xs leading-relaxed text-stone-800 shadow-xl ${previewWidth}`}>
        {settings.showLogo && (
          <div className="mb-4 flex justify-center">
            <img src={settings.logoUrl || "/logo.png"} alt="Logo struk" className={`object-contain ${settings.logoSize === "small" ? "h-12 w-12" : settings.logoSize === "large" ? "h-24 w-24" : "h-16 w-16"}`} onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
          </div>
        )}
        {settings.showStoreName && <p className="text-center text-base font-black uppercase mb-1">{storeName}</p>}
        {settings.headerText && <p className="mt-2 mb-2 whitespace-pre-wrap text-center">{settings.headerText}</p>}
        <p className="my-4 border-t-2 border-dashed border-stone-300" />
        {settings.showOrderNumber && <PreviewRow label="Order" value="#A102" />}
        {settings.showCashier && <PreviewRow label="Kasir" value={cashierName} />}
        {settings.showCustomer && <PreviewRow label="Pelanggan" value="Pelanggan Umum" />}
        <p className="my-4 border-t-2 border-dashed border-stone-300" />
        <div className="space-y-3">
          <div><div className="flex justify-between gap-3 font-bold text-sm"><span>1x Kopi Susu</span><span>18.000</span></div>{settings.showAddons && <p className="pl-4 text-stone-500 mt-0.5">+ Extra shot</p>}</div>
        </div>
        <p className="my-4 border-t-2 border-dashed border-stone-300" />
        {settings.showSubtotal && <PreviewRow label="Subtotal" value="18.000" />}
        <div className="mt-3 flex justify-between gap-3 text-base font-black"><span>TOTAL</span><span>18.000</span></div>
        {settings.footerText && <><p className="my-4 border-t-2 border-dashed border-stone-300" /><p className="whitespace-pre-wrap text-center">{settings.footerText}</p></>}
        {settings.thankYouText && <p className="mt-6 text-center font-bold text-sm">{settings.thankYouText}</p>}
        <div style={{ height: `${settings.feedLines * 6}px` }} />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 mb-1"><span>{label}</span><span className="text-right font-bold">{value}</span></div>;
}