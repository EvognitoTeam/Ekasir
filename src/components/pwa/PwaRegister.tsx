'use client';

import {
  useEffect,
} from 'react';

function canRegisterPwa():
boolean {
  if (
    typeof window ===
    'undefined'
  ) {
    return false;
  }

  if (
    !(
      'serviceWorker' in
      navigator
    )
  ) {
    return false;
  }

  /*
   * localhost dianggap secure context oleh browser.
   * Production tetap wajib HTTPS.
   */
  return window.isSecureContext;
}

export default function PwaRegister() {
  useEffect(
    () => {
      if (
        !canRegisterPwa()
      ) {
        return;
      }

      /*
       * Default:
       * - production: PWA ON
       * - development: PWA OFF agar Next.js HMR tidak bentrok dengan SW
       *
       * Jika benar-benar ingin menguji PWA pada `npm run dev`, tambahkan:
       * NEXT_PUBLIC_ENABLE_PWA_DEV=true
       *
       * Namun pengujian yang paling aman tetap:
       * npm run build && npm start
       */
      const enableInDevelopment =
        process.env
          .NEXT_PUBLIC_ENABLE_PWA_DEV ===
        'true';

      if (
        process.env.NODE_ENV !==
          'production' &&
        !enableInDevelopment
      ) {
        return;
      }

      const register =
        async () => {
          try {
            const registration =
              await navigator
                .serviceWorker
                .register(
                  '/sw.js',
                  {
                    scope:
                      '/',
                    updateViaCache:
                      'none',
                  },
                );

            await registration
              .update();
          } catch (
            error
          ) {
            console.error(
              '[PWA_REGISTER_ERROR]',
              error,
            );
          }
        };

      void register();
    },
    [],
  );

  return null;
}
