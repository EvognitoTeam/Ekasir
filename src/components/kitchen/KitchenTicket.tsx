'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock3,
  Coffee,
  PackageCheck,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';

import {
  useMenuStore,
} from '@/store/menu.store';

import type {
  Order,
} from '@/types/menu';

interface Props {
  order: Order;
  onUpdateStatus: (
    id: string,
    status: Order['status'],
  ) => void;
}

function normalizeText(
  value: unknown,
): string {
  return String(
    value ??
      '',
  ).trim();
}

function parseJsonValue(
  value: unknown,
): unknown {
  let current =
    value;

  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    if (
      typeof current !==
      'string'
    ) {
      return current;
    }

    const trimmed =
      current.trim();

    if (!trimmed) {
      return '';
    }

    try {
      current =
        JSON.parse(
          trimmed,
        );
    } catch {
      return trimmed;
    }
  }

  return current;
}

function collectAddonNames(
  value: unknown,
  output: string[],
  notes: string[],
): void {
  const parsed =
    parseJsonValue(
      value,
    );

  if (!parsed) {
    return;
  }

  if (
    Array.isArray(
      parsed,
    )
  ) {
    parsed.forEach(
      (item) => {
        collectAddonNames(
          item,
          output,
          notes,
        );
      },
    );

    return;
  }

  if (
    typeof parsed ===
    'string'
  ) {
    const clean =
      parsed.trim();

    if (
      clean &&
      !clean.includes(
        '{"name":',
      ) &&
      !clean.includes(
        '[{',
      )
    ) {
      output.push(
        clean,
      );
    }

    return;
  }

  if (
    typeof parsed ===
      'object'
  ) {
    const record =
      parsed as Record<
        string,
        unknown
      >;

    const custNote =
      normalizeText(
        record.cust_notes ??
          record.custNotes,
      );

    if (custNote) {
      notes.push(
        custNote,
      );
    }

    const name =
      normalizeText(
        record.name ??
          record.title ??
          record.choiceName,
      );

    if (name) {
      output.push(
        name,
      );
    }
  }
}

function getParsedItems(
  order: Order,
): any[] {
  try {
    const parsed =
      parseJsonValue(
        order.items,
      );

    return Array.isArray(
      parsed,
    )
      ? parsed
      : [];
  } catch (
    error
  ) {
    console.error(
      'Gagal memproses detail pesanan:',
      error,
    );

    return [];
  }
}

