'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlignCenter,
  Bluetooth,
  Check,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Printer,
  Radio,
  Save,
  Settings2,
  Trash2,
  Usb,
  X,
} from 'lucide-react';

import type { PrinterDevice } from '@/lib/printer/types';
import { useCashier } from '../_providers/CashierProvider';
import {
  PRINTER_TEST_RECEIPT,
  type PrinterSettingsTab,
  type ReceiptLogoSize,
} from '../types';

export default function PrinterSettingsModal() {
  const {
    showPrinterModal,
    setShowPrinterModal,
    printers,
    savedPrinters,
    selectedPrinter,
    printerSettings,
    isScanningPrinter,
    scanningTransport,
    isSavingPrinterSettings,
    isTestingPrinter,
    testPrintProgress,
    updatePrinterSetting,
    scanPrinter,
    selectPrinter,
    saveSelectedPrinter,
    removeSavedPrinter,
    connectPrinter,
    testPrint,
    savePrinterSettings,
    uploadPrinterLogo,
    storeName,
    staffName,
  } = useCashier();

  const [tab, setTab] = useState<PrinterSettingsTab>('device');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigation = [
    {
      id: 'device',
      label: 'Printer',
      description: 'Perangkat & koneksi',
      icon: Printer,
    },
    {
      id: 'receipt',
      label: 'Identitas',
      description: 'Logo & teks struk',
      icon: FileText,
    },
    {
      id: 'content',
      label: 'Isi Struk',
      description: 'Field yang dicetak',
      icon: AlignCenter,
    },
    {
      id: 'automation',
      label: 'Otomatisasi',
      description: 'Auto print & cutter',
      icon: Settings2,
    },
  ] as const;

  const activePrinterName =
    selectedPrinter?.name ||
    'Belum memilih printer';

  return (
    <AnimatePresence>
      {showPrinterModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPrinterModal(false)}
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.985 }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[96dvh] w-full max-w-[1220px] overflow-hidden rounded-t-[30px] bg-[#f5f5f1] shadow-2xl sm:h-[92dvh] sm:rounded-[30px]"
          >
            {/* ==================================================
                LEFT CONTROL RAIL
                ================================================== */}
            <aside className="hidden w-[220px] shrink-0 flex-col bg-[#11110f] text-white md:flex">
              <div className="border-b border-white/10 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black">
                  <Printer className="h-5 w-5" />
                </div>

                <p className="mt-5 text-[8px] font-black uppercase tracking-[.17em] text-white/30">
                  Hardware utility
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-.04em]">
                  Print Station
                </h2>
              </div>

              <nav className="flex-1 space-y-1.5 p-3">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                        active
                          ? 'bg-white text-black'
                          : 'text-white/45 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? 'bg-black text-white'
                            : 'bg-white/10'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[.08em]">
                          {item.label}
                        </p>
                        <p className={`mt-0.5 text-[7px] ${active ? 'text-black/40' : 'text-white/25'}`}>
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-white/10 p-4">
                <p className="text-[7px] font-black uppercase tracking-[.14em] text-white/25">
                  Active printer
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selectedPrinter
                        ? 'bg-emerald-400'
                        : 'bg-white/20'
                    }`}
                  />
                  <p className="min-w-0 truncate text-[9px] font-black">
                    {activePrinterName}
                  </p>
                </div>
              </div>
            </aside>

            {/* ==================================================
                MAIN WORKBENCH
                ================================================== */}
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="shrink-0 border-b border-black/[0.07] bg-white px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[.16em] text-black/25">
                      Printer setup
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-[-.035em]">
                      {navigation.find((item) => item.id === tab)?.label || 'Printer'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingPrinterSettings}
                      onClick={() => void savePrinterSettings()}
                      className="hidden h-10 items-center gap-2 rounded-xl bg-black px-4 text-[8px] font-black uppercase tracking-[.08em] text-white sm:flex disabled:opacity-40"
                    >
                      {isSavingPrinterSettings ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPrinterModal(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-black/40 hover:bg-[#f2f2ee]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* mobile nav */}
                <div className="mt-3 flex gap-2 overflow-x-auto md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[8px] font-black uppercase tracking-[.07em] ${
                          active
                            ? 'bg-black text-white'
                            : 'border border-black/[0.07] bg-white text-black/40'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </header>

              <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* SETTINGS */}
                <main className="min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
                  {tab === 'device' && (
                    <div className="space-y-5">
                      {/* active device */}
                      <section className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white">
                        <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                          <div className="p-5">
                            <p className="text-[8px] font-black uppercase tracking-[.14em] text-black/25">
                              Selected device
                            </p>

                            <div className="mt-3 flex items-center gap-3">
                              <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                  selectedPrinter
                                    ? 'bg-black text-white'
                                    : 'bg-[#efefeb] text-black/25'
                                }`}
                              >
                                <Printer className="h-5 w-5" />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">
                                  {activePrinterName}
                                </p>
                                <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[.08em] text-black/30">
                                  {selectedPrinter
                                    ? `${selectedPrinter.type} · ${selectedPrinter.address || selectedPrinter.id}`
                                    : 'Pilih printer dari daftar di bawah'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-black/[0.06] bg-[#fafaf7] p-4 sm:w-[210px] sm:grid-cols-1 sm:border-l sm:border-t-0">
                            <button
                              type="button"
                              disabled={!selectedPrinter}
                              onClick={() => void connectPrinter()}
                              className="h-10 rounded-xl bg-black px-3 text-[8px] font-black uppercase tracking-[.08em] text-white disabled:opacity-30"
                            >
                              Connect
                            </button>

                            <button
                              type="button"
                              disabled={
                                !selectedPrinter ||
                                isTestingPrinter
                              }
                              onClick={() =>
                                void testPrint()
                              }
                              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 text-[8px] font-black uppercase tracking-[.08em] disabled:opacity-30"
                            >
                              {isTestingPrinter ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Printer className="h-3.5 w-3.5" />
                              )}

                              {isTestingPrinter
                                ? testPrintProgress.phase ===
                                  'waiting'
                                  ? `Jeda ${Math.round(
                                      testPrintProgress.delayMs /
                                        1000,
                                    )}s · ${testPrintProgress.current}/${testPrintProgress.total}`
                                  : `Print ${testPrintProgress.current}/${testPrintProgress.total}`
                                : 'Test preview'}
                            </button>
                          </div>
                        </div>
                      </section>

                      {isTestingPrinter && (
                        <section className="rounded-[18px] border border-amber-100 bg-amber-50 p-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </span>

                            <div>
                              <p className="text-[9px] font-black text-amber-950">
                                {testPrintProgress.phase ===
                                'waiting'
                                  ? `Salinan ${testPrintProgress.current} selesai`
                                  : `Mencetak salinan ${testPrintProgress.current}/${testPrintProgress.total}`}
                              </p>

                              <p className="mt-1 text-[8px] leading-4 text-amber-800/60">
                                {testPrintProgress.phase ===
                                'waiting'
                                  ? `Printer sudah menyelesaikan job sebelumnya. Menunggu ${Math.round(
                                      testPrintProgress.delayMs /
                                        1000,
                                    )} detik sebelum salinan berikutnya.`
                                  : 'Menunggu seluruh receipt, feed, dan cutter selesai dikirim sebelum timer jeda dimulai.'}
                              </p>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* scanning */}
                      <section className="rounded-[22px] border border-black/[0.07] bg-white p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black">Cari printer baru</p>
                            <p className="mt-1 text-[8px] leading-4 text-black/35">
                              Scan printer thermal ESC/POS melalui USB atau Bluetooth.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={isScanningPrinter}
                              onClick={() => void scanPrinter('usb')}
                              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-[#f5f5f1] px-3 text-[8px] font-black uppercase tracking-[.07em] disabled:opacity-40"
                            >
                              {scanningTransport === 'usb' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Usb className="h-3.5 w-3.5" />
                              )}
                              USB
                            </button>

                            <button
                              type="button"
                              disabled={isScanningPrinter}
                              onClick={() => void scanPrinter('bluetooth')}
                              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-3 text-[8px] font-black uppercase tracking-[.07em] text-white disabled:opacity-40"
                            >
                              {scanningTransport === 'bluetooth' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Bluetooth className="h-3.5 w-3.5" />
                              )}
                              Bluetooth
                            </button>
                          </div>
                        </div>
                      </section>

                      {savedPrinters.length > 0 && (
                        <section>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[8px] font-black uppercase tracking-[.14em] text-black/30">
                              Saved printers
                            </p>
                            <span className="font-mono text-[8px] font-black text-black/25">
                              {savedPrinters.length}
                            </span>
                          </div>

                          <div className="grid gap-2 xl:grid-cols-2">
                            {savedPrinters.map((printer) => (
                              <DeviceTile
                                key={`saved-${printer.type}-${printer.id}`}
                                printer={printer}
                                selected={
                                  selectedPrinter?.id === printer.id &&
                                  selectedPrinter.type === printer.type
                                }
                                saved
                                onSelect={() => void selectPrinter(printer)}
                                onRemove={() => removeSavedPrinter(printer)}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[8px] font-black uppercase tracking-[.14em] text-black/30">
                            Detected devices
                          </p>
                          <span className="font-mono text-[8px] font-black text-black/25">
                            {
                              printers.filter(
                                (printer) =>
                                  !savedPrinters.some(
                                    (saved) =>
                                      saved.id === printer.id &&
                                      saved.type === printer.type,
                                  ),
                              ).length
                            }
                          </span>
                        </div>

                        <div className="grid gap-2 xl:grid-cols-2">
                          {printers
                            .filter(
                              (printer) =>
                                !savedPrinters.some(
                                  (saved) =>
                                    saved.id === printer.id &&
                                    saved.type === printer.type,
                                ),
                            )
                            .map((printer) => (
                              <DeviceTile
                                key={`found-${printer.type}-${printer.id}`}
                                printer={printer}
                                selected={
                                  selectedPrinter?.id === printer.id &&
                                  selectedPrinter.type === printer.type
                                }
                                onSelect={() => void selectPrinter(printer)}
                              />
                            ))}
                        </div>

                        {printers.length === 0 && savedPrinters.length === 0 && !isScanningPrinter && (
                          <div className="rounded-[20px] border border-dashed border-black/12 bg-white px-5 py-10 text-center">
                            <Radio className="mx-auto h-6 w-6 text-black/20" />
                            <p className="mt-3 text-[9px] font-black">
                              Belum ada printer
                            </p>
                            <p className="mt-1 text-[8px] text-black/30">
                              Sambungkan perangkat lalu jalankan scan.
                            </p>
                          </div>
                        )}
                      </section>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <WorkbenchCard
                          title="Ukuran kertas"
                          description="Sesuaikan dengan roll thermal."
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {(['58mm', '80mm'] as const).map((width) => (
                              <button
                                key={width}
                                type="button"
                                onClick={() =>
                                  updatePrinterSetting(
                                    'paperWidth',
                                    width,
                                  )
                                }
                                className={`h-11 rounded-xl border font-mono text-[9px] font-black ${
                                  printerSettings.paperWidth === width
                                    ? 'border-black bg-black text-white'
                                    : 'border-black/[0.08] bg-[#f5f5f1] text-black/45'
                                }`}
                              >
                                {width}
                              </button>
                            ))}
                          </div>
                        </WorkbenchCard>

                        <WorkbenchCard
                          title="Jumlah salinan"
                          description="Berlaku untuk test print, manual print, dan auto print."
                        >
                          <NumberStepper
                            value={
                              printerSettings.copies
                            }
                            min={1}
                            max={5}
                            onChange={(value) =>
                              updatePrinterSetting(
                                'copies',
                                value,
                              )
                            }
                          />

                          <p className="mt-3 text-[8px] font-bold leading-4 text-black/35">
                            {printerSettings.copies === 1
                              ? '1 cetakan original.'
                              : `1 original + ${printerSettings.copies - 1} copy. Cetakan ke-2 mulai diberi label COPY #1.`}
                          </p>
                        </WorkbenchCard>

                        <WorkbenchCard
                          title="Jeda antar salinan"
                          description="Memberi printer waktu sebelum copy berikutnya."
                        >
                          <div className="flex items-center gap-3">
                            <NumberStepper
                              value={
                                Math.round(
                                  printerSettings.copyDelayMs /
                                    1000,
                                )
                              }
                              min={0}
                              max={15}
                              onChange={(seconds) =>
                                updatePrinterSetting(
                                  'copyDelayMs',
                                  seconds *
                                    1000,
                                )
                              }
                            />

                            <span className="text-[9px] font-black text-black/35">
                              detik
                            </span>
                          </div>

                          <p className="mt-3 text-[8px] font-bold leading-4 text-black/35">
                            Default 3 detik. Jeda hanya terjadi di antara salinan.
                          </p>
                        </WorkbenchCard>
                      </div>

                      {printerSettings.copies > 1 && (
                        <div className="rounded-[18px] border border-blue-100 bg-blue-50 p-4">
                          <p className="text-[8px] font-black uppercase tracking-[.1em] text-blue-700/60">
                            Multi-copy aktif
                          </p>

                          <p className="mt-1 text-[10px] font-black text-blue-950">
                            {printerSettings.copies} salinan · jeda{' '}
                            {Math.round(
                              printerSettings.copyDelayMs /
                                1000,
                            )}{' '}
                            detik
                          </p>

                          <p className="mt-1 text-[8px] leading-4 text-blue-800/55">
                            Print #1 = original. Setelah selesai, tunggu{' '}
                            {Math.round(
                              printerSettings.copyDelayMs /
                                1000,
                            )}{' '}
                            detik. Print #2 diberi label COPY #1, print #3 COPY #2, dan seterusnya.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!selectedPrinter}
                        onClick={() => void saveSelectedPrinter()}
                        className="h-11 w-full rounded-xl border border-black/[0.08] bg-white text-[8px] font-black uppercase tracking-[.08em] disabled:opacity-30"
                      >
                        Simpan printer terpilih
                      </button>
                    </div>
                  )}

                  {tab === 'receipt' && (
                    <div className="space-y-4">
                      <WorkbenchCard
                        title="Logo struk"
                        description="Logo tampil di bagian paling atas receipt."
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              updatePrinterSetting(
                                'showLogo',
                                !printerSettings.showLogo,
                              )
                            }
                            className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[8px] font-black uppercase tracking-[.07em] ${
                              printerSettings.showLogo
                                ? 'bg-black text-white'
                                : 'bg-[#ecece7] text-black/40'
                            }`}
                          >
                            {printerSettings.showLogo ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                            {printerSettings.showLogo ? 'Logo aktif' : 'Logo mati'}
                          </button>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';

                              if (file) {
                                void uploadPrinterLogo(file);
                              }
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-9 items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 text-[8px] font-black uppercase tracking-[.07em]"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Pilih file
                          </button>
                        </div>

                        {printerSettings.logoUrl && (
                          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f5f5f1] p-3">
                            <img
                              src={printerSettings.logoUrl}
                              alt="Logo"
                              className="h-16 w-16 rounded-xl bg-white object-contain p-1"
                            />

                            <button
                              type="button"
                              onClick={() => updatePrinterSetting('logoUrl', '')}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {(['small', 'medium', 'large'] as ReceiptLogoSize[]).map(
                            (size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => updatePrinterSetting('logoSize', size)}
                                className={`h-10 rounded-xl text-[8px] font-black uppercase tracking-[.07em] ${
                                  printerSettings.logoSize === size
                                    ? 'bg-black text-white'
                                    : 'bg-[#ecece7] text-black/40'
                                }`}
                              >
                                {size}
                              </button>
                            ),
                          )}
                        </div>
                      </WorkbenchCard>

                      <WorkbenchCard title="Teks header">
                        <textarea
                          value={printerSettings.headerText}
                          onChange={(event) =>
                            updatePrinterSetting('headerText', event.target.value)
                          }
                          placeholder="Contoh: Selamat datang..."
                          className="min-h-24 w-full resize-none rounded-xl border border-black/[0.07] bg-[#f5f5f1] p-3 text-[10px] font-semibold outline-none focus:border-black/20 focus:bg-white"
                        />
                      </WorkbenchCard>

                      <WorkbenchCard title="Teks footer">
                        <textarea
                          value={printerSettings.footerText}
                          onChange={(event) =>
                            updatePrinterSetting('footerText', event.target.value)
                          }
                          placeholder="Contoh: Barang yang sudah dibeli..."
                          className="min-h-24 w-full resize-none rounded-xl border border-black/[0.07] bg-[#f5f5f1] p-3 text-[10px] font-semibold outline-none focus:border-black/20 focus:bg-white"
                        />
                      </WorkbenchCard>

                      <WorkbenchCard title="Ucapan terima kasih">
                        <input
                          value={printerSettings.thankYouText}
                          onChange={(event) =>
                            updatePrinterSetting(
                              'thankYouText',
                              event.target.value,
                            )
                          }
                          className="h-11 w-full rounded-xl border border-black/[0.07] bg-[#f5f5f1] px-3 text-[10px] font-bold outline-none focus:border-black/20 focus:bg-white"
                        />
                      </WorkbenchCard>
                    </div>
                  )}

                  {tab === 'content' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ['showStoreName', 'Nama toko'],
                        ['showCashier', 'Nama kasir'],
                        ['showCustomer', 'Pelanggan'],
                        ['showOrderNumber', 'Nomor pesanan'],
                        ['showOrderType', 'Tipe layanan'],
                        ['showTable', 'Nomor meja'],
                        ['showAddons', 'Add-on produk'],
                        ['showNotes', 'Catatan'],
                        ['showSubtotal', 'Subtotal'],
                        ['showDiscount', 'Diskon'],
                        ['showTax', 'Pajak'],
                        ['showServiceCharge', 'Service charge'],
                        ['showPaymentMethod', 'Metode bayar'],
                        ['showCashReceived', 'Uang diterima'],
                        ['showChange', 'Kembalian'],
                      ].map(([key, label]) => {
                        const checked = Boolean(
                          printerSettings[
                            key as keyof typeof printerSettings
                          ],
                        );

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              updatePrinterSetting(
                                key as any,
                                !checked as any,
                              )
                            }
                            className={`flex min-h-[64px] items-center justify-between gap-3 rounded-[16px] border p-3 text-left transition ${
                              checked
                                ? 'border-black bg-white'
                                : 'border-black/[0.06] bg-[#ecece7] text-black/45'
                            }`}
                          >
                            <span className="text-[9px] font-black">
                              {label}
                            </span>

                            <MiniSwitch checked={checked} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {tab === 'automation' && (
                    <div className="space-y-3">
                      <AutomationRow
                        title="Cetak otomatis"
                        description="Cetak receipt customer setelah transaksi berhasil."
                        checked={printerSettings.autoPrint}
                        onChange={(checked) =>
                          updatePrinterSetting('autoPrint', checked)
                        }
                      />

                      <AutomationRow
                        title="Auto-cutter"
                        description="Potong kertas setelah cetak selesai."
                        checked={printerSettings.autoCut}
                        onChange={(checked) =>
                          updatePrinterSetting('autoCut', checked)
                        }
                      />

                      <WorkbenchCard
                        title="Feed lines"
                        description="Jarak kosong sebelum cutter."
                      >
                        <NumberStepper
                          value={printerSettings.feedLines}
                          min={0}
                          max={10}
                          onChange={(value) =>
                            updatePrinterSetting('feedLines', value)
                          }
                        />
                      </WorkbenchCard>
                    </div>
                  )}
                </main>

                {/* ==================================================
                    ALWAYS-ON PREVIEW
                    ================================================== */}
                <aside className="hidden min-h-0 border-l border-black/[0.07] bg-[#e9e9e4] lg:flex lg:flex-col">
                  <div className="border-b border-black/[0.07] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[.14em] text-black/25">
                          Live preview
                        </p>
                        <p className="mt-1 text-xs font-black">Receipt</p>
                      </div>

                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black/40">
                        <Monitor className="h-4 w-4" />
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <ReceiptPreview
                      storeName={storeName}
                      cashierName={staffName}
                      settings={printerSettings}
                    />
                  </div>

                  <div className="border-t border-black/[0.07] bg-white p-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <QuickStat
                        label="Paper"
                        value={printerSettings.paperWidth}
                      />
                      <QuickStat
                        label="Copies"
                        value={String(printerSettings.copies)}
                      />
                      <QuickStat
                        label="Delay"
                        value={`${Math.round(
                          printerSettings.copyDelayMs /
                            1000,
                        )}s`}
                      />
                      <QuickStat
                        label="Auto"
                        value={printerSettings.autoPrint ? 'ON' : 'OFF'}
                      />
                    </div>

                    {printerSettings.copies > 1 && (
                      <p className="mt-3 text-center text-[7px] font-bold leading-4 text-black/30">
                        Preview di atas adalah ORIGINAL. Cetakan berikutnya otomatis diberi COPY #1, COPY #2, dst.
                      </p>
                    )}
                  </div>
                </aside>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.07] bg-white p-4 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowPrinterModal(false)}
                  className="h-11 rounded-xl border border-black/[0.08] px-4 text-[8px] font-black uppercase tracking-[.08em]"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  disabled={isSavingPrinterSettings}
                  onClick={() => void savePrinterSettings()}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 text-[8px] font-black uppercase tracking-[.08em] text-white disabled:opacity-40"
                >
                  {isSavingPrinterSettings ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Simpan Pengaturan
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeviceTile({
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
    <div
      className={`relative overflow-hidden rounded-[18px] border bg-white ${
        selected
          ? 'border-black ring-1 ring-black'
          : 'border-black/[0.07]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? 'bg-black text-white'
              : 'bg-[#ecece7] text-black/35'
          }`}
        >
          {printer.type === 'bluetooth' ? (
            <Bluetooth className="h-4 w-4" />
          ) : (
            <Usb className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black">{printer.name}</p>
          <p className="mt-1 truncate text-[7px] font-bold uppercase tracking-[.08em] text-black/30">
            {printer.address || printer.id}
          </p>
        </div>

        {selected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
        )}
      </button>

      {saved && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600"
          title="Hapus printer tersimpan"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function WorkbenchCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-black/[0.07] bg-white p-4">
      <p className="text-[10px] font-black">{title}</p>
      {description && (
        <p className="mt-1 text-[8px] leading-4 text-black/35">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AutomationRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-5 rounded-[20px] border border-black/[0.07] bg-white p-4 text-left"
    >
      <div>
        <p className="text-[10px] font-black">{title}</p>
        <p className="mt-1 text-[8px] leading-4 text-black/35">
          {description}
        </p>
      </div>
      <MiniSwitch checked={checked} />
    </button>
  );
}

function MiniSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      className={`relative h-[20px] w-9 shrink-0 rounded-full transition ${
        checked ? 'bg-black' : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
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
    <div className="flex w-40 items-center justify-between rounded-xl bg-[#ecece7] p-1">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-black disabled:opacity-30"
      >
        −
      </button>

      <strong className="font-mono text-[10px]">{value}</strong>

      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-black text-white disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f5f5f1] px-2 py-2.5">
      <p className="text-[6px] font-black uppercase tracking-[.1em] text-black/25">
        {label}
      </p>
      <p className="mt-1 font-mono text-[8px] font-black">{value}</p>
    </div>
  );
}

function ReceiptPreview({
  storeName,
  cashierName,
  settings,
}: any) {
  const sample =
    PRINTER_TEST_RECEIPT;

  return (
    <div className="flex justify-center py-2">
      <div
        className={`w-full bg-white px-5 py-6 font-mono text-[9px] leading-relaxed text-black shadow-xl ${
          settings.paperWidth === '80mm'
            ? 'max-w-[290px]'
            : 'max-w-[230px]'
        }`}
      >
        {settings.showLogo && (
          <div className="mb-4 flex justify-center">
            <img
              src={settings.logoUrl || '/logo.png'}
              alt="Logo"
              className={`w-auto object-contain ${
                settings.logoSize === 'small'
                  ? 'h-8'
                  : settings.logoSize === 'large'
                    ? 'h-16'
                    : 'h-11'
              }`}
            />
          </div>
        )}

        {settings.showStoreName && (
          <p className="text-center text-xs font-black uppercase">
            {storeName}
          </p>
        )}

        {settings.headerText && (
          <p className="mt-2 whitespace-pre-wrap text-center text-[8px]">
            {settings.headerText}
          </p>
        )}

        <div className="my-4 border-t border-dashed border-black/30" />

        {settings.showOrderNumber && (
          <PreviewRow
            label="Order"
            value={`#${sample.orderCode}`}
          />
        )}

        {settings.showCashier && (
          <PreviewRow
            label="Kasir"
            value={cashierName || '-'}
          />
        )}

        {settings.showCustomer && (
          <PreviewRow
            label="Customer"
            value={sample.customerName}
          />
        )}

        {settings.showOrderType && (
          <PreviewRow
            label="Tipe"
            value={sample.orderType}
          />
        )}

        {settings.showTable && (
          <PreviewRow
            label="Meja"
            value={sample.tableName}
          />
        )}

        <div className="my-4 border-t border-dashed border-black/30" />

        <p className="flex justify-between gap-2 font-bold">
          <span>
            {sample.item.quantity}x {sample.item.name}
          </span>

          <span>
            {formatReceiptNumber(
              sample.item.basePrice *
                sample.item.quantity,
            )}
          </span>
        </p>

        {settings.showAddons && (
          <p className="mt-1 flex justify-between gap-2 pl-3 text-black/45">
            <span>
              + {sample.item.addonName}
            </span>

            <span>
              {formatReceiptNumber(
                sample.item.addonPrice,
              )}
            </span>
          </p>
        )}

        {settings.showNotes &&
          sample.item.note && (
            <p className="mt-1 pl-3 text-black/45">
              Catatan: {sample.item.note}
            </p>
          )}

        <div className="my-4 border-t border-dashed border-black/30" />

        {settings.showSubtotal && (
          <PreviewRow
            label="Subtotal"
            value={formatReceiptNumber(
              sample.subtotal,
            )}
          />
        )}

        {settings.showDiscount && (
          <PreviewRow
            label="Diskon"
            value={`-${formatReceiptNumber(
              sample.discount,
            )}`}
          />
        )}

        {settings.showServiceCharge && (
          <PreviewRow
            label="Service"
            value={formatReceiptNumber(
              sample.service,
            )}
          />
        )}

        {settings.showTax && (
          <PreviewRow
            label="Pajak"
            value={formatReceiptNumber(
              sample.tax,
            )}
          />
        )}

        <p className="mt-2 flex justify-between gap-2 text-[10px] font-black">
          <span>TOTAL</span>
          <span>
            {formatReceiptNumber(
              sample.total,
            )}
          </span>
        </p>

        {settings.showPaymentMethod && (
          <div className="mt-3">
            <PreviewRow
              label="Bayar"
              value="CASH"
            />
          </div>
        )}

        {settings.showCashReceived && (
          <PreviewRow
            label="Diterima"
            value={formatReceiptNumber(
              sample.cashReceived,
            )}
          />
        )}

        {settings.showChange && (
          <PreviewRow
            label="Kembali"
            value={formatReceiptNumber(
              sample.change,
            )}
          />
        )}

        {settings.footerText && (
          <>
            <div className="my-4 border-t border-dashed border-black/30" />
            <p className="whitespace-pre-wrap text-center text-[8px]">
              {settings.footerText}
            </p>
          </>
        )}

        {settings.thankYouText && (
          <p className="mt-5 text-center text-[8px] font-bold">
            {settings.thankYouText}
          </p>
        )}

        <div
          style={{
            height: `${settings.feedLines * 6}px`,
          }}
        />
      </div>
    </div>
  );
}

function formatReceiptNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits:
        0,
    },
  ).format(
    value,
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
    <div className="mb-1 flex justify-between gap-3">
      <span>{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}
