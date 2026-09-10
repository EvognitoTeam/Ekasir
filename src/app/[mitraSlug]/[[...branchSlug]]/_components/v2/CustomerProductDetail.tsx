/* eslint-disable @next/next/no-img-element */
'use client';

import {
  useMemo,
  useState,
} from 'react';
import {
  motion,
} from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ImageIcon,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  useParams,
} from 'next/navigation';

import type {
  MenuItem,
} from '@/types/menu';
import {
  applyFallbackImage,
  normalizeImageSrc,
} from '@/utils/image';
import {
  Toast,
} from '@/utils/toast';

type Props = {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (
    slug: string,
    item: MenuItem,
    selections: unknown,
    quantity: number,
    options?: unknown,
    skuCode?: string,
  ) => void;
};

const formatIDR = (
  price:
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
    .format(price)
    .replace(/\s/g, '');

function stripHtml(
  value?:
    string | null,
) {
  return String(
    value || '',
  )
    .replace(
      /<[^>]*>/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();
}

export default function CustomerProductDetail({
  item,
  onClose,
  onAddToCart,
}: Props) {
  const params =
    useParams();

  const slug =
    (params.mitraSlug as string) ||
    '';

  const [
    quantity,
    setQuantity,
  ] =
    useState(1);

  const [
    selectedAddons,
    setSelectedAddons,
  ] =
    useState<
      number[]
    >([]);

  const [
    selectedSize,
    setSelectedSize,
  ] =
    useState(
      item.meta?.sizes?.[0]?.label ||
        'Regular',
    );

  const stockNum =
    item.stock !== null &&
    item.stock !== undefined
      ? Number(
          item.stock,
        )
      : 0;

  const isSoldOut =
    item.isAvailable ===
      false ||
    stockNum <= 0;

  const isLowStock =
    !isSoldOut &&
    stockNum > 0 &&
    stockNum <= 5;

  const sizes =
    Array.isArray(
      item.meta?.sizes,
    )
      ? item.meta!.sizes
      : [];

  const description =
  String(
    item.description ??
      "",
  )
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    )
    .replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      "",
    )
    .replace(
      /\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      "",
    )
    .replace(
      /javascript\s*:/gi,
      "",
    );

  const totalPrice =
    useMemo(() => {
      let base =
        Number(
          item.basePrice,
        );

      let extra = 0;

      if (
        item.meta &&
        item.meta.sizes
      ) {
        const sizeDef =
          item.meta.sizes.find(
            (
              size:
                any,
            ) =>
              size.label ===
              selectedSize,
          );

        if (sizeDef) {
          base =
            Number(
              sizeDef.price,
            );
        }
      }

      if (
        item.categorizedAddons &&
        Array.isArray(
          item.categorizedAddons,
        )
      ) {
        selectedAddons.forEach(
          (
            addonId,
          ) => {
            item.categorizedAddons?.forEach(
              (
                group:
                  any,
              ) => {
                const addonData =
                  group.addons?.find(
                    (
                      addon:
                        any,
                    ) =>
                      Number(
                        addon.id,
                      ) ===
                      Number(
                        addonId,
                      ),
                  );

                if (
                  addonData
                ) {
                  extra +=
                    Number(
                      addonData.price,
                    );
                }
              },
            );
          },
        );
      }

      return (
        (base + extra) *
        quantity
      );
    }, [
      item,
      quantity,
      selectedAddons,
      selectedSize,
    ]);

  const isValid =
    useMemo(() => {
      if (
        !item.categorizedAddons ||
        !Array.isArray(
          item.categorizedAddons,
        )
      ) {
        return true;
      }

      for (
        const group of
        item.categorizedAddons
      ) {
        const required =
          Boolean(
            group.is_required ||
              group.isRequired,
          );

        if (!required) {
          continue;
        }

        const groupIds =
          group.addons.map(
            (
              addon:
                any,
            ) =>
              Number(
                addon.id,
              ),
          );

        const selected =
          selectedAddons.some(
            (
              id,
            ) =>
              groupIds.includes(
                id,
              ),
          );

        if (!selected) {
          return false;
        }
      }

      return true;
    }, [
      item.categorizedAddons,
      selectedAddons,
    ]);

  function handleSelectAddon(
    addon:
      any,
    group:
      any,
  ) {
    const addonId =
      Number(
        addon.id,
      );

    const addonStock =
      addon.stock !== null &&
      addon.stock !==
        undefined
        ? Number(
            addon.stock,
          )
        : 0;

    const tracked =
      Boolean(
        addon.is_track_stock ??
          addon.isTrackStock,
      );

    if (
      tracked &&
      addonStock <= 0
    ) {
      Toast.fire({
        icon: 'warning',
        title:
          'Maaf, opsi ini sedang habis!',
      });
      return;
    }

    const maxSelected =
      Number(
        group.maxSelected ||
          group.max_selected ||
          0,
      );

    const required =
      Boolean(
        group.isRequired ||
          group.is_required,
      );

    const groupIds =
      group.addons.map(
        (
          groupAddon:
            any,
        ) =>
          Number(
            groupAddon.id,
          ),
      );

    setSelectedAddons(
      (
        previous,
      ) => {
        const alreadySelected =
          previous.includes(
            addonId,
          );

        if (
          maxSelected ===
          1
        ) {
          if (
            alreadySelected
          ) {
            return required
              ? previous
              : previous.filter(
                  (
                    id,
                  ) =>
                    id !==
                    addonId,
                );
          }

          return [
            ...previous.filter(
              (
                id,
              ) =>
                !groupIds.includes(
                  id,
                ),
            ),
            addonId,
          ];
        }

        if (
          alreadySelected
        ) {
          return previous.filter(
            (
              id,
            ) =>
              id !==
              addonId,
          );
        }

        if (
          maxSelected > 1
        ) {
          const selectedCount =
            previous.filter(
              (
                id,
              ) =>
                groupIds.includes(
                  id,
                ),
            ).length;

          if (
            selectedCount >=
            maxSelected
          ) {
            Toast.fire({
              icon: 'warning',
              title:
                `Maksimal pilih ${maxSelected} opsi.`,
            });

            return previous;
          }
        }

        return [
          ...previous,
          addonId,
        ];
      },
    );
  }

  function handleIncrease() {
    if (
      quantity <
      stockNum
    ) {
      setQuantity(
        (
          value,
        ) =>
          value + 1,
      );
      return;
    }

    Toast.fire({
      icon: 'warning',
      title:
        `Maksimal pembelian sisa ${stockNum} porsi!`,
    });
  }

  function handleSubmit() {
    if (
      !isValid ||
      isSoldOut
    ) {
      return;
    }

    const finalOptions =
      item.meta?.sizes
        ? {
            size:
              selectedSize,
          }
        : undefined;

    const cleanAddons =
      selectedAddons.filter(
        (
          id,
        ) =>
          !Number.isNaN(
            id,
          ),
      );

    onAddToCart(
      slug,
      item,
      cleanAddons,
      quantity,
      finalOptions,
      item.meta?.sku_code,
    );

    onClose();
  }

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 24,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: 24,
      }}
      transition={{
        duration: 0.22,
        ease: [
          0.2,
          0.8,
          0.2,
          1,
        ],
      }}
      className="absolute inset-0 z-[120] overflow-y-auto bg-stone-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="relative h-[220px] overflow-hidden bg-stone-200 sm:h-[260px]">
        {item.image ? (
          <img
            src={normalizeImageSrc(
              item.image,
            )}
            alt={item.name}
            onError={
              applyFallbackImage
            }
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-black/20">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail produk"
          className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-xl active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/50">
                Menu item
              </p>

              <h1 className="mt-1 line-clamp-2 text-[26px] font-black leading-[0.98] tracking-[-0.05em] sm:text-3xl">
                {item.name}
              </h1>
            </div>

            <p className="shrink-0 text-sm font-extrabold">
              {formatIDR(
                Number(
                  item.basePrice,
                ),
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="pb-4">
        <div className="px-4 pb-5 pt-4">
          <div className="flex flex-wrap gap-2">
            {item.meta?.sku_code && (
              <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-black/40">
                {item.meta.sku_code}
              </span>
            )}

            {isLowStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-amber-900">
                <AlertTriangle className="h-3 w-3" />
                Sisa {stockNum}
              </span>
            )}

            {isSoldOut && (
              <span className="rounded-full bg-red-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-red-700">
                Stok habis
              </span>
            )}
          </div>

          {description && (
            <div
              dangerouslySetInnerHTML={{
                __html:
                  description,
              }}
            />
          )}
        </div>

        {sizes.length > 0 && (
          <section className="border-t border-black/[0.06] px-4 py-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-black/30">
                  Size
                </p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.035em]">
                  Pilih ukuran
                </h2>
              </div>

              <span className="rounded-full bg-black px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-white">
                Pilih 1
              </span>
            </div>

            <div className="grid gap-2">
              {sizes.map(
                (
                  size:
                    any,
                ) => {
                  const selected =
                    size.label ===
                    selectedSize;

                  return (
                    <button
                      key={
                        size.label
                      }
                      type="button"
                      onClick={() =>
                        setSelectedSize(
                          size.label,
                        )
                      }
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${
                        selected
                          ? 'border-black bg-black text-white'
                          : 'border-black/[0.08] bg-white'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-white bg-white text-black'
                            : 'border-black/20'
                        }`}
                      >
                        {selected && (
                          <Check className="h-3 w-3" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1 text-sm font-extrabold">
                        {
                          size.label
                        }
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          selected
                            ? 'text-white/65'
                            : 'text-black/45'
                        }`}
                      >
                        {formatIDR(
                          Number(
                            size.price,
                          ),
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>
        )}

        {item.categorizedAddons?.map(
          (
            group:
              any,
          ) => {
            const maxSelected =
              Number(
                group.maxSelected ||
                  group.max_selected ||
                  0,
              );

            const required =
              Boolean(
                group.isRequired ||
                  group.is_required,
              );

            const single =
              maxSelected ===
              1;

            return (
              <section
                key={
                  group.categoryName
                }
                className="border-t border-black/[0.06] px-4 py-5"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black tracking-[-0.035em]">
                        {
                          group.categoryName
                        }
                      </h2>

                      {required && (
                        <span className="rounded-full bg-black px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.1em] text-white">
                          Wajib
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[10px] leading-4 text-black/38">
                      {single
                        ? 'Pilih satu opsi'
                        : maxSelected >
                            1
                          ? `Pilih maksimal ${maxSelected}`
                          : 'Opsional'}
                    </p>
                  </div>

                  <ChevronDown className="mt-1 h-4 w-4 text-black/25" />
                </div>

                <div className="grid gap-2">
                  {group.addons?.map(
                    (
                      addon:
                        any,
                    ) => {
                      const addonId =
                        Number(
                          addon.id,
                        );

                      const selected =
                        selectedAddons.includes(
                          addonId,
                        );

                      const addonStock =
                        addon.stock !==
                          null &&
                        addon.stock !==
                          undefined
                          ? Number(
                              addon.stock,
                            )
                          : 0;

                      const tracked =
                        Boolean(
                          addon.is_track_stock ??
                            addon.isTrackStock,
                        );

                      const soldOut =
                        tracked &&
                        addonStock <=
                          0;

                      const lowStock =
                        tracked &&
                        addonStock > 0 &&
                        addonStock <=
                          5;

                      return (
                        <button
                          key={
                            addon.id
                          }
                          type="button"
                          disabled={
                            soldOut
                          }
                          onClick={() =>
                            handleSelectAddon(
                              addon,
                              group,
                            )
                          }
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-45 ${
                            selected
                              ? 'border-black bg-black text-white'
                              : 'border-black/[0.08] bg-white'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                              single
                                ? 'rounded-full'
                                : 'rounded-md'
                            } border ${
                              selected
                                ? 'border-white bg-white text-black'
                                : 'border-black/20'
                            }`}
                          >
                            {selected && (
                              <Check className="h-3 w-3" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-extrabold">
                              {
                                addon.name
                              }
                            </span>

                            {tracked && (
                              <span
                                className={`mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em] ${
                                  selected
                                    ? 'text-white/45'
                                    : soldOut
                                      ? 'text-red-500'
                                      : lowStock
                                        ? 'text-amber-600'
                                        : 'text-black/30'
                                }`}
                              >
                                {soldOut
                                  ? 'Habis'
                                  : `Sisa ${addonStock}`}
                              </span>
                            )}
                          </span>

                          <span
                            className={`shrink-0 text-xs font-bold ${
                              selected
                                ? 'text-white/65'
                                : 'text-black/45'
                            }`}
                          >
                            {Number(
                              addon.price,
                            ) >
                            0
                              ? `+${formatIDR(
                                  Number(
                                    addon.price,
                                  ),
                                )}`
                              : 'Gratis'}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
            );
          },
        )}
      </div>

      <div className="sticky bottom-0 z-40 border-t border-black/[0.08] bg-stone-50/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-12 shrink-0 items-center rounded-2xl border border-black/10 bg-white p-1">
            <button
              type="button"
              onClick={() =>
                setQuantity(
                  (
                    value,
                  ) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
              disabled={
                isSoldOut
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl text-black/45 active:bg-stone-100 disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="w-8 text-center text-sm font-black tabular-nums">
              {quantity}
            </span>

            <button
              type="button"
              onClick={
                handleIncrease
              }
              disabled={
                isSoldOut
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white active:scale-95 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={
              handleSubmit
            }
            disabled={
              !isValid ||
              isSoldOut
            }
            className="flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl bg-black px-4 text-white active:scale-[0.99] disabled:bg-stone-300 disabled:text-black/40"
          >
            <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.11em]">
              {isSoldOut
                ? 'Stok habis'
                : isValid
                  ? 'Tambah ke pesanan'
                  : 'Lengkapi opsi'}
            </span>

            {!isSoldOut &&
              isValid && (
                <span className="shrink-0 text-sm font-black">
                  {formatIDR(
                    totalPrice,
                  )}
                </span>
              )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
