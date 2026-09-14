'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Swal from 'sweetalert2';

type InstallChoice = {
  outcome:
    | 'accepted'
    | 'dismissed';
  platform: string;
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

type Props = {
  variant?:
    | 'floating'
    | 'header';

  className?: string;
};

function isStandaloneMode():
boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  const displayModeStandalone =
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
    displayModeStandalone ||
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

function isGoogleChrome():
boolean {
  if (
    typeof navigator ===
    'undefined'
  ) {
    return false;
  }

  const nav =
    navigator as Navigator & {
      userAgentData?: {
        brands?: Array<{
          brand: string;
          version: string;
        }>;
      };
    };

  const brands =
    nav.userAgentData?.brands ??
    [];

  if (
    brands.length >
    0
  ) {
    return brands.some(
      ({ brand }) =>
        brand ===
        'Google Chrome',
    );
  }

  const ua =
    navigator.userAgent;

  const isChrome =
    /Chrome|CriOS/i.test(
      ua,
    );

  const isOtherChromium =
    /Edg|OPR|Opera|SamsungBrowser|Vivaldi/i.test(
      ua,
    );

  return (
    isChrome &&
    !isOtherChromium
  );
}

function DownloadIcon({
  className = '',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={
        className
      }
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function PwaInstallButton({
  variant = 'floating',
  className = '',
}: Props) {
  const [
    installEvent,
    setInstallEvent,
  ] =
    useState<
      BeforeInstallPromptEvent |
      null
    >(null);

  const [
    installed,
    setInstalled,
  ] =
    useState(false);

  useEffect(
    () => {
      setInstalled(
        isStandaloneMode(),
      );

      /*
       * Popup rekomendasi browser sengaja TIDAK memakai sessionStorage.
       * CashierLayout akan tetap mounted selama navigasi internal Next.js,
       * jadi popup tidak muncul setiap pindah menu, tetapi akan muncul lagi
       * ketika halaman Cashier dibuka ulang melalui browser non-Chrome.
       */
      if (
        !isGoogleChrome() &&
        !isStandaloneMode()
      ) {
        void Swal.fire({
          icon:
            'warning',
          title:
            'Disarankan menggunakan Google Chrome',
          html:
            `
              <div style="text-align:left;line-height:1.65">
                <p style="margin:0 0 12px">
                  Untuk penggunaan <b>KALOO POS Kasir</b> yang paling kompatibel,
                  kami menyarankan menggunakan <b>Google Chrome</b>.
                </p>

                <div style="
                  padding:12px 14px;
                  border-radius:12px;
                  background:#f5f5f4;
                ">
                  <b>Kenapa Chrome?</b><br/>
                  Beberapa fitur seperti printer Bluetooth / USB,
                  instalasi PWA, dan integrasi perangkat browser
                  dapat memiliki dukungan yang lebih terbatas
                  pada browser lain.
                </div>
              </div>
            `,
          confirmButtonText:
            'Tetap lanjut',
          confirmButtonColor:
            '#111111',
          allowOutsideClick:
            true,
        });
      }

      const onBeforeInstallPrompt =
        (
          event: Event,
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
      () =>
        installEvent
          ? 'Install App'
          : 'Install PWA',
      [
        installEvent,
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
          await Swal.fire({
            icon:
              'info',
            title:
              'Pasang KALOO POS',
            html:
              'Di Safari, tekan tombol <b>Bagikan</b>, lalu pilih <b>Tambahkan ke Layar Utama</b>.',
            confirmButtonText:
              'Mengerti',
            confirmButtonColor:
              '#111111',
          });

          return;
        }

        await Swal.fire({
          icon:
            'info',
          title:
            'Install PWA belum tersedia',
          html:
            `
              Browser belum menyediakan prompt instalasi.
              <br/><br/>
              Buka halaman ini melalui <b>Google Chrome</b>
              pada situs HTTPS, lalu pilih <b>Install app</b>.
            `,
          confirmButtonText:
            'Mengerti',
          confirmButtonColor:
            '#111111',
        });
      },
      [
        installEvent,
        installed,
      ],
    );

  if (
    installed
  ) {
    return null;
  }

  const buttonClass =
    variant ===
    'header'
      ? [
          'inline-flex h-10 items-center justify-center gap-2',
          'rounded-xl border border-black/10 bg-white px-3',
          'text-xs font-black text-black shadow-sm transition',
          'hover:bg-stone-50 active:scale-[0.98]',
          className,
        ].join(' ')
      : [
          'fixed bottom-5 right-5 z-[80]',
          'inline-flex h-12 items-center justify-center gap-2',
          'rounded-2xl border border-black/10 bg-black px-4',
          'text-sm font-black text-white',
          'shadow-[0_14px_40px_rgba(0,0,0,0.22)]',
          'transition hover:-translate-y-0.5 hover:bg-black/85',
          'active:scale-[0.98] sm:bottom-6 sm:right-6',
          className,
        ].join(' ');

  return (
    <button
      type="button"
      onClick={
        handleInstall
      }
      className={
        buttonClass
      }
      title="Install KALOO POS"
      aria-label="Install KALOO POS"
    >
      <DownloadIcon
        className={
          variant ===
          'header'
            ? 'h-4 w-4'
            : 'h-[18px] w-[18px]'
        }
      />

      <span>
        {label}
      </span>
    </button>
  );
}
