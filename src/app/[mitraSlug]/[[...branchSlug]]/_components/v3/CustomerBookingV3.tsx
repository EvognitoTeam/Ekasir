'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Loader2,
  Minus,
  Plus,
} from 'lucide-react';
import {
  useParams,
} from 'next/navigation';

import {
  Toast,
} from '@/utils/toast';

type Props = {
  onBack: () => void;
  cafeName?: string;
};

type BusyInterval = {
  start: string;
  end: string;
  status:
    | 'pending'
    | 'confirmed';
};

type BookingForm = {
  name: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  pax: number;
  notes: string;
};

const RESERVED_CUSTOMER_VIEWS =
  new Set([
    'menu',
    'checkout',
    'tracking',
    'history',
    'help',
    'profile',
    'coupons',
    'roasts',
    'reservation',
  ]);

function toInputDate(
  value:
    Date,
): string {
  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      value.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

function formatBusyTime(
  iso:
    string,
): string {
  const value =
    new Date(iso);

  if (
    Number.isNaN(
      value.getTime(),
    )
  ) {
    return '--:--';
  }

  return value.toLocaleTimeString(
    'id-ID',
    {
      hour:
        '2-digit',
      minute:
        '2-digit',
      hour12:
        false,
    },
  );
}

function formatBookingDate(
  date:
    string,
): string {
  if (!date) {
    return '-';
  }

  const value =
    new Date(
      `${date}T00:00:00`,
    );

  if (
    Number.isNaN(
      value.getTime(),
    )
  ) {
    return date;
  }

  return value.toLocaleDateString(
    'id-ID',
    {
      weekday:
        'short',
      day:
        '2-digit',
      month:
        'short',
      year:
        'numeric',
    },
  );
}

function selectedPeriod(
  form:
    BookingForm,
) {
  if (
    !form.date ||
    !form.startTime ||
    !form.endTime
  ) {
    return null;
  }

  const start =
    new Date(
      `${form.date}T${form.startTime}:00`,
    );

  const end =
    new Date(
      `${form.date}T${form.endTime}:00`,
    );

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

function intervalsOverlap(
  selectedStart:
    Date,
  selectedEnd:
    Date,
  busy:
    BusyInterval,
): boolean {
  const busyStart =
    new Date(
      busy.start,
    );

  const busyEnd =
    new Date(
      busy.end,
    );

  if (
    Number.isNaN(
      busyStart.getTime(),
    ) ||
    Number.isNaN(
      busyEnd.getTime(),
    )
  ) {
    return false;
  }

  return (
    selectedStart <
      busyEnd &&
    selectedEnd >
      busyStart
  );
}

export default function CustomerBookingV3({
  onBack,
  cafeName =
    'Restoran Kami',
}: Props) {
  const params =
    useParams();

  const slug =
    String(
      params.mitraSlug ||
        '',
    );

  const branchSegments =
    Array.isArray(
      params.branchSlug,
    )
      ? params.branchSlug
      : [];

  const branchSlug =
    branchSegments[0] &&
    !RESERVED_CUSTOMER_VIEWS.has(
      branchSegments[0],
    )
      ? branchSegments[0]
      : undefined;

  const [
    step,
    setStep,
  ] =
    useState(0);

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] =
    useState(false);

  const [
    busyIntervals,
    setBusyIntervals,
  ] =
    useState<
      BusyInterval[]
    >([]);

  const [
    availabilityError,
    setAvailabilityError,
  ] =
    useState('');

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    done,
    setDone,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState<BookingForm>({
      name: '',
      phone: '',
      date: '',
      startTime:
        '18:00',
      endTime:
        '20:00',
      pax: 2,
      notes: '',
    });

  const minimumDate =
    useMemo(
      () =>
        toInputDate(
          new Date(),
        ),
      [],
    );

  /*
   * Public availability request.
   *
   * Endpoint only returns:
   * start, end, status.
   *
   * Customer name / phone / table are never exposed.
   */
  useEffect(() => {
    if (
      !slug ||
      !form.date
    ) {
      setBusyIntervals(
        [],
      );
      setAvailabilityError(
        '',
      );
      return;
    }

    const controller =
      new AbortController();

    async function loadAvailability() {
      setAvailabilityLoading(
        true,
      );

      setAvailabilityError(
        '',
      );

      try {
        const query =
          new URLSearchParams({
            slug,
            availability_date:
              form.date,
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
            `/api/pos/reservations?${query.toString()}`,
            {
              method:
                'GET',
              cache:
                'no-store',
              signal:
                controller.signal,
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Gagal memeriksa jadwal reservasi.',
          );
        }

        setBusyIntervals(
          Array.isArray(
            result.data,
          )
            ? result.data
            : [],
        );
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

        console.error(
          'Booking availability error:',
          error,
        );

        setAvailabilityError(
          error instanceof
            Error
            ? error.message
            : 'Gagal memeriksa jadwal reservasi.',
        );
      } finally {
        setAvailabilityLoading(
          false,
        );
      }
    }

    void loadAvailability();

    return () => {
      controller.abort();
    };
  }, [
    branchSlug,
    form.date,
    slug,
  ]);

  const period =
    useMemo(
      () =>
        selectedPeriod(
          form,
        ),
      [form],
    );

  const timeIsValid =
    Boolean(
      period &&
        period.end >
          period.start,
    );

  const conflictingIntervals =
    useMemo(() => {
      if (
        !period ||
        !timeIsValid
      ) {
        return [];
      }

      return busyIntervals.filter(
        (
          interval,
        ) =>
          intervalsOverlap(
            period.start,
            period.end,
            interval,
          ),
      );
    }, [
      busyIntervals,
      period,
      timeIsValid,
    ]);

  const hasConflict =
    conflictingIntervals.length >
    0;

  const canContinue =
    step === 0
      ? Boolean(
          form.date &&
            form.startTime &&
            form.endTime &&
            timeIsValid &&
            !availabilityLoading &&
            !availabilityError &&
            !hasConflict,
        )
      : step === 1
        ? form.pax > 0
        : Boolean(
            form.name.trim() &&
              form.phone.trim(),
          );

  function back() {
    if (
      step === 0
    ) {
      onBack();
      return;
    }

    setStep(
      (
        current,
      ) =>
        current - 1,
    );
  }

  function next() {
    if (
      !canContinue
    ) {
      return;
    }

    if (
      step < 2
    ) {
      setStep(
        (
          current,
        ) =>
          current + 1,
      );
      return;
    }

    void submit();
  }

  async function submit() {
    const selected =
      selectedPeriod(
        form,
      );

    if (
      !selected ||
      selected.end <=
        selected.start
    ) {
      Toast.fire({
        icon:
          'warning',
        title:
          'Waktu reservasi tidak valid.',
      });
      return;
    }

    if (
      hasConflict
    ) {
      Toast.fire({
        icon:
          'warning',
        title:
          'Jam tersebut sudah memiliki reservasi. Pilih waktu lain.',
      });
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `/api/pos/reservations?slug=${encodeURIComponent(
            slug,
          )}`,
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                customer_name:
                  form.name.trim(),
                customer_phone:
                  form.phone.trim(),
                guest_count:
                  form.pax,
                reserved_start:
                  `${form.date}T${form.startTime}:00`,
                reserved_end:
                  `${form.date}T${form.endTime}:00`,
                notes:
                  form.notes.trim() ||
                  null,

                /*
                 * Customer no longer chooses a physical table.
                 * Table assignment can be handled later by staff.
                 */
                table_ids:
                  [],

                /*
                 * Critical for multi-branch customer URLs.
                 */
                branch_slug:
                  branchSlug ||
                  null,
              }),
          },
        );

      const result =
        await response.json();

      if (
        response.status ===
          409 ||
        result.code ===
          'RESERVATION_TIME_CONFLICT'
      ) {
        if (
          Array.isArray(
            result.conflicts,
          )
        ) {
          setBusyIntervals(
            result.conflicts,
          );
        }

        setStep(0);

        throw new Error(
          result.message ||
            'Jam reservasi baru saja terisi. Silakan pilih waktu lain.',
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Gagal membuat reservasi.',
        );
      }

      setDone(true);
    } catch (
      error
    ) {
      Toast.fire({
        icon:
          'error',
        title:
          error instanceof
            Error
            ? error.message
            : 'Gagal membuat reservasi.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-between overflow-y-auto bg-black p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Reservation
            received
          </p>

          <h1 className="mt-7 text-5xl font-black leading-[0.88] tracking-[-0.07em]">
            See you
            <br />
            at the
            table.
          </h1>

          <p className="mt-7 max-w-xs text-sm leading-6 text-white/55">
            Terima kasih,
            {' '}
            {form.name}.
            Reservasi Anda
            menunggu konfirmasi
            restoran.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
              {cafeName}
            </p>

            <p className="mt-3 text-lg font-black">
              {formatBookingDate(
                form.date,
              )}
            </p>

            <p className="mt-1 text-sm text-white/55">
              {form.startTime}
              {' — '}
              {form.endTime}
              {' · '}
              {form.pax}
              {' guest'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onBack
          }
          className="mt-10 h-14 shrink-0 rounded-2xl bg-white text-sm font-black text-black"
        >
          Kembali ke menu
        </button>
      </div>
    );
  }

  return (
    /*
     * Component owns its own height/scroll/footer.
     * Bottom navigation is hidden by CustomerShell on reservation view.
     */
    <div className="flex h-full min-h-0 flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={back}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white active:scale-95"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
            Book a table
          </p>

          <p className="mt-0.5 text-xs font-black">
            {step + 1}
            {' / 3'}
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === 0 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
              Date & time
            </p>

            <h1 className="mt-2 text-[38px] font-black leading-[0.94] tracking-[-0.065em]">
              When are
              <br />
              you coming?
            </h1>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-black/35">
                  Date
                </span>

                <input
                  type="date"
                  min={
                    minimumDate
                  }
                  value={
                    form.date
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      date:
                        event
                          .target
                          .value,
                    })
                  }
                  className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-black/35">
                    Arrival
                  </span>

                  <input
                    type="time"
                    value={
                      form.startTime
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,
                        startTime:
                          event
                            .target
                            .value,
                      })
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-black outline-none focus:border-black"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-black/35">
                    Until
                  </span>

                  <input
                    type="time"
                    value={
                      form.endTime
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,
                        endTime:
                          event
                            .target
                            .value,
                      })
                    }
                    className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-black outline-none focus:border-black"
                  />
                </label>
              </div>
            </div>

            {form.date && (
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-black/30">
                      Existing
                      reservations
                    </p>

                    <p className="mt-1 text-xs text-black/45">
                      Pilih jam di
                      luar periode
                      berikut.
                    </p>
                  </div>

                  {availabilityLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-black/40" />
                  )}
                </div>

                {availabilityError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-700">
                    {availabilityError}
                  </div>
                ) : availabilityLoading ? (
                  <div className="rounded-2xl border border-black/[0.07] bg-white p-4 text-xs text-black/40">
                    Memeriksa
                    jadwal...
                  </div>
                ) : busyIntervals.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                      <CalendarDays className="h-4 w-4" />
                    </span>

                    <div>
                      <p className="text-xs font-black">
                        Jadwal masih
                        kosong
                      </p>

                      <p className="mt-0.5 text-[10px] text-black/40">
                        Belum ada
                        reservasi pada
                        tanggal ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
                    {busyIntervals.map(
                      (
                        interval,
                        index,
                      ) => {
                        const conflict =
                          period &&
                          timeIsValid
                            ? intervalsOverlap(
                                period.start,
                                period.end,
                                interval,
                              )
                            : false;

                        return (
                          <div
                            key={`${interval.start}-${interval.end}-${index}`}
                            className={`flex items-center gap-3 px-4 py-3.5 ${
                              index
                                ? 'border-t border-black/[0.06]'
                                : ''
                            } ${
                              conflict
                                ? 'bg-red-50'
                                : ''
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                conflict
                                  ? 'bg-red-600 text-white'
                                  : 'bg-stone-100 text-black'
                              }`}
                            >
                              <Clock3 className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black">
                                {formatBusyTime(
                                  interval.start,
                                )}
                                {' — '}
                                {formatBusyTime(
                                  interval.end,
                                )}
                              </p>

                              <p
                                className={`mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                                  conflict
                                    ? 'text-red-600'
                                    : 'text-black/30'
                                }`}
                              >
                                {conflict
                                  ? 'Overlaps your selection'
                                  : 'Reserved'}
                              </p>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                {!timeIsValid &&
                  form.startTime &&
                  form.endTime && (
                    <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-800">
                      Jam selesai
                      harus lebih
                      besar dari jam
                      kedatangan.
                    </p>
                  )}

                {hasConflict && (
                  <p className="mt-3 rounded-2xl bg-red-50 p-3 text-[11px] font-bold leading-5 text-red-700">
                    {form.startTime}
                    {'–'}
                    {form.endTime}
                    {' '}
                    bertabrakan
                    dengan reservasi
                    yang sudah ada.
                    Pilih waktu lain.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
              Party
            </p>

            <h1 className="mt-2 text-[38px] font-black leading-[0.94] tracking-[-0.065em]">
              How many
              <br />
              guests?
            </h1>

            <div className="my-14 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    pax:
                      Math.max(
                        1,
                        form.pax -
                          1,
                      ),
                  })
                }
                className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white active:scale-95"
              >
                <Minus className="h-5 w-5" />
              </button>

              <div className="text-center">
                <div className="text-7xl font-black tracking-[-0.08em]">
                  {String(
                    form.pax,
                  ).padStart(
                    2,
                    '0',
                  )}
                </div>

                <div className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-black/30">
                  Guests
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    pax:
                      form.pax +
                      1,
                  })
                }
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-3xl bg-black p-5 text-white">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                Table assignment
              </p>

              <p className="mt-3 text-base font-black">
                Meja dipilih oleh
                restoran.
              </p>

              <p className="mt-2 text-xs leading-5 text-white/45">
                Customer tidak
                perlu memilih meja
                saat reservasi.
                Restoran akan
                menyesuaikan meja
                berdasarkan jumlah
                tamu dan kondisi
                operasional.
              </p>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/30">
              Contact
            </p>

            <h1 className="mt-2 text-[38px] font-black leading-[0.94] tracking-[-0.065em]">
              Who should
              <br />
              we contact?
            </h1>

            <div className="mt-8 space-y-3">
              <input
                value={
                  form.name
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    name:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="Nama lengkap"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
              />

              <input
                value={
                  form.phone
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    phone:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="WhatsApp"
                className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-black"
              />

              <textarea
                value={
                  form.notes
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    notes:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="Catatan khusus (opsional)"
                rows={4}
                className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-sm outline-none focus:border-black"
              />

              <div className="rounded-3xl bg-black p-5 text-white">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                  {cafeName}
                </p>

                <p className="mt-3 text-base font-black">
                  {formatBookingDate(
                    form.date,
                  )}
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {form.startTime}
                  {' — '}
                  {form.endTime}
                  {' · '}
                  {form.pax}
                  {' guest'}
                </p>

                <p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/35">
                  Meja akan
                  ditentukan oleh
                  restoran setelah
                  reservasi
                  dikonfirmasi.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/*
       * Footer is part of the booking layout itself.
       * It is no longer covered by customer bottom navigation.
       */}
      <footer className="shrink-0 border-t border-black/[0.07] bg-stone-50/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <button
          type="button"
          disabled={
            !canContinue ||
            saving
          }
          onClick={next}
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-black px-5 text-white active:scale-[0.99] disabled:bg-stone-300 disabled:text-black/35"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.14em]">
            {step === 2
              ? 'Request reservation'
              : 'Continue'}
          </span>

          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </footer>
    </div>
  );
}
