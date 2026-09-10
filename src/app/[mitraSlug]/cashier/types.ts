import type { PrinterDevice } from '@/lib/printer/types';

export type CashierRole = 'cashier' | 'owner' | null;
export type PaperWidth = '58mm' | '80mm';
export type ReceiptLogoSize = 'small' | 'medium' | 'large';
export type PrinterSettingsTab =
  | 'device'
  | 'receipt'
  | 'content'
  | 'automation'
  | 'preview';

/**
 * Satu-satunya source-of-truth untuk:
 * - Live Preview di modal printer
 * - Physical Test Print
 *
 * Jadi test print yang keluar di printer harus merepresentasikan
 * data yang sama dengan preview.
 */
export const PRINTER_TEST_RECEIPT = {
  orderCode: 'TEST-001',
  customerName: 'Pelanggan Umum',
  orderType: 'Dine In',
  tableName: '01',

  item: {
    productId: '__KALOO_PRINTER_TEST_PRODUCT__',
    addonId: '__KALOO_PRINTER_TEST_ADDON__',
    name: 'Kopi Susu',
    addonName: 'Extra shot',
    note: 'Less ice, gula sedikit',
    quantity: 1,
    basePrice: 18000,
    addonPrice: 3000,
  },

  subtotal: 21000,
  discount: 1000,
  service: 1000,
  tax: 2000,
  total: 23000,

  paymentMethod: 'cash',
  cashReceived: 25000,
  change: 2000,
} as const;

export type CashierPrinterSettings = {
  paperWidth: PaperWidth;
  copies: number;

  /**
   * Jeda antar salinan dalam millisecond.
   * Hanya dipakai di antara copy, bukan setelah copy terakhir.
   *
   * Contoh:
   * copies = 2
   * copyDelayMs = 3000
   *
   * print #1 -> tunggu 3 detik -> print #2
   */
  copyDelayMs: number;

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

export const DEFAULT_PRINTER_SETTINGS: CashierPrinterSettings = {
  paperWidth: '58mm',
  copies: 1,
  copyDelayMs: 3000,
  autoPrint: true,
  autoCut: true,
  showLogo: true,
  logoUrl: '/logo.png',
  logoSize: 'medium',
  headerText: '',
  footerText: '',
  thankYouText: 'Terima kasih atas kunjungan Anda.',
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

export type CashierSessionSnapshot = {
  token: string;
  name: string;
  role: 'cashier' | 'owner';
  branchId: number | null;
};

export type NewReservationForm = {
  name: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  pax: number;
  tableIds: string[];
  notes: string;
};

export type PrinterRuntimeState = {
  printers: PrinterDevice[];
  savedPrinters: PrinterDevice[];
  selectedPrinter: PrinterDevice | null;
  isScanningPrinter: boolean;
  scanningTransport: 'usb' | 'bluetooth' | null;
  settings: CashierPrinterSettings;
  isSavingSettings: boolean;
};
