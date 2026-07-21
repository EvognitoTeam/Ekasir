import { BluetoothDriver } from "./drivers/BluetoothDriver";
import { WifiDriver } from "./drivers/WifiDriver";

import {
  PrinterDevice
} from "./types";

import {
  PrinterStorage
} from "./storage";

import {
  EscPosBuilder
} from "./escpos";

export class PrinterManager {

  static async scan() {

    const bluetooth =
      await BluetoothDriver.scan();

    const wifi =
      await WifiDriver.scan();

    return [
      ...bluetooth,
      ...wifi
    ];
  }

  static async savePrinter(
    printer: PrinterDevice
  ) {
    PrinterStorage.save(
      printer
    );
  }

  static getPrinter() {
    return PrinterStorage.get();
  }

  static async connect() {

    const printer =
      this.getPrinter();

    if (!printer) {
      throw new Error(
        "Printer belum dipilih"
      );
    }

    switch (
      printer.type
    ) {

      case "bluetooth":
        return BluetoothDriver.connect(
          printer
        );

      case "wifi":
        return WifiDriver.connect(
          printer
        );

      default:
        throw new Error(
          "Driver tidak tersedia"
        );
    }
  }

  static async testPrint() {

    const printer =
      this.getPrinter();

    if (!printer) {
      throw new Error(
        "Printer belum dipilih"
      );
    }

    const builder =
      new EscPosBuilder();

    const data =
      builder.build(
`EKASIR POS

TEST PRINT

Printer :
${printer.name}

================`
      );

    switch (
      printer.type
    ) {

      case "bluetooth":
        return BluetoothDriver.print(
          printer,
          data
        );

      case "wifi":
        return WifiDriver.print(
          printer,
          data
        );

      default:
        throw new Error(
          "Driver tidak tersedia"
        );
    }
  }
}