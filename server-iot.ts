import 'dotenv/config';

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'http';

import {
  WebSocket,
  WebSocketServer,
} from 'ws';

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
} from 'drizzle-orm';

import { db } from './src/db';

import {
  orders,
  reservations,
  reservationTableList,
  tableDevice,
  tableList,
} from './src/db/schema';

const PORT =
  Number(
    process.env.IOT_PORT ??
    3011,
  );

const HOST =
  process.env.IOT_HOST ??
  '0.0.0.0';

const INTERNAL_SECRET =
  String(
    process.env.IOT_INTERNAL_SECRET ??
    '',
  );

const HEARTBEAT_MS =
  25_000;

type LedMode =
  | 'off'
  | 'on'
  | 'slow_blink'
  | 'fast_blink';

type DeviceSocket =
  WebSocket & {
    isAlive?: boolean;
    authenticated?: boolean;

    tableId?: number | null;

    mitraId?: number | null;
    hexId?: string;
    serialNumber?: string | null;
  };

type TableSnapshot = {
  type: 'table.snapshot';
  revision: number;
  generated_at: string;

  table: {
    id: number;
    mitra_id: number | null;
    code: string;
    name: string;

    status:
      | 'disabled'
      | 'available'
      | 'occupied'
      | 'reserved'
      | 'unknown';

    raw_status: number | null;
  };

  order: {
    code: string;
    customer_name: string;
    status: string;
    payment_status: string | null;
  } | null;

  reservation: {
    customer_name: string;
    reserved_start: string;
    reserved_end: string;
    guest_count: number;
  } | null;

  pager: {
    active: boolean;
    type:
      | 'order_ready'
      | 'manual'
      | null;
    message: string | null;
  };

  leds: {
    red: LedMode;
    yellow: LedMode;
    blue: LedMode;
  };
};

const clientsByTable =
  new Map<
    number,
    Set<DeviceSocket>
  >();

const clientsByHex =
  new Map<
    string,
    DeviceSocket
  >();

type PagerSource =
  | 'order_ready'
  | 'manual';

type PagerState = {
  active: boolean;
  source: PagerSource;
  message: string | null;
  updatedAt: number;
};

const pagerByTable =
  new Map<
    number,
    PagerState
  >();

function getPagerState(
  tableId: number,
): PagerState | null {
  const state =
    pagerByTable.get(
      tableId,
    );

  if (
    !state ||
    !state.active
  ) {
    return null;
  }

  return state;
}

function setPagerState(
  tableId: number,
  active: boolean,
  source: PagerSource,
  message: string | null,
) {
  if (!active) {
    pagerByTable.delete(
      tableId,
    );

    return;
  }

  pagerByTable.set(
    tableId,
    {
      active:
        true,
      source,
      message,
      updatedAt:
        Date.now(),
    },
  );
}

/**
 * Menjaga kompatibilitas dengan firmware lama.
 *
 * DB lama menggunakan:
 * A4:CF:12:34:56:78
 *
 * BUKAN:
 * A4CF12345678
 */
function normalizeLegacyHex(
  value: unknown,
): string {
  const raw =
    String(
      value ??
      '',
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^0-9A-F]/g,
        '',
      );

  if (
    raw.length !==
    12
  ) {
    return '';
  }

  return raw.match(
    /.{2}/g,
  )!
    .join(':');
}

function tableStatusName(
  rawStatus: unknown,
): TableSnapshot['table']['status'] {
  switch (
    Number(
      rawStatus,
    )
  ) {
    case 0:
      return 'disabled';

    case 1:
      return 'available';

    case 2:
      return 'occupied';

    case 3:
      return 'reserved';

    default:
      return 'unknown';
  }
}

function toIso(
  value: unknown,
): string {
  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  const asString =
    String(
      value ??
      '',
    );

  const date =
    new Date(
      asString,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return asString;
  }

  return date
    .toISOString();
}

function jsonResponse(
  res: ServerResponse,
  status: number,
  body: unknown,
) {
  res.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8',

      'Cache-Control':
        'no-store',
    },
  );

  res.end(
    JSON.stringify(
      body,
    ),
  );
}

