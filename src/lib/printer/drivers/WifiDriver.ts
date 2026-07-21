import { PrinterDevice } from "../types";

export class WifiDriver {

  static async scan() {
    return [];
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