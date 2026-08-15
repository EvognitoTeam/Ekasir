'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCheck, Store, Clock } from 'lucide-react';
import { applyFallbackImage } from '@/utils/image';

interface OrderQueue {
  id: number;
  order_code: string;
  customerName: string | null;
  status: 'preparing' | 'ready';
}

export default function QueueDisplayPage() {
  const params = useParams();
  const slug = params.mitraSlug as string;

  const [preparingOrders, setPreparingOrders] = useState<OrderQueue[]>([]);
  const [readyOrders, setReadyOrders] = useState<OrderQueue[]>([]);
  const [mitraName, setMitraName] = useState('Memuat Toko...');
  const [mitraLogo, setMitraLogo] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const lastAnnouncedTime = useRef<Map<number, number>>(new Map());
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // 🟢 1. PRE-LOAD DAFTAR SUARA BROWSER
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        voicesRef.current = available;
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 1. Jam Digital Real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🟢 2. FUNGSI SUARA KHUSUS PEREMPUAN
  const speakOrder = useCallback((customerName: string | null, orderCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanName = customerName ? customerName.trim() : 'Pelanggan';
    const spelledCode = orderCode.split('').join(' ');
    const textToSpeech = `Panggilan atas nama ${cleanName}, dengan nomor ${spelledCode}, silakan mengambil pesanan Anda di kasir. Terima kasih.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeech);
    utterance.lang = 'id-ID';
    utterance.rate = 0.92; 
    utterance.pitch = 1.3; // 🟢 Pitch dinaikkan ke 1.3 agar register vokal perempuan jelas

    const availableVoices = voicesRef.current.length > 0 
      ? voicesRef.current 
      : window.speechSynthesis.getVoices();

    // Filter seluruh suara bahasa Indonesia
    const idVoices = availableVoices.filter(
      (v) => v.lang === 'id-ID' || v.lang === 'id_ID' || v.lang.startsWith('id') || v.lang.startsWith('in')
    );

    // Prioritas 1: Suara perempuan resmi (Gadis di Windows/Edge, Damayanti di Mac/iOS, Female, Google)
    let selectedVoice = idVoices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes('gadis') ||
        name.includes('damayanti') ||
        name.includes('female') ||
        name.includes('wanita') ||
        name.includes('perempuan') ||
        (name.includes('google') && name.includes('indonesia'))
      );
    });

    // Prioritas 2: Jika belum ketemu, pilih suara ID apa saja KECUALI suara laki-laki (Ardi / Male / David)
    if (!selectedVoice) {
      selectedVoice = idVoices.find((v) => {
        const name = v.name.toLowerCase();
        return !name.includes('ardi') && !name.includes('male') && !name.includes('pria') && !name.includes('david');
      });
    }

    // Prioritas 3: Fallback ke suara ID pertama yang tersedia
    if (!selectedVoice && idVoices.length > 0) {
      selectedVoice = idVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  // 3. Fetch Data Antrean (Polling setiap 5 Detik)
  useEffect(() => {
    if (!slug) return;

    const fetchQueue = async () => {
      try {
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();
        if (dataSettings.success) {
          setMitraName(dataSettings.data.cafeName || 'Sistem Antrean');
          setMitraLogo(dataSettings.data.banner || null);
        }

        const resOrders = await fetch(`/api/orders/history?slug=${slug}&status=active`);
        const dataOrders = await resOrders.json();

        if (dataOrders.success) {
          const activeOrders: OrderQueue[] = dataOrders.data || [];
          const newReadyOrders = activeOrders.filter((o) => o.status === 'ready');
          const now = Date.now();

          // Panggilan & Pengulangan Tiap 1 Menit
          newReadyOrders.forEach((order) => {
            const lastTime = lastAnnouncedTime.current.get(order.id) || 0;
            const oneMinute = 60 * 1000;

            if (now - lastTime >= oneMinute) {
              speakOrder(order.customerName, order.order_code);
              lastAnnouncedTime.current.set(order.id, now);
            }
          });

          // Bersihkan cache pesanan yang sudah selesai
          const currentReadyIds = new Set(newReadyOrders.map((o) => o.id));
          lastAnnouncedTime.current.forEach((_, id) => {
            if (!currentReadyIds.has(id)) {
              lastAnnouncedTime.current.delete(id);
            }
          });

          setPreparingOrders(activeOrders.filter((o) => o.status === 'preparing'));
          setReadyOrders(newReadyOrders);
        }
      } catch (error) {
        console.error('Gagal mengambil data antrean:', error);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);

    return () => clearInterval(interval);
  }, [slug, speakOrder]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-stone-950 font-sans text-stone-100 selection:bg-none">
      {/* KOLOM KIRI: SEDANG DISIAPKAN (PREPARING) */}
      <div className="flex w-[35%] flex-col border-r border-stone-800 bg-stone-900/50 p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4 border-b border-stone-800 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <ChefHat className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-widest text-amber-400">
              Sedang Disiapkan
            </h2>
            <p className="text-sm font-medium text-stone-400">Preparing</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex flex-wrap content-start gap-4">
            <AnimatePresence>
              {preparingOrders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-10 w-full text-center font-medium text-stone-600"
                >
                  Belum ada pesanan yang disiapkan.
                </motion.p>
              ) : (
                preparingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="flex h-24 w-[calc(50%-0.5rem)] flex-col items-center justify-center rounded-2xl border border-stone-700 bg-stone-800 shadow-sm"
                  >
                    <span className="font-mono text-3xl font-black text-white">
                      {order.order_code}
                    </span>
                    {order.customerName && (
                      <span className="mt-1 max-w-full truncate px-3 text-md font-bold uppercase tracking-widest text-stone-400">
                        {order.customerName}
                      </span>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* KOLOM TENGAH: LOGO & INFORMASI (CENTER) */}
      <div className="relative flex w-[30%] flex-col items-center justify-between overflow-hidden bg-stone-950 p-8 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)] opacity-10 blur-[100px]" />

        <div className="flex w-full items-center justify-center pt-10">
          <div className="flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/80 px-4 py-2 text-stone-500">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-xl font-bold tracking-widest">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        <div className="z-10 flex flex-col items-center justify-center">
          <div className="mb-10 flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl border-4 border-stone-800 bg-stone-900 shadow-2xl">
            {mitraLogo ? (
              <img
                src={mitraLogo}
                onError={applyFallbackImage}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-20 w-20 text-stone-500" />
            )}
          </div>
          <h1 className="mb-4 font-display text-4xl font-black text-white">
            {mitraName}
          </h1>
          <p className="max-w-[80%] text-lg font-medium leading-relaxed text-stone-400">
            Perhatikan nomor pesanan Anda pada layar. Silakan ambil pesanan di meja kasir jika nomor Anda sudah berwarna <strong className="text-emerald-400">Hijau</strong>.
          </p>
        </div>

        <div className="w-full pb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
            Powered by Kaloo POS
          </p>
        </div>
      </div>

      {/* KOLOM KANAN: SILAKAN AMBIL (READY) */}
      <div className="relative flex w-[35%] flex-col overflow-hidden border-l border-stone-800 bg-emerald-950/20 p-8 shadow-2xl">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-full bg-gradient-to-b from-emerald-900/10 to-transparent" />

        <div className="relative z-10 mb-8 flex items-center gap-4 border-b border-stone-800/50 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-widest text-emerald-400">
              Silakan Ambil
            </h2>
            <p className="text-sm font-medium text-emerald-600/70">Please Collect</p>
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-hidden">
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {readyOrders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-10 w-full text-center font-medium text-stone-600"
                >
                  Belum ada pesanan yang siap diambil.
                </motion.p>
              ) : (
                readyOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`flex items-center justify-between rounded-2xl border p-6 shadow-lg ${
                      index === 0
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-emerald-500/10'
                        : 'border-emerald-900/30 bg-stone-900/80'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-mono font-black ${
                          index === 0 ? 'text-5xl text-emerald-400' : 'text-4xl text-white'
                        }`}
                      >
                        {order.order_code}
                      </span>
                      {order.customerName && (
                        <span
                          className={`mt-2 text-sm font-bold uppercase tracking-widest ${
                            index === 0 ? 'text-emerald-200' : 'text-stone-400'
                          }`}
                        >
                          {order.customerName}
                        </span>
                      )}
                    </div>

                    {index === 0 && (
                      <div className="animate-pulse rounded-full bg-emerald-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-stone-950">
                        Baru
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}