function sendJson(
  ws: DeviceSocket,
  payload: unknown,
): boolean {
  if (
    ws.readyState !==
    WebSocket.OPEN
  ) {
    return false;
  }

  ws.send(
    JSON.stringify(
      payload,
    ),
  );

  return true;
}

function readJsonBody(
  req: IncomingMessage,
): Promise<
  Record<
    string,
    unknown
  >
> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      let body =
        '';

      req.on(
        'data',
        (
          chunk,
        ) => {
          body +=
            chunk.toString();

          if (
            body.length >
            64 * 1024
          ) {
            reject(
              new Error(
                'Payload terlalu besar.',
              ),
            );
          }
        },
      );

      req.on(
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
                'Invalid JSON.',
              ),
            );
          }
        },
      );

      req.on(
        'error',
        reject,
      );
    },
  );
}

function isInternalAuthorized(
  req: IncomingMessage,
): boolean {
  if (
    !INTERNAL_SECRET
  ) {
    return false;
  }

  const received =
    String(
      req.headers[
        'x-internal-secret'
      ] ??
      '',
    );

  return (
    received.length >
      0 &&
    received ===
      INTERNAL_SECRET
  );
}

function addTableClient(
  tableId: number,
  ws: DeviceSocket,
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

  clients.add(
    ws,
  );
}

function removeClient(
  ws: DeviceSocket,
) {
  if (
    ws.tableId !==
      undefined &&
    ws.tableId !==
      null
  ) {
    const clients =
      clientsByTable.get(
        ws.tableId,
      );

    if (clients) {
      clients.delete(
        ws,
      );

      if (
        clients.size ===
        0
      ) {
        clientsByTable.delete(
          ws.tableId,
        );
      }
    }
  }

  if (
    ws.hexId &&
    clientsByHex.get(
      ws.hexId,
    ) === ws
  ) {
    clientsByHex.delete(
      ws.hexId,
    );
  }
}

/**
 * Database = source of truth.
 *
 * Gateway tidak mempercayai status yang dikirim route POS.
 * Next.js hanya trigger tableId, lalu gateway membaca DB terbaru.
 */
