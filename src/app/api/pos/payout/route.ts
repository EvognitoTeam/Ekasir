import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, mitra, cashouts } from '@/db/schema';
import { eq, and, isNull, inArray, desc } from 'drizzle-orm';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ success: false, message: 'Slug Toko diperlukan' }, { status: 400 });

  try {
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const mitraId = foundMitra[0].id;
    
    // 1. Ambil persentase potongan (Fee Platform)
    const platformFeeRate = Number(foundMitra[0].cashout || 0) / 100;

    // 2. Ambil SEMUA riwayat sukses untuk tab "Riwayat Penjualan"
    const allOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.mitra_id, mitraId),
        eq(orders.status, 'completed'),
        eq(orders.payment_status, '2'),
        isNull(orders.deletedAt)
      ));

    const allHistoryData: Record<string, Record<string, any>> = {};
    

    allOrders.forEach((order) => {
      if (!order.createdAt) return;
      // 🔴 UBAH MENJADI HURUF KECIL SEMUA
      const payMethod = (order.payment_method || '').toLowerCase();

      const orderDate = new Date(order.createdAt);
      const year = orderDate.getFullYear().toString();
      const month = orderDate.getMonth().toString();

      const grandTotal = Number(order.totalAfterDiscount || 0); 
      const tax = Number(order.tax || 0);
      const service = Number(order.service || 0);

      if (!allHistoryData[year]) allHistoryData[year] = {};
      if (!allHistoryData[year][month]) {
          allHistoryData[year][month] = {
            monthIndex: Number(month),
            monthName: MONTH_NAMES[Number(month)],
            gross: 0, net: 0, cash: 0, qris: 0, tax: 0, service: 0, platformFee: 0, totalOrders: 0
          };
      }

      const bucket = allHistoryData[year][month];
      bucket.totalOrders += 1;
      
      // Kumpulkan seluruh Gross terlebih dahulu
      bucket.gross += grandTotal;
      bucket.tax += tax;
      bucket.service += service;

      // 🔴 PENGECEKAN AMAN DARI HURUF BESAR/KECIL
      if (payMethod === "cash" || payMethod === "tunai") bucket.cash += grandTotal; 
      else if (payMethod === "qris") bucket.qris += grandTotal; 
    });

    // 3. Hitung Fee Platform SEKALIGUS dari total bulanan (allHistory)
    Object.keys(allHistoryData).forEach(year => {
      Object.keys(allHistoryData[year]).forEach(month => {
        const bucket = allHistoryData[year][month];
        bucket.platformFee = Math.floor(bucket.gross * platformFeeRate);
        bucket.net = bucket.gross - bucket.platformFee;
      });
    });

    // 4. Ambil Riwayat Penarikan (History Cashout)
    const withdrawalHistory = await db.select()
        .from(cashouts)
        .where(eq(cashouts.mitra_id, mitraId))
        .orderBy(desc(cashouts.createdAt));

    // 5. Ambil Order Unpaid (Belum Dicairkan)
    const pendingOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.mitra_id, mitraId),
        eq(orders.status, 'completed'),
        eq(orders.payment_status, '2'),
        eq(orders.is_cashouted, false),
        isNull(orders.deletedAt)
      ));
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 
    const currentDay = now.getDate();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Variabel penampung total kotor per tipe
    let totalCashGross = 0;
    let totalTax = 0;
    let totalService = 0;

    let eligibleCashGross = 0;
    let lockedCashGross = 0;
    let eligibleQrisGross = 0;
    let lockedQrisGross = 0;

    const historyData: Record<string, Record<string, any>> = {};

    pendingOrders.forEach((order) => {
      if (!order.createdAt) return;
      const orderDate = new Date(order.createdAt);
      const oYear = orderDate.getFullYear();
      const oMonth = orderDate.getMonth();
      const oDay = orderDate.getDate();

      const isCurrentOrLastMonth = 
        (oYear === currentYear && oMonth === currentMonth) || 
        (oYear === lastMonthYear && oMonth === lastMonth);

      if (!isCurrentOrLastMonth) return;

      const grandTotal = Number(order.totalAfterDiscount || 0);
      const service = Number(order.service || 0);
      const tax = Number(order.tax || 0);

      const yearStr = oYear.toString();
      const monthStr = oMonth.toString();

      if (!historyData[yearStr]) historyData[yearStr] = {};
      if (!historyData[yearStr][monthStr]) {
        historyData[yearStr][monthStr] = { 
          monthName: MONTH_NAMES[oMonth], net: 0, gross: 0, cash: 0, qris: 0, service: 0, tax: 0,
          cashGross: 0, qrisGross: 0 // Penampung sementara per bulan
        };
      }

      const bucket = historyData[yearStr][monthStr];
      bucket.gross += grandTotal;
      bucket.service += service; 
      bucket.tax += tax;

      totalTax += tax;
      totalService += service;

      const isEligible = 
        oYear < currentYear || 
        (oYear === currentYear && oMonth < currentMonth) || 
        (oYear === currentYear && oMonth === currentMonth && oDay <= 20);

      // 🔴 UBAH MENJADI HURUF KECIL SEMUA
      const payMethod = (order.payment_method || '').toLowerCase();

      // 🔴 Kumpulkan seluruh Gross yang belum dicairkan ke masing-masing kategori
      if (payMethod === 'cash' || payMethod === 'tunai') {
        bucket.cashGross += grandTotal;
        totalCashGross += grandTotal;
        
        if (isEligible) eligibleCashGross += grandTotal;
        else lockedCashGross += grandTotal;
      } else if (payMethod === 'qris') {
        bucket.qrisGross += grandTotal;

        if (isEligible) eligibleQrisGross += grandTotal;
        else lockedQrisGross += grandTotal;
      }
    });

    // 6. KALKULASI FEE PLATFORM SECARA AGREGAT (DIHITUNG SEMUA DULU)
    const eligibleCashFee = Math.floor(eligibleCashGross * platformFeeRate);
    const lockedCashFee = Math.floor(lockedCashGross * platformFeeRate);
    
    const eligibleQrisFee = Math.floor(eligibleQrisGross * platformFeeRate);
    const lockedQrisFee = Math.floor(lockedQrisGross * platformFeeRate);

    // Saldo QRIS Bersih
    const eligibleQrisNet = eligibleQrisGross - eligibleQrisFee;
    const lockedQrisNet = lockedQrisGross - lockedQrisFee;

    // Saldo Akhir yang bisa dicairkan (Net QRIS - Minus Fee Cash)
    const totalEligibleQris = eligibleQrisNet - eligibleCashFee;
    const totalLockedQris = lockedQrisNet - lockedCashFee;

    // Data presentasi untuk frontend
    const totalCash = totalCashGross;
    const totalCashService = eligibleCashFee + lockedCashFee; 
    const totalQrisService = eligibleQrisFee + lockedQrisFee;

    // 7. Hitung Fee Platform per bulan untuk historyData
    Object.keys(historyData).forEach(year => {
      Object.keys(historyData[year]).forEach(month => {
        const bucket = historyData[year][month];
        
        const cashFeeBulanan = Math.floor(bucket.cashGross * platformFeeRate);
        const qrisFeeBulanan = Math.floor(bucket.qrisGross * platformFeeRate);
        const totalFeeBulanan = cashFeeBulanan + qrisFeeBulanan;

        bucket.cash = bucket.cashGross;
        // Saldo QRIS frontend dikurangi fee QRIS dan fee Cash
        bucket.qris = (bucket.qrisGross - qrisFeeBulanan) - cashFeeBulanan; 
        bucket.net = bucket.gross - totalFeeBulanan;

        // Bersihkan data sementara
        delete bucket.cashGross;
        delete bucket.qrisGross;
      });
    });

    // --- Sisa Validasi Withdrawal ---
    let canWithdraw = false;
    let withdrawalMessage = '';

    if (totalEligibleQris > 0) {
      if (totalEligibleQris >= 500000) {
        canWithdraw = true;
        withdrawalMessage = 'Dana QRIS tersedia dan siap dicairkan.';
      } else if (currentDay >= 20) {
        canWithdraw = true;
        withdrawalMessage = 'Periode pencairan dibuka (>= Tgl 20).';
      } else {
        const shortage = 500000 - totalEligibleQris;
        withdrawalMessage = `Minimal penarikan Rp 500.000 (Kurang Rp ${shortage.toLocaleString('id-ID')}). Atau tunggu setelah tanggal 20.`;
      }
    } else if (totalEligibleQris < 0) {
      withdrawalMessage = `Terdapat minus fee sebesar Rp ${Math.abs(totalEligibleQris).toLocaleString('id-ID')} dari transaksi tunai.`;
    } else {
      withdrawalMessage = 'Belum ada dana QRIS yang dapat dicairkan.';
    }

    const historyArray = Object.keys(historyData).sort((a, b) => Number(b) - Number(a)).map(year => ({
        year,
        months: Object.keys(historyData[year]).sort((a, b) => Number(b) - Number(a)).map(month => ({ monthIndex: month, ...historyData[year][month] }))
    }));

    const allHistoryArray = Object.keys(allHistoryData)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
        year,
        months: Object.values(allHistoryData[year])
        .sort((a: any, b: any) => b.monthIndex - a.monthIndex),
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        totalEligibleQris, totalLockedQris, totalCash, totalTax, totalService,
        totalCashService, totalQrisService, canWithdraw, withdrawalMessage,
        withdrawals: withdrawalHistory, 
        history: historyArray,
        allHistory: allHistoryArray
      } 
    });
  } catch (error) {
    console.error("GET Payout Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) return NextResponse.json({ success: false, message: 'Slug Toko diperlukan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const mitraId = foundMitra[0].id;
    const platformFeeRate = Number(foundMitra[0].cashout || 0) / 100;

    const pendingOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.mitra_id, mitraId),
        eq(orders.status, 'completed'),
        eq(orders.payment_status, '2'),
        eq(orders.is_cashouted, false),
        isNull(orders.deletedAt)
      ));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 
    const currentDay = now.getDate();

    let eligibleCashGross = 0;
    let eligibleQrisGross = 0;
    const eligibleOrderIds: number[] = []; 

    // 1. Kumpulkan seluruh nominal (Gross) terlebih dahulu
    pendingOrders.forEach(order => {
      if (!order.createdAt) return;
      const orderDate = new Date(order.createdAt);
      const oYear = orderDate.getFullYear();
      const oMonth = orderDate.getMonth();
      const oDay = orderDate.getDate();

      const grandTotal = Number(order.totalAfterDiscount || 0);

      const isEligible = 
          oYear < currentYear || 
          (oYear === currentYear && oMonth < currentMonth) || 
          (oYear === currentYear && oMonth === currentMonth && oDay <= 20);

      if (isEligible) {
        eligibleOrderIds.push(order.id);

        // 🔴 UBAH MENJADI HURUF KECIL SEMUA DAN TAMBAH TUNAI
        const payMethod = (order.payment_method || '').toLowerCase();

        if (payMethod === 'cash' || payMethod === 'tunai') {
          eligibleCashGross += grandTotal;
        } else if (payMethod === 'qris') {
          eligibleQrisGross += grandTotal;
        }
      }
    });

    // 2. Hitung Platform Fee SEKALIGUS dari total keseluruhan
    const eligibleCashFee = Math.floor(eligibleCashGross * platformFeeRate);
    const eligibleQrisFee = Math.floor(eligibleQrisGross * platformFeeRate);
    
    // Net QRIS setelah dipotong fee QRIS
    const eligibleQrisNet = eligibleQrisGross - eligibleQrisFee;

    // Saldo akhir yang dicairkan (Net QRIS - Fee Cash yang tertunggak)
    const totalEligibleQris = eligibleQrisNet - eligibleCashFee;

    if (totalEligibleQris <= 0) {
        return NextResponse.json({ success: false, message: 'Tidak ada dana QRIS yang bisa dicairkan.' }, { status: 400 });
    }

    if (totalEligibleQris < 500000 && currentDay <= 20) {
        return NextResponse.json({ success: false, message: 'Minimal penarikan Rp 500.000 atau tunggu setelah tanggal 20.' }, { status: 400 });
    }

    if (eligibleOrderIds.length === 0) {
        return NextResponse.json({ success: false, message: 'Tidak ada transaksi valid.' }, { status: 400 });
    }

    await db.insert(cashouts).values({
        mitra_id: mitraId,
        amount: totalEligibleQris.toString(), 
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await db.update(orders)
        .set({ is_cashouted: true, updatedAt: new Date() })
        .where(inArray(orders.id, eligibleOrderIds));

    return NextResponse.json({ 
        success: true, 
        message: 'Permintaan penarikan dana berhasil dikirim.',
        amount: totalEligibleQris 
    });

  } catch (error) {
    console.error("Cashout Request Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}