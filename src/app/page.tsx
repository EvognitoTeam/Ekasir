import Link from 'next/link';
import { ArrowRight, Store, QrCode, TrendingUp } from 'lucide-react';

export default function EvokasirLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)] overflow-hidden relative">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-primary)] opacity-10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-[var(--color-tertiary)] opacity-10 rounded-full blur-[100px]"></div>

      {/* Navbar Minimalis */}
      <nav className="w-full p-6 flex justify-between items-center relative z-10 max-w-7xl mx-auto">
        <div className="text-2xl font-headline font-bold text-[var(--color-primary)] tracking-tight">
          Evokasir.
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2 rounded-full font-label text-sm hover:bg-[var(--color-surface-container)] transition-colors">
            Masuk
          </Link>
          <Link href="/register" className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white font-label text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
            Daftar Mitra
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-primary)] text-xs font-bold font-label uppercase tracking-wider mb-4 border border-[var(--color-outline-variant)]/30">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
          Sistem POS Generasi Baru
        </div>
        
        <h1 className="text-5xl md:text-7xl font-headline font-bold leading-tight text-[var(--color-on-surface)]">
          Modernisasi Kedai Kopi Anda dalam <span className="text-[var(--color-primary)] italic">Hitungan Menit.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--color-on-surface-variant)] max-w-2xl font-body leading-relaxed">
          Sistem kasir cerdas, manajemen meja real-time, dan menu QR interaktif yang dirancang khusus untuk memanjakan pelanggan dan mempermudah operasional F&B Anda.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full sm:w-auto">
          {/* Tombol Demo (Akan mengarah ke URL dinamis mitra "demo") */}
          <Link href="/demo" className="px-8 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-label font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform ambient-shadow">
            Lihat Demo Menu
            <ArrowRight size={18} />
          </Link>
          
          <button className="px-8 py-4 rounded-2xl glass ghost-border font-label font-bold text-[var(--color-on-surface)] flex items-center justify-center hover:bg-[var(--color-surface-container)] transition-colors">
            Pelajari Fitur
          </button>
        </div>
      </main>

      {/* Feature Highlight */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <QrCode size={24} />, title: "Menu Digital Interaktif", desc: "Pelanggan memindai QR, melihat menu elegan, dan memesan langsung dari meja." },
          { icon: <Store size={24} />, title: "Manajemen Multi-Tenant", desc: "Satu platform untuk mengelola banyak cabang kedai kopi dengan pelaporan terpusat." },
          { icon: <TrendingUp size={24} />, title: "Loyalti & Promosi", desc: "Sistem poin otomatis dan manajemen kupon untuk menjaga pelanggan tetap kembali." }
        ].map((feat, idx) => (
          <div key={idx} className="p-8 rounded-3xl glass ghost-border flex flex-col gap-4 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-primary)] flex items-center justify-center">
              {feat.icon}
            </div>
            <h3 className="text-xl font-headline font-bold">{feat.title}</h3>
            <p className="text-[var(--color-on-surface-variant)] leading-relaxed text-sm">
              {feat.desc}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}