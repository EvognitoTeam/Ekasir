import { registerPlugin } from '@capacitor/core';

export interface ScanResult {
  devices: {
    id: string;
    name: string;
    address: string;
    type: string;
  }[];
}

export const NativePrinter = registerPlugin<{
  scan(): Promise<ScanResult>;
}>('PrinterPlugin');