async function buildTableSnapshot(
  tableId: number,
): Promise<TableSnapshot> {
  const [
    tableInfo,
  ] =
    await db
      .select({
        id:
          tableList.id,

        mitraId:
          tableList.mitra_id,

        code:
          tableList.table_code,

        name:
          tableList.table_name,

        status:
          tableList.status,
      })
      .from(
        tableList,
      )
      .where(
        eq(
          tableList.id,
          tableId,
        ),
      )
      .limit(1);

  if (!tableInfo) {
    throw new Error(
      `Table ${tableId} tidak ditemukan.`,
    );
  }

  const orderConditions = [
    eq(
      orders.table_number,
      tableId,
    ),

    inArray(
      orders.status,
      [
        'pending',
        'confirmed',
        'preparing',
        'ready',
      ],
    ),
  ];

  if (
    tableInfo.mitraId !==
    null
  ) {
    orderConditions.push(
      eq(
        orders.mitra_id,
        Number(
          tableInfo.mitraId,
        ),
      ),
    );
  }

  const [
    activeOrder,
  ] =
    await db
      .select({
        orderCode:
          orders.order_code,

        customerName:
          orders.name,

        status:
          orders.status,

        paymentStatus:
          orders.payment_status,
      })
      .from(
        orders,
      )
      .where(
        and(
          ...orderConditions,
        ),
      )
      .orderBy(
        desc(
          orders.createdAt,
        ),
      )
      .limit(1);

  /**
   * Reservation tetap dicari walaupun table masih AVAILABLE.
   *
   * PENTING:
   * Reservation KALOO mendukung multi-meja melalui reservationTableList.
   * Karena itu lookup utama harus memakai pivot, bukan hanya
   * reservations.table_id (yang hanya menyimpan meja pertama).
   */
  const reservationConditions = [
    eq(
      reservationTableList.table_list_id,
      tableId,
    ),

    inArray(
      reservations.status,
      [
        'pending',
        'confirmed',
      ],
    ),

    /*
     * Reservation yang sudah mulai namun belum selesai
     * tetap harus tampil.
     */
    gte(
      reservations.reserved_end,
      new Date(),
    ),
  ];

  if (
    tableInfo.mitraId !==
    null
  ) {
    reservationConditions.push(
      eq(
        reservations.mitra_id,
        Number(
          tableInfo.mitraId,
        ),
      ),
    );
  }

  let [
    upcomingReservation,
  ] =
    await db
      .select({
        customerName:
          reservations.customer_name,

        reservedStart:
          reservations.reserved_start,

        reservedEnd:
          reservations.reserved_end,

        guestCount:
          reservations.guest_count,
      })
      .from(
        reservationTableList,
      )
      .innerJoin(
        reservations,
        eq(
          reservationTableList.reservation_id,
          reservations.id,
        ),
      )
      .where(
        and(
          ...reservationConditions,
        ),
      )
      .orderBy(
        asc(
          reservations.reserved_start,
        ),
      )
      .limit(
        1,
      );

  /*
   * Backward compatibility:
   * data reservation lama mungkin belum mempunyai pivot row.
   * Kalau pivot tidak menemukan reservation, fallback ke table_id.
   */
  if (
    !upcomingReservation
  ) {
    const legacyConditions = [
      eq(
        reservations.table_id,
        tableId,
      ),

      inArray(
        reservations.status,
        [
          'pending',
          'confirmed',
        ],
      ),

      gte(
        reservations.reserved_end,
        new Date(),
      ),
    ];

    if (
      tableInfo.mitraId !==
      null
    ) {
      legacyConditions.push(
        eq(
          reservations.mitra_id,
          Number(
            tableInfo.mitraId,
          ),
        ),
      );
    }

    [
      upcomingReservation,
    ] =
      await db
        .select({
          customerName:
            reservations.customer_name,

          reservedStart:
            reservations.reserved_start,

          reservedEnd:
            reservations.reserved_end,

          guestCount:
            reservations.guest_count,
        })
        .from(
          reservations,
        )
        .where(
          and(
            ...legacyConditions,
          ),
        )
        .orderBy(
          asc(
            reservations.reserved_start,
          ),
        )
        .limit(
          1,
        );
  }

  const physicalStatus =
    tableStatusName(
      tableInfo.status,
    );

  const orderReady =
    activeOrder?.status ===
    'ready';

  /*
   * Pager sengaja dipisah dari order.status.
   *
   * Jadi:
   * - ready + pager ON  => layar READY + bunyi
   * - ready + pager OFF => layar READY tanpa bunyi
   * - manual pager ON   => buzzer/LED biru aktif tanpa mengubah order
   */
  const pagerState =
    getPagerState(
      tableId,
    );

  const pagerActive =
    Boolean(
      pagerState?.active,
    );

  return {
    type:
      'table.snapshot',

    revision:
      Date.now(),

    generated_at:
      new Date()
        .toISOString(),

    table: {
      id:
        Number(
          tableInfo.id,
        ),

      mitra_id:
        tableInfo.mitraId ===
          null
          ? null
          : Number(
              tableInfo.mitraId,
            ),

      code:
        String(
          tableInfo.code ??
          tableInfo.id,
        ),

      name:
        String(
          tableInfo.name ??
          `Table ${tableInfo.id}`,
        ),

      status:
        physicalStatus,

      raw_status:
        tableInfo.status ===
          null
          ? null
          : Number(
              tableInfo.status,
            ),
    },

    order:
      activeOrder
        ? {
            code:
              activeOrder.orderCode ??
              '',

            customer_name:
              activeOrder.customerName ??
              'Tamu Umum',

            status:
              activeOrder.status,

            payment_status:
              activeOrder.paymentStatus ===
                null
                ? null
                : String(
                    activeOrder.paymentStatus,
                  ),
          }
        : null,

    reservation:
      upcomingReservation
        ? {
            customer_name:
              upcomingReservation.customerName ??
              'Tamu',

            reserved_start:
              toIso(
                upcomingReservation.reservedStart,
              ),

            reserved_end:
              toIso(
                upcomingReservation.reservedEnd,
              ),

            guest_count:
              Number(
                upcomingReservation.guestCount ??
                  0,
              ),
          }
        : null,

    pager: {
      active:
        pagerActive,

      type:
        pagerState?.source ??
        null,

      message:
        pagerState?.message ??
        null,
    },

    leds: {
      /**
       * Merah = meja sedang occupied.
       */
      red:
        physicalStatus ===
        'occupied'
          ? 'on'
          : 'off',

      /**
       * Kuning = ada reservation mendatang,
       * atau status fisik memang reserved.
       */
      yellow:
        upcomingReservation ||
        physicalStatus ===
          'reserved'
          ? 'on'
          : 'off',

      /**
       * Biru = fungsi pager.
       */
      blue:
        pagerActive
          ? 'fast_blink'
          : 'off',
    },
  };
}

