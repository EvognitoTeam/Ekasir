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

export class PrinterManager {
  static async scan() {
    const results =
      await Promise.allSettled([
        UsbDriver.scan(),
        BluetoothDriver.scan(),
      ]);

    return this.mergeDevices(
      results.flatMap(
        (
          result
        ) =>
          result.status ===
          'fulfilled'
            ? result.value
            : []
      )
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
        await UsbDriver.scan()
      );
    }

    return this.mergeDevices(
      await BluetoothDriver.scan()
    );
  }

  private static mergeDevices(
    devices:
      PrinterDevice[],
  ) {
    return Array.from(
      new Map(
        devices.map(
          (
            device
          ) => [
            `${device.type}:${device.id}`,
            device,
          ]
        )
      ).values()
    );
  }

  static async savePrinter(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    PrinterStorage.save(
      printer,
      scope
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
      scope
    );
  }

  static getPrinters(
    scope =
      'default',
  ) {
    return PrinterStorage.getAll(
      scope
    );
  }

  static getPrinter(
    scope =
      'default',
  ) {
    return PrinterStorage.getActive(
      scope
    );
  }

  static removePrinter(
    printer:
      PrinterDevice,
    scope =
      'default',
  ) {
    PrinterStorage.remove(
      printer,
      scope
    );
  }

  static async connect(
    selectedPrinter?:
      PrinterDevice,
    scope =
      'default',
  ) {
    const printer =
      selectedPrinter ||
      this.getPrinter(
        scope
      );

    if (!printer) {
      throw new Error(
        'Printer belum dipilih'
      );
    }

    // Pastikan perangkat aktif selalu tersimpan sebelum koneksi.
    PrinterStorage.setActive(
      printer,
      scope
    );

    switch (
      printer.type
    ) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.connect(
          printer
        );

      case 'usb':
        return UsbDriver.connect(
          printer
        );

      case 'wifi':
        return WifiDriver.connect(
          printer
        );

      default:
        throw new Error(
          'Driver printer tidak tersedia'
        );
    }
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
        scope
      );

    if (!printer) {
      throw new Error(
        'Printer aktif belum dipilih.'
      );
    }

    PrinterStorage.setActive(
      printer,
      scope
    );

    switch (
      printer.type
    ) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.print(
          printer,
          data
        );

      case 'usb':
        return UsbDriver.print(
          printer,
          data
        );

      case 'wifi':
        return WifiDriver.print(
          printer,
          data
        );

      default:
        throw new Error(
          'Driver printer tidak tersedia.'
        );
    }
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
        scope
      );

    if (!printer) {
      throw new Error(
        'Printer belum dipilih'
      );
    }

    PrinterStorage.setActive(
      printer,
      scope
    );

    const builder =
      new EscPosBuilder();

    const data =
      builder.build(
`EVOKASIR POS

TEST PRINT BERHASIL

Printer:
${printer.name}

Koneksi:
${printer.type.toUpperCase()}

================`
      );

    switch (
      printer.type
    ) {
      case 'bluetooth':
      case 'ble':
        return BluetoothDriver.print(
          printer,
          data
        );

      case 'usb':
        return UsbDriver.print(
          printer,
          data
        );

      case 'wifi':
        return WifiDriver.print(
          printer,
          data
        );

      default:
        throw new Error(
          'Driver printer tidak tersedia'
        );
    }
  }
}
