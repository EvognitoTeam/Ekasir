'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Props = {
  children: ReactNode;
  idleMs?: number;
  countdownSeconds?: number;
  disabled?: boolean;
  onReset: () => void;
};

export default function KioskIdleGuard({
  children,
  idleMs = 90_000,
  countdownSeconds = 15,
  disabled = false,
  onReset,
}: Props) {
  const [
    warningOpen,
    setWarningOpen,
  ] =
    useState(false);

  const [
    remaining,
    setRemaining,
  ] =
    useState(
      countdownSeconds,
    );

  const idleTimerRef =
    useRef<number | null>(
      null,
    );

  const countdownTimerRef =
    useRef<number | null>(
      null,
    );

  const resetTimerRef =
    useRef<number | null>(
      null,
    );

  const clearIdleTimer =
    useCallback(() => {
      if (
        idleTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          idleTimerRef.current,
        );

        idleTimerRef.current =
          null;
      }
    }, []);

  const clearCountdownTimer =
    useCallback(() => {
      if (
        countdownTimerRef.current !==
        null
      ) {
        window.clearInterval(
          countdownTimerRef.current,
        );

        countdownTimerRef.current =
          null;
      }
    }, []);

  const clearResetTimer =
    useCallback(() => {
      if (
        resetTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          resetTimerRef.current,
        );

        resetTimerRef.current =
          null;
      }
    }, []);

  const scheduleIdleWarning =
    useCallback(() => {
      if (disabled) {
        return;
      }

      clearIdleTimer();

      idleTimerRef.current =
        window.setTimeout(
          () => {
            setRemaining(
              countdownSeconds,
            );

            setWarningOpen(
              true,
            );
          },
          idleMs,
        );
    }, [
      clearIdleTimer,
      countdownSeconds,
      disabled,
      idleMs,
    ]);

  const continueSession =
    useCallback(() => {
      clearCountdownTimer();
      clearResetTimer();

      setWarningOpen(
        false,
      );

      setRemaining(
        countdownSeconds,
      );

      scheduleIdleWarning();
    }, [
      clearCountdownTimer,
      clearResetTimer,
      countdownSeconds,
      scheduleIdleWarning,
    ]);

  useEffect(() => {
    if (disabled) {
      clearIdleTimer();
      clearCountdownTimer();
      clearResetTimer();

      const timer =
        window.setTimeout(
          () => {
            setWarningOpen(
              false,
            );

            setRemaining(
              countdownSeconds,
            );
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    }

    const handleActivity =
      () => {
        /*
         * Saat dialog countdown terbuka, aktivitas biasa tidak
         * otomatis menutup dialog. Pengguna harus menekan
         * tombol "Ya, lanjutkan".
         */
        if (
          warningOpen
        ) {
          return;
        }

        scheduleIdleWarning();
      };

    const events = [
      'pointerdown',
      'pointermove',
      'keydown',
      'touchstart',
    ] as const;

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive:
              true,
          },
        );
      },
    );

    const initialTimer =
      window.setTimeout(
        () => {
          scheduleIdleWarning();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        initialTimer,
      );

      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity,
          );
        },
      );

      clearIdleTimer();
    };
  }, [
    clearCountdownTimer,
    clearIdleTimer,
    clearResetTimer,
    countdownSeconds,
    disabled,
    scheduleIdleWarning,
    warningOpen,
  ]);

  useEffect(() => {
    if (
      !warningOpen ||
      disabled
    ) {
      clearCountdownTimer();
      return;
    }

    clearCountdownTimer();

    countdownTimerRef.current =
      window.setInterval(
        () => {
          setRemaining(
            (current) =>
              Math.max(
                0,
                current - 1,
              ),
          );
        },
        1000,
      );

    return () => {
      clearCountdownTimer();
    };
  }, [
    clearCountdownTimer,
    disabled,
    warningOpen,
  ]);

  useEffect(() => {
    if (
      !warningOpen ||
      disabled ||
      remaining > 0
    ) {
      clearResetTimer();
      return;
    }

    clearCountdownTimer();
    clearResetTimer();

    /*
     * onReset memperbarui state milik KioskApp. Pemanggilan
     * dijadwalkan di luar state updater KioskIdleGuard agar
     * React tidak menerima update parent ketika child sedang
     * memproses update state.
     */
    resetTimerRef.current =
      window.setTimeout(
        () => {
          setWarningOpen(
            false,
          );

          onReset();
        },
        0,
      );

    return () => {
      clearResetTimer();
    };
  }, [
    clearCountdownTimer,
    clearResetTimer,
    disabled,
    onReset,
    remaining,
    warningOpen,
  ]);

  useEffect(
    () => () => {
      clearIdleTimer();
      clearCountdownTimer();
      clearResetTimer();
    },
    [
      clearCountdownTimer,
      clearIdleTimer,
      clearResetTimer,
    ],
  );

  return (
    <>
      {children}

      {warningOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#171717]/85 p-4 backdrop-blur-md sm:p-6 lg:p-8">
          <div className="w-full max-w-2xl rounded-[2rem] border-[3px] border-[#171717] bg-white shadow-[10px_10px_0_#c8ff3d] p-6 text-center shadow-2xl sm:rounded-[2rem] sm:p-8 lg:rounded-[2.5rem] lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff5c35] sm:text-sm sm:tracking-[0.28em]">
              Sesi hampir berakhir
            </p>

            <h2 className="mt-4 text-3xl font-black text-stone-950 sm:mt-5 sm:text-4xl lg:text-5xl">
              Masih memesan?
            </h2>

            <p className="mt-4 text-base text-stone-500 sm:mt-5 sm:text-lg lg:text-xl">
              Pesanan akan direset dalam{' '}
              <strong className="text-stone-950">
                {remaining}
              </strong>{' '}
              detik.
            </p>

            <button
              type="button"
              onClick={
                continueSession
              }
              className="mt-6 min-h-16 w-full rounded-2xl bg-stone-950 px-5 text-lg font-black text-white sm:mt-8 sm:min-h-20 sm:text-xl lg:text-2xl"
            >
              Ya, lanjutkan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
