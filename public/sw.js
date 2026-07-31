const CACHE_NAME =
  'evokasir-pwa-v1';

const OFFLINE_URL =
  '/offline';

const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-512.png',
];

self.addEventListener(
  'install',
  (event) => {
    event.waitUntil(
      caches
        .open(
          CACHE_NAME,
        )
        .then(
          (
            cache,
          ) =>
            cache.addAll(
              PRECACHE_URLS,
            ),
        ),
    );

    self.skipWaiting();
  },
);

self.addEventListener(
  'activate',
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then(
          (
            cacheNames,
          ) =>
            Promise.all(
              cacheNames
                .filter(
                  (
                    cacheName,
                  ) =>
                    cacheName !==
                    CACHE_NAME,
                )
                .map(
                  (
                    cacheName,
                  ) =>
                    caches.delete(
                      cacheName,
                    ),
                ),
            ),
        ),
    );

    self.clients.claim();
  },
);

self.addEventListener(
  'fetch',
  (event) => {
    const request =
      event.request;

    if (
      request.method !==
      'GET'
    ) {
      return;
    }

    const url =
      new URL(
        request.url,
      );

    /*
     * Jangan cache route API, checkout, auth, QRIS,
     * atau response yang berhubungan dengan transaksi.
     */
    if (
      url.origin !==
        self.location.origin ||
      url.pathname.startsWith(
        '/api/',
      )
    ) {
      return;
    }

    if (
      request.mode ===
      'navigate'
    ) {
      event.respondWith(
        fetch(
          request,
        )
          .then(
            (
              response,
            ) => {
              const copy =
                response.clone();

              caches
                .open(
                  CACHE_NAME,
                )
                .then(
                  (
                    cache,
                  ) =>
                    cache.put(
                      request,
                      copy,
                    ),
                );

              return response;
            },
          )
          .catch(
            async () =>
              (
                await caches.match(
                  request,
                )
              ) ||
              (
                await caches.match(
                  OFFLINE_URL,
                )
              ),
          ),
      );

      return;
    }

    event.respondWith(
      caches
        .match(
          request,
        )
        .then(
          (
            cached,
          ) => {
            if (
              cached
            ) {
              return cached;
            }

            return fetch(
              request,
            ).then(
              (
                response,
              ) => {
                if (
                  !response ||
                  response.status !==
                    200 ||
                  response.type !==
                    'basic'
                ) {
                  return response;
                }

                const copy =
                  response.clone();

                caches
                  .open(
                    CACHE_NAME,
                  )
                  .then(
                    (
                      cache,
                    ) =>
                      cache.put(
                        request,
                        copy,
                      ),
                  );

                return response;
              },
            );
          },
        ),
    );
  },
);
