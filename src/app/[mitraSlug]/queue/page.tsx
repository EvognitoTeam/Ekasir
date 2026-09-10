'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  CheckCheck,
  ChefHat,
  CircleDot,
  Clock3,
  RefreshCw,
  Store,
  Volume2,
  VolumeX,
} from 'lucide-react';

import {
  useParams,
  useSearchParams,
} from 'next/navigation';

type QueueOrderStatus =
  | 'preparing'
  | 'ready';

type QueueOrder = {
  id: number;
  orderCode: string;
  customerName: string | null;
  status: QueueOrderStatus;
  createdAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
};

type QueueStore = {
  name: string;
  mitraName: string;
  branchName: string | null;
  banner: string | null;
};

type QueueResponse = {
  success: boolean;
  message?: string;
  data?: {
    store: QueueStore;
    preparing: QueueOrder[];
    ready: QueueOrder[];
    serverTime: string;
  };
};

type AnnouncementItem = {
  orderId: number;
  customerName: string | null;
  orderCode: string;
};

const ANNOUNCE_REPEAT_MS =
  60_000;

const POLLING_MS =
  5_000;

function normalizeText(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function getTimestamp(
  value: string | null,
): number {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isFinite(
    timestamp,
  )
    ? timestamp
    : 0;
}

function formatAge(
  order: QueueOrder,
  now: number,
): string {
  const anchor =
    getTimestamp(
      order.status ===
        'ready'
        ? order.readyAt ??
            order.preparingAt ??
            order.createdAt
        : order.preparingAt ??
            order.createdAt,
    );

  if (
    anchor <= 0 ||
    now <= anchor
  ) {
    return '--:--';
  }

  const totalSeconds =
    Math.floor(
      (
        now -
        anchor
      ) /
        1000,
    );

  const minutes =
    Math.floor(
      totalSeconds /
        60,
    );

  const seconds =
    totalSeconds %
    60;

  if (
    minutes >=
    60
  ) {
    const hours =
      Math.floor(
        minutes /
          60,
      );

    const restMinutes =
      minutes %
      60;

    return `${String(
      hours,
    ).padStart(
      2,
      '0',
    )}:${String(
      restMinutes,
    ).padStart(
      2,
      '0',
    )}`;
  }

  return `${String(
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
}

function formatClock(
  date: Date,
): string {
  return date.toLocaleTimeString(
    'id-ID',
    {
      hour:
        '2-digit',
      minute:
        '2-digit',
      second:
        '2-digit',
    },
  );
}

function formatDate(
  date: Date,
): string {
  return date.toLocaleDateString(
    'id-ID',
    {
      weekday:
        'long',
      day:
        '2-digit',
      month:
        'long',
    },
  );
}

/**
 * Membuat kode order lebih natural saat dibaca TTS Indonesia.
 *
 * Contoh:
 * - A102   -> "A, 102"
 * - ORD12  -> "O R D, 12"
 * - 105    -> "105"
 *
 * Angka tidak lagi dieja digit-per-digit karena terdengar terlalu robotik.
 */
function formatOrderCodeForSpeech(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        '',
      );

  if (!normalized) {
    return '';
  }

  /*
   * Kode order KALOO berbentuk alfanumerik seperti M8QTY0.
   * Setiap karakter dibaca eksplisit supaya TTS tidak menebak kode
   * tersebut sebagai satu kata.
   */
  const letterSpeech:
    Record<string, string> = {
      A: 'a',
      B: 'be',
      C: 'ce',
      D: 'de',
      E: 'e',
      F: 'ef',
      G: 'ge',
      H: 'ha',
      I: 'i',
      J: 'je',
      K: 'ka',
      L: 'el',
      M: 'em',
      N: 'en',
      O: 'o',
      P: 'pe',
      Q: 'kiu',
      R: 'er',
      S: 'es',
      T: 'te',
      U: 'u',
      V: 've',
      W: 'we',
      X: 'eks',
      Y: 'ye',
      Z: 'zet',
    };

  const digitSpeech:
    Record<string, string> = {
      '0': 'nol',
      '1': 'satu',
      '2': 'dua',
      '3': 'tiga',
      '4': 'empat',
      '5': 'lima',
      '6': 'enam',
      '7': 'tujuh',
      '8': 'delapan',
      '9': 'sembilan',
    };

  return normalized
    .split('')
    .map(
      (character) =>
        letterSpeech[
          character
        ] ??
        digitSpeech[
          character
        ] ??
        character,
    )
    .join(', ');
}

export default function QueueDisplayPage() {
  const params =
    useParams<{
      mitraSlug:
        string;
    }>();

  const searchParams =
    useSearchParams();

  const slug =
    String(
      params.mitraSlug ??
        '',
    );

  const branchSlug =
    normalizeText(
      searchParams.get(
        'branch_slug',
      ),
    );

  const [
    store,
    setStore,
  ] =
    useState<QueueStore>({
      name:
        'Memuat Toko...',
      mitraName:
        'Memuat Toko...',
      branchName:
        null,
      banner:
        null,
    });

  const [
    preparingOrders,
    setPreparingOrders,
  ] =
    useState<
      QueueOrder[]
    >([]);

  const [
    readyOrders,
    setReadyOrders,
  ] =
    useState<
      QueueOrder[]
    >([]);

  const [
    currentTime,
    setCurrentTime,
  ] =
    useState(
      () =>
        new Date(),
    );

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    lastSyncAt,
    setLastSyncAt,
  ] =
    useState<
      Date | null
    >(null);

  const [
    bannerFailed,
    setBannerFailed,
  ] =
    useState(false);

  const [
    voiceEnabled,
    setVoiceEnabled,
  ] =
    useState(true);

  const voicesRef =
    useRef<
      SpeechSynthesisVoice[]
    >([]);

  const lastAnnouncedTime =
    useRef<
      Map<
        number,
        number
      >
    >(
      new Map(),
    );

  const announcementQueueRef =
    useRef<
      AnnouncementItem[]
    >([]);

  const isSpeakingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      if (
        typeof window !==
          'undefined' &&
        'speechSynthesis' in
          window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    setBannerFailed(
      false,
    );
  }, [
    store.banner,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date(),
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  useEffect(() => {
    if (
      typeof window ===
        'undefined' ||
      !(
        'speechSynthesis' in
        window
      )
    ) {
      return;
    }

    const loadVoices =
      () => {
        const voices =
          window.speechSynthesis.getVoices();

        if (
          voices.length >
          0
        ) {
          voicesRef.current =
            voices;
        }
      };

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
      loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged =
        null;
    };
  }, []);

  const getPreferredVoice =
    useCallback(
      () => {
        if (
          typeof window ===
            'undefined' ||
          !(
            'speechSynthesis' in
              window
          )
        ) {
          return null;
        }

        const voices =
          voicesRef.current.length >
          0
            ? voicesRef.current
            : window.speechSynthesis.getVoices();

        const indonesian =
          voices.filter(
            (
              voice,
            ) => {
              const lang =
                voice.lang.toLowerCase();

              return (
                lang ===
                  'id-id' ||
                lang.startsWith(
                  'id-',
                ) ||
                lang ===
                  'id'
              );
            },
          );

        /**
         * Jangan rotasi voice setiap pengumuman.
         * Pergantian voice membuat karakter suara terdengar tidak konsisten
         * dan pada beberapa mesin TTS terasa jauh lebih "aneh".
         *
         * Prioritas:
         * 1. voice Indonesia bertanda Natural / Online
         * 2. Microsoft Gadis
         * 3. Google Indonesia
         * 4. voice Indonesia apa pun
         * 5. default browser
         */
        const scoreVoice =
          (
            voice:
              SpeechSynthesisVoice,
          ) => {
            const name =
              voice.name.toLowerCase();

            let score =
              0;

            if (
              name.includes(
                'natural',
              )
            ) {
              score +=
                100;
            }

            if (
              name.includes(
                'online',
              )
            ) {
              score +=
                70;
            }

            if (
              name.includes(
                'gadis',
              )
            ) {
              score +=
                60;
            }

            if (
              name.includes(
                'google',
              )
            ) {
              score +=
                50;
            }

            if (
              name.includes(
                'indonesia',
              ) ||
              name.includes(
                'indonesian',
              )
            ) {
              score +=
                25;
            }

            if (
              voice.default
            ) {
              score +=
                10;
            }

            return score;
          };

        const candidates =
          (
            indonesian.length >
            0
              ? indonesian
              : voices
          )
            .slice()
            .sort(
              (
                first,
                second,
              ) =>
                scoreVoice(
                  second,
                ) -
                scoreVoice(
                  first,
                ),
            );

        return (
          candidates[0] ??
          null
        );
      },
      [],
    );

  const processAnnouncementQueue =
    useCallback(
      () => {
        if (
          !voiceEnabled ||
          isSpeakingRef.current ||
          typeof window ===
            'undefined' ||
          !(
            'speechSynthesis' in
              window
          )
        ) {
          return;
        }

        const next =
          announcementQueueRef.current.shift();

        if (!next) {
          return;
        }

        isSpeakingRef.current =
          true;

        const cleanName =
          normalizeText(
            next.customerName,
          );

        const spokenCode =
          formatOrderCodeForSpeech(
            next.orderCode,
          );

        let speech =
          `Nomor pesanan ${spokenCode}. `;

        if (
          cleanName &&
          cleanName.toLowerCase() !==
            'pelanggan umum'
        ) {
          speech +=
            `Atas nama ${cleanName}. `;
        }

        speech +=
          'Pesanan Anda sudah siap. Silakan mengambil pesanan di kasir. Terima kasih.';

        const utterance =
          new SpeechSynthesisUtterance(
            speech,
          );

        utterance.lang =
          'id-ID';

        /**
         * Sedikit lebih lambat dan pitch netral terdengar lebih natural
         * pada voice Windows/Chrome dibanding pitch yang dinaikkan.
         */
        utterance.rate =
          0.86;

        utterance.pitch =
          1.0;

        utterance.volume =
          1.0;

        const voice =
          getPreferredVoice();

        if (voice) {
          utterance.voice =
            voice;
        }

        const finish =
          () => {
            isSpeakingRef.current =
              false;

            if (
              mountedRef.current
            ) {
              window.setTimeout(
                () => {
                  processAnnouncementQueue();
                },
                350,
              );
            }
          };

        utterance.onend =
          finish;

        utterance.onerror =
          finish;

        window.speechSynthesis.speak(
          utterance,
        );
      },
      [
        getPreferredVoice,
        voiceEnabled,
      ],
    );

  const enqueueAnnouncement =
    useCallback(
      (
        item:
          AnnouncementItem,
      ) => {
        if (
          !voiceEnabled
        ) {
          return;
        }

        const alreadyQueued =
          announcementQueueRef.current.some(
            (
              queued,
            ) =>
              queued.orderId ===
              item.orderId,
          );

        if (
          alreadyQueued
        ) {
          return;
        }

        announcementQueueRef.current.push(
          item,
        );

        processAnnouncementQueue();
      },
      [
        processAnnouncementQueue,
        voiceEnabled,
      ],
    );

  useEffect(() => {
    if (
      voiceEnabled
    ) {
      processAnnouncementQueue();
      return;
    }

    announcementQueueRef.current =
      [];

    if (
      typeof window !==
        'undefined' &&
      'speechSynthesis' in
        window
    ) {
      window.speechSynthesis.cancel();
    }

    isSpeakingRef.current =
      false;
  }, [
    processAnnouncementQueue,
    voiceEnabled,
  ]);

  const fetchQueue =
    useCallback(
      async (
        silent =
          false,
      ) => {
        if (!slug) {
          return;
        }

        if (!silent) {
          setIsRefreshing(
            true,
          );
        }

        try {
          const query =
            new URLSearchParams({
              slug,
            });

          if (
            branchSlug
          ) {
            query.set(
              'branch_slug',
              branchSlug,
            );
          }

          const response =
            await fetch(
              `/api/queue?${query.toString()}`,
              {
                method:
                  'GET',
                cache:
                  'no-store',
                headers: {
                  Accept:
                    'application/json',
                },
              },
            );

          const result =
            await response.json() as
              QueueResponse;

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                'Gagal memuat antrean.',
            );
          }

          const now =
            Date.now();

          const nextReady =
            Array.isArray(
              result.data.ready,
            )
              ? result.data.ready
              : [];

          nextReady.forEach(
            (
              order,
            ) => {
              const lastTime =
                lastAnnouncedTime.current.get(
                  order.id,
                ) ??
                0;

              if (
                now -
                  lastTime >=
                ANNOUNCE_REPEAT_MS
              ) {
                enqueueAnnouncement({
                  orderId:
                    order.id,
                  customerName:
                    order.customerName,
                  orderCode:
                    order.orderCode,
                });

                lastAnnouncedTime.current.set(
                  order.id,
                  now,
                );
              }
            },
          );

          const currentReadyIds =
            new Set(
              nextReady.map(
                (
                  order,
                ) =>
                  order.id,
              ),
            );

          for (
            const id of
            lastAnnouncedTime.current.keys()
          ) {
            if (
              !currentReadyIds.has(
                id,
              )
            ) {
              lastAnnouncedTime.current.delete(
                id,
              );
            }
          }

          setStore(
            result.data.store,
          );

          setPreparingOrders(
            Array.isArray(
              result.data.preparing,
            )
              ? result.data.preparing
              : [],
          );

          setReadyOrders(
            nextReady,
          );

          setIsOnline(
            true,
          );

          setLastSyncAt(
            new Date(),
          );
        } catch (
          error
        ) {
          console.error(
            '[QUEUE_FETCH_ERROR]',
            error,
          );

          setIsOnline(
            false,
          );
        } finally {
          if (!silent) {
            setIsRefreshing(
              false,
            );
          }
        }
      },
      [
        branchSlug,
        enqueueAnnouncement,
        slug,
      ],
    );

  useEffect(() => {
    void fetchQueue();

    const interval =
      window.setInterval(
        () => {
          void fetchQueue(
            true,
          );
        },
        POLLING_MS,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    fetchQueue,
  ]);

  const nowTimestamp =
    currentTime.getTime();

  const readyPrimary =
    readyOrders[0] ??
    null;

  const otherReadyOrders =
    readyOrders.slice(
      1,
    );

  const bannerAvailable =
    Boolean(
      store.banner,
    ) &&
    !bannerFailed;

  const syncLabel =
    useMemo(
      () => {
        if (
          !lastSyncAt
        ) {
          return 'Menunggu sinkronisasi';
        }

        return `Sinkron ${lastSyncAt.toLocaleTimeString(
          'id-ID',
          {
            hour:
              '2-digit',
            minute:
              '2-digit',
          },
        )}`;
      },
      [
        lastSyncAt,
      ],
    );

  return (
    <div className="h-screen w-full overflow-hidden bg-[#ecece8] font-sans text-black">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-[#0b0b0b] text-white">
          <div className="flex min-h-20 items-center justify-between gap-5 px-5 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-black">
                {bannerAvailable ? (
                  <img
                    src={
                      store.banner ??
                      ''
                    }
                    alt={
                      store.mitraName
                    }
                    className="h-full w-full object-contain p-1.5"
                    onError={() =>
                      setBannerFailed(
                        true,
                      )
                    }
                  />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                    KALOO Queue
                  </p>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
                      isOnline
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'bg-red-400/10 text-red-300'
                    }`}
                  >
                    <CircleDot className="h-3 w-3 fill-current" />

                    {isOnline
                      ? 'LIVE'
                      : 'OFFLINE'}
                  </span>
                </div>

                <h1 className="mt-1 truncate text-xl font-black tracking-[-0.03em] lg:text-2xl">
                  {store.name}
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              <div className="text-right">
                <p className="text-xs font-bold capitalize text-white/35">
                  {formatDate(
                    currentTime,
                  )}
                </p>

                <p className="mt-0.5 font-mono text-2xl font-black tracking-[-0.03em]">
                  {formatClock(
                    currentTime,
                  )}
                </p>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <div>
                <p className="text-xs font-bold text-white/35">
                  Disiapkan
                </p>

                <p className="mt-0.5 text-2xl font-black">
                  {preparingOrders.length}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-white/35">
                  Siap diambil
                </p>

                <p className="mt-0.5 text-2xl font-black">
                  {readyOrders.length}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setVoiceEnabled(
                    (
                      current,
                    ) =>
                      !current,
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition hover:bg-white/10"
                title={
                  voiceEnabled
                    ? 'Matikan pengumuman'
                    : 'Aktifkan pengumuman'
                }
                aria-label={
                  voiceEnabled
                    ? 'Matikan pengumuman'
                    : 'Aktifkan pengumuman'
                }
              >
                {voiceEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5 text-white/45" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  void fetchQueue();
                }}
                disabled={
                  isRefreshing
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition hover:bg-white/10 disabled:opacity-40"
                title="Muat ulang antrean"
                aria-label="Muat ulang antrean"
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    isRefreshing
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-black/10 xl:grid-cols-[0.92fr_1.25fr]">
          <section className="flex min-h-0 flex-col bg-[#f4f1eb]">
            <div className="flex min-h-20 shrink-0 items-center justify-between border-b border-black/10 px-5 lg:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <ChefHat className="h-5 w-5" />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-black/35">
                    Queue 01
                  </p>

                  <h2 className="mt-0.5 text-xl font-black tracking-[-0.03em]">
                    Sedang Disiapkan
                  </h2>
                </div>
              </div>

              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-black px-3 text-base font-black text-white">
                {preparingOrders.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
              {preparingOrders.length ===
              0 ? (
                <div className="flex h-full min-h-52 items-center justify-center rounded-[28px] border-2 border-dashed border-black/10 bg-white/45 p-8 text-center">
                  <div>
                    <ChefHat className="mx-auto h-10 w-10 text-black/15" />

                    <p className="mt-5 text-xl font-black text-black/45">
                      Belum ada pesanan
                    </p>

                    <p className="mt-2 text-sm font-semibold text-black/30">
                      Pesanan yang sedang diproses akan muncul di sini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid h-full auto-rows-min grid-cols-2 content-start gap-3 2xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {preparingOrders.map(
                      (
                        order,
                      ) => (
                        <motion.div
                          layout
                          key={
                            order.id
                          }
                          initial={{
                            opacity:
                              0,
                            y:
                              10,
                            scale:
                              0.97,
                          }}
                          animate={{
                            opacity:
                              1,
                            y:
                              0,
                            scale:
                              1,
                          }}
                          exit={{
                            opacity:
                              0,
                            scale:
                              0.95,
                          }}
                          className="flex min-h-32 flex-col justify-between rounded-[24px] border border-black/10 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-[0.12em] text-black/30">
                              PREPARING
                            </span>

                            <span className="font-mono text-xs font-black text-black/35">
                              {formatAge(
                                order,
                                nowTimestamp,
                              )}
                            </span>
                          </div>

                          <div className="mt-4">
                            <p className="font-mono text-3xl font-black tracking-[-0.04em] text-black 2xl:text-4xl">
                              {order.orderCode}
                            </p>

                            {order.customerName && (
                              <p className="mt-2 truncate text-sm font-black uppercase tracking-[0.08em] text-black/45">
                                {order.customerName}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ),
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>

          <section className="relative flex min-h-0 flex-col overflow-hidden bg-white">
            <div className="flex min-h-20 shrink-0 items-center justify-between border-b border-black/10 px-5 lg:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <CheckCheck className="h-5 w-5" />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-black/35">
                    Queue 02
                  </p>

                  <h2 className="mt-0.5 text-xl font-black tracking-[-0.03em]">
                    Siap Diambil
                  </h2>
                </div>
              </div>

              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-500 px-3 text-base font-black text-white">
                {readyOrders.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 p-4 lg:p-6">
              {readyPrimary ? (
                <div className="grid h-full min-h-0 grid-rows-[minmax(250px,0.92fr)_minmax(0,1.08fr)] gap-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={
                        readyPrimary.id
                      }
                      initial={{
                        opacity:
                          0,
                        scale:
                          0.97,
                      }}
                      animate={{
                        opacity:
                          1,
                        scale:
                          1,
                      }}
                      exit={{
                        opacity:
                          0,
                        scale:
                          0.98,
                      }}
                      className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-[#0b0b0b] p-6 text-center text-white"
                    >
                      <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-black">
                        <CircleDot className="h-3 w-3 fill-current" />
                        Baru Siap
                      </span>

                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white/35">
                        Silakan Ambil Pesanan
                      </p>

                      <p className="mt-4 font-mono text-6xl font-black tracking-[-0.06em] text-emerald-400 2xl:text-8xl">
                        {readyPrimary.orderCode}
                      </p>

                      {readyPrimary.customerName && (
                        <p className="mt-4 max-w-full truncate text-xl font-black uppercase tracking-[0.08em] text-white/65 2xl:text-2xl">
                          {readyPrimary.customerName}
                        </p>
                      )}

                      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2">
                        <Clock3 className="h-4 w-4 text-white/50" />

                        <span className="font-mono text-sm font-black text-white/65">
                          Siap sejak{' '}
                          {formatAge(
                            readyPrimary,
                            nowTimestamp,
                          )}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="min-h-0 overflow-hidden">
                    {otherReadyOrders.length ===
                    0 ? (
                      <div className="flex h-full items-center justify-center rounded-[28px] border-2 border-dashed border-black/10 bg-[#fafaf8] p-6 text-center">
                        <p className="text-sm font-bold text-black/30">
                          Belum ada pesanan siap lainnya.
                        </p>
                      </div>
                    ) : (
                      <div className="grid auto-rows-min grid-cols-2 gap-3 2xl:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                          {otherReadyOrders.map(
                            (
                              order,
                            ) => (
                              <motion.div
                                layout
                                key={
                                  order.id
                                }
                                initial={{
                                  opacity:
                                    0,
                                  y:
                                    10,
                                }}
                                animate={{
                                  opacity:
                                    1,
                                  y:
                                    0,
                                }}
                                exit={{
                                  opacity:
                                    0,
                                  scale:
                                    0.95,
                                }}
                                className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700/55">
                                    READY
                                  </span>

                                  <span className="font-mono text-xs font-black text-emerald-700/50">
                                    {formatAge(
                                      order,
                                      nowTimestamp,
                                    )}
                                  </span>
                                </div>

                                <p className="mt-4 font-mono text-3xl font-black tracking-[-0.04em] text-emerald-800 2xl:text-4xl">
                                  {order.orderCode}
                                </p>

                                {order.customerName && (
                                  <p className="mt-2 truncate text-sm font-black uppercase tracking-[0.08em] text-emerald-800/55">
                                    {order.customerName}
                                  </p>
                                )}
                              </motion.div>
                            ),
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center rounded-[32px] border-2 border-dashed border-black/10 bg-[#fafaf8] p-8 text-center">
                  <div>
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-black text-white">
                      <CheckCheck className="h-9 w-9" />
                    </span>

                    <h3 className="mt-6 text-3xl font-black tracking-[-0.04em]">
                      Belum ada yang siap
                    </h3>

                    <p className="mx-auto mt-3 max-w-sm text-base font-semibold leading-7 text-black/40">
                      Nomor pesanan akan tampil besar di area ini saat sudah siap diambil.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-t border-black/10 bg-[#f7f7f4] px-5 py-2 lg:px-8">
          <p className="truncate text-sm font-bold text-black/40">
            Perhatikan nomor pesanan Anda. Ambil pesanan saat nomor muncul di bagian
            <strong className="ml-1 text-emerald-700">
              Siap Diambil
            </strong>
            .
          </p>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
              }`}
            />

            <span className="text-xs font-black uppercase tracking-[0.12em] text-black/35">
              {syncLabel}
            </span>

            <span className="hidden text-xs font-black uppercase tracking-[0.14em] text-black/20 sm:inline">
              Powered by KALOO POS
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
