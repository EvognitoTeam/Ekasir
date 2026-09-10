'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, Loader2, QrCode, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

import { useCashier } from '../_providers/CashierProvider';

export default function CashierLogin() {
  const { storeName, isVerifying, verifyStaffToken } = useCashier();
  const [isScanning, setIsScanning] = useState(true);
  const physicalBuffer = useRef('');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === 'Enter') {
        const token = physicalBuffer.current;
        physicalBuffer.current = '';
        if (token.length > 10) void verifyStaffToken(token);
        return;
      }

      if (event.key.length === 1) {
        physicalBuffer.current += event.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [verifyStaffToken]);

  const scanNative = async () => {
    try {
      const permission = await BarcodeScanner.requestPermissions();
      if (permission.camera !== 'granted' && permission.camera !== 'limited') {
        alert('Izin kamera ditolak');
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes[0]?.rawValue) {
        await verifyStaffToken(barcodes[0].rawValue);
      }
    } catch (error) {
      console.error('[CASHIER_NATIVE_SCAN_ERROR]', error);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f5f1] p-4 text-black">
      <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-white blur-3xl" />
      <div className="absolute bottom-[-160px] right-[-100px] h-[420px] w-[420px] rounded-full bg-black/[0.03] blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-black/[0.07] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.08)] lg:grid-cols-[1fr_440px]"
      >
        <div className="hidden min-h-[650px] flex-col justify-between bg-black p-10 text-white lg:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
              <QrCode className="h-5 w-5" />
            </div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-white/35">
              KALOO POS
            </p>
            <h1 className="mt-4 max-w-md text-5xl font-black leading-[.92] tracking-[-.06em]">
              Ready for your shift.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/45">
              Scan identitas staff untuk membuka workspace kasir, menerima order, mengelola meja, dan mencetak transaksi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['Fast checkout', 'Live orders', 'Printer ready'].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white lg:hidden">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">Staff access</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.04em]">{storeName}</h2>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-black/45">
            Scan QR identitas kasir atau gunakan barcode scanner fisik untuk memulai sesi.
          </p>

          <div className="mt-7">
            {isVerifying ? (
              <div className="flex aspect-square max-h-[330px] w-full flex-col items-center justify-center rounded-[26px] bg-[#f5f5f1]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-black/35">Memverifikasi akses</p>
              </div>
            ) : !isNative && isScanning ? (
              <div className="relative mx-auto aspect-square max-h-[330px] overflow-hidden rounded-[26px] bg-black">
                <Scanner
                  onScan={(result) => {
                    const token = result?.[0]?.rawValue;
                    if (token) void verifyStaffToken(token);
                  }}
                  components={{ finder: false }}
                />
                <div className="pointer-events-none absolute inset-6 rounded-[22px] border border-white/40" />
                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black"
                >
                  Tutup kamera
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (isNative ? void scanNative() : setIsScanning(true))}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-[26px] border border-dashed border-black/15 bg-[#f8f8f5] transition hover:bg-[#f1f1ed]"
              >
                <Camera className="h-6 w-6" />
                <span className="mt-3 text-xs font-black">
                  {isNative ? 'Scan QR Staff' : 'Aktifkan Kamera'}
                </span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f5f5f1] p-4">
            <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-black/35" />
            <div>
              <p className="text-[10px] font-black">Scanner fisik aktif</p>
              <p className="mt-1 text-[9px] leading-4 text-black/40">
                Scanner USB/Bluetooth dapat langsung menembakkan QR tanpa membuka kamera.
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
