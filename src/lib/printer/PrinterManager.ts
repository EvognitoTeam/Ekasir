import {
  BluetoothDriver,
} from './drivers/BluetoothDriver';
import {
  UsbDriver,
} from './drivers/UsbDriver';
import {
  WifiDriver,
} from './drivers/WifiDriver';
import type {
  PrinterDevice,
  PrinterScanTransport,
} from './types';
import {
  PrinterStorage,
} from './storage';
import {
  EscPosBuilder,
} from './escpos';

type AutoReconnectController = {
  stop(): void;
  reconnect(): Promise<boolean>;
};

export class PrinterManager {
  private static reconnectPromises =
    new Map<string, Promise<boolean>>();

  private static reconnectControllers =
    new Map<string, AutoReconnectController>();

  static async scan() {
    const results =
      await Promise.allSettled([
        UsbDriver.scan(),
        BluetoothDriver.scan(),
      ]);

    return this.mergeDevices(
      results.flatMap(
        (result) =>
          result.status ===
          'fulfilled'
            ? result.value
            : [],
      ),
    );
  }

  static async scanByType(
    transport: PrinterScanTransport,
  ) {
    if (transport === 'usb') {
      return this.mergeDevices(
        await UsbDriver.scan(),
      );
    }

    return this.mergeDevices(
      await BluetoothDriver.scan(),
    );
  }

  private static mergeDevices(
    devices: PrinterDevice[],
  ) {
    return Array.from(
      new Map(
        devices.map(
          (device) => [
            `${device.type}:${device.id}`,
            device,
          ],
        ),
      ).values(),
    );
  }

  private static connectionKey(
    printer: PrinterDevice,
    scope: string,
  ) {
    return `${scope}:${printer.type}:${printer.id}`;
  }

  static async savePrinter(
    printer: PrinterDevice,
    scope = 'default',
  ) {
    PrinterStorage.save(
      printer,
      scope,
    );
  }

  static async setActivePrinter(
    printer: PrinterDevice,
    scope = 'default',
  ) {
    PrinterStorage.setActive(
      printer,
      scope,
    );
  }

  static getPrinters(
    scope = 'default',
  ) {
    return PrinterStorage.getAll(
      scope,
    );
  }

  static getPrinter(
    scope = 'default',
  ) {
    return PrinterStorage.getActive(
      scope,
    );
  }

  static removePrinter(
    printer: PrinterDevice,
    scope = 'default',
  ) {
    PrinterStorage.remove(
      printer,
      scope,
    );
  }

  static isConnected(
    selectedPrinter?: PrinterDevice,
    scope = 'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(scope);

    if (!printer) {
      return false;
    }

    switch (printer.type) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.isConnected(
          printer,
        );
      case 'usb':
        return UsbDriver.isConnected(
          printer,
        );
      case 'wifi':
        return true;
      default:
        return false;
    }
  }

  static async connect(
    selectedPrinter?: PrinterDevice,
    scope = 'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(scope);

    if (!printer) {
      throw new Error(
        'Printer belum dipilih',
      );
    }

    PrinterStorage.setActive(
      printer,
      scope,
    );

    switch (printer.type) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.connect(
          printer,
        );
      case 'usb':
        return UsbDriver.connect(
          printer,
        );
      case 'wifi':
        return WifiDriver.connect(
          printer,
        );
      default:
        throw new Error(
          'Driver printer tidak tersedia',
        );
    }
  }

  /**
   * Memulihkan koneksi printer aktif tanpa menampilkan dialog pairing.
   * Berhasil hanya ketika izin Web Bluetooth/WebUSB masih tersimpan browser.
   */
  static async reconnectSavedPrinter(
    scope = 'default',
  ): Promise<boolean> {
    const printer =
      this.getPrinter(scope);

    if (!printer) {
      return false;
    }

    if (
      this.isConnected(
        printer,
        scope,
      )
    ) {
      return true;
    }

    const key =
      this.connectionKey(
        printer,
        scope,
      );

    const existing =
      this.reconnectPromises.get(
        key,
      );

    if (existing) {
      return existing;
    }

    const reconnectPromise =
      (async () => {
        try {
          await this.connect(
            printer,
            scope,
          );
          return true;
        } catch (error) {
          console.warn(
            '[PRINTER_AUTO_RECONNECT_FAILED]',
            {
              scope,
              printer,
              error,
            },
          );
          return false;
        } finally {
          this.reconnectPromises.delete(
            key,
          );
        }
      })();

    this.reconnectPromises.set(
      key,
      reconnectPromise,
    );

    return reconnectPromise;
  }

  /**
   * Panggil sekali dari useEffect halaman kasir. Reconnect dilakukan saat
   * halaman dimuat, tab kembali aktif, browser online, serta berkala.
   */
  static startAutoReconnect(
    scope = 'default',
    intervalMs = 15000,
  ): AutoReconnectController {
    const previous =
      this.reconnectControllers.get(
        scope,
      );

    if (previous) {
      return previous;
    }

    const reconnect = async () =>
      this.reconnectSavedPrinter(
        scope,
      );

    if (
      typeof window ===
      'undefined'
    ) {
      return {
        stop() {},
        reconnect,
      };
    }

    const handleFocus = () => {
      void reconnect();
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void reconnect();
      }
    };

    const intervalId =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void reconnect();
          }
        },
        Math.max(
          5000,
          intervalMs,
        ),
      );

    window.addEventListener(
      'focus',
      handleFocus,
    );
    window.addEventListener(
      'online',
      handleFocus,
    );
    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    );

    void reconnect();

    const controller:
      AutoReconnectController = {
        reconnect,
        stop: () => {
          window.clearInterval(
            intervalId,
          );
          window.removeEventListener(
            'focus',
            handleFocus,
          );
          window.removeEventListener(
            'online',
            handleFocus,
          );
          document.removeEventListener(
            'visibilitychange',
            handleVisibility,
          );
          this.reconnectControllers.delete(
            scope,
          );
        },
      };

    this.reconnectControllers.set(
      scope,
      controller,
    );

    return controller;
  }

  static async printBytes(
    data: Uint8Array,
    selectedPrinter?: PrinterDevice,
    scope = 'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(scope);

    if (!printer) {
      throw new Error(
        'Printer aktif belum dipilih.',
      );
    }

    PrinterStorage.setActive(
      printer,
      scope,
    );

    // Pastikan printer tersambung kembali sebelum setiap print.
    await this.connect(
      printer,
      scope,
    );

    switch (printer.type) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.print(
          printer,
          data,
        );
      case 'usb':
        return UsbDriver.print(
          printer,
          data,
        );
      case 'wifi':
        return WifiDriver.print(
          printer,
          data,
        );
      default:
        throw new Error(
          'Driver printer tidak tersedia.',
        );
    }
  }

  static async testPrint(
    selectedPrinter?: PrinterDevice,
    scope = 'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(scope);

    if (!printer) {
      throw new Error(
        'Printer belum dipilih',
      );
    }

    PrinterStorage.setActive(
      printer,
      scope,
    );

    const builder =
      new EscPosBuilder();

    const data =
      builder.build(
`SATUKASIR POS

TEST PRINT BERHASIL

Printer:
${printer.name}

Koneksi:
${printer.type.toUpperCase()}

================`,
      );

    return this.printBytes(
      data,
      printer,
      scope,
    );
  }
}