export default function KitchenTicket({
  order,
  onUpdateStatus,
}: Props) {
  const {
    items: menuItems,
  } =
    useMenuStore();

  const [
    elapsedTime,
    setElapsedTime,
  ] =
    useState(0);

  useEffect(() => {
    if (
      order.status ===
        'ready' ||
      order.status ===
        'completed' ||
      order.status ===
        'cancelled'
    ) {
      return;
    }

    const orderTime =
      new Date(
        order.createdAt ||
          order.created_at ||
          Date.now(),
      ).getTime();

    const updateElapsed =
      () => {
        const now =
          Date.now();

        const diffInSeconds =
          Math.floor(
            (
              now -
              orderTime
            ) /
              1000,
          );

        setElapsedTime(
          diffInSeconds >
            0
            ? diffInSeconds
            : 0,
        );
      };

    updateElapsed();

    const interval =
      window.setInterval(
        updateElapsed,
        1000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    order.status,
    order.createdAt,
    order.created_at,
  ]);

  const minutes =
    Math.floor(
      elapsedTime /
        60,
    );

  const seconds =
    elapsedTime %
    60;

  const timeText =
    `${String(
      minutes,
    ).padStart(
      2,
      '0',
    )}:${String(
      seconds,
    ).padStart(
      2,
      '0',
    )}`;

  const manualTableInfo =
    normalizeText(
      (order as any)
        ?.manualTableInfo ??
        (order as any)
          ?.manual_table_info,
    );

  const normalizedOrderType =
    normalizeText(
      (order as any)
        ?.orderType ??
        (order as any)
          ?.order_type ??
        (order as any)
          ?.serviceType ??
        (order as any)
          ?.service_type ??
        manualTableInfo,
    ).toLowerCase();

  const isTakeaway =
    [
      'takeaway',
      'take away',
      'take_away',
      'bungkus',
      'walk-in',
      'walk_in',
      'walk in',
    ].includes(
      normalizedOrderType,
    ) ||
    normalizeText(
      manualTableInfo,
    ).toLowerCase() ===
      'takeaway';

  const rawTableName =
    (order as any)
      ?.tableName ??
    (order as any)
      ?.table_name ??
    (order as any)
      ?.tableCode ??
    (order as any)
      ?.table_code ??
    (order as any)
      ?.tableId ??
    (order as any)
      ?.table_id ??
    (order as any)
      ?.tableNumber ??
    (order as any)
      ?.table_number ??
    '';

  const tableName =
    normalizeText(
      rawTableName,
    ).replace(
      /^T-/i,
      '',
    );

  const hasTable =
    Boolean(
      tableName,
    ) &&
    ![
      'null',
      'undefined',
      'walk-in',
      'walk in',
    ].includes(
      tableName.toLowerCase(),
    );

  const orderCode =
    normalizeText(
      (order as any)
        ?.order_code ??
        (order as any)
          ?.orderCode ??
        order.id,
    );

  const customerName =
    normalizeText(
      (order as any)
        ?.customerName ??
        (order as any)
          ?.customer_name ??
        (order as any)
          ?.name,
    );

  const adminNotes =
    normalizeText(
      (order as any)
        ?.admin_notes ??
        (order as any)
          ?.adminNotes,
    );

  const parsedItems =
    getParsedItems(
      order,
    );

  const isUrgent =
    minutes >= 15;

  const isWarning =
    minutes >= 10 &&
    minutes < 15;

  const isHistory =
    order.status ===
      'ready' ||
    order.status ===
      'completed' ||
    order.status ===
      'cancelled';

  const cardClass =
    isHistory
      ? 'border-black/10 bg-white opacity-75'
      : isUrgent
        ? 'border-red-300 bg-white ring-2 ring-red-500/20 shadow-[0_18px_50px_rgba(220,38,38,0.12)]'
        : isWarning
          ? 'border-amber-300 bg-white ring-1 ring-amber-300/40 shadow-[0_16px_44px_rgba(245,158,11,0.10)]'
          : 'border-black/10 bg-white shadow-[0_14px_36px_rgba(0,0,0,0.06)]';

  const timerClass =
    isUrgent
      ? 'border-red-200 bg-red-600 text-white'
      : isWarning
        ? 'border-amber-300 bg-amber-400 text-black'
        : 'border-black/10 bg-black text-white';

  const statusLabel =
    order.status ===
      'confirmed'
      ? 'Menunggu Diproses'
      : order.status ===
          'preparing'
        ? 'Sedang Diproses'
        : order.status ===
            'ready'
          ? 'Siap Saji'
          : order.status ===
              'completed'
            ? 'Selesai'
            : order.status ===
                'cancelled'
              ? 'Dibatalkan'
              : 'Pesanan Baru';

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-[26px] border transition-all duration-200 ${cardClass}`}
    >
      <header
        className={`border-b px-5 py-4 ${
          isUrgent
            ? 'border-red-200 bg-red-50'
            : isWarning
              ? 'border-amber-200 bg-amber-50'
              : 'border-black/10 bg-[#fafaf8]'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-9 items-center rounded-xl bg-black px-3 font-mono text-base font-black tracking-[0.06em] text-white">
                #{orderCode}
              </span>

              <span
                className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-[0.12em] ${
                  order.status ===
                  'preparing'
                    ? 'border-black bg-black text-white'
                    : order.status ===
                        'cancelled'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-black/10 bg-white text-black/55'
                }`}
              >
                {order.status ===
                'preparing' ? (
                  <ChefHat className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}

                {statusLabel}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {isTakeaway ? (
                <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-red-600">
                  <ShoppingBag className="h-5 w-5" />
                  Takeaway
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-black/55">
                  <Coffee className="h-5 w-5" />
                  Dine In
                </span>
              )}

              <span className="h-4 w-px bg-black/10" />

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
                  {isTakeaway &&
                  hasTable
                    ? 'Asal Meja'
                    : 'Meja / Lokasi'}
                </p>

                <p className="mt-0.5 truncate text-lg font-black text-black">
                  {hasTable
                    ? tableName
                    : isTakeaway
                      ? 'Takeaway'
                      : 'Walk-in'}
                </p>
              </div>
            </div>

            {customerName && (
              <p className="mt-3 truncate text-sm font-semibold text-black/45">
                Atas nama{' '}
                <strong className="font-black text-black/70">
                  {customerName}
                </strong>
              </p>
            )}
          </div>

          {!isHistory && (
            <div
              className={`flex min-w-[86px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 ${timerClass}`}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-70">
                Waktu
              </span>

              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xl font-black tracking-[-0.04em]">
                {isUrgent ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}

                {timeText}
              </span>
            </div>
          )}
        </div>

        {isUrgent && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-black text-white">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Pesanan melewati 15 menit — prioritaskan.
          </div>
        )}
      </header>

      <div className="flex-1 px-5 py-4">
        {parsedItems.length ===
        0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-[#fafaf8] p-5 text-center">
            <div>
              <UtensilsCrossed className="mx-auto h-6 w-6 text-black/20" />
              <p className="mt-3 text-sm font-bold text-black/40">
                Detail item tidak tersedia.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-black/8">
            {parsedItems.map(
              (
                cartItem:
                  any,
                idx:
                  number,
              ) => {
                const product =
                  menuItems.find(
                    (menuItem) =>
                      Number(
                        menuItem.id,
                      ) ===
                      Number(
                        cartItem
                          .menuItemId ??
                          cartItem
                            .product_id,
                      ),
                  );

                const itemName =
                  product?.name ||
                  cartItem.name ||
                  cartItem
                    .menuItemName ||
                  cartItem
                    .menu_item_name ||
                  'Item Menu';

                const addonNames:
                  string[] =
                  [];

                const itemNotes:
                  string[] =
                  [];

                const directItemNote =
                  normalizeText(
                    cartItem
                      .cust_notes ??
                      cartItem
                        .custNotes,
                  );

                if (
                  directItemNote
                ) {
                  itemNotes.push(
                    directItemNote,
                  );
                }

                collectAddonNames(
                  cartItem
                    .selectedAddOnsDetails ??
                    cartItem
                      .selected_add_ons_details ??
                    cartItem
                      .selectedAddOns ??
                    cartItem
                      .selected_add_ons ??
                    cartItem.notes,
                  addonNames,
                  itemNotes,
                );

                const uniqueAddons =
                  Array.from(
                    new Set(
                      addonNames
                        .map(
                          (
                            name,
                          ) =>
                            name.trim(),
                        )
                        .filter(
                          Boolean,
                        ),
                    ),
                  );

                const uniqueNotes =
                  Array.from(
                    new Set(
                      itemNotes
                        .map(
                          (
                            note,
                          ) =>
                            note.trim(),
                        )
                        .filter(
                          Boolean,
                        ),
                    ),
                  );

                const quantity =
                  Math.max(
                    1,
                    Number(
                      cartItem
                        .quantity ??
                        1,
                    ) ||
                      1,
                  );

                return (
                  <div
                    key={`${String(
                      cartItem
                        .id ??
                        cartItem
                          .menuItemId ??
                        cartItem
                          .product_id ??
                        idx,
                    )}-${idx}`}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-black px-2 text-lg font-black text-white">
                        {quantity}x
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-black leading-6 tracking-[-0.02em] text-black">
                          {itemName}
                        </h3>

                        {uniqueAddons.length >
                          0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            {uniqueAddons.map(
                              (
                                addon,
                              ) => (
                                <p
                                  key={
                                    addon
                                  }
                                  className="text-sm font-bold leading-5 text-amber-700"
                                >
                                  +{' '}
                                  {addon}
                                </p>
                              ),
                            )}
                          </div>
                        )}

                        {uniqueNotes.length >
                          0 && (
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-red-500">
                              Catatan Customer
                            </p>

                            {uniqueNotes.map(
                              (
                                note,
                              ) => (
                                <p
                                  key={
                                    note
                                  }
                                  className="mt-1 text-sm font-black leading-5 text-red-800"
                                >
                                  {note}
                                </p>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      {adminNotes && (
        <div className="mx-5 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
              <AlertCircle className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-red-500">
                Catatan Kasir
              </p>

              <p className="mt-1 text-sm font-black leading-6 text-red-900">
                {adminNotes}
              </p>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-black/10 bg-[#fafaf8] p-4">
        {(order.status ===
          'pending' ||
          order.status ===
            'confirmed') && (
          <button
            type="button"
            onClick={() =>
              onUpdateStatus(
                String(
                  order.id,
                ),
                'preparing',
              )
            }
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black px-5 text-base font-black text-white transition hover:bg-black/85 active:scale-[0.99]"
          >
            <ChefHat className="h-5 w-5" />
            Mulai Proses
          </button>
        )}

        {order.status ===
          'preparing' && (
          <div className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-5 text-center text-sm font-black text-black/55">
            <PackageCheck className="h-5 w-5 text-black" />

            Sedang diproses — status Ready ditandai dari Kasir
          </div>
        )}

        {(order.status ===
          'ready' ||
          order.status ===
            'completed') && (
          <div className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-50 px-5 text-sm font-black text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />

            {order.status ===
            'ready'
              ? 'Siap disajikan'
              : 'Pesanan selesai'}
          </div>
        )}

        {order.status ===
          'cancelled' && (
          <div className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-red-50 px-5 text-sm font-black text-red-700">
            <AlertCircle className="h-5 w-5" />

            Pesanan dibatalkan
          </div>
        )}
      </footer>
    </article>
  );
}
