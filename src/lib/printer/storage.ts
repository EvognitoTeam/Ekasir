import type {
  PrinterDevice,
} from './types';

const LEGACY_KEY =
  'ekasir_printer';

const printerKey = (
  scope:
    string,
) =>
  `ekasir_printers_${scope}`;

const activeKey = (
  scope:
    string,
) =>
  `ekasir_active_printer_${scope}`;

const canUseStorage =
  () =>
    typeof window !==
    'undefined';

const normalizeName = (
  value:
    unknown,
) =>
  String(
    value ??
      '',
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeUuid = (
  value:
    unknown,
) =>
  String(
    value ??
      '',
  )
    .trim()
    .toLowerCase();

const isBluetooth =
  (
    printer:
      PrinterDevice,
  ) =>
    printer.type ===
      'ble' ||
    printer.type ===
      'bluetooth';

const identity = (
  printer:
    PrinterDevice,
) =>
  `${printer.type}:${printer.id}`;

/**
 * Menentukan apakah dua metadata menunjuk printer fisik yang sama.
 *
 * BLE:
 * - exact id selalu sama;
 * - fallback nama + service/characteristic dipakai untuk menyembuhkan
 *   opaque BluetoothDevice.id yang berubah/stale.
 *
 * USB:
 * - VID/PID + serial adalah identitas kuat.
 */
const samePrinter = (
  a:
    PrinterDevice,
  b:
    PrinterDevice,
) => {
  if (
    identity(a) ===
    identity(b)
  ) {
    return true;
  }

  if (
    isBluetooth(a) &&
    isBluetooth(b)
  ) {
    const aName =
      normalizeName(
        a.name,
      );

    const bName =
      normalizeName(
        b.name,
      );

    if (
      !aName ||
      aName !==
        bName
    ) {
      return false;
    }

    const aService =
      normalizeUuid(
        a.serviceUuid,
      );

    const bService =
      normalizeUuid(
        b.serviceUuid,
      );

    const aChar =
      normalizeUuid(
        a.characteristicUuid,
      );

    const bChar =
      normalizeUuid(
        b.characteristicUuid,
      );

    /**
     * Nama sama + UUID sama adalah match kuat.
     * Jika salah satu metadata UUID kosong (legacy), nama tetap dipakai
     * untuk migrasi satu kali.
     */
    const serviceCompatible =
      !aService ||
      !bService ||
      aService ===
        bService;

    const charCompatible =
      !aChar ||
      !bChar ||
      aChar ===
        bChar;

    return (
      serviceCompatible &&
      charCompatible
    );
  }

  if (
    a.type ===
      'usb' &&
    b.type ===
      'usb'
  ) {
    return Boolean(
      a.vendorId ===
        b.vendorId &&
      a.productId ===
        b.productId &&
      (
        !a.serialNumber ||
        !b.serialNumber ||
        a.serialNumber ===
          b.serialNumber
      ),
    );
  }

  return false;
};

const mergePrinter = (
  oldPrinter:
    PrinterDevice |
    undefined,
  newPrinter:
    PrinterDevice,
):
  PrinterDevice => ({
    ...(oldPrinter ||
      {}),
    ...newPrinter,

    /**
     * UUID baru mengalahkan stale metadata.
     * Jika object baru belum punya UUID, pertahankan hasil discovery lama.
     */
    serviceUuid:
      newPrinter.serviceUuid ||
      oldPrinter?.serviceUuid,

    characteristicUuid:
      newPrinter.characteristicUuid ||
      oldPrinter?.characteristicUuid,
  } as PrinterDevice);

const parsePrinterArray = (
  raw:
    string |
    null,
):
  PrinterDevice[] => {
  if (
    !raw
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        raw,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item ===
          'object' &&
        typeof item.id ===
          'string' &&
        typeof item.name ===
          'string' &&
        typeof item.type ===
          'string',
    );
  } catch {
    return [];
  }
};