async function sendCurrentSnapshot(
  ws: DeviceSocket,
) {
  if (
    !ws.authenticated ||
    ws.tableId ===
      undefined ||
    ws.tableId ===
      null
  ) {
    return;
  }

  const snapshot =
    await buildTableSnapshot(
      ws.tableId,
    );

  sendJson(
    ws,
    snapshot,
  );
}

async function broadcastTableSnapshot(
  tableId: number,
) {
  const clients =
    clientsByTable.get(
      tableId,
    );

  /**
   * Device offline bukan error.
   * Saat reconnect device selalu dapat full snapshot terbaru.
   */
  if (
    !clients ||
    clients.size ===
      0
  ) {
    return {
      tableId,
      online:
        0,
      delivered:
        0,
    };
  }

  const snapshot =
    await buildTableSnapshot(
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

  return {
    tableId,

    online:
      clients.size,

    delivered,

    revision:
      snapshot.revision,
  };
}

async function authenticateDevice(
  ws: DeviceSocket,
  data: {
    hex_id?: unknown;
    secret_key?: unknown;
  },
) {
  const hexId =
    normalizeLegacyHex(
      data.hex_id,
    );

  const secretKey =
    String(
      data.secret_key ??
        '',
    ).trim();

  // ==========================================================
  // VALIDASI PAYLOAD
  // ==========================================================

  if (
    !hexId ||
    secretKey.length !==
      64
  ) {
    console.warn(
      '[IoT] Payload auth tidak valid',
      {
        hexId,
      },
    );

    sendJson(
      ws,
      {
        type:
          'auth.result',

        success:
          false,

        message:
          'invalid_auth_payload',
      },
    );

    ws.close(
      1008,
      'Invalid authentication',
    );

    return;
  }

  // ==========================================================
  // CARI DEVICE
  //
  // PENTING:
  // table_id TIDAK ikut menjadi syarat authentication.
  //
  // Device tetap valid walaupun table_id = NULL.
  // ==========================================================

  const [
    device,
  ] =
    await db
      .select({
        id:
          tableDevice.id,

        mitraId:
          tableDevice.mitra_id,

        tableId:
          tableDevice.table_id,

        hexId:
          tableDevice.hex_id,

        serialNumber:
          tableDevice.serial_number,

        status:
          tableDevice.status,
      })
      .from(
        tableDevice,
      )
      .where(
        and(
          eq(
            tableDevice.hex_id,
            hexId,
          ),

          eq(
            tableDevice.secret_key,
            secretKey,
          ),

          eq(
            tableDevice.status,
            'active',
          ),
        ),
      )
      .limit(
        1,
      );

  // ==========================================================
  // DEVICE / CREDENTIAL BENAR-BENAR TIDAK VALID
  // ==========================================================

  if (!device) {
    console.warn(
      '[IoT] Auth gagal',
      {
        hexId,
        reason:
          'invalid_credentials_or_device_status',
      },
    );

    sendJson(
      ws,
      {
        type:
          'auth.result',

        success:
          false,

        message:
          'unauthorized',
      },
    );

    ws.close(
      1008,
      'Unauthorized',
    );

    return;
  }

  // ==========================================================
  // DEVICE VALID
  // ==========================================================

  /*
   * Jika socket ini sebelumnya sudah mempunyai tableId,
   * keluarkan dulu dari clientsByTable.
   *
   * Berguna jika device di-reassign dari Table A -> Table B
   * lalu melakukan auth ulang pada socket yang sama.
   */
  if (
    ws.tableId !==
      undefined &&
    ws.tableId !==
      null
  ) {
    const oldClients =
      clientsByTable.get(
        ws.tableId,
      );

    if (oldClients) {
      oldClients.delete(
        ws,
      );

      if (
        oldClients.size ===
        0
      ) {
        clientsByTable.delete(
          ws.tableId,
        );
      }
    }
  }

  /*
   * Jika HEX yang sama connect menggunakan socket baru,
   * tutup socket lama.
   */
  const previousSocket =
    clientsByHex.get(
      hexId,
    );

  if (
    previousSocket &&
    previousSocket !==
      ws
  ) {
    previousSocket.close(
      4001,
      'Device reconnected',
    );
  }

  // ==========================================================
  // SET IDENTITY SOCKET
  // ==========================================================

  ws.authenticated =
    true;

  ws.hexId =
    hexId;

  ws.serialNumber =
    device.serialNumber ??
    null;

  ws.mitraId =
    device.mitraId ===
      null
      ? null
      : Number(
          device.mitraId,
        );

  /*
   * tableId sengaja boleh NULL.
   */
  ws.tableId =
    device.tableId ===
      null
      ? null
      : Number(
          device.tableId,
        );

  /*
   * Bahkan device yang belum assigned tetap masuk clientsByHex.
   *
   * Ini penting supaya:
   * - device-reconnect bisa menemukan device
   * - status online device tetap diketahui
   */
  clientsByHex.set(
    hexId,
    ws,
  );

  // ==========================================================
  // DEVICE BELUM DI-ASSIGN
  // ==========================================================

  if (
    ws.tableId ===
      null
  ) {
    console.log(
      '[IoT] Device authenticated, belum di-assign',
      {
        hexId:
          ws.hexId,

        serial:
          ws.serialNumber,

        mitraId:
          ws.mitraId,

        tableId:
          null,
      },
    );

    sendJson(
      ws,
      {
        type:
          'auth.result',

        success:
          true,

        /*
         * Firmware memakai ini untuk menentukan
         * layar DEVICE BELUM DI-ASSIGN.
         */
        assigned:
          false,

        hex_id:
          ws.hexId,

        /*
         * Yang ditampilkan pada layar ESP32.
         */
        serial_number:
          ws.serialNumber,

        table_id:
          null,

        heartbeat_seconds:
          Math.floor(
            HEARTBEAT_MS /
              1000,
          ),

        message:
          'device_unassigned',
      },
    );

    /*
     * Jangan close socket.
     * Device sudah authenticated.
     *
     * Firmware boleh melakukan auth ulang beberapa detik kemudian
     * untuk mengecek apakah assignment sudah berubah.
     */
    return;
  }

  // ==========================================================
  // DEVICE SUDAH DI-ASSIGN
  // ==========================================================

  addTableClient(
    ws.tableId,
    ws,
  );

  console.log(
    '[IoT] Auth sukses',
    {
      hexId:
        ws.hexId,

      serial:
        ws.serialNumber,

      mitraId:
        ws.mitraId,

      tableId:
        ws.tableId,
    },
  );

  sendJson(
    ws,
    {
      type:
        'auth.result',

      success:
        true,

      assigned:
        true,

      hex_id:
        ws.hexId,

      serial_number:
        ws.serialNumber,

      table_id:
        ws.tableId,

      heartbeat_seconds:
        Math.floor(
          HEARTBEAT_MS /
            1000,
        ),
    },
  );

  /*
   * Tetap kirim snapshot langsung untuk compatibility
   * dengan firmware lama.
   *
   * Firmware baru juga boleh kirim action: "sync".
   */
  await sendCurrentSnapshot(
    ws,
  );
}

const httpServer =
  createServer(
    async (
      req,
      res,
    ) => {
      const url =
        new URL(
          req.url ??
          '/',
          `http://${req.headers.host ?? 'localhost'}`,
        );

      if (
        req.method ===
          'GET' &&
        url.pathname ===
          '/health'
      ) {
        jsonResponse(
          res,
          200,
          {
            success:
              true,

            service:
              'kaloo-iot',

            port:
              PORT,

            devices_online:
              clientsByHex.size,

            tables_online:
              clientsByTable.size,

            server_time:
              new Date()
                .toISOString(),
          },
        );

        return;
      }

      /**
       * Next.js -> IoT Gateway.
       *
       * Menanyakan device mana yang terdaftar dan benar-benar online.
       *
       * POST /api/internal/device-status
       * {
       *   "tableIds": [1, 2, 3]
       * }
       */
      if (
        req.method ===
          'POST' &&
        url.pathname ===
          '/api/internal/device-status'
      ) {
        if (
          !isInternalAuthorized(
            req,
          )
        ) {
          jsonResponse(
            res,
            401,
            {
              success:
                false,
              message:
                'Unauthorized',
            },
          );

          return;
        }

        try {
          const body =
            await readJsonBody(
              req,
            );

          const rawTableIds =
            Array.isArray(
              body.tableIds,
            )
              ? body.tableIds
              : [];

          const tableIds =
            Array.from(
              new Set(
                rawTableIds
                  .map(
                    (
                      value:
                        unknown,
                    ) =>
                      Number(
                        value,
                      ),
                  )
                  .filter(
                    (
                      value:
                        number,
                    ) =>
                      Number.isInteger(
                        value,
                      ) &&
                      value > 0,
                  ),
              ),
            ).slice(
              0,
              200,
            );

          if (
            tableIds.length ===
            0
          ) {
            jsonResponse(
              res,
              200,
              {
                success:
                  true,
                data: [],
              },
            );

            return;
          }

          const registeredRows =
            await db
              .select({
                tableId:
                  tableDevice.table_id,
                id:
                  tableDevice.id,
              })
              .from(
                tableDevice,
              )
              .where(
                and(
                  inArray(
                    tableDevice.table_id,
                    tableIds,
                  ),
                  eq(
                    tableDevice.status,
                    'active',
                  ),
                ),
              );

          const registeredCount =
            new Map<
              number,
              number
            >();

          for (
            const row of
            registeredRows
          ) {
            const id =
              Number(
                row.tableId ??
                0,
              );

            if (
              !Number.isInteger(
                id,
              ) ||
              id <= 0
            ) {
              continue;
            }

            registeredCount.set(
              id,
              (
                registeredCount.get(
                  id,
                ) ??
                0
              ) +
                1,
            );
          }

          const data =
            tableIds.map(
              (
                tableId,
              ) => {
                const onlineCount =
                  clientsByTable.get(
                    tableId,
                  )?.size ??
                  0;

                const pagerState =
                  getPagerState(
                    tableId,
                  );

                return {
                  tableId,
                  registered:
                    (
                      registeredCount.get(
                        tableId,
                      ) ??
                      0
                    ) >
                    0,
                  registeredCount:
                    registeredCount.get(
                      tableId,
                    ) ??
                    0,
                  online:
                    onlineCount >
                    0,
                  onlineCount,
                  pagerActive:
                    Boolean(
                      pagerState?.active,
                    ),
                  pagerSource:
                    pagerState?.source ??
                    null,
                };
              },
            );

          jsonResponse(
            res,
            200,
            {
              success:
                true,
              data,
            },
          );
        } catch (
          error
        ) {
          console.error(
            '[IoT] device-status error:',
            error,
          );

          jsonResponse(
            res,
            500,
            {
              success:
                false,
              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Gagal membaca status device.',
            },
          );
        }

        return;
      }

      /**
       * Next.js -> IoT Gateway.
       *
       * Paksa satu device reconnect setelah assignment / status device
       * di database berubah. Setelah reconnect, authentication membaca
       * table_id terbaru dari iot_devices.
       *
       * POST /api/internal/device-reconnect
       * {
       *   "hexId": "D4:8A:FC:A4:91:BC"
       * }
       */
      if (
        req.method ===
          'POST' &&
        url.pathname ===
          '/api/internal/device-reconnect'
      ) {
        if (
          !isInternalAuthorized(
            req,
          )
        ) {
          jsonResponse(
            res,
            401,
            {
              success:
                false,
              message:
                'Unauthorized',
            },
          );

          return;
        }

        try {
          const body =
            await readJsonBody(
              req,
            );

          const hexId =
            normalizeLegacyHex(
              body.hexId,
            );

          if (!hexId) {
            jsonResponse(
              res,
              400,
              {
                success:
                  false,
                message:
                  'HEX ID / MAC device tidak valid.',
              },
            );

            return;
          }

          const client =
            clientsByHex.get(
              hexId,
            );

          const wasOnline =
            Boolean(
              client &&
              client.readyState ===
                WebSocket.OPEN,
            );

          if (client) {
            /*
             * Firmware WebSocketsClient akan reconnect otomatis.
             * Saat auth berikutnya gateway membaca assignment DB terbaru.
             */
            client.close(
              4006,
              'Device configuration changed',
            );
          }

          jsonResponse(
            res,
            200,
            {
              success:
                true,
              hexId,
              wasOnline,
            },
          );
        } catch (
          error
        ) {
          console.error(
            '[IoT] device-reconnect error:',
            error,
          );

          jsonResponse(
            res,
            500,
            {
              success:
                false,
              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Gagal meminta device reconnect.',
            },
          );
        }

        return;
      }

      /**
       * Kontrol pager terpisah dari lifecycle order.
       *
       * POST /api/internal/table-pager
       * {
       *   "tableId": 12,
       *   "active": true,
       *   "source": "manual" | "order_ready",
       *   "reason": "cashier-manual-call"
       * }
       */
      if (
        req.method ===
          'POST' &&
        url.pathname ===
          '/api/internal/table-pager'
      ) {
        if (
          !isInternalAuthorized(
            req,
          )
        ) {
          jsonResponse(
            res,
            401,
            {
              success:
                false,
              message:
                'Unauthorized',
            },
          );

          return;
        }

        try {
          const body =
            await readJsonBody(
              req,
            );

          const tableId =
            Number(
              body.tableId ??
              0,
            );

          if (
            !Number.isInteger(
              tableId,
            ) ||
            tableId <= 0
          ) {
            jsonResponse(
              res,
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

          const active =
            body.active ===
            true;

          const source:
            PagerSource =
              body.source ===
              'order_ready'
                ? 'order_ready'
                : 'manual';

          const message =
            typeof body.message ===
            'string'
              ? body.message
                  .trim()
                  .slice(
                    0,
                    80,
                  ) ||
                null
              : source ===
                'order_ready'
                ? 'Pesanan Anda sudah siap'
                : 'Panggilan dari kasir';

          setPagerState(
            tableId,
            active,
            source,
            active
              ? message
              : null,
          );

          const result =
            await broadcastTableSnapshot(
              tableId,
            );

          console.log(
            '[IoT] table-pager',
            {
              ...result,
              active,
              source,
              reason:
                String(
                  body.reason ??
                    'unknown',
                ),
            },
          );

          jsonResponse(
            res,
            200,
            {
              success:
                true,
              active,
              source:
                active
                  ? source
                  : null,
              ...result,
            },
          );
        } catch (
          error
        ) {
          console.error(
            '[IoT] table-pager error:',
            error,
          );

          jsonResponse(
            res,
            500,
            {
              success:
                false,
              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Gagal mengubah pager.',
            },
          );
        }

        return;
      }

      /**
       * Next.js -> IoT Gateway.
       *
       * Setelah transaksi DB sukses:
       *
       * POST /api/internal/table-sync
       * {
       *   "tableId": 12,
       *   "reason": "checkout"
       * }
       */
      if (
        req.method ===
          'POST' &&
        url.pathname ===
          '/api/internal/table-sync'
      ) {
        if (
          !isInternalAuthorized(
            req,
          )
        ) {
          jsonResponse(
            res,
            401,
            {
              success:
                false,

              message:
                'Unauthorized',
            },
          );

          return;
        }

        try {
          const body =
            await readJsonBody(
              req,
            );

          const tableId =
            Number(
              body.tableId ??
              0,
            );

          if (
            !Number.isInteger(
              tableId,
            ) ||
            tableId <= 0
          ) {
            jsonResponse(
              res,
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
            await broadcastTableSnapshot(
              tableId,
            );

          console.log(
            '[IoT] table-sync',
            {
              ...result,

              reason:
                String(
                  body.reason ??
                  'unknown',
                ),
            },
          );

          jsonResponse(
            res,
            200,
            {
              success:
                true,

              ...result,
            },
          );
        } catch (
          error
        ) {
          console.error(
            '[IoT] table-sync error:',
            error,
          );

          jsonResponse(
            res,
            500,
            {
              success:
                false,

              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Gagal melakukan sync.',
            },
          );
        }

        return;
      }

      jsonResponse(
        res,
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
    server:
      httpServer,

    path:
      '/ws',
  });

wss.on(
  'connection',
  (
    rawSocket,
  ) => {
    const ws =
      rawSocket as
        DeviceSocket;

    ws.isAlive =
      true;

    ws.authenticated =
      false;

    console.log(
      '[IoT] ESP32 connected, waiting authentication...',
    );

    const authTimeout =
      setTimeout(
        () => {
          if (
            !ws.authenticated
          ) {
            ws.close(
              1008,
              'Authentication timeout',
            );
          }
        },
        10_000,
      );

    ws.on(
      'pong',
      () => {
        ws.isAlive =
          true;
      },
    );

    ws.on(
      'message',
      async (
        rawMessage,
      ) => {
        try {
          const data =
            JSON.parse(
              rawMessage.toString(),
            ) as {
              action?: string;
              hex_id?: unknown;
              secret_key?: unknown;
            };

          if (
            data.action ===
            'auth'
          ) {
            await authenticateDevice(
              ws,
              data,
            );

            if (
              ws.authenticated
            ) {
              clearTimeout(
                authTimeout,
              );
            }

            return;
          }

          if (
            !ws.authenticated
          ) {
            sendJson(
              ws,
              {
                type:
                  'gateway.error',

                message:
                  'Device belum authenticated.',
              },
            );

            return;
          }

          if (
            data.action ===
            'sync'
          ) {
            await sendCurrentSnapshot(
              ws,
            );

            return;
          }
        } catch (
          error
        ) {
          console.error(
            '[IoT] WS message error:',
            error,
          );

          sendJson(
            ws,
            {
              type:
                'gateway.error',

              message:
                'Invalid message.',
            },
          );
        }
      },
    );

    ws.on(
      'close',
      () => {
        clearTimeout(
          authTimeout,
        );

        const hexId =
          ws.hexId;

        const tableId =
          ws.tableId;

        removeClient(
          ws,
        );

        console.log(
          '[IoT] Device disconnected',
          {
            hexId,
            tableId,
          },
        );
      },
    );

    ws.on(
      'error',
      (
        error,
      ) => {
        console.error(
          '[IoT] WebSocket error:',
          {
            hexId:
              ws.hexId,

            tableId:
              ws.tableId,

            message:
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
        const rawSocket of
        wss.clients
      ) {
        const ws =
          rawSocket as
            DeviceSocket;

        if (
          ws.isAlive ===
          false
        ) {
          removeClient(
            ws,
          );

          ws.terminate();

          continue;
        }

        ws.isAlive =
          false;

        ws.ping();
      }
    },
    HEARTBEAT_MS,
  );

heartbeat.unref();

httpServer.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `> KALOO IoT Gateway running on ${HOST}:${PORT}`,
    );

    console.log(
      `> WebSocket: ws://${HOST}:${PORT}/ws`,
    );

    console.log(
      `> Health: http://127.0.0.1:${PORT}/health`,
    );

    if (
      !INTERNAL_SECRET
    ) {
      console.warn(
        '> WARNING: IOT_INTERNAL_SECRET belum dikonfigurasi.',
      );
    }
  },
);

function shutdown(
  signal: string,
) {
  console.log(
    `> ${signal}: stopping KALOO IoT...`,
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
      'Server shutdown',
    );
  }

  httpServer.close(
    () => {
      process.exit(
        0,
      );
    },
  );
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
