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

const identity = (
  printer:
    PrinterDevice,
) =>
  `${printer.type}:${printer.id}`;

const canUseStorage =
  () =>
    typeof window !==
    'undefined';

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
        scope
      );

    const next =
      [
        ...current.filter(
          (
            item
          ) =>
            identity(
              item
            ) !==
            identity(
              printer
            )
        ),
        printer,
      ];

    localStorage.setItem(
      printerKey(
        scope
      ),
      JSON.stringify(
        next
      )
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

    const unique =
      Array.from(
        new Map(
          printers.map(
            (
              printer
            ) => [
              identity(
                printer
              ),
              printer,
            ]
          )
        ).values()
      );

    localStorage.setItem(
      printerKey(
        scope
      ),
      JSON.stringify(
        unique
      )
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

    const data =
      localStorage.getItem(
        printerKey(
          scope
        )
      );

    if (data) {
      try {
        const parsed =
          JSON.parse(
            data
          );

        return Array.isArray(
          parsed
        )
          ? parsed
          : [];
      } catch {
        return [];
      }
    }

    // Migrasi penyimpanan versi lama yang hanya menyimpan satu printer.
    const legacy =
      localStorage.getItem(
        LEGACY_KEY
      );

    if (!legacy) {
      return [];
    }

    try {
      const printer =
        JSON.parse(
          legacy
        ) as
          PrinterDevice;

      this.save(
        printer,
        scope
      );

      this.setActive(
        printer,
        scope
      );

      localStorage.removeItem(
        LEGACY_KEY
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
      scope
    );

    localStorage.setItem(
      activeKey(
        scope
      ),
      JSON.stringify(
        printer
      )
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
          scope
        )
      );

    if (data) {
      try {
        return JSON.parse(
          data
        );
      } catch {
        localStorage.removeItem(
          activeKey(
            scope
          )
        );
      }
    }

    return (
      this.getAll(
        scope
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
        scope
      ).filter(
        (
          item
        ) =>
          identity(
            item
          ) !==
          identity(
            printer
          )
      );

    this.saveMany(
      next,
      scope
    );

    const active =
      this.getActive(
        scope
      );

    if (
      active &&
      identity(
        active
      ) ===
        identity(
          printer
        )
    ) {
      if (
        next[0]
      ) {
        this.setActive(
          next[0],
          scope
        );
      } else {
        localStorage.removeItem(
          activeKey(
            scope
          )
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
        scope
      )
    );

    localStorage.removeItem(
      activeKey(
        scope
      )
    );
  },
};
