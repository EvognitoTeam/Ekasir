const IOT_GATEWAY_URL =
  (
    process.env.IOT_GATEWAY_URL ??
    'http://127.0.0.1:3010'
  ).replace(
    /\/+$/,
    '',
  );

/**
 * Meminta gateway membacakan ulang state meja dari DB
 * dan push snapshot terbaru ke ESP32.
 *
 * Error IoT tidak membuat transaksi POS gagal.
 */
export async function syncTableIoT(
  tableId:
    | number
    | null
    | undefined,
  reason =
    'pos_update',
): Promise<boolean> {
  const normalizedTableId =
    Number(
      tableId ??
      0,
    );

  if (
    !Number.isInteger(
      normalizedTableId,
    ) ||
    normalizedTableId <= 0
  ) {
    return false;
  }

  const secret =
    process.env
      .IOT_INTERNAL_SECRET;

  if (!secret) {
    console.warn(
      '[IoT] IOT_INTERNAL_SECRET belum dikonfigurasi.',
    );

    return false;
  }

  try {
    const response =
      await fetch(
        `${IOT_GATEWAY_URL}/api/internal/table-sync`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',

            'X-Internal-Secret':
              secret,
          },

          body:
            JSON.stringify({
              tableId:
                normalizedTableId,

              reason,
            }),
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        '[IoT] table-sync gagal',
        {
          tableId:
            normalizedTableId,

          status:
            response.status,

          body:
            await response
              .text()
              .catch(
                () => '',
              ),
        },
      );

      return false;
    }

    return true;
  } catch (
    error
  ) {
    console.error(
      '[IoT] Gateway tidak dapat dihubungi',
      {
        tableId:
          normalizedTableId,

        error,
      },
    );

    return false;
  }
}

export function queueTableIoT(
  tableId:
    | number
    | null
    | undefined,
  reason =
    'pos_update',
) {
  void syncTableIoT(
    tableId,
    reason,
  );
}


export type TableIoTStatus = {
  tableId: number;
  registered: boolean;
  registeredCount: number;
  online: boolean;
  onlineCount: number;
  pagerActive: boolean;
  pagerSource:
    | 'manual'
    | 'order_ready'
    | null;
};

export async function getTableIoTStatuses(
  tableIds: number[],
): Promise<TableIoTStatus[]> {
  const normalizedIds =
    Array.from(
      new Set(
        tableIds
          .map(
            (
              value,
            ) =>
              Number(
                value,
              ),
          )
          .filter(
            (
              value,
            ) =>
              Number.isInteger(
                value,
              ) &&
              value > 0,
          ),
      ),
    );

  if (
    normalizedIds.length ===
    0
  ) {
    return [];
  }

  const secret =
    process.env
      .IOT_INTERNAL_SECRET;

  if (!secret) {
    return [];
  }

  try {
    const response =
      await fetch(
        `${IOT_GATEWAY_URL}/api/internal/device-status`,
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
            'X-Internal-Secret':
              secret,
          },
          body:
            JSON.stringify({
              tableIds:
                normalizedIds,
            }),
          cache:
            'no-store',
        },
      );

    if (!response.ok) {
      return [];
    }

    const result =
      await response.json() as {
        success?: boolean;
        data?: TableIoTStatus[];
      };

    if (
      !result.success ||
      !Array.isArray(
        result.data,
      )
    ) {
      return [];
    }

    return result.data;
  } catch (
    error
  ) {
    console.error(
      '[IoT] Gagal membaca status device',
      error,
    );

    return [];
  }
}

export async function setTablePagerIoT(
  tableId:
    | number
    | null
    | undefined,
  active: boolean,
  reason =
    'pos_pager',
  source:
    | 'manual'
    | 'order_ready' =
      'manual',
): Promise<boolean> {
  const normalizedTableId =
    Number(
      tableId ??
      0,
    );

  if (
    !Number.isInteger(
      normalizedTableId,
    ) ||
    normalizedTableId <= 0
  ) {
    return false;
  }

  const secret =
    process.env
      .IOT_INTERNAL_SECRET;

  if (!secret) {
    console.warn(
      '[IoT] IOT_INTERNAL_SECRET belum dikonfigurasi.',
    );

    return false;
  }

  try {
    const response =
      await fetch(
        `${IOT_GATEWAY_URL}/api/internal/table-pager`,
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
            'X-Internal-Secret':
              secret,
          },
          body:
            JSON.stringify({
              tableId:
                normalizedTableId,
              active,
              source,
              reason,
            }),
        },
      );

    if (!response.ok) {
      console.error(
        '[IoT] table-pager gagal',
        {
          tableId:
            normalizedTableId,
          active,
          status:
            response.status,
        },
      );

      return false;
    }

    return true;
  } catch (
    error
  ) {
    console.error(
      '[IoT] Gateway pager tidak dapat dihubungi',
      {
        tableId:
          normalizedTableId,
        active,
        error,
      },
    );

    return false;
  }
}

export function queueTablePagerIoT(
  tableId:
    | number
    | null
    | undefined,
  active: boolean,
  reason =
    'pos_pager',
  source:
    | 'manual'
    | 'order_ready' =
      'manual',
) {
  void setTablePagerIoT(
    tableId,
    active,
    reason,
    source,
  );
}


export async function reconnectIoTDevice(
  hexId: string,
): Promise<boolean> {
  const normalizedHex =
    String(
      hexId ??
      '',
    ).trim();

  if (!normalizedHex) {
    return false;
  }

  const secret =
    process.env
      .IOT_INTERNAL_SECRET;

  if (!secret) {
    console.warn(
      '[IoT] IOT_INTERNAL_SECRET belum dikonfigurasi.',
    );

    return false;
  }

  try {
    const response =
      await fetch(
        `${IOT_GATEWAY_URL}/api/internal/device-reconnect`,
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
            'X-Internal-Secret':
              secret,
          },
          body:
            JSON.stringify({
              hexId:
                normalizedHex,
            }),
        },
      );

    return response.ok;
  } catch (
    error
  ) {
    console.error(
      '[IoT] Gagal meminta device reconnect',
      {
        hexId:
          normalizedHex,
        error,
      },
    );

    return false;
  }
}

export function queueIoTDeviceReconnect(
  hexId:
    | string
    | null
    | undefined,
) {
  if (!hexId) {
    return;
  }

  void reconnectIoTDevice(
    hexId,
  );
}
