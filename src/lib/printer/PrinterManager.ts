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

function sleep(
  ms:
    number,
):
  Promise<void> {
  if (
    !Number.isFinite(
      ms,
    ) ||
    ms <= 0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        ms,
      );
    },
  );
}

export class PrinterManager {
  private static reconnectPromises =
    new Map<
      string,
      Promise<boolean>
    >();

  private static reconnectControllers =
    new Map<
      string,
      AutoReconnectController
    >();

  /**
   * Serial print queue per printer.
   */
  private static printQueues =
    new Map<
      string,
      Promise<void>
    >();

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
    transport:
      PrinterScanTransport,
  ) {
    if (
      transport ===
      'usb'
    ) {
      return this.mergeDevices(
        await UsbDriver.scan(),
      );
    }

    return this.mergeDevices(
      await BluetoothDriver.scan(),
    );
  }

  private static mergeDevices(
    devices:
      PrinterDevice[],
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
    printer:
      PrinterDevice,
    scope:
      string,
  ) {
    return `${scope}:${printer.type}:${printer.id}`;
  }

  static async savePrinter(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    PrinterStorage.save(
      printer,
      scope,
    );
  }

  static async setActivePrinter(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    PrinterStorage.setActive(
      printer,
      scope,
    );
  }

  static getPrinters(
    scope =
      'default',
  ) {
    return PrinterStorage.getAll(
      scope,
    );
  }

  static getPrinter(
    scope =
      'default',
  ) {
    return PrinterStorage.getActive(
      scope,
    );
  }

  static removePrinter(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    void this.disconnect(
      printer,
    );

    PrinterStorage.remove(
      printer,
      scope,
    );
  }

  static async disconnect(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      return;
    }

    switch (
      printer.type
    ) {
      case 'ble':
      case 'bluetooth':
        await BluetoothDriver.disconnect(
          printer,
        );
        break;

      case 'usb':
        await UsbDriver.disconnect(
          printer,
        );
        break;

      default:
        break;
    }
  }

  static isConnected(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      return false;
    }

    switch (
      printer.type
    ) {
      case 'ble':
      case 'bluetooth':
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

  /**
   * Connect menggunakan SATU source-of-truth per transport.
   *
   * Tidak ada lagi session Web Bluetooth kedua di PrinterManager.
   * Seluruh permission recovery BLE ditangani BluetoothDriver.
   *
   * Penting: PrinterStorage disimpan ULANG setelah connect sukses karena
   * BluetoothDriver boleh menyembuhkan stale device.id / UUID.
   */
  static async connect(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      throw new Error(
        'Printer belum dipilih',
      );
    }

    let result:
      unknown;

    switch (
      printer.type
    ) {
      case 'ble':
      case 'bluetooth':
        result =
          await BluetoothDriver.connect(
            printer,
          );
        break;

      case 'usb':
        result =
          await UsbDriver.connect(
            printer,
          );
        break;

      case 'wifi':
        result =
          await WifiDriver.connect(
            printer,
          );
        break;

      default:
        throw new Error(
          'Driver printer tidak tersedia',
        );
    }

    /**
     * printer mungkin sudah dimutasi BluetoothDriver:
     * - id actual dari getDevices()
     * - serviceUuid actual
     * - characteristicUuid actual
     */
    PrinterStorage.save(
      printer,
      scope,
    );

    PrinterStorage.setActive(
      printer,
      scope,
    );

    return result;
  }

  static async reconnectSavedPrinter(
    scope =
      'default',
  ):
    Promise<boolean> {
    const printer =
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
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

    if (
      existing
    ) {
      return existing;
    }

    const reconnectPromise =
      (
        async () => {
          try {
            await this.connect(
              printer,
              scope,
            );

            console.info(
              '[PRINTER_AUTO_RECONNECT_OK]',
              {
                scope,
                printer:
                  printer.name,
                type:
                  printer.type,
              },
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
        }
      )();

    this.reconnectPromises.set(
      key,
      reconnectPromise,
    );

    return reconnectPromise;
  }

  /**
   * Auto reconnect:
   * - langsung saat CashierProvider mount
   * - focus
   * - online
   * - visibility kembali visible
   * - interval
   */
  static startAutoReconnect(
    scope =
      'default',
    intervalMs =
      15000,
  ):
    AutoReconnectController {
    const previous =
      this.reconnectControllers.get(
        scope,
      );

    if (
      previous
    ) {
      return previous;
    }

    const reconnect =
      async () =>
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

    const handleFocus =
      () => {
        void reconnect();
      };

    const handleVisibility =
      () => {
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

  /**
   * Estimasi kapan kertas + cutter sudah selesai bergerak.
   *
   * Web Bluetooth/WebUSB printer murah biasanya hanya memberi tahu bahwa
   * bytes sudah masuk ke transport/buffer, bukan bahwa mekanik sudah idle.
   *
   * Estimator ini sengaja memakai kecepatan thermal konservatif 40 mm/s.
   * Tujuannya agar copyDelay benar-benar terlihat SETELAH receipt selesai,
   * bukan overlap dengan print receipt sebelumnya.
   */
  private static estimateMechanicalCompletionMs(
    data:
      Uint8Array,
    printer:
      PrinterDevice,
  ) {
    let lineFeeds =
      0;

    let rasterRows =
      0;

    let hasCut =
      false;

    for (
      let index = 0;
      index < data.length;
      index += 1
    ) {
      if (
        data[index] ===
        0x0a
      ) {
        lineFeeds +=
          1;
      }

      /**
       * GS v 0 m xL xH yL yH [raster]
       */
      if (
        data[index] ===
          0x1d &&
        data[index + 1] ===
          0x76 &&
        data[index + 2] ===
          0x30 &&
        index + 7 <
          data.length
      ) {
        const rows =
          data[index + 6] |
          (
            data[index + 7] <<
            8
          );

        if (
          rows > 0
        ) {
          rasterRows +=
            rows;
        }
      }

      if (
        data[index] ===
          0x1d &&
        data[index + 1] ===
          0x56
      ) {
        hasCut =
          true;
      }
    }

    /**
     * Approx:
     * - satu text line ~3.7 mm
     * - 203dpi raster ~8 dots/mm
     */
    const textMm =
      lineFeeds *
      3.7;

    const rasterMm =
      rasterRows /
      8;

    const paperMm =
      Math.max(
        20,
        textMm +
          rasterMm,
      );

    /**
     * 40mm/s sengaja lebih lambat daripada sebagian besar printer thermal
     * agar completion tidak terlalu cepat.
     */
    const printMotionMs =
      (
        paperMm /
        40
      ) *
      1000;

    const cutterMs =
      hasCut
        ? 1500
        : 650;

    const motorSettleMs =
      900;

    const transportTailMs =
      printer.type ===
          'ble' ||
        printer.type ===
          'bluetooth'
        ? 900
        : printer.type ===
            'wifi'
          ? 550
          : 350;

    return Math.round(
      Math.max(
        2800,
        Math.min(
          18000,
          printMotionMs +
            cutterMs +
            motorSettleMs +
            transportTailMs,
        ),
      ),
    );
  }

  private static async executePrint(
    data:
      Uint8Array,
    printer:
      PrinterDevice,
    scope:
      string,
  ) {
    await this.connect(
      printer,
      scope,
    );

    switch (
      printer.type
    ) {
      case 'ble':
      case 'bluetooth':
        await BluetoothDriver.print(
          printer,
          data,
        );
        break;

      case 'usb':
        await UsbDriver.print(
          printer,
          data,
        );
        break;

      case 'wifi':
        await WifiDriver.print(
          printer,
          data,
        );
        break;

      default:
        throw new Error(
          'Driver printer tidak tersedia.',
        );
    }

    const mechanicalWaitMs =
      this.estimateMechanicalCompletionMs(
        data,
        printer,
      );

    console.info(
      '[PRINTER_MECHANICAL_WAIT_START]',
      {
        printer:
          printer.name,
        mechanicalWaitMs,
      },
    );

    await sleep(
      mechanicalWaitMs,
    );

    console.info(
      '[PRINTER_MECHANICAL_WAIT_END]',
      {
        printer:
          printer.name,
        at:
          new Date().toISOString(),
      },
    );
  }

  static async printBytes(
    data:
      Uint8Array,
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      throw new Error(
        'Printer aktif belum dipilih.',
      );
    }

    const key =
      this.connectionKey(
        printer,
        scope,
      );

    const previous =
      this.printQueues.get(
        key,
      ) ??
      Promise.resolve();

    const current =
      previous
        .catch(
          () => {
            // Error job sebelumnya tidak mengunci queue berikutnya.
          },
        )
        .then(
          () =>
            this.executePrint(
              data,
              printer,
              scope,
            ),
        );

    this.printQueues.set(
      key,
      current,
    );

    try {
      await current;
    } finally {
      if (
        this.printQueues.get(
          key,
        ) ===
          current
      ) {
        this.printQueues.delete(
          key,
        );
      }
    }
  }

  static async waitForPrintComplete(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      return;
    }

    const queue =
      this.printQueues.get(
        this.connectionKey(
          printer,
          scope,
        ),
      );

    if (
      queue
    ) {
      await queue;
    }
  }

  /**
   * INI sengaja menunggu FULL delay setelah print complete.
   *
   * Tidak ada pengurangan timestamp/elapsed time.
   *
   * copy #1 selesai total
   * -> baru sleep copyDelayMs penuh
   * -> copy #2 boleh dimulai
   */
  static async waitAfterPhysicalPrint(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
    delayMs =
      0,
  ) {
    await this.waitForPrintComplete(
      selectedPrinter,
      scope,
    );

    const normalizedDelayMs =
      Math.max(
        0,
        Math.min(
          60000,
          Math.round(
            Number(
              delayMs,
            ) ||
              0,
          ),
        ),
      );

    if (
      normalizedDelayMs <=
      0
    ) {
      return;
    }

    console.info(
      '[PRINTER_COPY_GAP_START]',
      {
        delayMs:
          normalizedDelayMs,
        at:
          new Date().toISOString(),
      },
    );

    /**
     * FULL delay. Tidak dihitung mundur dari write / timestamp sebelumnya.
     */
    await sleep(
      normalizedDelayMs,
    );

    console.info(
      '[PRINTER_COPY_GAP_END]',
      {
        at:
          new Date().toISOString(),
      },
    );
  }

  static async waitUntilIdle(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    await this.waitForPrintComplete(
      selectedPrinter,
      scope,
    );
  }

  static async waitForIdle(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    await this.waitForPrintComplete(
      selectedPrinter,
      scope,
    );
  }

  static async testPrint(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope,
      );

    if (
      !printer
    ) {
      throw new Error(
        'Printer belum dipilih',
      );
    }

    const builder =
      new EscPosBuilder();

    const data =
      builder.build(
`KALOO POS

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
