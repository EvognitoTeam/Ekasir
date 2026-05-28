import Link from 'next/link';
import {
  ArrowRight,
  Store,
  QrCode,
  TrendingUp,
  Smartphone,
  CreditCard,
  Receipt,
  BellRing,
  ShieldCheck,
  BarChart3,
  Clock3,
  Users,
  MessageCircle,
  Mail,
  MapPin,
  Sparkles,
  Wifi,
  ScanLine,
} from 'lucide-react';
import { FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa6';

export default function EvokasirLandingPage() {
  const features = [
    {
      icon: <QrCode size={24} />,
      title: 'Menu Digital Interaktif',
      desc: 'Pelanggan scan QR dan langsung memesan dari meja tanpa perlu memanggil waiter.',
    },
    // {
    //   icon: <Store size={24} />,
    //   title: 'Multi Outlet & Multi Tenant',
    //   desc: 'Kelola banyak cabang, meja, dan transaksi dari satu dashboard terpusat.',
    // },
    {
      icon: <TrendingUp size={24} />,
      title: 'Laporan Penjualan Real-Time',
      desc: 'Pantau omzet, transaksi, dan performa bisnis secara live kapan saja.',
    },
    {
      icon: <Receipt size={24} />,
      title: 'POS Modern',
      desc: 'Kasir cepat dengan dukungan diskon, pajak, split bill, dan kitchen order.',
    },
    {
      icon: <BellRing size={24} />,
      title: 'Notifikasi Pesanan',
      desc: 'Pesanan baru langsung masuk ke dapur dan kasir secara real-time.',
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Keamanan Multi-Tenant',
      desc: 'Data setiap mitra terisolasi dan aman dengan sistem autentikasi modern.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Analitik Bisnis',
      desc: 'Lihat menu terlaris, jam ramai, hingga performa operasional bisnis.',
    },
    {
      icon: <Users size={24} />,
      title: 'Manajemen Pelanggan',
      desc: 'Simpan data pelanggan, loyalty point, dan histori transaksi otomatis.',
    },
    {
      icon: <Wifi size={24} />,
      title: 'WiFi & Informasi Outlet',
      desc: 'Tampilkan password WiFi, fasilitas, dan FAQ langsung di menu digital.',
    },
  ];

  const payments = [
    'QRIS',
    'GoPay',
    'OVO',
    'DANA',
    'ShopeePay',
    'Cash',
  ];

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)] overflow-hidden relative">
      {/* BACKGROUND */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-primary)] opacity-10 rounded-full blur-[120px]" />

      <div className="absolute bottom-[-10%] right-[-10%] w-[32rem] h-[32rem] bg-[var(--color-tertiary)] opacity-10 rounded-full blur-[120px]" />

      {/* NAVBAR */}
      <nav className="w-full px-6 py-6 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center ambient-shadow">
              <ScanLine size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
                EKASIR
              </h1>

              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-on-surface-variant)]">
                Smart POS Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-[var(--color-surface-container)] transition-all"
            >
              Masuk
            </Link>

            <Link
              href="/register"
              className="px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all ambient-shadow"
            >
              Daftar Mitra
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <main className="relative z-10 px-4 pt-16 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          
          {/* LEFT */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-high)] text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              POS Digital Generasi Baru
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">
                Sistem Kasir Modern untuk{' '}
                <span className="text-[var(--color-primary)] italic">
                  Cafe, Resto,
                </span>{' '}
                dan Bisnis F&B.
              </h1>

              <p className="text-lg text-[var(--color-on-surface-variant)] leading-relaxed max-w-2xl">
                Kelola transaksi, menu digital QR, laporan penjualan,
                pembayaran cashless, hingga monitoring outlet dalam satu
                platform yang cepat, elegan, dan real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/demo"
                className="px-8 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-3 hover:scale-[1.03] transition-all ambient-shadow"
              >
                Lihat Demo
                <ArrowRight size={18} />
              </Link>

              <a
                href="#fitur"
                className="px-8 py-4 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/40 backdrop-blur-xl font-bold hover:bg-[var(--color-surface-container)] transition-all"
              >
                Pelajari Fitur
              </a>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              {[
                {
                  value: '24/7',
                  label: 'Monitoring',
                },
                {
                  value: 'Real-Time',
                  label: 'Sync Order',
                },
                {
                  value: 'Cloud',
                  label: 'Modern System',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]/40 backdrop-blur-xl"
                >
                  <h3 className="text-2xl font-black text-[var(--color-primary)]">
                    {item.value}
                  </h3>

                  <p className="text-xs mt-1 text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT MOCKUP */}
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--color-primary)] opacity-10 blur-[120px] rounded-full" />

            <div className="relative rounded-[2rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]/40 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black">
                    Dashboard EKASIR
                  </h3>

                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    Monitoring bisnis real-time
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center">
                  <Smartphone size={22} />
                </div>
              </div>

              <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/20">
                    <div className="flex items-center justify-between">
                      <Clock3 size={18} className="text-[var(--color-primary)]" />

                      <span className="text-xs font-bold text-emerald-500">
                        LIVE
                      </span>
                    </div>

                    <h4 className="text-2xl font-black mt-4">
                      128
                    </h4>

                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                      Order Hari Ini
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/20">
                    <div className="flex items-center justify-between">
                      <CreditCard
                        size={18}
                        className="text-[var(--color-primary)]"
                      />

                      <span className="text-xs font-bold text-emerald-500">
                        +12%
                      </span>
                    </div>

                    <h4 className="text-2xl font-black mt-4">
                      Rp 8.2JT
                    </h4>

                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                      Revenue Hari Ini
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/20">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold">
                      Pembayaran Digital
                    </h4>

                    <QrCode
                      size={18}
                      className="text-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {payments.slice(0, 6).map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-[var(--color-surface-container-high)] text-xs font-bold"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FEATURES */}
      <section
        id="fitur"
        className="relative z-10 max-w-7xl mx-auto px-4 py-24"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
            FITUR UNGGULAN
          </p>

          <h2 className="text-4xl md:text-5xl font-black leading-tight">
            Semua yang Dibutuhkan Bisnis F&B Modern
          </h2>

          <p className="mt-5 text-[var(--color-on-surface-variant)] text-lg">
            Dibangun khusus untuk cafe, coffee shop, restoran, dan UMKM
            modern yang membutuhkan sistem cepat, stabil, dan elegan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-8 rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-xl hover:-translate-y-1 hover:border-[var(--color-primary)]/20 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-5">
                {feat.icon}
              </div>

              <h3 className="text-xl font-black mb-3">
                {feat.title}
              </h3>

              <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PAYMENT */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-2xl p-10 overflow-hidden relative">
          
          <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--color-primary)] opacity-10 blur-[100px]" />

          <div className="relative z-10">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
                PEMBAYARAN
              </p>

              <h2 className="text-4xl font-black leading-tight">
                Mendukung Berbagai Metode Pembayaran Modern
              </h2>

              <p className="mt-4 text-[var(--color-on-surface-variant)]">
                Permudah pelanggan dengan sistem pembayaran fleksibel dan
                cashless yang cepat.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-10">
              {payments.map((payment, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3 rounded-2xl bg-white/70 dark:bg-black/10 border border-[var(--color-outline-variant)]/20 font-bold text-sm"
                >
                  {payment}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-24">
        <div className="rounded-[2.5rem] overflow-hidden border border-[var(--color-outline-variant)]/20 bg-[var(--color-primary)] text-white p-10 md:p-14 relative">
          
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-black text-white/70 mb-4">
                CONTACT
              </p>

              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                Siap Mengembangkan Bisnis Anda?
              </h2>

              <p className="mt-5 text-white/80 leading-relaxed">
                Konsultasikan kebutuhan sistem kasir, QR menu, dan digitalisasi bisnis F&B Anda bersama tim EKASIR.
              </p>

              <div className="flex flex-col gap-4 mt-8">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      WhatsApp
                    </p>

                    <p className="text-sm text-white/70">
                      +62 851-7677-3826
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Mail size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Email
                    </p>

                    <p className="text-sm text-white/70">
                      support@ekasir.evognito.my.id
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <FaInstagram size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Instagram
                    </p>

                    <p className="text-sm text-white/70">
                      @ekasir.id
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Location
                    </p>

                    <p className="text-sm text-white/70">
                      Semarang, Indonesia
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <Link
                href="/register"
                className="px-10 py-5 rounded-3xl bg-white text-[var(--color-primary)] font-black text-lg hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
              >
                Mulai Sekarang
                <ArrowRight size={22} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[var(--color-outline-variant)]/20 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div>
            <h3 className="font-black text-xl text-[var(--color-primary)]">
              EKASIR
            </h3>

            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Smart POS & Digital Menu Platform
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-[var(--color-on-surface-variant)]">
            <Link href="/privacy-policy" className="hover:text-[var(--color-primary)] transition-colors">
              Privacy Policy
            </Link>

            <Link href="/term-conditions" className="hover:text-[var(--color-primary)] transition-colors">
              Terms
            </Link>

            {/* <Link href="/contact" className="hover:text-[var(--color-primary)] transition-colors">
              Contact
            </Link> */}
          </div>
        </div>
      </footer>
    </div>
  );
}