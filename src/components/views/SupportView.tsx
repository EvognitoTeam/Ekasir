"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  MessageCircle, CreditCard, Wifi, MapPin, CheckCircle2, 
  Clock, Phone, Wind, ShieldAlert, Loader2 
} from 'lucide-react';

interface Facility {
  name: string;
  description: string;
  icon?: string; 
}

interface MitraSettings {
  wifiSSID?: string;
  wifiPassword?: string;
  facilities?: Facility[];
}

export default function SupportView() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<MitraSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetching Data Dinamis
  useEffect(() => {
    const fetchSettings = async () => {
      if (!slug) return;
      try {
        const res = await fetch(`/api/settings?slug=${slug}`);
        const data = await res.json();
        console.log(data);
        
        if (data.success) {
          // Asumsi struktur respons: { success: true, data: { wifiSSID: '...', wifiPassword: '...', facilities: '[...]' } }
          const parsedFacilities = data.data.facilities 
            ? (typeof data.data.facilities === 'string' ? JSON.parse(data.data.facilities) : data.data.facilities) 
            : [];

          setSettings({
            wifiSSID: data.data.wifiSSID,
            wifiPassword: data.data.wifiPassword,
            facilities: parsedFacilities
          });
        }
      } catch (error) {
        console.error("Gagal memuat pengaturan toko:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [slug]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePulseWaiter = () => showToast('Waiter Notified! Tim kami segera menuju meja Anda.');
  
  // 2. Action Dinamis untuk WiFi
  const handleWifi = () => {
    if (settings?.wifiSSID && settings?.wifiPassword) {
      showToast(`WiFi: ${settings.wifiSSID} | Pass: ${settings.wifiPassword}`);
    } else {
      showToast('Informasi WiFi tidak tersedia saat ini.');
    }
  };

  const faqs = [
    { 
      q: "Jam Operasional", 
      a: "Buka setiap hari mulai pukul 08:00 hingga 23:00 WIB. Last order untuk makanan utama pukul 22:00 WIB." 
    },
    { 
      q: "Metode Pembayaran", 
      a: "Kami menerima pembayaran via QRIS dan Cash. Pembayaran dilakukan di kasir (Kecuali QRIS)." 
    },
    { 
      q: "Reservasi & Event", 
      a: "Untuk pemesanan grup di atas 10 orang atau penyewaan VIP Room / Private Event, silakan hubungi manajemen kami." 
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-10 h-10 text-[#0E5C37] animate-spin mb-4" />
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">
            Memuat Layanan...
        </p>
      </div>
    );
  }

  // 3. Helper untuk memetakan nama icon dari database ke komponen icon Lucide
  const getIconComponent = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'map': case 'mappin': return <MapPin className="w-5 h-5 text-emerald-300" />;
      case 'wind': return <Wind className="w-5 h-5 text-emerald-300" />;
      case 'phone': case 'stopkontak': return <Phone className="w-5 h-5 text-emerald-300" />;
      case 'shield': case 'toilet': return <ShieldAlert className="w-5 h-5 text-emerald-300" />;
      case 'wifi': return <Wifi className="w-5 h-5 text-emerald-300" />;
      default: return <CheckCircle2 className="w-5 h-5 text-emerald-300" />; // Fallback icon
    }
  };

  return (
    <div className="py-8 px-6 bg-[#F7F8FA] min-h-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-10 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold whitespace-nowrap"
          >
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
              transition={{ duration: 0.6 }}
              className="text-xl"
            >
              👋
            </motion.span>
            <span>{toastMessage}</span>
            <CheckCircle2 className="w-5 h-5 ml-2 text-[#0E5C37]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="mb-12">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex items-center gap-4 mb-4"
        >
           <div className="w-8 h-[2px] bg-[#0E5C37]" />
           <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-500">Layanan Pelanggan</span>
        </motion.div>
        <h1 className="text-4xl font-black text-stone-900 uppercase tracking-tight leading-none mb-4">
          Bantuan &<br /> Layanan
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed max-w-[280px]">
          Nikmati kemudahan layanan dari meja Anda. Kami siap membantu untuk pengalaman bersantap yang maksimal.
        </p>
      </header>

      {/* The Concierge Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
         {[
          //  { 
          //    title: "Panggil Waiter", 
          //    desc: "Butuh bantuan langsung di meja?",
          //    cta: "Panggil",
          //    icon: MessageCircle,
          //    onClick: handlePulseWaiter,
          //  },
           { 
             title: "Akses WiFi", 
             desc: "Tetap terhubung dengan internet.",
             cta: "Lihat Sandi",
             icon: Wifi,
             onClick: handleWifi,
           }
         ].map((card) => (
           <motion.div 
             key={card.title}
             whileHover={{ y: -4 }}
             className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center text-center transition-all"
           >
             <div className="w-14 h-14 bg-emerald-50 text-[#0E5C37] rounded-full flex items-center justify-center mb-6">
                <card.icon className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-stone-900 mb-2">{card.title}</h3>
             <p className="text-xs text-stone-500 mb-6 leading-relaxed">{card.desc}</p>
             <button
               onClick={card.onClick}
               className="w-full py-3 bg-stone-50 text-stone-700 border border-stone-100 rounded-xl text-xs font-bold uppercase hover:bg-[#0E5C37] hover:text-white transition-all active:scale-95 shadow-sm"
             >
               {card.cta}
             </button>
           </motion.div>
         ))}
      </div>

      {/* 4. Fasilitas Section Dinamis */}
      <section className="mb-16">
         <div className="bg-[#0E5C37] text-white p-8 rounded-[2rem] relative overflow-hidden shadow-xl shadow-emerald-900/10">
            <div className="absolute -bottom-10 -right-10 opacity-10">
              <ShieldAlert className="w-48 h-48" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tight mb-8 relative z-10">Fasilitas <br/> Restoran</h2>
            
            {settings?.facilities && settings.facilities.length > 0 ? (
              <div className="grid grid-cols-2 gap-6 relative z-10">
                 {settings.facilities.map((fac, index) => (
                   <div key={index} className="flex flex-col gap-2">
                     {getIconComponent(fac.icon || fac.name)}
                     <p className="font-bold text-sm">{fac.name}</p>
                     <p className="text-[10px] text-emerald-100/70">{fac.description}</p>
                   </div>
                 ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-100/70 relative z-10">
                Informasi fasilitas belum diperbarui oleh manajemen.
              </p>
            )}
         </div>
      </section>

      {/* Informasi Umum / FAQ Section */}
      <section>
         <div className="mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-2">Informasi Umum</h3>
            <h2 className="text-2xl font-black uppercase text-stone-900 leading-tight">Pertanyaan<br/>Sering Diajukan</h2>
         </div>
         
         <div className="space-y-4">
           {faqs.map((faq) => (
             <div key={faq.q} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
               <div className="flex items-center gap-3 mb-3">
                 <Clock className="w-4 h-4 text-[#0E5C37]" />
                 <h4 className="text-sm font-bold text-stone-900 uppercase">{faq.q}</h4>
               </div>
               <p className="text-xs text-stone-500 leading-relaxed">{faq.a}</p>
             </div>
           ))}
         </div>
      </section>
    </div>
  );
}