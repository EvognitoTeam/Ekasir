import { db } from '@/db';
import { mitra, branches, cashouts } from '@/db/schema'; // 🔴 posts diganti dengan cashouts
import { isNull, count } from 'drizzle-orm'; // eq, and dihapus karena tidak dipakai
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { 
  Store, 
  Building2, 
  Wallet,      // 🔴 Ikon baru untuk metrik Cashout
  Banknote,    // 🔴 Ikon baru untuk pintasan Cashout
  ArrowRight,
  ShieldAlert,
  Activity
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Sesuaikan dengan kunci rahasia aplikasi Anda
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export default async function SuperadminOverviewPage() {
  // ========================================================
  // 1. PROTEKSI HALAMAN (Auth & Role Check)
  // ========================================================
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;

  if (!token) {
    redirect('/kalooadm/login');
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = String(payload.role ?? '').trim().toLowerCase();

    if (role !== 'superadmin') {
      redirect('/kalooadm/login');
    }
  } catch (error) {
    redirect('/kalooadm/login');
  }

  // ========================================================
  // 2. Fetch Statistik dari Database secara paralel
  // ========================================================
  const [
    [mitraResult],
    [branchesResult],
    [cashoutsResult] // 🔴 Mengambil jumlah transaksi cashout
  ] = await Promise.all([
    db.select({ value: count() }).from(mitra).where(isNull(mitra.deletedAt)),
    db.select({ value: count() }).from(branches).where(isNull(branches.deletedAt)),
    db.select({ value: count() }).from(cashouts), 
  ]);

  const totalMitra = mitraResult?.value || 0;
  const totalBranches = branchesResult?.value || 0;
  const totalCashouts = cashoutsResult?.value || 0;

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* ================= HEADER OVERVIEW ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-sm text-stone-500 font-medium mt-1">
            Pantau pertumbuhan ekosistem Evognito POS secara real-time.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 text-xs font-bold tracking-widest uppercase shadow-sm">
          <Activity className="w-4 h-4 animate-pulse" />
          Sistem Online & Stabil
        </div>
      </div>

      {/* ================= METRIK STATISTIK ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Mitra */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-colors">
          <div className="absolute -right-6 -top-6 text-stone-50 group-hover:text-emerald-50 transition-colors">
            <Store className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Store className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Mitra Aktif</p>
            <h3 className="text-4xl font-black text-stone-800">{totalMitra}</h3>
          </div>
        </div>

        {/* Card 2: Total Cabang */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-colors">
          <div className="absolute -right-6 -top-6 text-stone-50 group-hover:text-blue-50 transition-colors">
            <Building2 className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Cabang Beroperasi</p>
            <h3 className="text-4xl font-black text-stone-800">{totalBranches}</h3>
          </div>
        </div>

        {/* Card 3: Total Cashout (Menggantikan Blog) */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-colors">
          <div className="absolute -right-6 -top-6 text-stone-50 group-hover:text-amber-50 transition-colors">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Riwayat Pencairan</p>
            <h3 className="text-4xl font-black text-stone-800">{totalCashouts}</h3>
          </div>
        </div>

      </div>

      {/* ================= PINTASAN CEPAT (QUICK ACTIONS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* Quick Action: Kelola Mitra */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-stone-800 mb-2">Manajemen Pusat</h3>
            <p className="text-sm text-stone-500 mb-4 leading-relaxed">
              Atur hak akses penyewa, pantau performa cabang, dan sesuaikan potongan platform fee dari satu tempat.
            </p>
            <Link 
              href="/kalooadm/mitra"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Kelola Mitra <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Action: Kelola Cashout (Menggantikan Blog) */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <Banknote className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-stone-800 mb-2">Manajemen Cashout</h3>
            <p className="text-sm text-stone-500 mb-4 leading-relaxed">
              Tinjau dan proses permintaan pencairan dana (QRIS) dari mitra, validasi nominal, serta pantau riwayat transfer.
            </p>
            <Link 
              href="/kalooadm/cashout"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
            >
              Kelola Pencairan Dana <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}