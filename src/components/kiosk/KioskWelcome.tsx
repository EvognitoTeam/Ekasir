'use client';

import {
  ArrowUpRight,
  Sparkles,
  Utensils,
} from 'lucide-react';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

type Props = {
  storeName: string;
  tagline?: string;
  logoUrl?: string | null;
  onStart: () => void;
  onOpenSettings?: () => void; 
};

export default function KioskWelcome({
  storeName,
  tagline = 'Pesan cepat, ambil nyaman, nikmati tanpa antre lama.',
  logoUrl,
  onStart,
  onOpenSettings,
}: Props) {

  // --- Logic untuk Secret Button ---
  const [clickCount, setClickCount] = useState(0);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSecretClick = () => {
    // Hitung nilai baru terlebih dahulu di luar setState
    const newCount = clickCount + 1;

    if (newCount >= 5) {
      // Panggil fungsi parent di luar updater
      if (onOpenSettings) {
        onOpenSettings();
      }
      setClickCount(0); // Reset ke 0
    } else {
      setClickCount(newCount); // Update state biasa
    }

    // Reset hitungan jika dalam 2 detik tidak ada klik lanjutan
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      setClickCount(0);
    }, 2000);
  };

  // --- State untuk URL gambar (mengakomodasi fallback error) ---
  const [imgSource, setImgSource] = useState(logoUrl || '/logo.png');

  // Perbarui state jika prop logoUrl berubah
  useEffect(() => {
    setImgSource(logoUrl || '/logo.png');
  }, [logoUrl]);

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#f4f1e8] text-[#171717]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#c8ff3d] blur-3xl sm:h-[420px] sm:w-[420px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#ff7a59]/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* --- 1. Logo Header (Kecil) --- */}
            {/* Kontainer luar tetap menentukan ukuran fisik kotak (h-12 w-12) */}
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#171717] bg-white shadow-[4px_4px_0_#171717] sm:h-14 sm:w-14">
              <Image
                src={imgSource}
                alt={storeName}
                width={80} 
                height={80}
                className="h-full w-auto object-contain p-1.5"
                onError={() => setImgSource('/logo.png')}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500" onClick={handleSecretClick}>
                Self order
              </p>
              <p className="max-w-[190px] truncate text-base font-black sm:max-w-sm sm:text-lg">
                {storeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border-2 border-[#171717] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#171717] sm:text-xs">
            <Sparkles className="h-4 w-4" />
            Fresh order
          </div>
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white sm:text-xs"
            >
              <Utensils className="h-4 w-4 text-[#c8ff3d]" />
              Selamat datang
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-5 max-w-5xl text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.88] tracking-[-0.075em]"
            >
              Pesan cepat,
              <span className="block text-[#ff5c35]">
                tanpa ribet.
              </span>
            </motion.h1>

            <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-neutral-600 sm:text-xl lg:text-2xl">
              {tagline}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, rotate: -3, scale: 0.96 }}
            animate={{ opacity: 1, rotate: 2, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="hidden lg:block"
          >
            {/* --- 2. Logo Tengah (Besar) --- */}
            {/* Kontainer luar menentukan ukuran maksimal dan padding (p-10) */}
            <div className="relative mx-auto aspect-square w-full max-w-[430px] rounded-[3rem] border-[3px] border-[#171717] bg-white p-10 shadow-[16px_16px_0_#171717]">
              {/* Lencana 'Cepat' & 'Praktis' tetap absolute terhadap kontainer putih */}
              <div className="absolute -left-8 top-10 z-10 rotate-[-8deg] rounded-2xl border-2 border-[#171717] bg-[#c8ff3d] px-5 py-3 text-sm font-black shadow-[5px_5px_0_#171717]">
                Cepat
              </div>
              <div className="absolute -right-8 bottom-16 z-10 rotate-[7deg] rounded-2xl border-2 border-[#171717] bg-[#ffd8cf] px-5 py-3 text-sm font-black shadow-[5px_5px_0_#171717]">
                Praktis
              </div>
              
              {/* Ganti fill dengan width/height eksplisit */}
              {/* Kita set ukuran intrinsik yang cukup besar (asumsi persegi, misal 500x500),
                  Next.js akan menggunakan ini untuk optimasi aspect ratio. */}
              <Image
                src={imgSource}
                alt={storeName}
                width={500}
                height={500}
                // CSS: 'h-full w-full' memastikan gambar mengisi seluruh sisa ruang di dalam padding kotak putih,
                // 'object-contain' memastikan gambar besar ini tidak gepeng dan pas di dalam kotak.
                className="h-full w-full object-contain"
                // Priority ditambahkan karena ini gambar utama di area "above the fold"
                priority
                onError={() => setImgSource('/logo.png')}
              />
            </div>
          </motion.div>
        </main>

        <motion.button
          type="button"
          onClick={onStart}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          whileTap={{ scale: 0.985 }}
          className="group flex min-h-[76px] w-full items-center justify-between rounded-[1.75rem] border-[3px] border-[#171717] bg-[#c8ff3d] px-5 text-left shadow-[7px_7px_0_#171717] transition hover:-translate-y-1 hover:shadow-[10px_10px_0_#171717] sm:min-h-[90px] sm:px-7"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 sm:text-xs">
              Mulai sekarang
            </p>
            <p className="mt-1 text-xl font-black sm:text-2xl lg:text-3xl">
              Pesan Sekarang
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-white sm:h-16 sm:w-16">
            <ArrowUpRight className="h-7 w-7 transition group-hover:rotate-12 sm:h-8 sm:w-8" />
          </span>
        </motion.button>
      </div>
    </section>
  );
}