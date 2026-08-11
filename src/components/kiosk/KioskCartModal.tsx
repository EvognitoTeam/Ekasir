'use client';

import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

import type {
  KioskCartItem,
} from './types';

type Props = {
  open: boolean;
  items: KioskCartItem[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  onIncrease: (lineId: string) => void;
  onDecrease: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  onClose: () => void;
};

function itemUnitTotal(
  item: KioskCartItem,
) {
  return (
    item.basePrice +
    item.addOns.reduce(
      (
        total,
        addOn,
      ) =>
        total +
        addOn.price,
      0,
    )
  );
}

export default function KioskCartModal({
  open,
  items,
  subtotal,
  discountAmount,
  grandTotal,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onCheckout,
  onClose,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-[#171717]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang pesanan"
    >
      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border-2 border-[#171717] bg-[#f4f1e8] shadow-[10px_10px_0_#171717] sm:max-h-[92dvh] sm:rounded-[2.5rem]">
        <header className="flex items-center justify-between border-b border-[#171717]/20 bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c8ff3d] text-[#171717] sm:h-14 sm:w-14 sm:rounded-2xl">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff5c35] sm:text-xs">
                Pesanan kamu
              </p>
              <h2 className="text-xl font-black text-[#171717] sm:mt-1 sm:text-3xl">
                Keranjang
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl px-3 py-2 text-xs font-black text-red-600 sm:px-4 sm:text-sm"
              >
                Hapus semua
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f1e8] sm:h-14 sm:w-14 sm:rounded-2xl"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-center">
              <ShoppingBag className="h-14 w-14 text-stone-300" />
              <h3 className="mt-4 text-2xl font-black text-stone-800">
                Keranjang masih kosong
              </h3>
              <p className="mt-2 text-stone-500">
                Tambahkan produk terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {items.map(
                (item) => {
                  const unitTotal =
                    itemUnitTotal(
                      item,
                    );

                  return (
                    <article
                      key={item.lineId}
                      className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#171717]/20 bg-white p-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5 sm:p-5"
                    >
                      <div className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-xl bg-stone-50 p-2 sm:h-24 sm:w-24 sm:rounded-2xl sm:p-3">
                        <img
                          src={
                            item.imageUrl ||
                            '/logo.png'
                          }
                          alt={item.name}
                          className="h-full w-full object-contain"
                          onError={(
                            event,
                          ) => {
                            event.currentTarget.src =
                              '/logo.png';
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-base font-black text-[#171717] sm:text-xl">
                              {item.name}
                            </h3>

                            {item.addOns.length > 0 && (
                              <p className="mt-1 line-clamp-2 text-xs text-stone-500 sm:text-sm">
                                {item.addOns
                                  .map(
                                    (
                                      addOn,
                                    ) =>
                                      addOn.name,
                                  )
                                  .join(
                                    ', ',
                                  )}
                              </p>
                            )}

                            {item.notes && (
                              <p className="mt-1 line-clamp-1 text-xs italic text-stone-400 sm:text-sm">
                                Catatan: {item.notes}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onRemove(
                                item.lineId,
                              )
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffe8e2] text-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-stone-400">
                              Rp{unitTotal.toLocaleString('id-ID')} / item
                            </p>
                            <p className="mt-1 text-lg font-black text-[#ff5c35] sm:text-xl">
                              Rp{(
                                unitTotal *
                                item.quantity
                              ).toLocaleString('id-ID')}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 rounded-xl bg-[#f4f1e8] p-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onDecrease(
                                  item.lineId,
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#171717] shadow-sm"
                            >
                              {item.quantity <= 1 ? (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              ) : (
                                <Minus className="h-5 w-5" />
                              )}
                            </button>

                            <span className="min-w-7 text-center text-lg font-black">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                onIncrease(
                                  item.lineId,
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#171717] text-white"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-[#171717]/20 bg-white p-4 sm:p-6 lg:p-8">
          <div className="space-y-2 text-sm sm:text-base">
            <div className="flex items-center justify-between text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold">
                Rp{subtotal.toLocaleString('id-ID')}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-bold">Diskon</span>
                <span className="font-black">
                  - Rp{discountAmount.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            <div className="flex items-end justify-between border-t border-dashed border-[#171717]/20 pt-3">
              <span className="font-black text-stone-700">
                Total
              </span>
              <span className="text-2xl font-black text-[#171717] sm:text-3xl">
                Rp{grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="mt-4 min-h-16 w-full rounded-2xl bg-[#c8ff3d] px-5 text-lg font-black text-[#171717] disabled:bg-stone-300 sm:min-h-18 sm:text-xl"
          >
            Lanjutkan pesanan
          </button>
        </footer>
      </div>
    </div>
  );
}
