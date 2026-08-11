'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Check,
  Minus,
  Plus,
  X,
} from 'lucide-react';

import type {
  KioskAddOn,
  KioskAddOnGroup,
  KioskCartItem,
  KioskProduct,
} from './types';

type Props = {
  open: boolean;
  product: KioskProduct | null;
  onClose: () => void;
  onAdd: (
    item: KioskCartItem,
  ) => void;
};

export default function KioskProductModal({
  open,
  product,
  onClose,
  onAdd,
}: Props) {
  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<number[]>(
      [],
    );

  const [
    notes,
    setNotes,
  ] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setQuantity(1);
          setSelectedIds([]);
          setNotes('');
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    open,
    product?.id,
  ]);

  const selectedAddOns =
    useMemo(() => {
      if (!product) {
        return [];
      }

      return (
        product.addOnGroups ??
        []
      ).flatMap(
        (group) =>
          group.addOns.filter(
            (addOn) =>
              selectedIds.includes(
                addOn.id,
              ),
          ),
      );
    }, [
      product,
      selectedIds,
    ]);

  const total =
    useMemo(
      () =>
        (
          (
            product?.price ??
            0
          ) +
          selectedAddOns.reduce(
            (
              sum,
              addOn,
            ) =>
              sum +
              addOn.price,
            0,
          )
        ) *
        quantity,
      [
        product?.price,
        quantity,
        selectedAddOns,
      ],
    );

  if (
    !open ||
    !product
  ) {
    return null;
  }

  const isGroupValid =
    (
      group:
        KioskAddOnGroup,
    ) => {
      if (!group.isRequired) {
        return true;
      }

      return group.addOns.some(
        (addOn) =>
          selectedIds.includes(
            addOn.id,
          ),
      );
    };

  const allRequiredValid =
    (
      product.addOnGroups ??
      []
    ).every(
      isGroupValid,
    );

  const toggleAddOn =
    (
      group:
        KioskAddOnGroup,
      addOn:
        KioskAddOn,
    ) => {
      const groupIds =
        group.addOns.map(
          (item) =>
            item.id,
        );

      setSelectedIds(
        (current) => {
          const selected =
            current.includes(
              addOn.id,
            );

          if (
            group.maxSelected ===
            1
          ) {
            if (
              selected &&
              !group.isRequired
            ) {
              return current.filter(
                (id) =>
                  id !==
                  addOn.id,
              );
            }

            return [
              ...current.filter(
                (id) =>
                  !groupIds.includes(
                    id,
                  ),
              ),
              addOn.id,
            ];
          }

          if (selected) {
            return current.filter(
              (id) =>
                id !==
                addOn.id,
            );
          }

          const selectedInGroup =
            current.filter(
              (id) =>
                groupIds.includes(
                  id,
                ),
            ).length;

          if (
            group.maxSelected >
              0 &&
            selectedInGroup >=
              group.maxSelected
          ) {
            return current;
          }

          return [
            ...current,
            addOn.id,
          ];
        },
      );
    };

  const handleAdd =
    () => {
      if (
        !allRequiredValid
      ) {
        return;
      }

      onAdd({
        lineId: [
          product.id,
          Date.now(),
          Math.random()
            .toString(36)
            .slice(2, 8),
        ].join('-'),
        productId:
          product.id,
        name:
          product.name,
        imageUrl:
          product.imageUrl ||
          '/logo.png',
        quantity,
        basePrice:
          product.price,
        addOns:
          selectedAddOns,
        notes:
          notes.trim() ||
          undefined,
      });
    };

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-[#171717]/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[96dvh] w-full max-w-[1080px] overflow-y-auto rounded-t-[2rem] border-2 border-[#171717] bg-white shadow-[10px_10px_0_#171717] sm:max-h-[92dvh] sm:rounded-[2.5rem]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#171717]/20 bg-white/95 px-8 py-6 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff5c35]">
              Detail produk
            </p>
            <h2 className="mt-1 truncate text-3xl font-black text-[#171717]">
              {product.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f1e8]"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[280px_1fr] lg:gap-8 lg:p-8 xl:grid-cols-[320px_1fr]">
          <div>
            <div className="mx-auto flex h-[220px] w-full max-w-[320px] items-center justify-center rounded-2xl bg-stone-50 p-5 sm:h-[260px] lg:h-[280px] lg:rounded-[2rem] lg:p-8 xl:h-[320px]">
              <img
                src={
                  product.imageUrl ||
                  '/logo.png'
                }
                alt={product.name}
                className="h-full w-full object-contain"
                onError={(
                  event,
                ) => {
                  event.currentTarget.src =
                    '/logo.png';
                }}
              />
            </div>

            {product.description && (
              <p className="mt-5 text-base leading-relaxed text-stone-500">
                {product.description}
              </p>
            )}

            <p className="mt-5 text-3xl font-black text-[#ff5c35]">
              Rp
              {product.price.toLocaleString(
                'id-ID',
              )}
            </p>
          </div>

          <div className="space-y-7">
            {(product.addOnGroups ?? []).map(
              (group) => {
                const valid =
                  isGroupValid(
                    group,
                  );

                return (
                  <section
                    key={group.categoryName}
                    className={`rounded-2xl border p-5 ${
                      valid
                        ? 'border-[#171717]/20'
                        : 'border-red-300 bg-[#ffe8e2]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-[#171717]">
                          {group.categoryName}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-stone-400">
                          {group.isRequired
                            ? 'Wajib dipilih'
                            : 'Opsional'}
                          {group.maxSelected >
                          0
                            ? ` • Maksimal ${group.maxSelected}`
                            : ''}
                        </p>
                      </div>

                      {group.isRequired && (
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {valid
                            ? 'Terpilih'
                            : 'Wajib'}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {group.addOns.map(
                        (addOn) => {
                          const selected =
                            selectedIds.includes(
                              addOn.id,
                            );

                          return (
                            <button
                              key={addOn.id}
                              type="button"
                              onClick={() =>
                                toggleAddOn(
                                  group,
                                  addOn,
                                )
                              }
                              className={`flex min-h-20 items-center justify-between gap-3 rounded-2xl border px-4 text-left ${
                                selected
                                  ? 'border-[#171717] bg-[#efffc0]'
                                  : 'border-[#171717]/20 bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-black text-[#171717]">
                                  {addOn.name}
                                </p>
                                <p className="mt-1 text-sm font-bold text-[#ff5c35]">
                                  + Rp
                                  {addOn.price.toLocaleString(
                                    'id-ID',
                                  )}
                                </p>
                              </div>

                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-amber-400 text-[#171717]' : 'bg-[#f4f1e8] text-stone-400'}`}>
                                {selected ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <Plus className="h-5 w-5" />
                                )}
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

            <textarea
              value={notes}
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Catatan: tidak pedas, tanpa bawang, dan lainnya"
              className="min-h-28 w-full resize-none rounded-2xl border border-[#171717]/20 bg-stone-50 p-4 text-lg outline-none focus:border-[#171717]"
            />

            <div className="flex items-center justify-between rounded-2xl bg-[#f4f1e8] p-4">
              <span className="text-lg font-black">
                Jumlah
              </span>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      (value) =>
                        Math.max(
                          1,
                          value - 1,
                        ),
                    )
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white"
                >
                  <Minus className="h-6 w-6" />
                </button>

                <span className="min-w-10 text-center text-3xl font-black">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      (value) =>
                        value + 1,
                    )
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171717] text-white"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={
                !allRequiredValid
              }
              onClick={handleAdd}
              className="flex min-h-20 w-full items-center justify-between rounded-[1.5rem] bg-[#c8ff3d] px-7 text-[#171717] disabled:bg-stone-300"
            >
              <span className="text-xl font-black">
                Tambahkan
              </span>

              <span className="text-xl font-black">
                Rp
                {total.toLocaleString(
                  'id-ID',
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
