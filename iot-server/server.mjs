import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const PORT =
  Number(
    process.env.IOT_PORT ??
    3010,
  );

const HOST =
  process.env.IOT_HOST ??
  '0.0.0.0';

const NEXT_BASE_URL =
  String(
    process.env.NEXT_INTERNAL_BASE_URL ??
    'http://127.0.0.1:3000',
  ).replace(
    /\/+$/,
    '',
  );

const INTERNAL_SECRET =
  process.env.IOT_INTERNAL_SECRET ??
  '';

/**
 * Phase 1 menggunakan shared device token.
 * Setelah protocol stabil, token ini bisa diganti menjadi
 * token per-device dari tabel iot_devices tanpa mengubah payload snapshot.
 */
const DEVICE_TOKEN =
  process.env.IOT_DEVICE_TOKEN ??
  '';

const HEARTBEAT_MS =
  25_000;

const clientsByTable =
  new Map();

function json(
  response,
  status,
  body,
) {
  response.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8',
      'Cache-Control':
        'no-store',
    },
  );

  response.end(
    JSON.stringify(
      body,
    ),
  );
}

function timingSafeTextEqual(
  left,
  right,
) {
  const a =
    Buffer.from(
      String(
        left ?? '',
      ),
    );

  const b =
    Buffer.from(
      String(
        right ?? '',
      ),
    );

  if (
    a.length !==
    b.length
  ) {
    return false;
  }

  return cryptoTimingSafeEqual(
    a,
    b,
  );
}

function cryptoTimingSafeEqual(
  a,
  b,
) {
  /**
   * Import dinamis tidak diperlukan hanya untuk satu helper kecil:
   * gunakan constant-time-ish comparison sederhana dengan XOR
   * setelah panjang dipastikan sama.
   */
  let result = 0;

  for (
    let index = 0;
    index < a.length;
    index += 1
  ) {
    result |=
      a[index] ^
      b[index];
  }

  return result === 0;
}

function isInternalAuthorized(
  request,
) {
  if (!INTERNAL_SECRET) {
    return false;
  }

  return timingSafeTextEqual(
    request.headers[
      'x-internal-secret'
    ],
    INTERNAL_SECRET,
  );
}

function isDeviceAuthorized(
  token,
) {
  if (!DEVICE_TOKEN) {
    return false;
  }

  return timingSafeTextEqual(
    token,
    DEVICE_TOKEN,
  );
}

function readJsonBody(
  request,
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      let body =
        '';

      request.on(
        'data',
        (chunk) => {
          body +=
            chunk;

          if (
            body.length >
            64 * 1024
          ) {
            reject(
              new Error(
                'Payload terlalu besar.',
              ),
            );

            request.destroy();
          }
        },
      );

      request.on(
        'end',
        () => {
          if (!body) {
            resolve(
              {},
            );

            return;
          }

          try {
            resolve(
              JSON.parse(
                body,
              ),
            );
          } catch {
            reject(
              new Error(
                'JSON tidak valid.',
              ),
            );
          }
        },
      );

      request.on(
        'error',
        reject,
      );
    },
  );
}

function getTableClients(
  tableId,
) {
  let clients =
    clientsByTable.get(
      tableId,
    );

  if (!clients) {
    clients =
      new Set();

    clientsByTable.set(
      tableId,
      clients,
    );
  }

  return clients;
}

function removeClient(
  socket,
) {
  const tableId =
    socket.kalooTableId;

  if (!tableId) {
    return;
  }

  const clients =
    clientsByTable.get(
      tableId,
    );

  if (!clients) {
    return;
  }

  clients.delete(
    socket,
  );

  if (
    clients.size ===
    0
  ) {
    clientsByTable.delete(
      tableId,
    );
  }
}

async function loadTableSnapshot(
  tableId,
) {
  const url =
    new URL(
      '/api/iot/internal/device-snapshot',
      NEXT_BASE_URL,
    );

  url.searchParams.set(
    'tableId',
    String(
      tableId,
    ),
  );

  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers: {
          'X-Internal-Secret':
            INTERNAL_SECRET,
        },

        cache:
          'no-store',
      },
    );

  const text =
    await response.text();

  let body;

  try {
    body =
      JSON.parse(
        text,
      );
  } catch {
    throw new Error(
      `Snapshot API mengembalikan non-JSON (HTTP ${response.status}).`,
    );
  }

  if (
    !response.ok ||
    !body?.success ||
    !body?.data
  ) {
    throw new Error(
      body?.message ??
      `Snapshot API gagal (HTTP ${response.status}).`,
    );
  }

  return body.data;
}

