import { db } from '@/db';
import { cashouts, mitra, orders } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { Banknote, Clock, CheckCircle } from 'lucide-react';
import CashoutTableRow from '@/components/kalooadm/CashoutTableRow'; // 🔴 Komponen baru untuk baris tabel

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export default async function SuperadminCashoutPage() {
  // 1. PROTEKSI HALAMAN SUPERADMIN
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;

  if (!token) redirect('/kalooadm/login');

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (String(payload.role).trim().toLowerCase() !== 'superadmin') {
      redirect('/kalooadm/login');
    }
  } catch (error) {
    redirect('/kalooadm/login');
  }

  // 2. AMBIL DATA CASHOUT
  const allCashouts = await db
    .select({
      id: cashouts.id,
      amount: cashouts.amount,
      status: cashouts.status,
      createdAt: cashouts.createdAt,
      cafeName: mitra.mitra_name,
      bankName: mitra.bank_name,
      bankNumber: mitra.no_rek,
      bankOwner: mitra.nama_rek,
    })
    .from(cashouts)
    .leftJoin(mitra, eq(cashouts.mitra_id, mitra.id))
    .orderBy(desc(cashouts.createdAt));

  // 3. AMBIL DETAIL PESANAN YANG TERKAIT DENGAN CASHOUT INI
  const cashoutIds = allCashouts.map(c => c.id);
  let relatedOrders: any[] = [];
  
  if (cashoutIds.length > 0) {
    relatedOrders = await db
      .select({
        id: orders.id,
        cashout_id: orders.cashout_id,
        order_code: orders.order_code,
        customer_name: orders.name,
        payment_method: orders.payment_method,
        total: orders.totalAfterDiscount, 
        platformFee: orders.platformFee,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(inArray(orders.cashout_id, cashoutIds))
      .orderBy(desc(orders.createdAt));
  }

  // 4. GABUNGKAN DATA
  const cashoutsWithOrders = allCashouts.map(c => ({
    ...c,
    orders: relatedOrders.filter(o => o.cashout_id === c.id)
  }));

  // Hitung Metrik Ringkasan
  const totalPending = allCashouts.filter(c => c.status === 'pending').length;
  const totalApproved = allCashouts.filter(c => c.status === 'approved').length;
  const amountPending = allCashouts
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight">
          Manajemen Cashout
        </h2>
        <p className="text-sm text-stone-500 font-medium mt-1">
          Tinjau dan proses permintaan penarikan dana QRIS dari para mitra.
        </p>
      </div>

      {/* METRIK STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Menunggu Diproses</p>
          <h3 className="text-3xl font-black text-stone-800">{totalPending} <span className="text-sm font-medium text-stone-400">Permintaan</span></h3>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <Banknote className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Nilai Pending</p>
          <h3 className="text-3xl font-black text-stone-800">Rp {amountPending.toLocaleString('id-ID')}</h3>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Disetujui (All Time)</p>
          <h3 className="text-3xl font-black text-stone-800">{totalApproved} <span className="text-sm font-medium text-stone-400">Transaksi</span></h3>
        </div>
      </div>

      {/* TABEL DATA CASHOUT */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                <th className="p-4 whitespace-nowrap">ID / Tanggal</th>
                <th className="p-4 whitespace-nowrap">Nama Mitra</th>
                <th className="p-4 whitespace-nowrap">Info Rekening Pencairan</th>
                <th className="p-4 whitespace-nowrap">Nominal (Net)</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm text-stone-700">
              {cashoutsWithOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400 italic">
                    Belum ada data pencairan.
                  </td>
                </tr>
              ) : (
                cashoutsWithOrders.map((item) => (
                  <CashoutTableRow key={item.id} item={item} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}