"use client";

import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMenuStore } from '@/store/menu.store';
import { Order } from '@/types/menu'; 
import OrderCard from '@/components/cashier/OrderCard';
import { formatPrice } from '@/utils/formatters';
import CashierPOS from '@/components/cashier/CashierPOS';
import {
  ArrowLeft, BellRing, ReceiptText, ShieldCheck, RefreshCw,
  Sparkles, ShoppingBag, TrendingUp, RotateCcw, Coffee, Plus, Loader2, QrCode, Camera, X,
  Printer, Bluetooth, Save, Scissors, Image as ImageIcon,
  FileText, CheckCircle2, Settings2, Copy, AlignCenter, Trash2
} from 'lucide-react';
import AdminDashboardView from '@/components/views/AdminDashboardView';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { Toast } from '@/utils/toast';
import { PrinterManager } from '@/lib/printer/PrinterManager';
import { PrinterDevice } from '@/lib/printer/types';
import { printOrder } from '@/lib/printer/orderPrint';
import PwaInstallButton
  from '@/components/pwa/PwaInstallButton';


type PaperWidth =
  | '58mm'
  | '80mm';

type ReceiptLogoSize =
  | 'small'
  | 'medium'
  | 'large';

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

const DEFAULT_PRINTER_SETTINGS:
  CashierPrinterSettings = {
    paperWidth:
      '58mm',
    copies:
      1,
    autoPrint:
      true,
    autoCut:
      true,
    showLogo:
      true,
    logoUrl:
      '/logo.png',
    logoSize:
      'medium',
    headerText:
      '',
    footerText:
      '',
    thankYouText:
      'Terima kasih atas kunjungan Anda.',
    showStoreName:
      true,
    showCashier:
      true,
    showCustomer:
      true,
    showOrderNumber:
      true,
    showOrderType:
      true,
    showTable:
      true,
    showAddons:
      true,
    showNotes:
      true,
    showSubtotal:
      true,
    showDiscount:
      true,
    showTax:
      true,
    showServiceCharge:
      true,
    showPaymentMethod:
      true,
    showCashReceived:
      true,
    showChange:
      true,
    feedLines:
      3,
  };

type PrinterSettingsTab =
  | 'device'
  | 'receipt'
  | 'content'
  | 'automation'
  | 'preview';


type PrintAddonDetail = {
  id?: string | number;
  name: string;
  price: number;
  customer_note?: string;
  cust_notes?: string;
};

const parsePrintArray = (
  value: unknown,
): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === 'object'
    ) {
      return [parsed];
    }
  } catch {
    return [];
  }

  return [];
};

const normalizeAddonDetails = (
  item: Record<string, any>,
  menuItems: any[],
): PrintAddonDetail[] => {
  const rawAddons =
    parsePrintArray(
      item.selectedAddOnsDetails ??
        item.selected_add_ons_details ??
        item.selectedAddOns ??
        item.selected_add_ons ??
        item.addons ??
        item.addOns ??
        item.notes,
    );

  const productId =
    String(
      item.menuItemId ??
        item.menu_item_id ??
        item.product_id ??
        item.productId ??
        '',
    );

  const product =
    menuItems.find(
      (
        menuItem: any,
      ) =>
        String(
          menuItem.id,
        ) ===
        productId,
    );

  const allProductAddons =
    (
      product?.categorizedAddons ??
      []
    ).flatMap(
      (
        category: any,
      ) =>
        Array.isArray(
          category?.addons,
        )
          ? category.addons
          : [],
    );

  return rawAddons
    .map(
      (
        rawAddon: any,
      ): PrintAddonDetail | null => {
        /*
         * Add-on hanya berbentuk ID.
         */
        if (
          typeof rawAddon ===
            'number' ||
          typeof rawAddon ===
            'string'
        ) {
          const found =
            allProductAddons.find(
              (
                addon: any,
              ) =>
                String(
                  addon.id,
                ) ===
                String(
                  rawAddon,
                ),
            );

          if (!found) {
            return null;
          }

          const price =
            Number(
              found.price ??
                0,
            );

          return {
            id:
              found.id,

            name:
              String(
                found.name ??
                  'Add-on',
              ),

            price:
              Number.isFinite(
                price,
              )
                ? price
                : 0,
          };
        }

        /*
         * Abaikan nilai kosong atau tipe yang bukan object.
         */
        if (
          !rawAddon ||
          typeof rawAddon !==
            'object' ||
          Array.isArray(
            rawAddon,
          )
        ) {
          return null;
        }

        const addonName =
          String(
            rawAddon.name ??
              rawAddon.addon_name ??
              rawAddon.addOnName ??
              rawAddon.label ??
              '',
          ).trim();

        const customerNote =
          String(
            rawAddon.customer_note ??
              rawAddon.customerNote ??
              rawAddon.cust_notes ??
              rawAddon.note ??
              '',
          ).trim();

        if (
          !addonName &&
          !customerNote
        ) {
          return null;
        }

        const price =
          Number(
            rawAddon.price ??
              rawAddon.addon_price ??
              rawAddon.addonPrice ??
              0,
          );

        const normalizedAddon:
          PrintAddonDetail = {
          name:
            addonName ||
            `Note: ${customerNote}`,

          price:
            Number.isFinite(
              price,
            )
              ? price
              : 0,
        };

        /*
         * Karena id pada PrintAddonDetail bersifat opsional,
         * hanya masukkan ketika benar-benar tersedia.
         */
        const addonId =
          rawAddon.id ??
          rawAddon.addon_id ??
          rawAddon.addonId;

        if (
          addonId !==
            undefined &&
          addonId !==
            null &&
          addonId !==
            ''
        ) {
          normalizedAddon.id =
            addonId;
        }

        if (customerNote) {
          normalizedAddon.customer_note =
            customerNote;

          normalizedAddon.cust_notes =
            customerNote;
        }

        return normalizedAddon;
      },
    )
    .filter(
      (
        addon,
      ): addon is PrintAddonDetail =>
        addon !== null,
    );
};

const normalizeOrderForPrint = (
  rawOrder: Order,
  menuItems: any[],
): Order => {
  const rawItems =
    parsePrintArray(
      (rawOrder as any).items ??
      (rawOrder as any).order_items ??
      (rawOrder as any).cartItems,
    );

  const normalizedItems =
    rawItems.map(
      (rawItem: any) => {
        const item =
          rawItem &&
          typeof rawItem === 'object'
            ? rawItem
            : {};

        const addonDetails =
          normalizeAddonDetails(
            item,
            menuItems,
          );

        return {
          ...item,
          menuItemId:
            String(
              item.menuItemId ??
              item.menu_item_id ??
              item.product_id ??
              item.productId ??
              '',
            ),
          product_id:
            item.product_id ??
            item.productId ??
            item.menuItemId ??
            item.menu_item_id,
          selectedAddOnsDetails:
            addonDetails,
          selected_add_ons_details:
            addonDetails,
          notes:
            typeof item.notes === 'string' &&
            item.notes.trim() !== ''
              ? item.notes
              : JSON.stringify(addonDetails),
        };
      },
    );

  return {
    ...rawOrder,
    items:
      normalizedItems,
  } as Order;
};

