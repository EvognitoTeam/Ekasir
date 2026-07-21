export type PrinterType =
  | "bluetooth"
  | "wifi"
  | "usb"
  | "ble";

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: PrinterType;
}

export interface PrintData {
  content: string;
}