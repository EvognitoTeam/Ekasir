/*
 * Tambahkan import berikut ke src/app/layout.tsx:
 */
import PwaRegister
  from '@/components/pwa/PwaRegister';

/*
 * Tambahkan metadata berikut atau gabungkan dengan metadata yang sudah ada:
 */
export const metadata = {
  title:
    'Evokasir POS',

  description:
    'Aplikasi Point of Sale Evokasir',

  manifest:
    '/manifest.webmanifest',

  applicationName:
    'Evokasir POS',

  appleWebApp: {
    capable:
      true,

    title:
      'Evokasir',

    statusBarStyle:
      'default',
  },
};

/*
 * Tempatkan <PwaRegister /> di dalam <body>.
 *
 * Contoh:
 *
 * <body>
 *   <PwaRegister />
 *   {children}
 * </body>
 */