export default function CashierApp() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<'cashier' | 'owner' | 'kitchen' | null>(null);
  const [activeStaffName, setActiveStaffName] = useState('');
  
  const [isScanning, setIsScanning] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const physicalScannerBuffer = useRef(''); 

  const [orders, setOrders] = useState<Order[]>([]);
  const [mitraProfile, setMitraProfile] = useState<{ name: string }>({ name: 'Kasir' });
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');
  const [notification, setNotification] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{
    orderId: string; oldStatus: Order['status']; oldPaymentStatus?: Order['paymentStatus']; timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [isPOSMode, setIsPOSMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [cashPaymentPopup, setCashPaymentPopup] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [savedPrinters, setSavedPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [isScanningPrinter, setIsScanningPrinter] = useState(false);
  const [scanningTransport, setScanningTransport] =
    useState<'usb' | 'bluetooth' | null>(null);
  const logoFileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [printerSettings, setPrinterSettings] =
    useState<CashierPrinterSettings>(
      DEFAULT_PRINTER_SETTINGS
    );
  const [printerSettingsTab, setPrinterSettingsTab] =
    useState<PrinterSettingsTab>('device');
  const [isSavingPrinterSettings, setIsSavingPrinterSettings] =
    useState(false);

  const isNative = Capacitor.isNativePlatform();

  const { setMenu } = useMenuStore();

  useEffect(() => {
    if (!slug) return;

    const settingsKey =
      `evo_printer_settings_${slug}`;

    try {
      const storedSettings =
        localStorage.getItem(
          settingsKey
        );

      if (storedSettings) {
        setPrinterSettings({
          ...DEFAULT_PRINTER_SETTINGS,
          ...JSON.parse(
            storedSettings
          ),
        });
      }

      const storedPrinters =
        PrinterManager.getPrinters(
          slug
        );

      const activePrinter =
        PrinterManager.getPrinter(
          slug
        );

      setSavedPrinters(
        storedPrinters
      );

      setPrinters(
        storedPrinters
      );

      setSelectedPrinter(
        activePrinter
      );
    } catch (error) {
      console.error(
        'Gagal memulihkan pengaturan printer:',
        error
      );
    }
  }, [slug]);

  const updatePrinterSetting =
    <K extends keyof CashierPrinterSettings>(
      key: K,
      value:
        CashierPrinterSettings[K],
    ) => {
      setPrinterSettings(
        (current) => ({
          ...current,
          [key]:
            value,
        })
      );
    };

  const saveAllPrinterSettings =
    async () => {
      if (!slug) return;

      setIsSavingPrinterSettings(
        true
      );

      try {
        localStorage.setItem(
          `evo_printer_settings_${slug}`,
          JSON.stringify(
            printerSettings
          )
        );

        if (selectedPrinter) {
          await PrinterManager.savePrinter(
            selectedPrinter,
            slug
          );

          await PrinterManager.setActivePrinter(
            selectedPrinter,
            slug
          );

          setSavedPrinters(
            PrinterManager.getPrinters(
              slug
            )
          );
        }

        Toast.fire({
          icon:
            'success',
          title:
            'Pengaturan printer disimpan',
        });
      } catch (error) {
        console.error(
          'Gagal menyimpan pengaturan printer:',
          error
        );

        Toast.fire({
          icon:
            'error',
          title:
            'Pengaturan printer gagal disimpan',
        });
      } finally {
        setIsSavingPrinterSettings(
          false
        );
      }
    };

  const handleScanPrinter = async (
    transport?: 'usb' | 'bluetooth',
  ) => {
    setIsScanningPrinter(
      true
    );
    setScanningTransport(
      transport || null
    );

    try {
      const devices =
        transport
          ? await PrinterManager.scanByType(
              transport
            )
          : await PrinterManager.scan();

      setPrinters(
        (
          current
        ) => {
          const merged =
            [
              ...current,
              ...devices,
            ];

          return Array.from(
            new Map(
              merged.map(
                (
                  printer
                ) => [
                  `${printer.type}:${printer.id}`,
                  printer,
                ]
              )
            ).values()
          );
        }
      );

      if (
        devices.length ===
        0
      ) {
        Toast.fire({
          icon:
            'info',
          title:
            transport ===
            'usb'
              ? 'Printer USB belum ditemukan'
              : transport ===
                'bluetooth'
                ? 'Printer Bluetooth belum ditemukan'
                : 'Printer belum ditemukan',
        });
      }
    } catch (error) {
      console.error(
        'Gagal mendeteksi printer:',
        error
      );

      Toast.fire({
        icon:
          'error',
        title:
          error instanceof Error
            ? error.message
            : 'Gagal mendeteksi printer',
      });
    } finally {
      setIsScanningPrinter(
        false
      );
      setScanningTransport(
        null
      );
    }
  };

  const selectPrinter =
    async (
      printer:
        PrinterDevice,
    ) => {
      setSelectedPrinter(
        printer
      );

      await PrinterManager.setActivePrinter(
        printer,
        slug
      );
    };

  const saveSelectedPrinter =
    async () => {
      if (!selectedPrinter) {
        Toast.fire({
          icon:
            'error',
          title:
            'Pilih printer terlebih dahulu',
        });
        return;
      }

      await PrinterManager.savePrinter(
        selectedPrinter,
        slug
      );

      await PrinterManager.setActivePrinter(
        selectedPrinter,
        slug
      );

      setSavedPrinters(
        PrinterManager.getPrinters(
          slug
        )
      );

      Toast.fire({
        icon:
          'success',
        title:
          `${selectedPrinter.name} disimpan`,
      });
    };

  const removeSavedPrinter =
    (
      printer:
        PrinterDevice,
    ) => {
      PrinterManager.removePrinter(
        printer,
        slug
      );

      const remaining =
        PrinterManager.getPrinters(
          slug
        );

      setSavedPrinters(
        remaining
      );

      setPrinters(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              !(
                item.id ===
                  printer.id &&
                item.type ===
                  printer.type
              )
          )
      );

      if (
        selectedPrinter?.id ===
          printer.id &&
        selectedPrinter.type ===
          printer.type
      ) {
        const next =
          PrinterManager.getPrinter(
            slug
          );

        setSelectedPrinter(
          next
        );
      }

      Toast.fire({
        icon:
          'success',
        title:
          'Printer dihapus dari daftar tersimpan',
      });
    };

  const handleLogoUpload =
    async (
      event:
        React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      event.target.value =
        '';

      if (!file) {
        return;
      }

      const allowedTypes =
        [
          'image/png',
          'image/jpeg',
          'image/webp',
        ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        Toast.fire({
          icon:
            'error',
          title:
            'Logo hanya boleh PNG, JPG, JPEG, atau WEBP',
        });
        return;
      }

      if (
        file.size >
        2 * 1024 * 1024
      ) {
        Toast.fire({
          icon:
            'error',
          title:
            'Ukuran logo maksimal 2 MB',
        });
        return;
      }

      try {
        const formData =
          new FormData();

        formData.append(
          'slug',
          slug
        );

        formData.append(
          'logo',
          file
        );

        const response =
          await fetch(
            '/api/pos/printer-logo',
            {
              method:
                'POST',
              body:
                formData,
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
            'Logo gagal diunggah'
          );
        }

        const logoUrl =
          String(
            result.data?.logoUrl ||
            result.data?.banner ||
            ''
          );

        updatePrinterSetting(
          'logoUrl',
          logoUrl
        );

        updatePrinterSetting(
          'showLogo',
          true
        );

        Toast.fire({
          icon:
            'success',
          title:
            'Logo berhasil disimpan pada banner mitra',
        });
      } catch (
        error
      ) {
        console.error(
          'Upload logo gagal:',
          error
        );

        Toast.fire({
          icon:
            'error',
          title:
            error instanceof
            Error
              ? error.message
              : 'Logo gagal diunggah',
        });
      }
    };


  const handleSavePrinter = async () => {
    await saveAllPrinterSettings();
  };

  const handleConnectPrinter = async () => {
    if (!selectedPrinter) {
      Toast.fire({
        icon: 'error',
        title: 'Pilih printer terlebih dahulu',
      });
      return;
    }

    try {
      // Simpan printer yang sedang dipilih sebelum connect.
      // Sebelumnya connect() membaca PrinterStorage lama/kosong,
      // sehingga perangkat terlihat terpilih tetapi koneksi gagal.
      await PrinterManager.savePrinter(
        selectedPrinter,
        slug
      );

      await PrinterManager.setActivePrinter(
        selectedPrinter,
        slug
      );

      setSavedPrinters(
        PrinterManager.getPrinters(
          slug
        )
      );

      await PrinterManager.connect(
        selectedPrinter,
        slug
      );

      Toast.fire({
        icon: 'success',
        title: `Terhubung ke ${selectedPrinter.name}`,
      });
    } catch (error) {
      console.error(
        'Gagal menghubungkan printer Bluetooth:',
        error
      );

      Toast.fire({
        icon: 'error',
        title:
          error instanceof Error
            ? error.message
            : 'Gagal menghubungkan printer',
      });
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      Toast.fire({
        icon: 'error',
        title: 'Pilih printer terlebih dahulu',
      });
      return;
    }

    try {
      await PrinterManager.savePrinter(
        selectedPrinter,
        slug
      );

      await PrinterManager.setActivePrinter(
        selectedPrinter,
        slug
      );

      setSavedPrinters(
        PrinterManager.getPrinters(
          slug
        )
      );

      await PrinterManager.testPrint(
        selectedPrinter,
        slug
      );

      Toast.fire({
        icon: 'success',
        title: 'Test print berhasil dikirim',
      });
    } catch (error) {
      console.error(
        'Test print gagal:',
        error
      );

      Toast.fire({
        icon: 'error',
        title:
          error instanceof Error
            ? error.message
            : 'Printer belum terhubung',
      });
    }
  };

  const handleNativeScan = async () => {
    try {
      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length > 0) {
        const value = barcodes[0].rawValue;

        if (value) {
          handleTokenScan(value);
        }
      }
    } catch (error) {
      console.error('Scan gagal:', error);
    }
  };
  const requestCameraPermission = async () => {
    const status = await BarcodeScanner.requestPermissions();

    return (
      status.camera === 'granted' ||
      status.camera === 'limited'
    );
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.mp3');
    }

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
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

        // Verifikasi ulang QR untuk memulihkan cookie HTTP-only dan scope cabang.
        const response = await fetch('/api/pos/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: parsed.token, slug }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          localStorage.removeItem(storageKey);
          return;
        }

        const restoredRole = String(result.data.role || '').toLowerCase();
        if (restoredRole !== 'cashier' && restoredRole !== 'owner') {
          localStorage.removeItem(storageKey);
          return;
        }

        setActiveStaffName(result.data.name);
        setRole(restoredRole);
        setIsAuthenticated(true);
        localStorage.setItem(storageKey, JSON.stringify({
          ...parsed,
          name: result.data.name,
          role: restoredRole,
          branchId: result.data.branchId ?? null,
        }));
      } catch {
        localStorage.removeItem(storageKey);
      }
    };

    void restoreCashierSession();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    
    const initApp = async () => {
      try {
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();
        if (dataSettings.success && dataSettings.data) {
          setMitraProfile({ name: dataSettings.data.cafeName || 'Kasir' });

          const storedBanner =
            dataSettings.data.banner ||
            dataSettings.data.logo ||
            dataSettings.data.logoUrl;

          if (storedBanner) {
            setPrinterSettings(
              (
                current
              ) => ({
                ...current,
                logoUrl:
                  String(
                    storedBanner
                  ),
                showLogo:
                  true,
              })
            );
          }
        }

        const resMenu = await fetch(`/api/menu?slug=${slug}`);
        const dataMenu = await resMenu.json();
        
        if (dataMenu.success) {
           const rawItems = dataMenu.items || [];
           const menuCategories = dataMenu.categories || [];
           const allAddons = dataMenu.addons || []; 
           const enrichedItems = rawItems.map((item: any) => ({
               ...item,
               categorizedAddons: [{ addons: allAddons }] 
           }));
           setMenu(enrichedItems, menuCategories);
        }
      } catch (e) {
        console.error("Gagal inisialisasi awal:", e);
      } finally {
        setIsLoadingInitial(false);
      }
    };
    initApp();
  }, [slug]);

  const fetchOrders = async () => {
    if (!slug || !isAuthenticated) return;
    try {
      const res = await fetch(`/api/orders/history?slug=${slug}`);
      const result = await res.json();

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(`evo_cashier_session_${slug}`);
        setIsAuthenticated(false);
        setRole(null);
        setActiveStaffName('');
        Toast.fire({ icon: 'error', title: result.message || 'Sesi kasir berakhir' });
        return;
      }
      
      if (result.success && Array.isArray(result.data)) {
        setOrders(prev => {
           if (prev.length > 0 && result.data.length > prev.length) {
             
             if (audioRef.current) {
               audioRef.current.currentTime = 0; 
               audioRef.current.play().catch((e) => {
                 console.warn("Audio diblokir: Kasir harus klik layar/tekan tombol minimal 1x setelah refresh.", e);
               });
             }

             Toast.fire({
               icon: 'info',
               title: 'Ada Pesanan Baru!'
             });

             setNotification('Pesanan baru masuk!');
             setTimeout(() => setNotification(null), 5000);
           }
           return result.data;
        });
      }
    } catch (e) {
      console.error("Gagal load orders:", e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return; 
    fetchOrders(); 
    const interval = setInterval(() => { fetchOrders(); }, 2000); 
    return () => clearInterval(interval);
  }, [slug, isAuthenticated]);

  const handleTokenScan = async (token: string) => {
    if (isVerifying) return; 
    setIsVerifying(true);
    setIsScanning(false);

    try {
      const res = await fetch('/api/pos/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slug })
      });
      const result = await res.json();

      if (result.success) {
        const staffRole = result.data.role.toLowerCase();
        
        if (staffRole !== 'cashier' && staffRole !== 'owner') {
          Toast.fire({ icon: 'error', title: 'Akses Ditolak! QR ini tidak memiliki izin Kasir.' });
          return;
        }

        const staffName = result.data.name;
        setRole(staffRole); 
        setActiveStaffName(staffName);
        setIsAuthenticated(true);
        
        localStorage.setItem(`evo_cashier_session_${slug}`, JSON.stringify({
          name: staffName,
          role: staffRole,
          token: token,
          branchId: result.data.branchId ?? null
        }));

        Toast.fire({ icon: 'success', title: `Selamat Bekerja, ${staffName}!` });
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Gagal menghubungi server' });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        if (physicalScannerBuffer.current.length > 10) {
          handleTokenScan(physicalScannerBuffer.current);
        }
        physicalScannerBuffer.current = ''; 
      } else if (e.key.length === 1) {
        physicalScannerBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const logout = async () => {
    try {
      // 1. Ambil data session sebelum dihapus untuk mengetahui ID/Token kasir
      const sessionData = localStorage.getItem(`evo_cashier_session_${slug}`);
      
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        
        // 2. Tembak API Logout untuk update is_login = 0 di database
        // Asumsi data session memiliki property .id
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: parsedSession.token }), // Sesuaikan jika kamu menyimpannya sebagai 'token'
        });
      }
    } catch (error) {
      console.error("Gagal melakukan logout dari server:", error);
    } finally {
      // 3. Apapun yang terjadi (berhasil/gagal API-nya), tetap bersihkan state di frontend
      localStorage.removeItem(`evo_cashier_session_${slug}`);
      setIsAuthenticated(false); 
      setRole(null); 
      setActiveStaffName(''); 
      setIsScanning(true); 
    }
  };

  const executeUpdate = async (orderId: string, newStatus: Order['status'], newPaymentStatus?: Order['paymentStatus'], extraData?: any) => {
    try {
      setOrders(prev => prev.map(o => String(o.id) === orderId ? { ...o, status: newStatus, paymentStatus: newPaymentStatus || o.paymentStatus, ...extraData } : o));
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus, paymentStatus: newPaymentStatus, ...extraData })
      });
    } catch (e) {
      console.error("Gagal update status:", e);
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], newPaymentStatus?: Order['paymentStatus']) => {
    const cur = orders.find(o => String(o.id) === String(orderId));
    if (!cur) return;
    
    if (newStatus === 'confirmed' && cur.paymentMethod === 'cash' && !cur.getPayment) {
      setCashPaymentPopup(cur);
      setReceivedAmount(''); 
      return; 
    }

    if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
    executeUpdate(orderId, newStatus, newPaymentStatus);
    const timeoutId = setTimeout(() => setUndoAction(null), 4000);
    setUndoAction({ orderId, oldStatus: cur.status, oldPaymentStatus: cur.paymentStatus, timeoutId });
  };

  const handleConfirmCashPayment = () => {
    if (!cashPaymentPopup) return;
    
    const totalBill = Number(cashPaymentPopup.totalAfterDiscount || cashPaymentPopup.total_after_discount || cashPaymentPopup.totalPrice || cashPaymentPopup.total_price || 0);
    const received = Number(receivedAmount.replace(/\D/g, '')); 

    if (received < totalBill) {
      Toast.fire({ icon: 'error', title: 'Nominal uang kurang!' });
      return;
    }

    const change = received - totalBill;
    
    executeUpdate(String(cashPaymentPopup.id), 'confirmed', '1', { 
      getPayment: received, 
      cashChange: change 
    });

    Toast.fire({ icon: 'success', title: `Lunas! Kembalian: ${formatPrice(change)}` });
    setCashPaymentPopup(null);
  };

  const updateOrderNote = async (orderId: string, note: string) => {
    try {
      setOrders(prev => prev.map(o => String(o.id) === orderId ? { ...o, adminNotes: note } : o));
      await fetch(`/api/orders/history?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, adminNotes: note })
      });
    } catch (e) {
      console.error("Gagal update note:", e);
    }
  };

  const handlePrintOrder =
    async (
      order:
        Order,
      target:
        'kitchen' |
        'customer',
    ) => {
      const printer =
        PrinterManager.getPrinter(
          slug
        );

      if (!printer) {
        throw new Error(
          'Printer aktif belum dipilih. Buka Pengaturan Printer terlebih dahulu.'
        );
      }

      let receiptSettings:
        Record<
          string,
          unknown
        > =
          {};

      try {
        receiptSettings =
          JSON.parse(
            localStorage.getItem(
              `evo_printer_settings_${slug}`
            ) ||
            '{}'
          );
      } catch {
        receiptSettings =
          {};
      }

      const currentMenuItems =
        useMenuStore
          .getState()
          .items as any[];

      const normalizedOrder =
        normalizeOrderForPrint(
          order,
          currentMenuItems,
        );

      console.log(
        '[PRINT_ORDER_NORMALIZED]',
        {
          orderId:
            normalizedOrder.id,
          orderCode:
            normalizedOrder.order_code,
          target,
          items:
            normalizedOrder.items,
        },
      );

      await printOrder({
        order:
          normalizedOrder,
        target,
        printer,
        slug,
        storeName:
          mitraProfile.name,
        cashierName:
          activeStaffName,
        menuItems:
          currentMenuItems as any,
        settings:
          receiptSettings as any,
      });

      Toast.fire({
        icon:
          'success',
        title:
          target ===
          'kitchen'
            ? 'Tiket dapur berhasil dicetak'
            : 'Struk customer berhasil dicetak',
      });
    };

  const handlePOSSubmit =
    async (
      newOrder:
        Order,
    ) => {
      const normalizedNewOrder =
        normalizeOrderForPrint(
          newOrder,
          useMenuStore
            .getState()
            .items as any[],
        );

      /*
       * Hindari order ganda ketika polling history berjalan
       * bersamaan dengan response checkout POS.
       */
      setOrders(
        (
          previous,
        ) => {
          const alreadyExists =
            previous.some(
              (
                order,
              ) =>
                String(
                  order.id,
                ) ===
                  String(
                    normalizedNewOrder.id,
                  ) ||
                (
                  Boolean(
                    order.order_code,
                  ) &&
                  String(
                    order.order_code,
                  ) ===
                    String(
                      normalizedNewOrder.order_code,
                    )
                ),
            );

          return alreadyExists
            ? previous.map(
                (
                  order,
                ) =>
                  String(
                    order.id,
                  ) ===
                    String(
                      normalizedNewOrder.id,
                    ) ||
                  (
                    Boolean(
                      order.order_code,
                    ) &&
                    String(
                      order.order_code,
                    ) ===
                      String(
                        normalizedNewOrder.order_code,
                      )
                  )
                    ? {
                        ...order,
                        ...normalizedNewOrder,
                      }
                    : order,
              )
            : [
                normalizedNewOrder,
                ...previous,
              ];
        },
      );

      try {
        /*
         * Cetak otomatis hanya ketika opsi otomatisasi aktif.
         * Default sekarang aktif untuk instalasi baru.
         */
        if (
          printerSettings.autoPrint
        ) {
          await handlePrintOrder(
            normalizedNewOrder,
            'customer',
          );
        } else {
          Toast.fire({
            icon:
              'success',

            title:
              'Pesanan berhasil dibuat',
          });
        }
      } catch (
        error
      ) {
        console.error(
          '[AUTO_PRINT_CUSTOMER_ERROR]',
          {
            error,
            orderId:
              normalizedNewOrder.id,
            orderCode:
              normalizedNewOrder.order_code,
            slug,
            activePrinter:
              PrinterManager.getPrinter(
                slug,
              ),
          },
        );

        Toast.fire({
          icon:
            'warning',

          title:
            error instanceof
            Error
              ? `Pesanan berhasil dibuat, tetapi cetak gagal: ${error.message}`
              : 'Pesanan berhasil dibuat, tetapi struk customer gagal dicetak',
        });
      } finally {
        setIsPOSMode(
          false,
        );
      }
    };

  const handleUndo = () => {
    if (!undoAction) return;
    clearTimeout(undoAction.timeoutId);
    executeUpdate(undoAction.orderId, undoAction.oldStatus, undoAction.oldPaymentStatus);
    setUndoAction(null);
  };

  const pendingCount   = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);
  const preparingCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length, [orders]);
  const readyCount     = useMemo(() => orders.filter(o => o.status === 'ready').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'completed' || o.status === 'cancelled').length, [orders]);
  
  const todayOrders    = useMemo(() => { const t = new Date().toDateString(); return orders.filter(o => new Date(o.createdAt || o.created_at || 0).toDateString() === t); }, [orders]);
  const totalRevenue   = useMemo(() => todayOrders.reduce((s, o) => s + (Number(o.totalPrice || o.total_price) || 0), 0), [todayOrders]);
  const totalProfit    = useMemo(() => totalRevenue * 0.45, [totalRevenue]);

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (activeTab === 'pending')   return o.status === 'pending';
    if (activeTab === 'preparing') return o.status === 'confirmed' || o.status === 'preparing';
    if (activeTab === 'ready')     return o.status === 'ready';
    if (activeTab === 'completed') return o.status === 'completed' || o.status === 'cancelled';
    return true;
  }).sort((a, b) => {
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    if (idA !== 0 && idB !== 0) return idB - idA;
    const dateA = String(a.createdAt || a.created_at || 0).replace(' ', 'T');
    const dateB = String(b.createdAt || b.created_at || 0).replace(' ', 'T');
    return (new Date(dateB).getTime() || 0) - (new Date(dateA).getTime() || 0);
  }), [orders, activeTab]);

  if (isLoadingInitial) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f3ee' }}>
         <Loader2 className="w-8 h-8 animate-spin text-[#0E5C37]" />
         <p style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#9CA3AF' }}>Menyiapkan Sistem...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'linear-gradient(160deg, #f6f3ee 0%, #e8e2d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(14,92,55,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(14,92,55,0.04)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-2xl p-8 flex flex-col items-center relative z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0E5C37] to-[#065F46] flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/20">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-stone-800 tracking-tight text-center font-display leading-tight">{mitraProfile.name}</h2>
          <p className="text-xs text-stone-500 mt-1.5 text-center px-4 mb-6">Arahkan QR Code Karyawan ke kamera atau gunakan Scanner Fisik</p>

          <div className="w-full">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center p-10 bg-stone-50 rounded-2xl border border-stone-100">
                <Loader2 className="w-10 h-10 animate-spin text-[#0E5C37] mb-3" />
                <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">Memverifikasi...</p>
              </div>
            ) : (
              <>
                {!isNative && isScanning ? (
                <div className="rounded-2xl overflow-hidden border-4 border-dashed border-[#0E5C37]/50 p-1 relative bg-black aspect-square max-h-[250px] mx-auto w-full max-w-[250px] mb-4">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        handleTokenScan(result[0].rawValue);
                      }
                    }}
                    components={{ finder: false }}
                  />

                  <button
                    onClick={() => setIsScanning(false)}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500/80 backdrop-blur text-white text-xs font-bold rounded-full shadow-lg"
                  >
                    Tutup Kamera
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (isNative) {

                      const granted =
                        await requestCameraPermission();

                      if (!granted) {
                        alert('Izin kamera ditolak');
                        return;
                      }

                      await handleNativeScan();
                      return;
                    }

                    setIsScanning(true);
                    
                  }}
                  className="w-full py-4 mb-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 font-bold text-sm flex flex-col items-center gap-2 hover:bg-stone-100 transition-all active:scale-95"
                >
                  <Camera className="w-6 h-6 text-[#0E5C37]" />

                  {isNative
                    ? 'Scan QR Native'
                    : 'Buka Kamera Web'}
                </button>
              )}
                
                <div className="text-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                    <strong className="font-bold">Scanner fisik juga aktif.</strong> <br/>Langsung *Tembak* QR Code ke layar.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (role === 'owner') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f6f3ee', display: 'flex', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
        <div style={{ width: '100%', maxWidth: '480px', height: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(28,28,25,0.1)', border: '1px solid #e5e2dd' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AdminDashboardView onBack={logout} />
          </div>
          <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #f0ede9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5a4b44' }}>
              <ShieldCheck size={14} color="#0E5C37" />
              <span>Login: <strong className="text-stone-800">{activeStaffName}</strong> (Owner)</span>
            </div>
            <button onClick={logout} style={{ color: '#DC2626', fontWeight: 700, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 'auto' }}>Keluar</button>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'pending',   label: 'Baru',           count: pendingCount   },
    { id: 'preparing', label: 'Diracik',        count: preparingCount },
    { id: 'ready',     label: 'Siap Disajikan', count: readyCount     },
    { id: 'completed', label: 'Selesai',        count: completedCount },
  ];

  // @ts-ignore
  const popupTotalBill = cashPaymentPopup ? Number(cashPaymentPopup.totalAfterDiscount || cashPaymentPopup.total_after_discount || cashPaymentPopup.totalPrice || cashPaymentPopup.total_price || 0) : 0;
  const popupReceived = Number(receivedAmount.replace(/\D/g, '')) || 0;
  const popupChange = popupReceived - popupTotalBill;

  return (
    <div style={{ minHeight: '100dvh', background: '#f0ede9', display: 'flex', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ width: '100%', maxWidth: '480px', height: '100dvh', background: '#fafaf9', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(28,28,25,0.12)', position: 'relative', overflow: 'hidden' }}>

        <AnimatePresence>
          {cashPaymentPopup && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
            >
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white w-full sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                  <div>
                    <h3 className="text-lg font-black text-stone-800 tracking-tight leading-none">Terima Tunai</h3>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mt-1">Order #{cashPaymentPopup.id}</p>
                  </div>
                  <button onClick={() => setCashPaymentPopup(null)} className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"><X className="w-4 h-4 text-stone-500" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="text-center p-6 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-1">Total Tagihan</p>
                    <p className="text-4xl font-black text-amber-600 font-display">{formatPrice(popupTotalBill)}</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">Uang Diterima (Rp)</label>
                    <input 
                      type="text" 
                      autoFocus
                      inputMode="numeric"
                      value={receivedAmount ? formatPrice(Number(receivedAmount.replace(/\D/g, ''))).replace('Rp', '').trim() : ''}
                      onChange={(e) => setReceivedAmount(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border-2 border-stone-200 rounded-xl py-4 px-5 text-2xl font-black text-stone-800 outline-none transition-all focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/10"
                      placeholder="0"
                    />
                    
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 custom-scrollbar">
                      <button onClick={() => setReceivedAmount(String(popupTotalBill))} className="shrink-0 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 hover:bg-stone-200">Uang Pas</button>
                      <button onClick={() => setReceivedAmount('50000')} className="shrink-0 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 hover:bg-stone-200">50.000</button>
                      <button onClick={() => setReceivedAmount('100000')} className="shrink-0 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 hover:bg-stone-200">100.000</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 rounded-xl border border-stone-100 bg-stone-50">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Kembalian</span>
                    <span className={`text-lg font-black ${popupChange < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {popupChange < 0 ? 'Uang Kurang' : formatPrice(popupChange)}
                    </span>
                  </div>
                </div>

                <div className="p-5 border-t border-stone-100 bg-white">
                  <button 
                    onClick={handleConfirmCashPayment}
                    disabled={popupReceived < popupTotalBill}
                    className="w-full py-4 rounded-xl bg-[#0E5C37] text-white font-bold uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0E5C37]/20"
                  >
                    <ReceiptText className="w-5 h-5" /> Simpan & Lunas
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isPOSMode && (
            <CashierPOS onClose={() => setIsPOSMode(false)} onSubmitOrder={handlePOSSubmit} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPrinterModal && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 40,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 40,
                  scale: 0.97,
                }}
                className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[2rem]"
              >
                <header className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-[#0E5C37] to-emerald-600 px-5 py-4 text-white sm:px-6 sm:py-5">
                    
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                      <Printer className="h-6 w-6" />
                    </span>

                    <div>
                      <h3 className="text-lg font-black">
                        Pengaturan Printer
                      </h3>

                      <p className="mt-0.5 text-xs text-white/75">
                        Perangkat, ukuran kertas, desain struk, dan otomatisasi
                      </p>
                    </div>
                  </div>
                  

                  <button
                    type="button"
                    onClick={() =>
                      setShowPrinterModal(
                        false
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <nav className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 py-3 sm:px-6">
                  {[
                    {
                      id:
                        'device',
                      label:
                        'Printer',
                      icon:
                        Printer,
                    },
                    {
                      id:
                        'receipt',
                      label:
                        'Struk',
                      icon:
                        FileText,
                    },
                    {
                      id:
                        'content',
                      label:
                        'Konten',
                      icon:
                        AlignCenter,
                    },
                    {
                      id:
                        'automation',
                      label:
                        'Otomatisasi',
                      icon:
                        Settings2,
                    },
                    {
                      id:
                        'preview',
                      label:
                        'Preview',
                      icon:
                        ReceiptText,
                    },
                  ].map(
                    (tab) => {
                      const Icon =
                        tab.icon;
                      const active =
                        printerSettingsTab ===
                        tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() =>
                            setPrinterSettingsTab(
                              tab.id as
                                PrinterSettingsTab
                            )
                          }
                          className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                            active
                              ? 'bg-[#0E5C37] text-white shadow-md'
                              : 'border border-stone-200 bg-white text-stone-500'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    }
                  )}
                </nav>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  {printerSettingsTab ===
                    'device' && (
                    <div className="space-y-5">
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-stone-800">
                              Printer aktif
                            </h4>

                            <p className="mt-1 text-xs text-stone-400">
                              Deteksi printer thermal melalui USB atau Bluetooth, lalu pilih perangkat yang digunakan.
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              disabled={
                                isScanningPrinter
                              }
                              onClick={() =>
                                handleScanPrinter(
                                  'usb'
                                )
                              }
                              className="flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-[#0E5C37] disabled:opacity-50"
                            >
                              {scanningTransport ===
                              'usb' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                              USB
                            </button>

                            <button
                              type="button"
                              disabled={
                                isScanningPrinter
                              }
                              onClick={() =>
                                handleScanPrinter(
                                  'bluetooth'
                                )
                              }
                              className="flex min-h-10 items-center gap-2 rounded-xl bg-[#0E5C37] px-3 text-xs font-black text-white disabled:opacity-50"
                            >
                              {scanningTransport ===
                              'bluetooth' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Bluetooth className="h-4 w-4" />
                              )}
                              Bluetooth
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {savedPrinters.length >
                            0 && (
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                                  Printer tersimpan ({savedPrinters.length})
                                </p>

                                <p className="text-[10px] font-semibold text-stone-400">
                                  Satu printer aktif untuk mencetak
                                </p>
                              </div>

                              <div className="space-y-2">
                                {savedPrinters.map(
                                  (
                                    printer
                                  ) => (
                                    <PrinterDeviceCard
                                      key={`saved-${printer.type}-${printer.id}`}
                                      printer={
                                        printer
                                      }
                                      selected={
                                        selectedPrinter?.id ===
                                          printer.id &&
                                        selectedPrinter?.type ===
                                          printer.type
                                      }
                                      saved
                                      onSelect={() =>
                                        void selectPrinter(
                                          printer
                                        )
                                      }
                                      onRemove={() =>
                                        removeSavedPrinter(
                                          printer
                                        )
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                              Perangkat terdeteksi
                            </p>

                            {printers.length ===
                              0 &&
                              !isScanningPrinter && (
                                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center">
                                  <Printer className="mx-auto h-8 w-8 text-stone-300" />

                                  <p className="mt-3 text-sm font-bold text-stone-500">
                                    Belum ada printer terdeteksi
                                  </p>

                                  <p className="mt-1 text-xs text-stone-400">
                                    Sambungkan kabel USB atau aktifkan Bluetooth, lalu tekan tombol deteksi.
                                  </p>
                                </div>
                              )}

                            <div className="space-y-2">
                              {printers
                                .filter(
                                  (
                                    printer
                                  ) =>
                                    !savedPrinters.some(
                                      (
                                        saved
                                      ) =>
                                        saved.id ===
                                          printer.id &&
                                        saved.type ===
                                          printer.type
                                    )
                                )
                                .map(
                                  (
                                    printer
                                  ) => (
                                    <PrinterDeviceCard
                                      key={`detected-${printer.type}-${printer.id}`}
                                      printer={
                                        printer
                                      }
                                      selected={
                                        selectedPrinter?.id ===
                                          printer.id &&
                                        selectedPrinter?.type ===
                                          printer.type
                                      }
                                      onSelect={() =>
                                        void selectPrinter(
                                          printer
                                        )
                                      }
                                    />
                                  )
                                )}
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <button
                          type="button"
                          disabled={
                            !selectedPrinter
                          }
                          onClick={
                            saveSelectedPrinter
                          }
                          className="min-h-12 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-[#0E5C37] disabled:opacity-50"
                        >
                          Simpan Printer
                        </button>

                        <button
                          type="button"
                          disabled={
                            !selectedPrinter
                          }
                          onClick={
                            handleConnectPrinter
                          }
                          className="min-h-12 rounded-xl bg-[#0E5C37] px-4 text-sm font-black text-white disabled:bg-stone-300"
                        >
                          Hubungkan Printer
                        </button>

                        <button
                          type="button"
                          disabled={
                            !selectedPrinter
                          }
                          onClick={
                            handleTestPrint
                          }
                          className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-700 disabled:opacity-50"
                        >
                          Test Print
                        </button>
                      </div>

                      <SettingGroup
                        title="Ukuran kertas"
                        description="Sesuaikan dengan roll thermal printer."
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            '58mm',
                            '80mm',
                          ].map(
                            (
                              width
                            ) => (
                              <button
                                key={
                                  width
                                }
                                type="button"
                                onClick={() =>
                                  updatePrinterSetting(
                                    'paperWidth',
                                    width as
                                      PaperWidth
                                  )
                                }
                                className={`min-h-12 rounded-xl border-2 text-sm font-black ${
                                  printerSettings.paperWidth ===
                                  width
                                    ? 'border-[#0E5C37] bg-emerald-50 text-[#0E5C37]'
                                    : 'border-stone-200 bg-white text-stone-500'
                                }`}
                              >
                                {width}
                              </button>
                            )
                          )}
                        </div>
                      </SettingGroup>

                      <SettingGroup
                        title="Jumlah salinan"
                        description="Jumlah struk yang dicetak setiap transaksi."
                      >
                        <NumberStepper
                          value={
                            printerSettings.copies
                          }
                          min={1}
                          max={5}
                          onChange={(
                            value
                          ) =>
                            updatePrinterSetting(
                              'copies',
                              value
                            )
                          }
                        />
                      </SettingGroup>
                    </div>
                  )}

                  {printerSettingsTab ===
                    'receipt' && (
                    <div className="space-y-5">
                      <SettingToggle
                        icon={
                          ImageIcon
                        }
                        title="Tampilkan logo"
                        description="Cetak logo usaha di bagian paling atas struk."
                        checked={
                          printerSettings.showLogo
                        }
                        onChange={(
                          checked
                        ) =>
                          updatePrinterSetting(
                            'showLogo',
                            checked
                          )
                        }
                      />

                      {printerSettings.showLogo && (
                        <>
                          <SettingGroup
                            title="File logo"
                            description="Format PNG, JPG, JPEG, atau WEBP. Maksimal 2 MB."
                          >
                            <input
                              ref={
                                logoFileInputRef
                              }
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              onChange={
                                handleLogoUpload
                              }
                              className="hidden"
                            />

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  logoFileInputRef.current?.click()
                                }
                                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-sm font-black text-[#0E5C37] transition hover:bg-emerald-100"
                              >
                                <ImageIcon className="h-5 w-5" />
                                Pilih File Logo
                              </button>

                              {printerSettings.logoUrl && (
                                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2">
                                  <img
                                    src={
                                      printerSettings.logoUrl
                                    }
                                    alt="Preview logo"
                                    className="h-12 w-12 rounded-lg bg-stone-50 object-contain p-1"
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.src =
                                        '/logo.png';
                                    }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updatePrinterSetting(
                                        'logoUrl',
                                        ''
                                      )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500"
                                    title="Hapus logo"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </SettingGroup>

                          <SettingGroup
                            title="Ukuran logo"
                            description="Ukuran logo pada hasil cetak."
                          >
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                {
                                  id:
                                    'small',
                                  label:
                                    'Kecil',
                                },
                                {
                                  id:
                                    'medium',
                                  label:
                                    'Sedang',
                                },
                                {
                                  id:
                                    'large',
                                  label:
                                    'Besar',
                                },
                              ].map(
                                (
                                  option
                                ) => (
                                  <button
                                    key={
                                      option.id
                                    }
                                    type="button"
                                    onClick={() =>
                                      updatePrinterSetting(
                                        'logoSize',
                                        option.id as
                                          ReceiptLogoSize
                                      )
                                    }
                                    className={`min-h-11 rounded-xl border-2 text-xs font-black ${
                                      printerSettings.logoSize ===
                                      option.id
                                        ? 'border-[#0E5C37] bg-emerald-50 text-[#0E5C37]'
                                        : 'border-stone-200 text-stone-500'
                                    }`}
                                  >
                                    {
                                      option.label
                                    }
                                  </button>
                                )
                              )}
                            </div>
                          </SettingGroup>
                        </>
                      )}

                      <SettingGroup
                        title="Teks header"
                        description="Tampil sebelum informasi transaksi."
                      >
                        <textarea
                          value={
                            printerSettings.headerText
                          }
                          onChange={(
                            event
                          ) =>
                            updatePrinterSetting(
                              'headerText',
                              event.target.value
                            )
                          }
                          placeholder="Contoh: Selamat datang di toko kami"
                          className="min-h-24 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none focus:border-[#0E5C37]"
                        />
                      </SettingGroup>

                      <SettingGroup
                        title="Teks footer"
                        description="Tampil setelah rincian pembayaran."
                      >
                        <textarea
                          value={
                            printerSettings.footerText
                          }
                          onChange={(
                            event
                          ) =>
                            updatePrinterSetting(
                              'footerText',
                              event.target.value
                            )
                          }
                          placeholder="Contoh: Barang yang sudah dibeli tidak dapat dikembalikan"
                          className="min-h-24 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none focus:border-[#0E5C37]"
                        />
                      </SettingGroup>

                      <SettingGroup
                        title="Ucapan terima kasih"
                        description="Kalimat penutup utama pada struk."
                      >
                        <input
                          type="text"
                          value={
                            printerSettings.thankYouText
                          }
                          onChange={(
                            event
                          ) =>
                            updatePrinterSetting(
                              'thankYouText',
                              event.target.value
                            )
                          }
                          className="min-h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none focus:border-[#0E5C37]"
                        />
                      </SettingGroup>
                    </div>
                  )}

                  {printerSettingsTab ===
                    'content' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        [
                          'showStoreName',
                          'Nama toko',
                        ],
                        [
                          'showCashier',
                          'Nama kasir',
                        ],
                        [
                          'showCustomer',
                          'Pelanggan',
                        ],
                        [
                          'showOrderNumber',
                          'Nomor pesanan',
                        ],
                        [
                          'showOrderType',
                          'Tipe layanan',
                        ],
                        [
                          'showTable',
                          'Nomor meja',
                        ],
                        [
                          'showAddons',
                          'Add-on produk',
                        ],
                        [
                          'showNotes',
                          'Catatan pesanan',
                        ],
                        [
                          'showSubtotal',
                          'Subtotal',
                        ],
                        [
                          'showDiscount',
                          'Diskon',
                        ],
                        [
                          'showTax',
                          'Pajak',
                        ],
                        [
                          'showServiceCharge',
                          'Biaya layanan',
                        ],
                        [
                          'showPaymentMethod',
                          'Metode pembayaran',
                        ],
                        [
                          'showCashReceived',
                          'Uang diterima',
                        ],
                        [
                          'showChange',
                          'Kembalian',
                        ],
                      ].map(
                        ([
                          key,
                          label,
                        ]) => (
                          <CompactToggle
                            key={
                              key
                            }
                            label={
                              label
                            }
                            checked={
                              Boolean(
                                printerSettings[
                                  key as keyof CashierPrinterSettings
                                ]
                              )
                            }
                            onChange={(
                              checked
                            ) =>
                              updatePrinterSetting(
                                key as keyof CashierPrinterSettings,
                                checked as never
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  )}

                  {printerSettingsTab ===
                    'automation' && (
                    <div className="space-y-4">
                      <SettingToggle
                        icon={
                          Printer
                        }
                        title="Cetak otomatis"
                        description="Cetak struk otomatis setelah transaksi berhasil."
                        checked={
                          printerSettings.autoPrint
                        }
                        onChange={(
                          checked
                        ) =>
                          updatePrinterSetting(
                            'autoPrint',
                            checked
                          )
                        }
                      />

                      <SettingToggle
                        icon={
                          Scissors
                        }
                        title="Auto-cutter"
                        description="Kirim perintah potong kertas setelah cetak. Printer harus mendukung ESC/POS cutter."
                        checked={
                          printerSettings.autoCut
                        }
                        onChange={(
                          checked
                        ) =>
                          updatePrinterSetting(
                            'autoCut',
                            checked
                          )
                        }
                      />

                      <SettingGroup
                        title="Baris kosong setelah cetak"
                        description="Memberi jarak sebelum kertas dipotong."
                      >
                        <NumberStepper
                          value={
                            printerSettings.feedLines
                          }
                          min={0}
                          max={10}
                          onChange={(
                            value
                          ) =>
                            updatePrinterSetting(
                              'feedLines',
                              value
                            )
                          }
                        />
                      </SettingGroup>
                    </div>
                  )}

                  {printerSettingsTab ===
                    'preview' && (
                    <ReceiptPreview
                      storeName={
                        mitraProfile.name
                      }
                      cashierName={
                        activeStaffName
                      }
                      settings={
                        printerSettings
                      }
                    />
                  )}
                </div>

                <footer className="grid grid-cols-[1fr_auto] gap-3 border-t border-stone-200 bg-stone-50 p-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPrinterModal(
                        false
                      )
                    }
                    className="min-h-12 rounded-xl border border-stone-200 bg-white px-5 text-sm font-black text-stone-600"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    disabled={
                      isSavingPrinterSettings
                    }
                    onClick={
                      handleSavePrinter
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0E5C37] px-6 text-sm font-black text-white disabled:bg-stone-300"
                  >
                    {isSavingPrinterSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    Simpan
                  </button>
                </footer>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
              style={{ position:'absolute', top:'72px', left:'16px', right:'16px', zIndex:50,
                background: 'linear-gradient(135deg,#0E5C37,#065F46)', color:'#fff',
                padding:'12px 16px', borderRadius:'12px', boxShadow:'0 8px 24px rgba(14,92,55,0.3)',
                display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:600 }}>
              <BellRing size={16} /> {notification}
            </motion.div>
          )}
          {undoAction && (
            <motion.div initial={{ opacity:0, y:50 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
              style={{ position:'absolute', bottom:'72px', left:'16px', right:'16px', zIndex:50,
                background:'#1c1c19', color:'#fff', padding:'12px 16px', borderRadius:'12px',
                boxShadow:'0 8px 32px rgba(28,28,25,0.25)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ margin:0, fontSize:'12px', fontWeight:700 }}>Status diperbarui</p>
                <p style={{ margin:0, fontSize:'10px', color:'#9CA3AF' }}>Pesanan #{undoAction.orderId}</p>
              </div>
              <button onClick={handleUndo} style={{
                display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'8px',
                background:'#374151', color:'#fff', fontSize:'11px', fontWeight:700,
                border:'1px solid #4B5563', cursor:'pointer', minHeight:'auto'
              }}>
                <RotateCcw size={12} /> Batalkan
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <header style={{
          padding: '14px 20px', background: '#fff', borderBottom: '1px solid #f0ede9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 12px rgba(28,28,25,0.05)', flexShrink: 0, zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#0E5C37,#065F46)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(14,92,55,0.25)'
            }}>
              <Coffee size={17} color="#fff" />
            </div>
            <div>
              <p style={{ margin:0, fontSize:'9px', color:'#9CA3AF', fontFamily:'var(--font-label)', letterSpacing:'0.1em' }}>
                POS: {role?.toUpperCase()}
              </p>
              <h1 style={{ margin:0, fontSize:'16px', fontWeight:800, color:'#1c1c19', lineHeight:1.2, fontFamily:'var(--font-display)' }}>
                 {mitraProfile.name}
              </h1>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <PwaInstallButton />
            <button
              onClick={() => setShowPrinterModal(true)}
              title="Pengaturan Printer"
              style={{
                width:'34px',
                height:'34px',
                borderRadius:'8px',
                border:'1.5px solid #e5e2dd',
                background: selectedPrinter ? '#ECFDF5' : '#fff',
                color:'#0E5C37',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                cursor:'pointer',
                position:'relative'
              }}
            >
              <Printer size={14} />
              {selectedPrinter && (
                <span style={{
                  position:'absolute',
                  width:'7px',
                  height:'7px',
                  borderRadius:'50%',
                  background:'#10B981',
                  right:'2px',
                  top:'2px',
                  border:'1px solid #fff'
                }} />
              )}
            </button>
            <button onClick={() => fetchOrders()} title="Refresh" style={{
              width:'34px', height:'34px', borderRadius:'8px', border:'1.5px solid #e5e2dd',
              background:'#fff', color:'#5a4b44', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', minHeight:'auto'
            }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => router.push(`/${slug}/menu`)} style={{
              width:'34px', height:'34px', borderRadius:'8px',
              background:'linear-gradient(135deg,#0E5C37,#065F46)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              textDecoration:'none', boxShadow:'0 4px 10px rgba(14,92,55,0.25)', border:'none', cursor:'pointer'
            }}>
              <ArrowLeft size={14} />
            </button>
          </div>
        </header>

        {role === 'cashier' && (
          <div style={{ padding:'12px 16px', background:'#fff', borderBottom:'1px solid #f0ede9', display:'flex', gap:'10px', flexShrink:0 }}>
            {[
              { icon: <ReceiptText size={13} />, label: 'Penjualan', value: `${todayOrders.length} nota`, color: '#5a4b44' },
              { icon: <TrendingUp size={13} />,  label: 'Pendapatan', value: formatPrice(totalRevenue), color: '#1c1c19' },
              { icon: <Sparkles size={13} />,    label: 'Est. Laba',  value: formatPrice(totalProfit),  color: '#0E5C37' },
            ].map((s, i) => (
              <div key={i} style={{
                flex:1, padding:'10px 12px', borderRadius:'12px',
                background:'#fafaf9', border:'1.5px solid #f0ede9',
                boxShadow:'0 1px 4px rgba(28,28,25,0.04)'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', color:'#9CA3AF', marginBottom:'4px' }}>
                  {s.icon}
                  <span style={{ fontSize:'9px', fontFamily:'var(--font-label)', letterSpacing:'0.06em' }}>{s.label}</span>
                </div>
                <p style={{ margin:0, fontSize:'12px', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding:'10px 16px', background:'#fff', borderBottom:'1px solid #f0ede9', display:'flex', gap:'8px', flexShrink:0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                flex:1, padding:'9px 4px', borderRadius:'10px', fontSize:'10px', fontWeight:700,
                border: active ? '1.5px solid #0E5C37' : '1.5px solid #f0ede9',
                background: active ? '#0E5C37' : '#fafaf9',
                color: active ? '#fff' : '#9CA3AF',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                boxShadow: active ? '0 4px 12px rgba(14,92,55,0.25)' : 'none',
                transition:'all 0.2s', minHeight:'auto'
              }}>
                {tab.label}
                <span style={{
                  width:'16px', height:'16px', borderRadius:'6px', fontSize:'9px', fontWeight:800,
                  background: active ? 'rgba(255,255,255,0.2)' : '#f0ede9',
                  color: active ? '#fff' : '#5a4b44',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <main style={{ flex:1, overflowY:'auto', padding:'16px', background:'#f6f3ee' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{
                width:'56px', height:'56px', borderRadius:'16px', background:'#fff',
                border:'1.5px solid #e5e2dd', margin:'0 auto 16px',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 12px rgba(28,28,25,0.06)'
              }}>
                <ShoppingBag size={22} color="#d6c2bd" />
              </div>
              <p style={{ fontWeight:700, color:'#1c1c19', fontSize:'14px', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>
                Belum Ada Pesanan
              </p>
              <p style={{ fontSize:'12px', color:'#9CA3AF', maxWidth:'220px', margin:'0 auto', lineHeight:1.6 }}>
                {activeTab === 'pending' ? 'Pesanan baru akan muncul di sini.' : 
                 activeTab === 'preparing' ? 'Daftar pesanan yang sedang diracik.' : 
                 activeTab === 'ready' ? 'Pesanan siap disajikan ke pelanggan.' :
                 'Riwayat pesanan selesai/batal akan tampil di sini.'}
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <AnimatePresence>
                {filteredOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdateStatus={updateOrderStatus} 
                    onUpdateNote={updateOrderNote}
                    onPrintOrder={handlePrintOrder}
                    role={role === 'kitchen' ? 'kitchen' : 'cashier'}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>

        <footer style={{
          padding:'10px 20px', background:'#fff', borderTop:'1px solid #f0ede9',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:'11px', flexShrink:0
        }}>
          <span style={{ color:'#9CA3AF', display:'flex', alignItems:'center', gap:'5px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block' }} />
            Login: <strong className="text-stone-800">{activeStaffName}</strong>
          </span>
          <button onClick={logout} style={{ color:'#DC2626', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:'11px', minHeight:'auto' }}>
            Akhiri Sesi
          </button>
        </footer>

        {role === 'cashier' && (
          <button 
            onClick={() => setIsPOSMode(true)}
            style={{
              position: 'absolute', bottom: '60px', right: '20px', zIndex: 40,
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #0E5C37, #065F46)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,92,55,0.4)',
            }}
          >
            <Plus size={24} />
          </button>
        )}

      </div>
    </div>
  );
}

function PrinterDeviceCard({
  printer,
  selected,
  saved = false,
  onSelect,
  onRemove,
}: {
  printer: PrinterDevice;
  selected: boolean;
  saved?: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className={`flex w-full items-center gap-2 rounded-2xl border p-2 transition ${
      selected
        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
        : 'border-stone-200 bg-white hover:border-stone-300'
    }`}>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 p-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-100 text-stone-500'
          }`}>
            <Printer className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-black text-stone-800">
                {printer.name}
              </p>

              {saved && (
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600">
                  Tersimpan
                </span>
              )}

              {selected && (
                <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                  Aktif
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-xs text-stone-500">
              {printer.address || 'Alamat tidak tersedia'}
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {printer.type}
            </p>
          </div>
        </div>

        {selected && (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        )}
      </button>

      {saved && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
          title="Hapus printer tersimpan"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-black text-stone-800">
        {title}
      </h4>

      <p className="mt-1 text-xs leading-relaxed text-stone-400">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function SettingToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(
          !checked
        )
      }
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0E5C37]">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <p className="text-sm font-black text-stone-800">
            {title}
          </p>

          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            {description}
          </p>
        </div>
      </div>

      <ToggleIndicator
        checked={
          checked
        }
      />
    </button>
  );
}

function CompactToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(
          !checked
        )
      }
      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 text-left"
    >
      <span className="text-xs font-black text-stone-700">
        {label}
      </span>

      <ToggleIndicator
        checked={
          checked
        }
      />
    </button>
  );
}

function ToggleIndicator({
  checked,
}: {
  checked: boolean;
}) {
  return (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${
      checked
        ? 'bg-[#0E5C37]'
        : 'bg-stone-300'
    }`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
        checked
          ? 'left-6'
          : 'left-1'
      }`} />
    </span>
  );
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-stone-100 p-1.5">
      <button
        type="button"
        disabled={
          value <= min
        }
        onClick={() =>
          onChange(
            Math.max(
              min,
              value - 1
            )
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-black text-stone-700 shadow-sm disabled:opacity-40"
      >
        −
      </button>

      <span className="min-w-12 text-center text-lg font-black text-stone-800">
        {value}
      </span>

      <button
        type="button"
        disabled={
          value >= max
        }
        onClick={() =>
          onChange(
            Math.min(
              max,
              value + 1
            )
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E5C37] text-lg font-black text-white disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function ReceiptPreview({
  storeName,
  cashierName,
  settings,
}: {
  storeName: string;
  cashierName: string;
  settings: CashierPrinterSettings;
}) {
  const previewWidth =
    settings.paperWidth ===
    '80mm'
      ? 'max-w-[360px]'
      : 'max-w-[280px]';

  return (
    <div className="rounded-2xl bg-stone-200 p-4 sm:p-6">
      <div className={`mx-auto bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-stone-800 shadow-xl ${previewWidth}`}>
        {settings.showLogo && (
          <div className="mb-3 flex justify-center">
            <img
              src={
                settings.logoUrl ||
                '/logo.png'
              }
              alt="Logo struk"
              className={`object-contain ${
                settings.logoSize ===
                'small'
                  ? 'h-10 w-10'
                  : settings.logoSize ===
                    'large'
                    ? 'h-20 w-20'
                    : 'h-14 w-14'
              }`}
              onError={(
                event
              ) => {
                event.currentTarget.src =
                  '/logo.png';
              }}
            />
          </div>
        )}

        {settings.showStoreName && (
          <p className="text-center text-sm font-black uppercase">
            {storeName}
          </p>
        )}

        {settings.headerText && (
          <p className="mt-2 whitespace-pre-wrap text-center">
            {settings.headerText}
          </p>
        )}

        <p className="my-3 border-t border-dashed border-stone-400" />

        {settings.showOrderNumber && (
          <PreviewRow
            label="Order"
            value="#A102"
          />
        )}

        {settings.showCashier && (
          <PreviewRow
            label="Kasir"
            value={
              cashierName ||
              'Kasir'
            }
          />
        )}

        {settings.showCustomer && (
          <PreviewRow
            label="Pelanggan"
            value="Pelanggan Umum"
          />
        )}

        <p className="my-3 border-t border-dashed border-stone-400" />

        <div className="space-y-2">
          <div>
            <div className="flex justify-between gap-3 font-bold">
              <span>1x Kopi Susu</span>
              <span>18.000</span>
            </div>

            {settings.showAddons && (
              <p className="pl-3 text-stone-500">
                + Extra shot
              </p>
            )}
          </div>

          <div className="flex justify-between gap-3 font-bold">
            <span>2x Roti Bakar</span>
            <span>30.000</span>
          </div>
        </div>

        <p className="my-3 border-t border-dashed border-stone-400" />

        {settings.showSubtotal && (
          <PreviewRow
            label="Subtotal"
            value="48.000"
          />
        )}

        {settings.showDiscount && (
          <PreviewRow
            label="Diskon"
            value="-3.000"
          />
        )}

        <div className="mt-2 flex justify-between gap-3 text-sm font-black">
          <span>TOTAL</span>
          <span>45.000</span>
        </div>

        {settings.showPaymentMethod && (
          <PreviewRow
            label="Pembayaran"
            value="Tunai"
          />
        )}

        {settings.showCashReceived && (
          <PreviewRow
            label="Diterima"
            value="50.000"
          />
        )}

        {settings.showChange && (
          <PreviewRow
            label="Kembalian"
            value="5.000"
          />
        )}

        {settings.footerText && (
          <>
            <p className="my-3 border-t border-dashed border-stone-400" />
            <p className="whitespace-pre-wrap text-center">
              {settings.footerText}
            </p>
          </>
        )}

        {settings.thankYouText && (
          <p className="mt-4 text-center font-bold">
            {settings.thankYouText}
          </p>
        )}

        <div style={{
          height:
            `${settings.feedLines * 5}px`,
        }} />
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="text-right">
        {value}
      </span>
    </div>
  );
}