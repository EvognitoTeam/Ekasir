import type {
  MetadataRoute,
} from 'next';

export default function manifest():
MetadataRoute.Manifest {
  return {
    id:
      '/login',

    name:
      'KALOO POS',

    short_name:
      'Evokasir',

    description:
      'Aplikasi Point of Sale KALOO POS',

    start_url:
      '/login',

    scope:
      '/',

    display:
      'fullscreen',

    orientation:
      'portrait',

    background_color:
      '#ffffff',

    theme_color:
      '#14532d',

    categories: [
      'business',
      'finance',
      'productivity',
    ],

    icons: [
      {
        src:
          '/icons/pwa-192.png',

        sizes:
          '192x192',

        type:
          'image/png',
      },
      {
        src:
          '/icons/pwa-512.png',

        sizes:
          '512x512',

        type:
          'image/png',
      },
      {
        src:
          '/icons/pwa-maskable-512.png',

        sizes:
          '512x512',

        type:
          'image/png',

        purpose:
          'maskable',
      },
    ],
  };
}
