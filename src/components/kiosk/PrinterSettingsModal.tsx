'use client';

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PrinterManager } from "@/lib/printer/PrinterManager";
import { PrinterDevice } from "@/lib/printer/types";
import { Toast } from "@/utils/toast";
import {
  X, Printer, FileText, AlignCenter, Settings2, ReceiptText,
  Loader2, Bluetooth, Image as ImageIcon, Scissors, Save, CheckCircle2, Trash2
} from "lucide-react";

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

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  storeName: string;
};

export default function PrinterSettingsModal({ open, onClose, slug, storeName }: Props) {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [savedPrinters, setSavedPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [isScanningPrinter, setIsScanningPrinter] = useState(false);
  const [scanningTransport, setScanningTransport] = useState<"usb" | "bluetooth" | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [printerSettings, setPrinterSettings] = useState<CashierPrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [printerSettingsTab, setPrinterSettingsTab] = useState<PrinterSettingsTab>("device");
  const [isSavingPrinterSettings, setIsSavingPrinterSettings] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;

    const settingsKey = `evo_printer_settings_${slug}`;
    try {
      const storedSettings = localStorage.getItem(settingsKey);
      if (storedSettings) {
        setPrinterSettings({
          ...DEFAULT_PRINTER_SETTINGS,
          ...JSON.parse(storedSettings),
        });
      }
      setSavedPrinters(PrinterManager.getPrinters(slug));
      setSelectedPrinter(PrinterManager.getPrinter(slug));
    } catch (error) {
      console.error("Gagal memulihkan pengaturan printer:", error);
    }
  }, [open, slug]);

  const updatePrinterSetting = <K extends keyof CashierPrinterSettings>(key: K, value: CashierPrinterSettings[K]) => {
    setPrinterSettings((current) => ({ ...current, [key]: value }));
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
      Toast.fire({ icon: "success", title: "Pengaturan printer disimpan" });
    } catch (error) {
      console.error("Gagal menyimpan pengaturan printer:", error);
      Toast.fire({ icon: "error", title: "Pengaturan printer gagal disimpan" });
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
        });
      }
    } catch (error) {
      console.error("Gagal mendeteksi printer:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Gagal mendeteksi printer" });
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
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu" });
      return;
    }
    await PrinterManager.savePrinter(selectedPrinter, slug);
    await PrinterManager.setActivePrinter(selectedPrinter, slug);
    setSavedPrinters(PrinterManager.getPrinters(slug));
    Toast.fire({ icon: "success", title: `${selectedPrinter.name} disimpan` });
  };

  const removeSavedPrinter = (printer: PrinterDevice) => {
    PrinterManager.removePrinter(printer, slug);
    setSavedPrinters(PrinterManager.getPrinters(slug));
    setPrinters((current) => current.filter((item) => !(item.id === printer.id && item.type === printer.type)));
    if (selectedPrinter?.id === printer.id && selectedPrinter.type === printer.type) {
      setSelectedPrinter(PrinterManager.getPrinter(slug));
    }
    Toast.fire({ icon: "success", title: "Printer dihapus dari daftar tersimpan" });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      Toast.fire({ icon: "error", title: "Logo hanya boleh PNG, JPG, JPEG, atau WEBP" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Toast.fire({ icon: "error", title: "Ukuran logo maksimal 2 MB" });
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
      Toast.fire({ icon: "success", title: "Logo berhasil disimpan pada banner mitra" });
    } catch (error) {
      console.error("Upload logo gagal:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Logo gagal diunggah" });
    }
  };

  const handleConnectPrinter = async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu" });
      return;
    }
    try {
      await PrinterManager.savePrinter(selectedPrinter, slug);
      await PrinterManager.setActivePrinter(selectedPrinter, slug);
      setSavedPrinters(PrinterManager.getPrinters(slug));
      await PrinterManager.connect(selectedPrinter, slug);
      Toast.fire({ icon: "success", title: `Terhubung ke ${selectedPrinter.name}` });
    } catch (error) {
      console.error("Gagal menghubungkan printer:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Gagal menghubungkan printer" });
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: "error", title: "Pilih printer terlebih dahulu" });
      return;
    }
    try {
      await PrinterManager.savePrinter(selectedPrinter, slug);
      await PrinterManager.setActivePrinter(selectedPrinter, slug);
      setSavedPrinters(PrinterManager.getPrinters(slug));
      await PrinterManager.testPrint(selectedPrinter, slug);
      Toast.fire({ icon: "success", title: "Test print berhasil dikirim" });
    } catch (error) {
      console.error("Test print gagal:", error);
      Toast.fire({ icon: "error", title: error instanceof Error ? error.message : "Printer belum terhubung" });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[2rem]"
          >
            <header className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-[#0E5C37] to-emerald-600 px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <Printer className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-black">Pengaturan Printer Kiosk</h3>
                  <p className="mt-0.5 text-xs text-white/75">
                    Perangkat, ukuran kertas, desain struk, dan otomatisasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <nav className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 py-3 sm:px-6">
              {[
                { id: "device", label: "Printer", icon: Printer },
                { id: "receipt", label: "Struk", icon: FileText },
                { id: "content", label: "Konten", icon: AlignCenter },
                { id: "automation", label: "Otomatisasi", icon: Settings2 },
                { id: "preview", label: "Preview", icon: ReceiptText },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = printerSettingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPrinterSettingsTab(tab.id as PrinterSettingsTab)}
                    className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                      active ? "bg-[#0E5C37] text-white shadow-md" : "border border-stone-200 bg-white text-stone-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {printerSettingsTab === "device" && (
                <div className="space-y-5">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-stone-800">Printer aktif</h4>
                        <p className="mt-1 text-xs text-stone-400">
                          Deteksi printer thermal melalui USB atau Bluetooth.
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={isScanningPrinter}
                          onClick={() => handleScanPrinter("usb")}
                          className="flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-[#0E5C37] disabled:opacity-50"
                        >
                          {scanningTransport === "usb" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} USB
                        </button>
                        <button
                          type="button"
                          disabled={isScanningPrinter}
                          onClick={() => handleScanPrinter("bluetooth")}
                          className="flex min-h-10 items-center gap-2 rounded-xl bg-[#0E5C37] px-3 text-xs font-black text-white disabled:opacity-50"
                        >
                          {scanningTransport === "bluetooth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />} Bluetooth
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {savedPrinters.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Printer tersimpan ({savedPrinters.length})</p>
                          </div>
                          <div className="space-y-2">
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
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">Perangkat terdeteksi</p>
                        {printers.length === 0 && !isScanningPrinter && (
                          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center">
                            <Printer className="mx-auto h-8 w-8 text-stone-300" />
                            <p className="mt-3 text-sm font-bold text-stone-500">Belum ada printer terdeteksi</p>
                          </div>
                        )}
                        <div className="space-y-2">
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button type="button" disabled={!selectedPrinter} onClick={saveSelectedPrinter} className="min-h-12 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-[#0E5C37] disabled:opacity-50">
                      Simpan Printer
                    </button>
                    <button type="button" disabled={!selectedPrinter} onClick={handleConnectPrinter} className="min-h-12 rounded-xl bg-[#0E5C37] px-4 text-sm font-black text-white disabled:bg-stone-300">
                      Hubungkan Printer
                    </button>
                    <button type="button" disabled={!selectedPrinter} onClick={handleTestPrint} className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-700 disabled:opacity-50">
                      Test Print
                    </button>
                  </div>

                  <SettingGroup title="Ukuran kertas" description="Sesuaikan dengan roll thermal printer.">
                    <div className="grid grid-cols-2 gap-3">
                      {["58mm", "80mm"].map((width) => (
                        <button
                          key={width}
                          type="button"
                          onClick={() => updatePrinterSetting("paperWidth", width as PaperWidth)}
                          className={`min-h-12 rounded-xl border-2 text-sm font-black ${printerSettings.paperWidth === width ? "border-[#0E5C37] bg-emerald-50 text-[#0E5C37]" : "border-stone-200 bg-white text-stone-500"}`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </SettingGroup>

                  <SettingGroup title="Jumlah salinan" description="Jumlah struk yang dicetak setiap transaksi.">
                    <NumberStepper value={printerSettings.copies} min={1} max={5} onChange={(value) => updatePrinterSetting("copies", value)} />
                  </SettingGroup>
                </div>
              )}

              {printerSettingsTab === "receipt" && (
                <div className="space-y-5">
                  <SettingToggle icon={ImageIcon} title="Tampilkan logo" description="Cetak logo usaha di bagian paling atas struk." checked={printerSettings.showLogo} onChange={(checked) => updatePrinterSetting("showLogo", checked)} />
                  {printerSettings.showLogo && (
                    <>
                      <SettingGroup title="File logo" description="Format PNG, JPG, JPEG, atau WEBP. Maksimal 2 MB.">
                        <input ref={logoFileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <button type="button" onClick={() => logoFileInputRef.current?.click()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 text-sm font-black text-[#0E5C37] transition hover:bg-emerald-100">
                            <ImageIcon className="h-5 w-5" /> Pilih File Logo
                          </button>
                          {printerSettings.logoUrl && (
                            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2">
                              <img src={printerSettings.logoUrl} alt="Preview logo" className="h-12 w-12 rounded-lg bg-stone-50 object-contain p-1" onError={(event) => { event.currentTarget.src = "/logo.png"; }} />
                              <button type="button" onClick={() => updatePrinterSetting("logoUrl", "")} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500" title="Hapus logo"><X className="h-4 w-4" /></button>
                            </div>
                          )}
                        </div>
                      </SettingGroup>
                      <SettingGroup title="Ukuran logo" description="Ukuran logo pada hasil cetak.">
                        <div className="grid grid-cols-3 gap-2">
                          {[{ id: "small", label: "Kecil" }, { id: "medium", label: "Sedang" }, { id: "large", label: "Besar" }].map((option) => (
                            <button key={option.id} type="button" onClick={() => updatePrinterSetting("logoSize", option.id as ReceiptLogoSize)} className={`min-h-11 rounded-xl border-2 text-xs font-black ${printerSettings.logoSize === option.id ? "border-[#0E5C37] bg-emerald-50 text-[#0E5C37]" : "border-stone-200 text-stone-500"}`}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </SettingGroup>
                    </>
                  )}
                  <SettingGroup title="Teks header" description="Tampil sebelum informasi transaksi.">
                    <textarea value={printerSettings.headerText} onChange={(e) => updatePrinterSetting("headerText", e.target.value)} placeholder="Contoh: Selamat datang di toko kami" className="min-h-24 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none focus:border-[#0E5C37]" />
                  </SettingGroup>
                  <SettingGroup title="Teks footer" description="Tampil setelah rincian pembayaran.">
                    <textarea value={printerSettings.footerText} onChange={(e) => updatePrinterSetting("footerText", e.target.value)} placeholder="Contoh: Barang yang sudah dibeli tidak dapat dikembalikan" className="min-h-24 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm outline-none focus:border-[#0E5C37]" />
                  </SettingGroup>
                  <SettingGroup title="Ucapan terima kasih" description="Kalimat penutup utama pada struk.">
                    <input type="text" value={printerSettings.thankYouText} onChange={(e) => updatePrinterSetting("thankYouText", e.target.value)} className="min-h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-semibold outline-none focus:border-[#0E5C37]" />
                  </SettingGroup>
                </div>
              )}

              {printerSettingsTab === "content" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ["showStoreName", "Nama toko"], ["showCashier", "Nama kasir"], ["showCustomer", "Pelanggan"], ["showOrderNumber", "Nomor pesanan"],
                    ["showOrderType", "Tipe layanan"], ["showTable", "Nomor meja"], ["showAddons", "Add-on produk"], ["showNotes", "Catatan pesanan"],
                    ["showSubtotal", "Subtotal"], ["showDiscount", "Diskon"], ["showTax", "Pajak"], ["showServiceCharge", "Biaya layanan"],
                    ["showPaymentMethod", "Metode pembayaran"], ["showCashReceived", "Uang diterima"], ["showChange", "Kembalian"],
                  ].map(([key, label]) => (
                    <CompactToggle key={key} label={label} checked={Boolean(printerSettings[key as keyof CashierPrinterSettings])} onChange={(checked) => updatePrinterSetting(key as keyof CashierPrinterSettings, checked as never)} />
                  ))}
                </div>
              )}

              {printerSettingsTab === "automation" && (
                <div className="space-y-4">
                  <SettingToggle icon={Printer} title="Cetak otomatis" description="Cetak struk otomatis setelah transaksi berhasil." checked={printerSettings.autoPrint} onChange={(checked) => updatePrinterSetting("autoPrint", checked)} />
                  <SettingToggle icon={Scissors} title="Auto-cutter" description="Kirim perintah potong kertas setelah cetak. Printer harus mendukung ESC/POS cutter." checked={printerSettings.autoCut} onChange={(checked) => updatePrinterSetting("autoCut", checked)} />
                  <SettingGroup title="Baris kosong setelah cetak" description="Memberi jarak sebelum kertas dipotong.">
                    <NumberStepper value={printerSettings.feedLines} min={0} max={10} onChange={(value) => updatePrinterSetting("feedLines", value)} />
                  </SettingGroup>
                </div>
              )}

              {printerSettingsTab === "preview" && (
                <ReceiptPreview storeName={storeName} cashierName="Kiosk Self-Service" settings={printerSettings} />
              )}
            </div>

            <footer className="grid grid-cols-[1fr_auto] gap-3 border-t border-stone-200 bg-stone-50 p-4 sm:px-6">
              <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-stone-200 bg-white px-5 text-sm font-black text-stone-600">Tutup</button>
              <button type="button" disabled={isSavingPrinterSettings} onClick={saveAllPrinterSettings} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0E5C37] px-6 text-sm font-black text-white disabled:bg-stone-300">
                {isSavingPrinterSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ================= KOMPONEN HELPER =================

function PrinterDeviceCard({ printer, selected, saved = false, onSelect, onRemove }: any) {
  return (
    <div className={`flex w-full items-center gap-2 rounded-2xl border p-2 transition ${selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-stone-200 bg-white hover:border-stone-300"}`}>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center justify-between gap-4 p-2 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"}`}>
            <Printer className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-black text-stone-800">{printer.name}</p>
              {saved && <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600">Tersimpan</span>}
              {selected && <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Aktif</span>}
            </div>
            <p className="mt-1 truncate text-xs text-stone-500">{printer.address || "Alamat tidak tersedia"}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">{printer.type}</p>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />}
      </button>
      {saved && onRemove && (
        <button type="button" onClick={onRemove} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100" title="Hapus printer">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SettingGroup({ title, description, children }: any) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-black text-stone-800">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-stone-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingToggle({ icon: Icon, title, description, checked, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0E5C37]"><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-sm font-black text-stone-800">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">{description}</p>
        </div>
      </div>
      <ToggleIndicator checked={checked} />
    </button>
  );
}

function CompactToggle({ label, checked, onChange }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 text-left">
      <span className="text-xs font-black text-stone-700">{label}</span>
      <ToggleIndicator checked={checked} />
    </button>
  );
}

function ToggleIndicator({ checked }: { checked: boolean }) {
  return (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-[#0E5C37]" : "bg-stone-300"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
    </span>
  );
}

function NumberStepper({ value, min, max, onChange }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-stone-100 p-1.5">
      <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-black text-stone-700 shadow-sm disabled:opacity-40">−</button>
      <span className="min-w-12 text-center text-lg font-black text-stone-800">{value}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E5C37] text-lg font-black text-white disabled:opacity-40">+</button>
    </div>
  );
}

function ReceiptPreview({ storeName, cashierName, settings }: any) {
  const previewWidth = settings.paperWidth === "80mm" ? "max-w-[360px]" : "max-w-[280px]";
  return (
    <div className="rounded-2xl bg-stone-200 p-4 sm:p-6">
      <div className={`mx-auto bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-stone-800 shadow-xl ${previewWidth}`}>
        {settings.showLogo && (
          <div className="mb-3 flex justify-center">
            <img src={settings.logoUrl || "/logo.png"} alt="Logo struk" className={`object-contain ${settings.logoSize === "small" ? "h-10 w-10" : settings.logoSize === "large" ? "h-20 w-20" : "h-14 w-14"}`} onError={(e) => { e.currentTarget.src = "/logo.png"; }} />
          </div>
        )}
        {settings.showStoreName && <p className="text-center text-sm font-black uppercase">{storeName}</p>}
        {settings.headerText && <p className="mt-2 whitespace-pre-wrap text-center">{settings.headerText}</p>}
        <p className="my-3 border-t border-dashed border-stone-400" />
        {settings.showOrderNumber && <PreviewRow label="Order" value="#A102" />}
        {settings.showCashier && <PreviewRow label="Kasir" value={cashierName} />}
        {settings.showCustomer && <PreviewRow label="Pelanggan" value="Pelanggan Umum" />}
        <p className="my-3 border-t border-dashed border-stone-400" />
        <div className="space-y-2">
          <div><div className="flex justify-between gap-3 font-bold"><span>1x Kopi Susu</span><span>18.000</span></div>{settings.showAddons && <p className="pl-3 text-stone-500">+ Extra shot</p>}</div>
        </div>
        <p className="my-3 border-t border-dashed border-stone-400" />
        {settings.showSubtotal && <PreviewRow label="Subtotal" value="18.000" />}
        <div className="mt-2 flex justify-between gap-3 text-sm font-black"><span>TOTAL</span><span>18.000</span></div>
        {settings.footerText && <><p className="my-3 border-t border-dashed border-stone-400" /><p className="whitespace-pre-wrap text-center">{settings.footerText}</p></>}
        {settings.thankYouText && <p className="mt-4 text-center font-bold">{settings.thankYouText}</p>}
        <div style={{ height: `${settings.feedLines * 5}px` }} />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span>{label}</span><span className="text-right">{value}</span></div>;
}