import { db } from '@/db';
import { mitra, branches, posts } from '@/db/schema';
import { isNull, count, eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { 
  Store, 
  Building2, 
  FileText, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Activity
} from 'lucide-react';

export const dynamic = 'force-dynamic'; // Memastikan data selalu segar setiap kali dimuat

export default async function SuperadminOverviewPage() {
  // 1. Fetch Statistik dari Database secara paralel
  const [
    [mitraResult],
    [branchesResult],
    [postsResult]
  ] = await Promise.all([
    db.select({ value: count() }).from(mitra).where(isNull(mitra.deletedAt)),
    db.select({ value: count() }).from(branches).where(isNull(branches.deletedAt)),
    db.select({ value: count() }).from(posts).where(and(isNull(posts.deletedAt), eq(posts.is_published, true))),
  ]);

  const totalMitra = mitraResult?.value || 0;
  const totalBranches = branchesResult?.value || 0;
  const totalPosts = postsResult?.value || 0;

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

        {/* Card 3: Total Artikel Blog */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-colors">
          <div className="absolute -right-6 -top-6 text-stone-50 group-hover:text-amber-50 transition-colors">
            <FileText className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Artikel Publikasi</p>
            <h3 className="text-4xl font-black text-stone-800">{totalPosts}</h3>
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

        {/* Quick Action: Tulis Blog */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-stone-800 mb-2">Pusat Informasi & Blog</h3>
            <p className="text-sm text-stone-500 mb-4 leading-relaxed">
              Terbitkan pembaruan fitur terbaru, edukasi penggunaan sistem kasir, atau artikel pemasaran untuk pengguna publik.
            </p>
            <Link 
              href="/kalooadm/blog"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
            >
              Tulis Artikel Baru <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}