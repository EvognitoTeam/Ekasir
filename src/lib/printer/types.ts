export type PrinterType =
  | 'bluetooth'
  | 'wifi'
  | 'usb'
  | 'ble';

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: PrinterType;

  vendorId?: number;
  productId?: number;
  serialNumber?: string;

  serviceUuid?: string;
  characteristicUuid?: string;
}

export interface PrintData {
  content: string;
}

export type PrinterScanTransport =
  | 'usb'
  | 'bluetooth';
