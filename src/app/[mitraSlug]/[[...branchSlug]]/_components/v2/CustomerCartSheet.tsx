/* eslint-disable @next/next/no-img-element */
'use client';

import {
  useEffect,
  useState,
  type MouseEvent,
} from 'react';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  ArrowRight,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  useParams,
} from 'next/navigation';

import {
  useCartStore,
} from '@/store/cart.store';
import {
  useMenuStore,
} from '@/store/menu.store';
import type {
  CartItem,
  MenuItem,
} from '@/types/menu';
import {
  applyFallbackImage,
  normalizeImageSrc,
} from '@/utils/image';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
};

const formatIDR = (
  value:
    number,
) =>
  new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    },
  )
    .format(value)
    .replace(/\s/g, '');

export default function CustomerCartSheet({
  isOpen,
  onClose,
  onCheckout,
}: Props) {
  const params =
    useParams();

  const slug =
    (params.mitraSlug as string) ||
    '';

  const {
    getCartBySlug,
    updateQuantity,
    removeItem,
    calculateTotal,
    getAppliedCoupon,
  } =
    useCartStore();

  const {
    items:
      menuItems,
  } =
    useMenuStore();

  const cartItems =
    getCartBySlug(
      slug,
    );

  const appliedCoupon =
    getAppliedCoupon(
      slug,
    );

  const [
    settings,
    setSettings,
  ] =
    useState({
      taxRate: 0,
      serviceRate: 0,
      isTaxIncluded:
        false,
    });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (
      !slug ||
      !isOpen
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadSettings() {
      try {
        const response =
          await fetch(
            `/api/settings?slug=${slug}`,
            {
              signal:
                controller.signal,
            },
          );

        const result =
          await response.json();

        if (
          result.success
        ) {
          setSettings({
            taxRate:
              result.data
                .taxRate ||
              0,
            serviceRate:
              result.data
                .serviceRate ||
              0,
            isTaxIncluded:
              result.data
                .isTaxIncluded ===
              1,
          });
        }
      } catch (
        error
      ) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            'AbortError'
        ) {
          return;
        }

        console.warn(
          'Gagal fetch settings di cart, menggunakan nilai 0.',
        );
      }
    }

    void loadSettings();

    return () => {
      controller.abort();
    };
  }, [
    isOpen,
    slug,
  ]);

  const {
    subtotal,
    discountAmount,
    total:
      discountedSubtotal,
  } =
    calculateTotal(
      slug,
      menuItems,
    );

  let tax = 0;
  let service = 0;

  if (
    !settings.isTaxIncluded
  ) {
    service =
      discountedSubtotal *
      (settings.serviceRate /
        100);

    tax =
      discountedSubtotal *
      (settings.taxRate /
        100);
  }

  const grandTotal =
    discountedSubtotal +
    tax +
    service;

  function handleRemoveItem(
    event:
      MouseEvent<HTMLButtonElement>,
    itemId:
      string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    removeItem(
      slug,
      itemId,
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="customer-cart"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={
            onClose
          }
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Keranjang belanja"
            initial={{
              y: '100%',
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: '100%',
            }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 320,
              mass: 0.85,
            }}
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
            className="flex max-h-[94dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[30px] bg-stone-50 shadow-2xl sm:max-h-[88dvh] sm:rounded-[30px]"
          >
            <header className="flex items-center gap-3 border-b border-black/[0.07] px-4 pb-4 pt-4 sm:pt-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                <ShoppingBag className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/30">
                  Your order
                </p>

                <h2 className="mt-0.5 text-lg font-black tracking-[-0.035em]">
                  {cartItems.length}{' '}
                  item dipilih
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  onClose
                }
                aria-label="Tutup keranjang"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cartItems.length ===
              0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-black/35">
                    <Sparkles className="h-6 w-6" />
                  </span>

                  <h3 className="mt-5 text-xl font-black tracking-[-0.04em]">
                    Keranjang kosong
                  </h3>

                  <p className="mt-2 max-w-[240px] text-xs leading-5 text-black/40">
                    Pilih menu yang Anda inginkan, lalu kembali ke sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map(
                    (
                      item:
                        CartItem,
                    ) => {
                      const product =
                        menuItems.find(
                          (
                            menuItem:
                              MenuItem,
                          ) =>
                            menuItem.id ===
                            item.menuItemId,
                        );

                      if (!product) {
                        return null;
                      }

                      let unitPrice =
                        Number(
                          product.basePrice,
                        );

                      const labels:
                        string[] =
                        [];

                      if (
                        item.options &&
                        product.meta
                      ) {
                        const sizeDef =
                          product.meta.sizes?.find(
                            (
                              size:
                                any,
                            ) =>
                              size.label ===
                              item.options!.size,
                          );

                        if (
                          sizeDef
                        ) {
                          unitPrice =
                            Number(
                              sizeDef.price,
                            );
                        }

                        if (
                          item.options
                            .size
                        ) {
                          labels.push(
                            item.options
                              .size,
                          );
                        }

                        if (
                          item.options
                            .temperature
                        ) {
                          labels.push(
                            item.options.temperature.replace(
                              'Serve ',
                              '',
                            ),
                          );
                        }
                      }

                      if (
                        Array.isArray(
                          item.selectedAddOns,
                        ) &&
                        product.categorizedAddons
                      ) {
                        item.selectedAddOns.forEach(
                          (
                            id:
                              any,
                          ) => {
                            product.categorizedAddons?.forEach(
                              (
                                group:
                                  any,
                              ) => {
                                const addon =
                                  group.addons.find(
                                    (
                                      groupAddon:
                                        any,
                                    ) =>
                                      Number(
                                        groupAddon.id,
                                      ) ===
                                      Number(
                                        id,
                                      ),
                                  );

                                if (
                                  addon
                                ) {
                                  unitPrice +=
                                    Number(
                                      addon.price,
                                    );

                                  labels.push(
                                    addon.name,
                                  );
                                }
                              },
                            );
                          },
                        );
                      }

                      return (
                        <motion.article
                          key={
                            item.id
                          }
                          layout
                          className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-black/[0.07] bg-white p-2.5"
                        >
                          <div className="h-[72px] w-[72px] overflow-hidden rounded-xl bg-stone-100">
                            {product.image ? (
                              <img
                                src={normalizeImageSrc(
                                  product.image,
                                )}
                                alt={
                                  product.name
                                }
                                onError={
                                  applyFallbackImage
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-black/20">
                                <ShoppingBag className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-black tracking-[-0.02em]">
                                  {
                                    product.name
                                  }
                                </h3>

                                {labels.length >
                                  0 && (
                                  <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-black/38">
                                    {labels.join(
                                      ' · ',
                                    )}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onPointerDown={(
                                  event,
                                ) =>
                                  event.stopPropagation()
                                }
                                onClick={(
                                  event,
                                ) =>
                                  handleRemoveItem(
                                    event,
                                    item.id,
                                  )
                                }
                                aria-label={`Hapus ${product.name}`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/25 active:bg-red-50 active:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="text-xs font-black">
                                {formatIDR(
                                  unitPrice *
                                    item.quantity,
                                )}
                              </span>

                              <div className="flex h-9 items-center rounded-xl border border-black/10 bg-stone-50 p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      slug,
                                      item.id,
                                      -1,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-black/45 active:bg-white"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>

                                <span className="w-7 text-center text-xs font-black tabular-nums">
                                  {
                                    item.quantity
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      slug,
                                      item.id,
                                      1,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white active:scale-95"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.article>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <footer className="border-t border-black/[0.07] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-black/40">
                    Subtotal
                  </span>
                  <span className="font-extrabold">
                    {formatIDR(
                      subtotal,
                    )}
                  </span>
                </div>

                {discountAmount >
                  0 && (
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="min-w-0 text-black/40">
                      Diskon
                      {appliedCoupon
                        ? ` · ${
                            appliedCoupon.coupon_code ||
                            appliedCoupon.code ||
                            'Promo'
                          }`
                        : ''}
                    </span>

                    <span className="shrink-0 font-extrabold text-emerald-700">
                      -
                      {formatIDR(
                        discountAmount,
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-black/40">
                    <ReceiptText className="h-3 w-3" />
                    Tax & service
                  </span>

                  <span className="font-extrabold">
                    {settings.isTaxIncluded
                      ? 'Included'
                      : formatIDR(
                          tax +
                            service,
                        )}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-black/[0.07] pt-4">
                <div>
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-black/30">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.05em]">
                    {formatIDR(
                      grandTotal,
                    )}
                  </p>
                </div>

                <span className="text-right text-[9px] leading-4 text-black/30">
                  {settings.isTaxIncluded
                    ? 'Tax included'
                    : 'Calculated at cart'}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  cartItems.length ===
                  0
                }
                onClick={
                  onCheckout
                }
                className="mt-4 flex h-13 w-full items-center justify-between rounded-2xl bg-black px-5 text-white active:scale-[0.99] disabled:bg-stone-200 disabled:text-black/30"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                  Lanjut checkout
                </span>

                <ArrowRight className="h-4 w-4" />
              </button>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