function sendJson(
  socket,
  payload,
) {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return false;
  }

  socket.send(
    JSON.stringify(
      payload,
    ),
  );

  return true;
}

async function syncTable(
  tableId,
  reason =
    'unknown',
) {
  const clients =
    clientsByTable.get(
      tableId,
    );

  /**
   * Tidak ada ESP32 online bukan error.
   * Pada reconnect device akan mengambil snapshot terbaru.
   */
  if (
    !clients ||
    clients.size ===
      0
  ) {
    return {
      ok:
        true,

      tableId,

      delivered:
        0,

      reason:
        'no_online_device',
    };
  }

  const snapshot =
    await loadTableSnapshot(
      tableId,
    );

  let delivered =
    0;

  for (
    const client of
    clients
  ) {
    if (
      sendJson(
        client,
        snapshot,
      )
    ) {
      delivered += 1;
    }
  }

  console.log(
    '[IOT_TABLE_SYNC]',
    {
      tableId,
      reason,
      delivered,
      revision:
        snapshot.revision,
    },
  );

  return {
    ok:
      true,
    tableId,
    delivered,
    revision:
      snapshot.revision,
  };
}

function getOnlineDeviceCount() {
  let count =
    0;

  for (
    const clients of
    clientsByTable.values()
  ) {
    count +=
      clients.size;
  }

  return count;
}

const server =
  http.createServer(
    async (
      request,
      response,
    ) => {
      const url =
        new URL(
          request.url ??
          '/',
          `http://${request.headers.host ?? 'localhost'}`,
        );

      if (
        request.method ===
          'GET' &&
        url.pathname ===
          '/health'
      ) {
        json(
          response,
          200,
          {
            success:
              true,

            service:
              'kaloo-iot-gateway',

            port:
              PORT,

            onlineDevices:
              getOnlineDeviceCount(),

            tablesWithDevices:
              clientsByTable.size,

            serverTime:
              new Date()
                .toISOString(),
          },
        );

        return;
      }

      if (
        request.method ===
          'POST' &&
        url.pathname ===
          '/api/internal/table-sync'
      ) {
        if (
          !isInternalAuthorized(
            request,
          )
        ) {
          json(
            response,
            401,
            {
              success:
                false,
              message:
                'Unauthorized.',
            },
          );

          return;
        }

        try {
          const body =
            await readJsonBody(
              request,
            );

          const tableId =
            Number(
              body?.tableId ??
              0,
            );

          if (
            !Number.isInteger(
              tableId,
            ) ||
            tableId <= 0
          ) {
            json(
              response,
              400,
              {
                success:
                  false,
                message:
                  'tableId tidak valid.',
              },
            );

            return;
          }

          const result =
            await syncTable(
              tableId,
              String(
                body?.reason ??
                'internal_sync',
              ),
            );

          json(
            response,
            200,
            {
              success:
                true,
              ...result,
            },
          );
        } catch (error) {
          console.error(
            '[IOT_INTERNAL_SYNC_ERROR]',
            error,
          );

          json(
            response,
            500,
            {
              success:
                false,
              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Gagal melakukan table sync.',
            },
          );
        }

        return;
      }

      json(
        response,
        404,
        {
          success:
            false,
          message:
            'Not Found',
        },
      );
    },
  );

const wss =
  new WebSocketServer({
    noServer:
      true,
  });

server.on(
  'upgrade',
  (
    request,
    socket,
    head,
  ) => {
    const url =
      new URL(
        request.url ??
        '/',
        `http://${request.headers.host ?? 'localhost'}`,
      );

    if (
      url.pathname !==
      '/ws'
    ) {
      socket.destroy();
      return;
    }

    const tableId =
      Number(
        url.searchParams.get(
          'tableId',
        ) ??
        0,
      );

    const deviceId =
      String(
        url.searchParams.get(
          'deviceId',
        ) ??
        '',
      ).trim();

    const token =
      String(
        url.searchParams.get(
          'token',
        ) ??
        '',
      );

    if (
      !Number.isInteger(
        tableId,
      ) ||
      tableId <= 0 ||
      !deviceId ||
      !isDeviceAuthorized(
        token,
      )
    ) {
      socket.write(
        'HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n',
      );

      socket.destroy();
      return;
    }

    wss.handleUpgrade(
      request,
      socket,
      head,
      (webSocket) => {
        webSocket.kalooTableId =
          tableId;

        webSocket.kalooDeviceId =
          deviceId;

        webSocket.isAlive =
          true;

        wss.emit(
          'connection',
          webSocket,
          request,
        );
      },
    );
  },
);

