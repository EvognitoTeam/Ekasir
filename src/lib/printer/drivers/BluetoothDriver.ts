import { Capacitor } from '@capacitor/core';
import { NativePrinter } from '../PrinterPlugin';
import { PrinterDevice } from '../types';

export class BluetoothDriver {

  static async scan(): Promise<PrinterDevice[]> {

    console.log(
    "EKASIR: scan dipanggil"
  );

  console.log(
    "isNative",
    Capacitor.isNativePlatform()
  );

    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    const result = await NativePrinter.scan();

    console.log(
    "HASIL",
    result
  );


    return result.devices as PrinterDevice[];
  }

  static async connect(
    printer: PrinterDevice
  ) {
    return true;
  }

  static async print(
    printer: PrinterDevice,
    data: Uint8Array
  ) {}
}