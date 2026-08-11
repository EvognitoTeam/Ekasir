'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type InstallChoice = {
  outcome:
    | 'accepted'
    | 'dismissed';

  platform:
    string;
};

interface BeforeInstallPromptEvent
  extends Event {
  readonly platforms:
    string[];

  readonly userChoice:
    Promise<InstallChoice>;

  prompt():
    Promise<void>;
}

function isStandaloneMode():
boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const standaloneMedia =
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches;

  const iosStandalone =
    (
      window.navigator as
        Navigator & {
          standalone?:
            boolean;
        }
    ).standalone ===
    true;

  return (
    standaloneMedia ||
    iosStandalone
  );
}

function isIosDevice():
boolean {
  if (
    typeof navigator ===
    'undefined'
  ) {
    return false;
  }

  return /iphone|ipad|ipod/i.test(
    navigator.userAgent,
  );
}

export default function PwaInstallButton() {
  const [
    installEvent,
    setInstallEvent,
  ] =
    useState<
      BeforeInstallPromptEvent |
      null
    >(
      null,
    );

  const [
    installed,
    setInstalled,
  ] =
    useState(
      false,
    );

  const [
    showIosHelp,
    setShowIosHelp,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      setInstalled(
        isStandaloneMode(),
      );

      const onBeforeInstallPrompt =
        (
          event:
            Event,
        ) => {
          event.preventDefault();

          setInstallEvent(
            event as
              BeforeInstallPromptEvent,
          );
        };

      const onInstalled =
        () => {
          setInstalled(
            true,
          );

          setInstallEvent(
            null,
          );

          setShowIosHelp(
            false,
          );
        };

      window.addEventListener(
        'beforeinstallprompt',
        onBeforeInstallPrompt,
      );

      window.addEventListener(
        'appinstalled',
        onInstalled,
      );

      return () => {
        window.removeEventListener(
          'beforeinstallprompt',
          onBeforeInstallPrompt,
        );

        window.removeEventListener(
          'appinstalled',
          onInstalled,
        );
      };
    },
    [],
  );

  const label =
    useMemo(
      () => {
        if (
          installed
        ) {
          return 'PWA Terpasang';
        }

        return 'Unduh Aplikasi';
      },
      [
        installed,
      ],
    );

  const handleInstall =
    useCallback(
      async () => {
        if (
          installed
        ) {
          return;
        }

        if (
          installEvent
        ) {
          await installEvent
            .prompt();

          const choice =
            await installEvent
              .userChoice;

          if (
            choice.outcome ===
            'accepted'
          ) {
            setInstalled(
              true,
            );
          }

          setInstallEvent(
            null,
          );

          return;
        }

        if (
          isIosDevice()
        ) {
          setShowIosHelp(
            true,
          );

          return;
        }

        /*
         * Browser belum mengirim beforeinstallprompt.
         * Pengguna masih dapat memakai menu browser:
         * Install app / Tambahkan ke layar utama.
         */
        window.alert(
          'Pilih menu browser, lalu tekan "Install app" atau "Tambahkan ke layar utama". Pastikan situs dibuka melalui HTTPS.',
        );
      },
      [
        installEvent,
        installed,
      ],
    );

  return (
    <>
      <button
        type="button"
        onClick={
          handleInstall
        }
        disabled={
          installed
        }
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-default disabled:bg-slate-400"
      >
        {label}
      </button>

      {showIosHelp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cara memasang Evokasir"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={
            () =>
              setShowIosHelp(
                false,
              )
          }
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={
              (
                event,
              ) =>
                event.stopPropagation()
            }
          >
            <h2 className="text-lg font-bold text-slate-900">
              Pasang Evokasir
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Di Safari, tekan tombol Bagikan, lalu pilih
              <strong>
                {' '}
                Tambahkan ke Layar Utama
              </strong>
              .
            </p>

            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={
                () =>
                  setShowIosHelp(
                    false,
                  )
              }
            >
              Mengerti
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