wss.on(
  'connection',
  async (
    socket,
  ) => {
    const tableId =
      socket.kalooTableId;

    const deviceId =
      socket.kalooDeviceId;

    getTableClients(
      tableId,
    ).add(
      socket,
    );

    console.log(
      '[IOT_DEVICE_CONNECTED]',
      {
        deviceId,
        tableId,
      },
    );

    sendJson(
      socket,
      {
        type:
          'gateway.hello',

        deviceId,

        tableId,

        serverTime:
          new Date()
            .toISOString(),

        heartbeatSeconds:
          Math.floor(
            HEARTBEAT_MS /
            1000,
          ),
      },
    );

    /**
     * Reconnect-safe:
     * device selalu mendapat snapshot kondisi terbaru saat connect.
     */
    try {
      const snapshot =
        await loadTableSnapshot(
          tableId,
        );

      sendJson(
        socket,
        snapshot,
      );
    } catch (error) {
      console.error(
        '[IOT_INITIAL_SNAPSHOT_ERROR]',
        {
          tableId,
          deviceId,
          error,
        },
      );

      sendJson(
        socket,
        {
          type:
            'gateway.error',
          code:
            'INITIAL_SNAPSHOT_FAILED',
          message:
            'Gagal memuat kondisi meja terbaru.',
        },
      );
    }

    socket.on(
      'pong',
      () => {
        socket.isAlive =
          true;
      },
    );

    socket.on(
      'message',
      async (
        raw,
      ) => {
        let message;

        try {
          message =
            JSON.parse(
              raw.toString(),
            );
        } catch {
          return;
        }

        /**
         * ESP32 dapat meminta sync manual setelah WiFi reconnect,
         * display reset, atau user menekan tombol di masa depan.
         */
        if (
          message?.type ===
          'sync.request'
        ) {
          try {
            const snapshot =
              await loadTableSnapshot(
                tableId,
              );

            sendJson(
              socket,
              snapshot,
            );
          } catch (error) {
            console.error(
              '[IOT_DEVICE_SYNC_REQUEST_ERROR]',
              {
                tableId,
                deviceId,
                error,
              },
            );
          }
        }
      },
    );

    socket.on(
      'close',
      () => {
        removeClient(
          socket,
        );

        console.log(
          '[IOT_DEVICE_DISCONNECTED]',
          {
            deviceId,
            tableId,
          },
        );
      },
    );

    socket.on(
      'error',
      (error) => {
        console.error(
          '[IOT_DEVICE_SOCKET_ERROR]',
          {
            deviceId,
            tableId,
            error:
              error.message,
          },
        );
      },
    );
  },
);

const heartbeat =
  setInterval(
    () => {
      for (
        const socket of
        wss.clients
      ) {
        if (
          socket.isAlive ===
          false
        ) {
          removeClient(
            socket,
          );

          socket.terminate();
          continue;
        }

        socket.isAlive =
          false;

        socket.ping();
      }
    },
    HEARTBEAT_MS,
  );

heartbeat.unref();

server.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `[KALOO IoT] Gateway listening on http://${HOST}:${PORT}`,
    );

    console.log(
      `[KALOO IoT] WebSocket endpoint: ws://${HOST}:${PORT}/ws`,
    );

    console.log(
      `[KALOO IoT] Next internal base: ${NEXT_BASE_URL}`,
    );

    if (
      !INTERNAL_SECRET
    ) {
      console.warn(
        '[KALOO IoT] WARNING: IOT_INTERNAL_SECRET kosong.',
      );
    }

    if (
      !DEVICE_TOKEN
    ) {
      console.warn(
        '[KALOO IoT] WARNING: IOT_DEVICE_TOKEN kosong.',
      );
    }
  },
);

function shutdown(
  signal,
) {
  console.log(
    `[KALOO IoT] ${signal}, shutting down...`,
  );

  clearInterval(
    heartbeat,
  );

  for (
    const socket of
    wss.clients
  ) {
    socket.close(
      1001,
      'Server shutting down',
    );
  }

  server.close(
    () => {
      process.exit(
        0,
      );
    },
  );

  setTimeout(
    () => {
      process.exit(
        1,
      );
    },
    5_000,
  ).unref();
}

process.on(
  'SIGINT',
  () =>
    shutdown(
      'SIGINT',
    ),
);

process.on(
  'SIGTERM',
  () =>
    shutdown(
      'SIGTERM',
    ),
);
