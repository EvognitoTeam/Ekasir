import { db } from '@/db';
import { mitra, settings, branches } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, MapPin, Building2, CreditCard, Percent, Calendar, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MitraDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Fetch Data Utama
  const [tenant] = await db
    .select({
      id: mitra.id,
      mitra_name: mitra.mitra_name,
      mitra_slug: mitra.mitra_slug,
      status: mitra.status,
      createdAt: mitra.createdAt,
      mitraAddress: mitra.mitra_address,
      bankName: mitra.bank_name,
      bankNumber: mitra.no_rek,
      bankOwner: mitra.nama_rek,
      taxRate: settings.taxRate,
      serviceRate: settings.serviceRate,
      cashout: mitra.cashout,
    })
    .from(mitra)
    .leftJoin(settings, eq(mitra.id, settings.mitraId))
    .where(and(eq(mitra.mitra_slug, slug), isNull(mitra.deletedAt)))
    .limit(1);

  if (!tenant) notFound();

  // 2. Fetch Data Cabang
  const tenantBranches = await db
    .select()
    .from(branches)
    .where(and(eq(branches.mitra_id, tenant.id), isNull(branches.deletedAt)));

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50/50 p-8 min-h-screen">
      
      {/* HEADER NAVIGASI */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/kalooadm/mitra"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-stone-800 flex items-center gap-3">
            {tenant.mitra_name}
            {tenant.status === 1 ? (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">Aktif</span>
            ) : (
              <span className="bg-red-100 text-red-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">Nonaktif</span>
            )}
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            URL Platform: <span className="font-mono text-emerald-600 bg-emerald-50 px-1 rounded">kaloopos.com/{tenant.mitra_slug}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2"><Store className="w-4 h-4" /> Identitas Bisnis</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bergabung Pada</p>
                <p className="text-sm font-medium text-stone-800 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Alamat Pusat</p>
                <p className="text-sm font-medium text-stone-800 flex items-start gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  {tenant.mitraAddress || <span className="italic text-stone-400">Belum diatur</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Rekening Pencairan</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Bank</p>
                <p className="text-sm font-bold text-stone-800 mt-0.5">{tenant.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">No. Rekening</p>
                <p className="text-sm font-mono text-stone-800 mt-0.5 bg-stone-50 py-1 px-2 rounded inline-block border border-stone-100">{tenant.bankNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pemilik</p>
                <p className="text-sm font-bold text-stone-800 mt-0.5">{tenant.bankOwner || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2"><Percent className="w-4 h-4" /> Konfigurasi Keuangan & Fee</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 relative overflow-hidden">
                <ShieldAlert className="w-16 h-16 absolute -right-2 -bottom-2 text-red-500/10" />
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1 relative z-10">Platform Fee</p>
                <p className="text-2xl font-black text-red-700 relative z-10">
                  {Number(tenant.cashout) > 100 ? `Rp ${Number(tenant.cashout).toLocaleString('id-ID')}` : `${tenant.cashout || 0}%`}
                </p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Pajak Resto / PPN</p>
                <p className="text-2xl font-black text-stone-800">{tenant.taxRate || 0}%</p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Service Charge</p>
                <p className="text-2xl font-black text-stone-800">{tenant.serviceRate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2"><Building2 className="w-4 h-4" /> Daftar Cabang ({tenantBranches.length})</h3>
            {tenantBranches.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Building2 className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                <p className="text-sm font-bold text-stone-500">Belum ada cabang terdaftar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tenantBranches.map((branch) => (
                  <div key={branch.id} className="p-4 border border-stone-200 rounded-xl flex items-start gap-3 hover:border-emerald-500 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-stone-800 text-sm">{branch.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{branch.address || 'Alamat tidak diatur'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}