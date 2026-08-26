"use client";

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Receipt, AlertCircle } from 'lucide-react';
import CashoutActionButtons from '@/components/kalooadm/CashoutActionButtons';

interface OrderDetail {
  id: number;
  cashout_id: number;
  order_code: string;
  customer_name: string;
  payment_method: string;
  total: string | number;
  platformFee: string | number;
  createdAt: string | Date;
}

interface CashoutItem {
  id: number;
  amount: string | number;
  status: string | null;
  createdAt: string | Date | null;
  cafeName: string | null;
  bankName: string | null;
  bankNumber: string | null;
  bankOwner: string | null;
  orders: OrderDetail[];
}

export default function CashoutTableRow({ item }: { item: CashoutItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 🔴 Pisahkan Kalkulasi QRIS dan Tunai (Cash)
  let totalQrisGross = 0;
  let totalQrisFee = 0;
  
  let totalCashGross = 0;
  let totalCashFee = 0;

  item.orders.forEach(order => {
    const gross = Number(order.total || 0);
    const fee = Number(order.platformFee || 0);
    const method = String(order.payment_method).toLowerCase();

    if (method === 'qris') {
      totalQrisGross += gross;
      totalQrisFee += fee;
    } else {
      totalCashGross += gross;
      totalCashFee += fee;
    }
  });

  // Saldo bersih QRIS sebelum dipotong utang fee cash
  const qrisNet = totalQrisGross - totalQrisFee;
  
  // Total Pencairan Final (Mencocokkan dengan item.amount dari database)
  const finalCalculatedPayout = qrisNet - totalCashFee;

  return (
    <>
      {/* BARIS UTAMA */}
      <tr className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
        <td className="p-4 whitespace-nowrap">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-bold text-[#0E5C37] hover:text-emerald-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            #{item.id}
          </button>
          <p className="text-[11px] text-stone-400 mt-0.5 ml-5">
            {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
          </p>
        </td>
        <td className="p-4 whitespace-nowrap font-bold text-stone-800">
          {item.cafeName || 'Mitra Tidak Ditemukan'}
        </td>
        <td className="p-4 whitespace-nowrap">
          <p className="font-bold text-stone-800">{item.bankName} - {item.bankNumber}</p>
          <p className="text-[11px] font-bold text-stone-500 uppercase">A.N: {item.bankOwner}</p>
        </td>
        <td className="p-4 whitespace-nowrap font-black text-[#0E5C37]">
          Rp {Number(item.amount).toLocaleString('id-ID')}
        </td>
        <td className="p-4 whitespace-nowrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
            ${item.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
            ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : ''}
            ${item.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
          `}>
            {item.status === 'pending' && <Clock className="w-3 h-3" />}
            {item.status === 'approved' && <CheckCircle className="w-3 h-3" />}
            {item.status === 'rejected' && <XCircle className="w-3 h-3" />}
            {item.status}
          </span>
        </td>
        <td className="p-4 whitespace-nowrap text-right">
          <CashoutActionButtons cashoutId={item.id} currentStatus={item.status || 'pending'} />
        </td>
      </tr>

      {/* BARIS DETAIL (EKSPANSI) */}
      {isExpanded && (
        <tr className="bg-stone-50/80 border-b border-stone-200 shadow-inner">
          <td colSpan={6} className="p-4 sm:px-8 sm:py-6">
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-2 text-stone-700 font-bold text-xs uppercase tracking-widest">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Rincian Kalkulasi Dana ({item.orders.length} Pesanan)
                </div>
              </div>
              
              {/* KOTAK RINGKASAN AKUNTANSI UNTUK SUPERADMIN */}
              <div className="bg-stone-800 text-white p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm relative">
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-600/20 to-transparent pointer-events-none" />
                
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Masuk QRIS</p>
                  <p className="font-bold text-emerald-400">+ Rp {totalQrisGross.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Fee Transaksi QRIS</p>
                  <p className="font-bold text-red-400">- Rp {totalQrisFee.toLocaleString('id-ID')}</p>
                </div>
                <div className="border-l border-stone-700 pl-4">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" /> Hutang Fee Tunai
                  </p>
                  <p className="font-bold text-amber-400">- Rp {totalCashFee.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-stone-500 mt-0.5 leading-tight">Dipotong dari saldo QRIS karena uang cash dipegang mitra.</p>
                </div>
                <div className="border-l border-stone-700 pl-4">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Net Cair ke Mitra</p>
                  <p className="font-black text-xl text-white">Rp {finalCalculatedPayout.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {item.orders.length === 0 ? (
                <div className="p-4 text-xs text-stone-400 text-center italic">Tidak ada detail pesanan ditemukan.</div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase text-stone-400 border-b border-stone-100 bg-white sticky top-0 z-10 shadow-sm">
                        <th className="px-4 py-3 font-bold">Waktu</th>
                        <th className="px-4 py-3 font-bold">Kode Pesanan</th>
                        <th className="px-4 py-3 font-bold">Metode</th>
                        <th className="px-4 py-3 font-bold text-right">Gross Transaksi</th>
                        <th className="px-4 py-3 font-bold text-right">Fee Platform</th>
                        <th className="px-4 py-3 font-bold text-right text-stone-800">Pengaruh ke Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {item.orders.map((order) => {
                        const gross = Number(order.total || 0);
                        const fee = Number(order.platformFee || 0);
                        const isQris = String(order.payment_method).toLowerCase() === 'qris';
                        
                        // Logika Pengaruh Saldo
                        // QRIS: Menambah saldo (Gross - Fee)
                        // Cash: Mengurangi saldo (-Fee)
                        const balanceImpact = isQris ? (gross - fee) : (-fee);

                        return (
                          <tr key={order.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50">
                            <td className="px-4 py-3 text-stone-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-stone-700">
                              {order.order_code}
                              <span className="block text-[10px] font-normal text-stone-400">{order.customer_name || 'Tamu'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] ${
                                isQris ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {order.payment_method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-stone-600">
                              {isQris ? (
                                `Rp ${gross.toLocaleString('id-ID')}`
                              ) : (
                                <span className="text-stone-400 line-through text-[10px]" title="Uang sudah di laci mitra">Rp {gross.toLocaleString('id-ID')}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-red-500 font-medium">
                              -Rp {fee.toLocaleString('id-ID')}
                            </td>
                            <td className={`px-4 py-3 text-right font-black ${balanceImpact >= 0 ? 'text-[#0E5C37]' : 'text-amber-600'}`}>
                              {balanceImpact >= 0 ? '+' : '-'} Rp {Math.abs(balanceImpact).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}