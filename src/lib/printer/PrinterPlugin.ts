import {
  registerPlugin,
} from '@capacitor/core';

import type {
  PrinterDevice,
} from './types';

export interface ScanResult {
  devices: PrinterDevice[];
}

export interface PrintResult {
  success: boolean;
  message?: string;
}

export const NativePrinter =
  registerPlugin<{
    scan(): Promise<ScanResult>;
    scanUsb?(): Promise<ScanResult>;
    scanBluetooth?(): Promise<ScanResult>;
    connect(options: {
      printer: PrinterDevice;
    }): Promise<PrintResult>;
    print(options: {
      printer: PrinterDevice;
      data: number[];
    }): Promise<PrintResult>;
  }>('PrinterPlugin');