export const PrinterStorage = {
  save(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    if (
      !canUseStorage()
    ) {
      return;
    }

    const current =
      this.getAll(
        scope,
      );

    const existing =
      current.find(
        (item) =>
          samePrinter(
            item,
            printer,
          ),
      );

    const merged =
      mergePrinter(
        existing,
        printer,
      );

    const next = [
      ...current.filter(
        (item) =>
          !samePrinter(
            item,
            printer,
          ),
      ),
      merged,
    ];

    localStorage.setItem(
      printerKey(
        scope,
      ),
      JSON.stringify(
        next,
      ),
    );
  },

  saveMany(
    printers:
      PrinterDevice[],
    scope =
      'default',
  ) {
    if (
      !canUseStorage()
    ) {
      return;
    }

    const unique:
      PrinterDevice[] =
      [];

    for (
      const printer of
      printers
    ) {
      const index =
        unique.findIndex(
          (item) =>
            samePrinter(
              item,
              printer,
            ),
        );

      if (
        index ===
        -1
      ) {
        unique.push(
          printer,
        );
      } else {
        unique[index] =
          mergePrinter(
            unique[index],
            printer,
          );
      }
    }

    localStorage.setItem(
      printerKey(
        scope,
      ),
      JSON.stringify(
        unique,
      ),
    );
  },

  getAll(
    scope =
      'default',
  ):
    PrinterDevice[] {
    if (
      !canUseStorage()
    ) {
      return [];
    }

    const current =
      parsePrinterArray(
        localStorage.getItem(
          printerKey(
            scope,
          ),
        ),
      );

    if (
      current.length >
      0
    ) {
      return current;
    }

    /**
     * Migrasi versi lama.
     */
    const legacy =
      localStorage.getItem(
        LEGACY_KEY,
      );

    if (
      !legacy
    ) {
      return [];
    }

    try {
      const printer =
        JSON.parse(
          legacy,
        ) as PrinterDevice;

      this.save(
        printer,
        scope,
      );

      this.setActive(
        printer,
        scope,
      );

      localStorage.removeItem(
        LEGACY_KEY,
      );

      return [
        printer,
      ];
    } catch {
      return [];
    }
  },

  setActive(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    if (
      !canUseStorage()
    ) {
      return;
    }

    this.save(
      printer,
      scope,
    );

    /**
     * Ambil canonical merged version, jangan simpan stale object.
     */
    const canonical =
      this.getAll(
        scope,
      ).find(
        (item) =>
          samePrinter(
            item,
            printer,
          ),
      ) ||
      printer;

    localStorage.setItem(
      activeKey(
        scope,
      ),
      JSON.stringify(
        canonical,
      ),
    );
  },

  getActive(
    scope =
      'default',
  ):
    PrinterDevice |
    null {
    if (
      !canUseStorage()
    ) {
      return null;
    }

    const data =
      localStorage.getItem(
        activeKey(
          scope,
        ),
      );

    if (
      data
    ) {
      try {
        const active =
          JSON.parse(
            data,
          ) as
            PrinterDevice;

        /**
         * Reconcile active metadata dengan daftar saved terbaru.
         */
        const canonical =
          this.getAll(
            scope,
          ).find(
            (item) =>
              samePrinter(
                item,
                active,
              ),
          );

        if (
          canonical
        ) {
          if (
            JSON.stringify(
              canonical,
            ) !==
            JSON.stringify(
              active,
            )
          ) {
            localStorage.setItem(
              activeKey(
                scope,
              ),
              JSON.stringify(
                canonical,
              ),
            );
          }

          return canonical;
        }

        return active;
      } catch {
        localStorage.removeItem(
          activeKey(
            scope,
          ),
        );
      }
    }

    return (
      this.getAll(
        scope,
      )[0] ||
      null
    );
  },

  remove(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    if (
      !canUseStorage()
    ) {
      return;
    }

    const next =
      this.getAll(
        scope,
      ).filter(
        (item) =>
          !samePrinter(
            item,
            printer,
          ),
      );

    this.saveMany(
      next,
      scope,
    );

    const active =
      this.getActive(
        scope,
      );

    if (
      active &&
      samePrinter(
        active,
        printer,
      )
    ) {
      if (
        next[0]
      ) {
        this.setActive(
          next[0],
          scope,
        );
      } else {
        localStorage.removeItem(
          activeKey(
            scope,
          ),
        );
      }
    }
  },

  removeAll(
    scope =
      'default',
  ) {
    if (
      !canUseStorage()
    ) {
      return;
    }

    localStorage.removeItem(
      printerKey(
        scope,
      ),
    );

    localStorage.removeItem(
      activeKey(
        scope,
      ),
    );
  },
};
