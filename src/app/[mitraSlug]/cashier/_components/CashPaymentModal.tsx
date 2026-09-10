'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CheckCircle2, X } from 'lucide-react';

import { formatPrice } from '@/utils/formatters';
import { useCashier, orderTotal } from '../_providers/CashierProvider';

export default function CashPaymentModal() {
  const {
    cashPaymentOrder,
    receivedAmount,
    setReceivedAmount,
    closeCashPayment,
    confirmCashPayment,
  } = useCashier();

  const total = cashPaymentOrder ? orderTotal(cashPaymentOrder) : 0;
  const received = Number(receivedAmount.replace(/\D/g, '')) || 0;
  const change = received - total;

  return (
    <AnimatePresence>
      {cashPaymentOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCashPayment}
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
        >
          <motion.div
            initial={{ y: 50, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]"
          >
            <header className="flex items-center justify-between border-b border-black/[0.06] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                  <Banknote className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Cash payment</p>
                  <h3 className="mt-1 text-xl font-black tracking-[-.03em]">Terima pembayaran</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCashPayment}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f2ee]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-5 sm:p-6">
              <div className="rounded-[24px] bg-black p-5 text-white">
                <p className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Total tagihan</p>
                <p className="mt-2 text-4xl font-black tracking-[-.05em]">{formatPrice(total)}</p>
                <p className="mt-3 font-mono text-[9px] text-white/35">
                  #{(cashPaymentOrder as any).order_code || cashPaymentOrder.id}
                </p>
              </div>

              <div className="mt-6">
                <label className="text-[9px] font-black uppercase tracking-[.14em] text-black/35">Uang diterima</label>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={
                    receivedAmount
                      ? formatPrice(Number(receivedAmount.replace(/\D/g, ''))).replace('Rp', '').trim()
                      : ''
                  }
                  onChange={(event) => setReceivedAmount(event.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  className="mt-2 h-16 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 text-center text-3xl font-black outline-none focus:border-black"
                />

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ['Uang pas', total],
                    ['50.000', 50000],
                    ['100.000', 100000],
                  ].map(([label, value]) => (
                    <button
                      key={String(label)}
                      type="button"
                      onClick={() => setReceivedAmount(String(value))}
                      className="h-11 rounded-xl bg-[#f2f2ee] text-[10px] font-black"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-black/[0.06] p-4">
                <span className="text-xs font-bold text-black/40">Kembalian</span>
                <strong className={`text-xl ${change < 0 ? 'text-red-600' : 'text-black'}`}>
                  {change < 0 ? 'Uang kurang' : formatPrice(change)}
                </strong>
              </div>
            </div>

            <footer className="border-t border-black/[0.06] p-5 sm:p-6">
              <button
                type="button"
                disabled={received < total}
                onClick={() => void confirmCashPayment()}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <CheckCircle2 className="h-5 w-5" />
                Konfirmasi & simpan
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
