"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
// 🔴 1. Import semua ikon agar fungsi ikon dinamis (dari database) bisa dirender
import * as Icons from 'lucide-react';

interface Facility {
  name: string;
  description: string;
  icon?: string; 
}

// 🔴 2. Sesuaikan interface dengan format JSON dari form admin lu sebelumnya
interface FAQ {
  question: string;
  answer: string;
}

interface MitraSettings {
  wifiSSID?: string;
  wifiPassword?: string;
  facility?: Facility[];
  faqs?: FAQ[]; 
}

export default function SupportView() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<MitraSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetching Data Dinamis
  useEffect(() => {
    const fetchSettings = async () => {
      if (!slug) return;
      try {
        const res = await fetch(`/api/settings?slug=${slug}`);
        const data = await res.json();
        
        if (data.success) {
          // 🔴 3. Parsing aman: pastikan tidak melakukan JSON.parse pada array atau null
          let parsedFacilities: Facility[] = [];
          if (Array.isArray(data.data.facility)) {
             parsedFacilities = data.data.facility; // Drizzle biasanya mereturn array langsung kalau tipenya JSON
          } else if (typeof data.data.facility === 'string') {
             try { parsedFacilities = JSON.parse(data.data.facility); } catch(e) {}
          }
          // console.log(data.data.facility);
          
          let parsedFaqs: FAQ[] = [];
          if (Array.isArray(data.data.faq)) {
            parsedFaqs = data.data.faq;
          } else if (typeof data.data.faq === 'string') {
            try { parsedFaqs = JSON.parse(data.data.faq); } catch(e) {}
          }
          // console.log(data.data.faq);

          setSettings({
            wifiSSID: data.data.wifiSSID,
            wifiPassword: data.data.wifiPassword,
            facility: parsedFacilities,
            faqs: parsedFaqs 
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
  
  const handleWifi = () => {
    if (settings?.wifiSSID && settings?.wifiPassword) {
      showToast(`WiFi: ${settings.wifiSSID} | Pass: ${settings.wifiPassword}`);
    } else {
      showToast('Informasi WiFi tidak tersedia saat ini.');
    }
  };

  // 🔴 4. Komponen Helper untuk merender ikon Lucide secara dinamis dari string
  const DynamicIcon = ({ iconName, className }: { iconName?: string, className?: string }) => {
    // Pastikan Icon Component valid dan namanya CapitalCase
    const IconComponent = iconName ? Icons[iconName as keyof typeof Icons] : null;
    
    // Fallback icon jika kosong atau salah ketik
    if (!IconComponent) {
      return <Icons.CheckCircle2 className={className || "w-5 h-5 text-emerald-300"} />;
    }
    
    return <IconComponent className={className || "w-5 h-5 text-emerald-300"} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Icons.Loader2 className="w-10 h-10 text-[#0E5C37] animate-spin mb-4" />
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">
            Memuat Layanan...
        </p>
      </div>
    );
  }

  const hasWifiInfo = !!(settings?.wifiSSID && settings?.wifiPassword);
  const hasFacilities = !!(settings?.facility && settings.facility.length > 0);
  const hasFaqs = !!(settings?.faqs && settings.faqs.length > 0);

  return (
    <div className="py-8 px-6 bg-[#F7F8FA] min-h-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold whitespace-nowrap"
          >
            <motion.span animate={{ rotate: [0, -15, 15, -10, 10, 0] }} transition={{ duration: 0.6 }} className="text-xl">
              👋
            </motion.span>
            <span>{toastMessage}</span>
            <Icons.CheckCircle2 className="w-5 h-5 ml-2 text-[#0E5C37]" />
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

      {/* Akses WiFi Card */}
      {hasWifiInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
           <motion.div 
             whileHover={{ y: -4 }}
             className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center text-center transition-all"
           >
             <div className="w-14 h-14 bg-emerald-50 text-[#0E5C37] rounded-full flex items-center justify-center mb-6">
                <Icons.Wifi className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-bold text-stone-900 mb-2">Akses WiFi</h3>
             <p className="text-xs text-stone-500 mb-6 leading-relaxed">Tetap terhubung dengan internet.</p>
             <button
               onClick={handleWifi}
               className="w-full py-3 bg-stone-50 text-stone-700 border border-stone-100 rounded-xl text-xs font-bold uppercase hover:bg-[#0E5C37] hover:text-white transition-all active:scale-95 shadow-sm"
             >
               Lihat Sandi
             </button>
           </motion.div>
        </div>
      )}

      {/* Fasilitas Grid */}
      {hasFacilities && (
        <section className="mb-16">
           <div className="bg-[#0E5C37] text-white p-8 rounded-[2rem] relative overflow-hidden shadow-xl shadow-emerald-900/10">
              <div className="absolute -bottom-10 -right-10 opacity-10">
                <Icons.Building2 className="w-48 h-48" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight mb-8 relative z-10">Fasilitas <br/> Restoran</h2>
              
              <div className="grid grid-cols-2 gap-6 relative z-10">
                 {settings.facility!.map((fac, index) => (
                   <div key={index} className="flex flex-col gap-2">
                     {/* 🔴 5. Render icon dinamis dari DB */}
                     <DynamicIcon iconName={fac.icon} />
                     <p className="font-bold text-sm">{fac.name}</p>
                     <p className="text-[10px] text-emerald-100/70">{fac.description}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      )}

      {/* FAQ List */}
      {hasFaqs && (
        <section>
           <div className="mb-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-2">Informasi Umum</h3>
              <h2 className="text-2xl font-black uppercase text-stone-900 leading-tight">Pertanyaan<br/>Sering Diajukan</h2>
           </div>
           
           <div className="space-y-4">
             {settings.faqs!.map((faq, index) => (
               <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                 <div className="flex items-center gap-3 mb-3">
                   <Icons.HelpCircle className="w-4 h-4 text-[#0E5C37]" />
                   <h4 className="text-sm font-bold text-stone-900 uppercase">{faq.question}</h4>
                 </div>
                 <p className="text-xs text-stone-500 leading-relaxed">{faq.answer}</p>
               </div>
             ))}
           </div>
        </section>
      )}

      {/* Fallback Jika Kosong Semua */}
      {!hasWifiInfo && !hasFacilities && !hasFaqs && (
        <div className="flex flex-col items-center justify-center text-center opacity-40 py-20">
          <Icons.ShieldAlert className="w-12 h-12 text-stone-300 mb-4" />
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
            Informasi layanan belum dikonfigurasi.
          </p>
        </div>
      )}

    </div>
  );
}