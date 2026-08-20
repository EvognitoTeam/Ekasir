"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Store, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Daftar menu navigasi
  const navItems = [
    { 
      name: 'Overview', 
      href: '/kalooadm', 
      icon: LayoutDashboard,
      // Aktif hanya jika URL persis di /kalooadm
      isActive: pathname === '/kalooadm' 
    },
    { 
      name: 'Manajemen Mitra', 
      href: '/kalooadm/mitra', 
      icon: Store,
      // Aktif jika URL diawali dengan /kalooadm/mitra (termasuk halaman detail)
      isActive: pathname.startsWith('/kalooadm/mitra') 
    },
    { 
      name: 'Kelola Blog', 
      href: '/kalooadm/blog', 
      icon: FileText,
      isActive: pathname.startsWith('/kalooadm/blog')
    },
  ];

  const handleLogout = async () => {
    if (!confirm('Yakin ingin keluar dari sesi Superadmin?')) return;
    setIsLoggingOut(true);
    
    try {
      // Panggil API logout (akan kita buat di bawah)
      await fetch('/api/auth/superadmin/logout', { method: 'POST' });
      router.push('/kalooadm/login');
      router.refresh();
    } catch (error) {
      alert('Gagal logout');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-stone-50 font-sans overflow-hidden">
      
      {/* ================= SIDEBAR (DESKTOP & MOBILE) ================= */}
      {/* Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static top-0 left-0 h-full w-64 bg-stone-950 text-stone-300 z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo / Branding */}
        <div className="h-16 flex items-center px-6 bg-stone-950 border-b border-stone-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white tracking-tight text-sm">EVOGNITO CMS</h1>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Superadmin</p>
            </div>
          </div>
        </div>

        {/* Menu Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-2">Menu Utama</p>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${item.isActive 
                    ? 'bg-emerald-600/10 text-emerald-500' 
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${item.isActive ? 'text-emerald-500' : 'text-stone-500 group-hover:text-stone-300'}`} />
                  {item.name}
                </div>
                {item.isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-stone-800/50 shrink-0">
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? 'Keluar...' : 'Logout Sistem'}
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            {/* Tombol Hamburger Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Indikator URL Aktif */}
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Direktori Saat Ini</p>
              <p className="text-sm font-semibold text-stone-800 font-mono mt-0.5">{pathname}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-stone-900">Administrator</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Akses Penuh</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 overflow-hidden">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* CHILDREN RENDER (Halaman-halaman akan dirender di sini) */}
        <main className="flex-1 overflow-y-auto bg-stone-50/50">
          {children}
        </main>
      </div>

    </div>
  );
}