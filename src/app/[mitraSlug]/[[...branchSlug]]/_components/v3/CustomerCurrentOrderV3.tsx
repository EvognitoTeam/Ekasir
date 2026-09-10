'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  Check,
  ChefHat,
  Clock3,
  PackageCheck,
  QrCode,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useOrderStore } from '@/store/order.store';

type Props = {
  onBackToMenu: () => void;
  onViewRoasts?: () => void;
};

const steps = [
  ['pending', 'Received', Clock3],
  ['confirmed', 'Confirmed', Check],
  ['preparing', 'Preparing', ChefHat],
  ['ready', 'Ready', PackageCheck],
] as const;

export default function CustomerCurrentOrderV3({
  onBackToMenu,
}: Props) {
  const params = useParams();
  const slug = String(params.mitraSlug || '');

  const {
    currentOrder,
    updateStatus,
  } = useOrderStore();

  const [
    data,
    setData,
  ] = useState<any>(
    currentOrder,
  );

  const [
    est,
    setEst,
  ] = useState({
    confirmed: 1,
    preparing: 5,
    ready: 10,
  });

  const [
    left,
    setLeft,
  ] = useState('');

  const code =
    data?.order_code ||
    data?.orderCode ||
    data?.id
      ?.toString()
      .slice(-6);

  useEffect(
    () => {
      setData(
        (
          previous: any,
        ) => ({
          ...previous,
          ...currentOrder,
        }),
      );
    },
    [
      currentOrder,
    ],
  );

  useEffect(
    () => {
      if (
        !slug
      ) {
        return;
      }

      fetch(
        `/api/orders/estimates?slug=${encodeURIComponent(
          slug,
        )}`,
        {
          cache:
            'no-store',
        },
      )
        .then(
          (
            response,
          ) =>
            response.json(),
        )
        .then(
          (
            result,
          ) => {
            if (
              result.success
            ) {
              setEst({
                confirmed:
                  result.data
                    ?.avgConfirm ||
                  1,
                preparing:
                  result.data
                    ?.avgPrepare ||
                  5,
                ready:
                  result.data
                    ?.avgReady ||
                  10,
              });
            }
          },
        )
        .catch(
          () => {},
        );
    },
    [
      slug,
    ],
  );

  useEffect(
    () => {
      if (
        !code
      ) {
        return;
      }

      let disposed =
        false;

      const run =
        async () => {
          try {
            const query =
              new URLSearchParams({
                code:
                  String(
                    code,
                  ),
              });

            if (
              slug
            ) {
              query.set(
                'slug',
                slug,
              );
            }

            const response =
              await fetch(
                `/api/orders/track?${query.toString()}`,
                {
                  cache:
                    'no-store',
                  credentials:
                    'include',
                },
              );

            const result =
              await response.json();

            if (
              !disposed &&
              result.success &&
              result.data?.[0]
            ) {
              const order =
                result.data[0];

              setData(
                (
                  previous: any,
                ) => ({
                  ...previous,
                  ...order,
                }),
              );

              if (
                order.status &&
                order.status !==
                  currentOrder
                    ?.status
              ) {
                updateStatus(
                  order.status,
                );
              }
            }
          } catch {}
        };

      void run();

      const id =
        window.setInterval(
          run,
          5000,
        );

      return () => {
        disposed =
          true;

        window.clearInterval(
          id,
        );
      };
    },
    [
      code,
      slug,
      currentOrder
        ?.status,
      updateStatus,
    ],
  );

  const expiry =
    data?.expiry_time ||
    data?.expiryTime;

  useEffect(
    () => {
      if (
        !expiry
      ) {
        setLeft('');
        return;
      }

      const tick =
        () => {
          const ms =
            Math.max(
              0,
              new Date(
                expiry,
              ).getTime() -
                Date.now(),
            );

          const minutes =
            Math.floor(
              ms /
                60000,
            );

          const seconds =
            Math.floor(
              (
                ms %
                60000
              ) /
                1000,
            );

          setLeft(
            ms <=
              0
              ? 'EXPIRED'
              : `${String(
                  minutes,
                ).padStart(
                  2,
                  '0',
                )}:${String(
                  seconds,
                ).padStart(
                  2,
                  '0',
                )}`,
          );
        };

      tick();

      const id =
        window.setInterval(
          tick,
          1000,
        );

      return () =>
        window.clearInterval(
          id,
        );
    },
    [
      expiry,
    ],
  );

  const status =
    String(
      data?.status ||
        'pending',
    ).toLowerCase();

  const rawStepIndex =
    steps.findIndex(
      (
        step,
      ) =>
        step[0] ===
          status ||
        (
          status ===
            'completed' &&
          step[0] ===
            'ready'
        ),
    );

  const idx =
    Math.max(
      0,
      rawStepIndex,
    );

  const payment =
    String(
      data?.payment_status ??
        data?.paymentStatus ??
        '1',
    );

  const method =
    String(
      data?.payment_method ??
        data?.paymentMethod ??
        'qris',
    ).toLowerCase();

  const qr =
    data?.qr_string ||
    data?.qrString;

  const qrUrl =
    data?.qr_url ||
    data?.qrUrl;

  const isReady =
    status ===
      'ready' ||
    status ===
      'completed';

  const title =
    isReady
      ? 'READY TO SERVE'
      : status ===
          'preparing'
        ? 'PREPARING YOUR ORDER'
        : status ===
            'confirmed'
          ? 'ORDER CONFIRMED'
          : 'ORDER RECEIVED';

  const mins =
    status ===
      'pending'
      ? est.confirmed
      : status ===
          'confirmed'
        ? est.preparing
        : status ===
            'preparing'
          ? est.ready
          : 0;

  const isTakeaway =
    String(
      data?.manual_table_info ??
        data?.manualTableInfo ??
        '',
    )
      .trim()
      .toLowerCase() ===
    'takeaway';

  const tableLabel =
    isTakeaway
      ? 'Takeaway'
      : data?.table_name ||
        data?.tableName ||
        'Walk-in';

  if (
    !currentOrder &&
    !data
  ) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center bg-stone-50 px-6 text-center">
        <PackageCheck className="h-10 w-10 text-black/20" />

        <h2 className="mt-4 text-2xl font-black">
          No active order
        </h2>

        <button
          type="button"
          onClick={
            onBackToMenu
          }
          className="mt-5 rounded-full bg-black px-6 py-3 text-xs font-black text-white"
        >
          Back to menu
        </button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-full pb-32 ${
        isReady
          ? 'bg-black text-white'
          : 'bg-stone-50 text-black'
      }`}
    >
      <header className="flex items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={
            onBackToMenu
          }
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isReady
              ? 'bg-white/10'
              : 'border border-black/10 bg-white'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className="font-mono text-xs font-black">
          #{code}
        </span>
      </header>

      <main className="px-4">
        <p
          className={`mt-4 text-[9px] font-black uppercase tracking-[.2em] ${
            isReady
              ? 'text-white/35'
              : 'text-black/30'
          }`}
        >
          Live order
        </p>

        <h1 className="mt-3 text-[48px] font-black leading-[.82] tracking-[-.075em]">
          {title}
        </h1>

        {mins >
          0 && (
          <div className="my-10 flex items-end gap-3">
            <span className="text-8xl font-black leading-none tracking-[-.1em]">
              {mins}
            </span>

            <span className="pb-2 text-[10px] font-black uppercase tracking-[.18em] opacity-40">
              min
              <br />
              estimated
            </span>
          </div>
        )}

        <div
          className={`mt-10 overflow-hidden rounded-[28px] ${
            isReady
              ? 'bg-white text-black'
              : 'bg-black text-white'
          }`}
        >
          {steps.map(
            (
              [
                id,
                label,
                Icon,
              ],
              index,
            ) => (
              <div
                key={
                  id
                }
                className={`flex items-center gap-4 px-5 py-4 ${
                  index
                    ? 'border-t border-current/10'
                    : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    index <=
                    idx
                      ? isReady
                        ? 'bg-black text-white'
                        : 'bg-white text-black'
                      : 'bg-current/10'
                  }`}
                >
                  {index <
                  idx ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>

                <span className="flex-1 text-sm font-black">
                  {label}
                </span>

                <span className="text-[9px] font-black uppercase tracking-[.12em] opacity-35">
                  {index <
                  idx
                    ? 'Done'
                    : index ===
                        idx
                      ? 'Now'
                      : 'Next'}
                </span>
              </div>
            ),
          )}
        </div>

        {payment ===
          '1' &&
          method ===
            'cash' &&
          code && (
            <div className="mt-5 overflow-hidden rounded-3xl border border-amber-300 bg-amber-100 text-amber-950">
              <div className="flex items-start justify-between gap-4 border-b border-amber-950/10 p-5">
                <div>
                  <Banknote className="h-5 w-5" />

                  <h3 className="mt-4 text-xl font-black">
                    Pay at
                    cashier
                  </h3>

                  <p className="mt-2 max-w-[260px] text-xs leading-5 opacity-70">
                    Tunjukkan
                    QR kode
                    pesanan ini
                    ke kasir
                    untuk
                    menyelesaikan
                    pembayaran
                    tunai.
                  </p>
                </div>

                <span className="rounded-full bg-amber-950 px-3 py-1 text-[8px] font-black uppercase tracking-[.14em] text-amber-100">
                  Unpaid
                </span>
              </div>

              <div className="p-5">
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-[24px] border border-amber-950/10 bg-white p-4">
                  <QRCodeSVG
                    value={
                      String(
                        code,
                      )
                    }
                    className="h-full w-full"
                    bgColor="#ffffff"
                    fgColor="#1c1917"
                    level="H"
                  />
                </div>

                <div className="mt-5 text-center">
                  <p className="text-[9px] font-black uppercase tracking-[.16em] opacity-45">
                    Order
                    code
                  </p>

                  <p className="mt-1 font-mono text-2xl font-black tracking-[.08em]">
                    #{code}
                  </p>
                </div>
              </div>
            </div>
          )}

        {payment ===
          '1' &&
          method ===
            'qris' && (
            <div className="mt-5 rounded-3xl border border-black/10 bg-white p-5 text-black">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/35">
                    QRIS
                    payment
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Complete
                    payment
                  </h3>
                </div>

                {left && (
                  <span
                    className={`font-mono text-xs font-black ${
                      left ===
                      'EXPIRED'
                        ? 'text-red-600'
                        : 'text-amber-700'
                    }`}
                  >
                    {left}
                  </span>
                )}
              </div>

              <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-2xl border border-black/10 bg-white p-3">
                {qr ? (
                  <QRCodeSVG
                    value={
                      String(
                        qr,
                      )
                    }
                    className="h-full w-full"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                ) : qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      qrUrl
                    }
                    alt="QRIS"
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-black/20" />

                    <QrCode className="mt-3 h-12 w-12 text-black/10" />

                    <p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-black/25">
                      Preparing
                      QRIS
                    </p>
                  </div>
                )}
              </div>

              <p className="mx-auto mt-4 max-w-[280px] text-center text-[11px] font-medium leading-5 text-black/50">
                Scan
                menggunakan
                aplikasi bank
                atau e-wallet.
                Status akan
                diperbarui
                otomatis
                setelah
                pembayaran
                berhasil.
              </p>
            </div>
          )}

        <div className="mt-6 flex items-center justify-between border-y border-current/10 py-4">
          <span className="text-[9px] font-black uppercase tracking-[.16em] opacity-35">
            {isTakeaway
              ? 'Takeaway'
              : 'Table'}
          </span>

          <b className="text-sm">
            {tableLabel}
          </b>
        </div>
      </main>
    </div>
  );
}
