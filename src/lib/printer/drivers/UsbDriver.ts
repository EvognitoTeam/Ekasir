import type {
  PrinterDevice,
} from '../types';

type WebUsbEndpoint = {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
};

type WebUsbAlternate = {
  alternateSetting: number;
  endpoints: WebUsbEndpoint[];
};

type WebUsbInterface = {
  interfaceNumber: number;
  alternates: WebUsbAlternate[];
  alternate: WebUsbAlternate;
  claimed: boolean;
};

type WebUsbConfiguration = {
  configurationValue: number;
  interfaces: WebUsbInterface[];
};

type WebUsbDevice = {
  productName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  configuration: WebUsbConfiguration | null;
  configurations: WebUsbConfiguration[];

  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(
    configurationValue: number,
  ): Promise<void>;
  claimInterface(
    interfaceNumber: number,
  ): Promise<void>;
  releaseInterface(
    interfaceNumber: number,
  ): Promise<void>;
  selectAlternateInterface(
    interfaceNumber: number,
    alternateSetting: number,
  ): Promise<void>;
  transferOut(
    endpointNumber: number,
    data:
      BufferSource,
  ): Promise<{
    bytesWritten?: number;
    status: string;
  }>;
};

type UsbNavigator =
  Navigator & {
    usb?: {
      requestDevice(options: {
        filters:
          Array<Record<string, number>>;
      }): Promise<WebUsbDevice>;

      getDevices():
        Promise<WebUsbDevice[]>;
    };
  };

type UsbConnection = {
  device: WebUsbDevice;
  interfaceNumber: number;
  endpointNumber: number;
  alternateSetting: number;
};

const runtimeDevices =
  new Map<
    string,
    WebUsbDevice
  >();

const runtimeConnections =
  new Map<
    string,
    UsbConnection
  >();

const printerKey = (
  printer:
    PrinterDevice,
) =>
  `${printer.vendorId || 0}:${printer.productId || 0}:${printer.serialNumber || printer.id}`;

export class UsbDriver {
  static async scan():
    Promise<
      PrinterDevice[]
    > {
    const usb =
      this.getWebUsb();

    const grantedDevices =
      await usb.getDevices();

    let devices =
      grantedDevices;

    if (
      devices.length ===
      0
    ) {
      const selected =
        await usb.requestDevice({
          filters:
            [],
        });

      devices =
        [
          selected,
        ];
    }

    return devices.map(
      (
        device
      ) => {
        const printer =
          this.normalizeDevice(
            device
          );

        runtimeDevices.set(
          printerKey(
            printer
          ),
          device
        );

        return printer;
      }
    );
  }

  static async connect(
    printer:
      PrinterDevice,
  ) {
    const connection =
      await this.openConnection(
        printer
      );

    runtimeConnections.set(
      printerKey(
        printer
      ),
      connection
    );

    return true;
  }

  static isConnected(
    printer:
      PrinterDevice,
  ) {
    const connection =
      runtimeConnections.get(
        printerKey(
          printer
        )
      );

    return Boolean(
      connection?.device.opened
    );
  }

  static async reconnect(
    printer:
      PrinterDevice,
  ) {
    return this.connect(
      printer
    );
  }

  static async print(
    printer:
      PrinterDevice,
    data:
      Uint8Array,
  ) {
    let connection =
      runtimeConnections.get(
        printerKey(
          printer
        )
      );

    if (
      !connection ||
      !connection.device.opened
    ) {
      connection =
        await this.openConnection(
          printer
        );

      runtimeConnections.set(
        printerKey(
          printer
        ),
        connection
      );
    }

    const chunkSize =
      4096;

    for (
      let offset = 0;
      offset <
      data.length;
      offset +=
      chunkSize
    ) {
      const chunk =
        data.slice(
          offset,
          offset +
            chunkSize
        );

      const result =
        await connection.device.transferOut(
          connection.endpointNumber,
          chunk
        );

      if (
        result.status !==
        'ok'
      ) {
        throw new Error(
          `Transfer USB gagal: ${result.status}`
        );
      }
    }

    return true;
  }

  static async disconnect(
    printer:
      PrinterDevice,
  ) {
    const key =
      printerKey(
        printer
      );

    const connection =
      runtimeConnections.get(
        key
      );

    if (!connection) {
      return;
    }

    try {
      if (
        connection.device.opened
      ) {
        await connection.device.releaseInterface(
          connection.interfaceNumber
        );

        await connection.device.close();
      }
    } finally {
      runtimeConnections.delete(
        key
      );
    }
  }

  private static getWebUsb() {
    if (
      typeof navigator ===
      'undefined'
    ) {
      throw new Error(
        'WebUSB tidak tersedia di lingkungan ini.'
      );
    }

    const usb =
      (
        navigator as
          UsbNavigator
      ).usb;

    if (!usb) {
      throw new Error(
        'Browser tidak mendukung WebUSB. Gunakan Chrome/Edge melalui HTTPS.'
      );
    }

    return usb;
  }

  private static async findDevice(
    printer:
      PrinterDevice,
  ) {
    const key =
      printerKey(
        printer
      );

    const cached =
      runtimeDevices.get(
        key
      );

    if (cached) {
      return cached;
    }

    const devices =
      await this
        .getWebUsb()
        .getDevices();

    const device =
      devices.find(
        (
          candidate
        ) =>
          candidate.vendorId ===
            printer.vendorId &&
          candidate.productId ===
            printer.productId &&
          (
            !printer.serialNumber ||
            candidate.serialNumber ===
              printer.serialNumber
          )
      );

    if (!device) {
      throw new Error(
        'Izin printer USB tidak ditemukan. Tekan Deteksi USB dan pilih ulang perangkat.'
      );
    }

    runtimeDevices.set(
      key,
      device
    );

    return device;
  }

  private static async openConnection(
    printer:
      PrinterDevice,
  ):
    Promise<
      UsbConnection
    > {
    const device =
      await this.findDevice(
        printer
      );

    if (
      !device.opened
    ) {
      await device.open();
    }

    if (
      !device.configuration
    ) {
      const configuration =
        device.configurations[0];

      if (!configuration) {
        throw new Error(
          'Konfigurasi USB printer tidak ditemukan.'
        );
      }

      await device.selectConfiguration(
        configuration.configurationValue
      );
    }

    const configuration =
      device.configuration;

    if (!configuration) {
      throw new Error(
        'Konfigurasi USB printer gagal diaktifkan.'
      );
    }

    for (
      const usbInterface of
      configuration.interfaces
    ) {
      for (
        const alternate of
        usbInterface.alternates
      ) {
        const outEndpoint =
          alternate.endpoints.find(
            (
              endpoint
            ) =>
              endpoint.direction ===
                'out' &&
              (
                endpoint.type ===
                  'bulk' ||
                endpoint.type ===
                  'interrupt'
              )
          );

        if (!outEndpoint) {
          continue;
        }

        try {
          if (
            !usbInterface.claimed
          ) {
            await device.claimInterface(
              usbInterface.interfaceNumber
            );
          }

          if (
            usbInterface.alternate
              .alternateSetting !==
            alternate.alternateSetting
          ) {
            await device.selectAlternateInterface(
              usbInterface.interfaceNumber,
              alternate.alternateSetting
            );
          }

          return {
            device,
            interfaceNumber:
              usbInterface.interfaceNumber,
            endpointNumber:
              outEndpoint.endpointNumber,
            alternateSetting:
              alternate.alternateSetting,
          };
        } catch {
          // Coba interface berikutnya.
        }
      }
    }

    throw new Error(
      'Endpoint OUT USB tidak ditemukan atau interface printer tidak dapat diklaim.'
    );
  }

  private static normalizeDevice(
    device:
      WebUsbDevice,
  ):
    PrinterDevice {
    const serialNumber =
      device.serialNumber ||
      undefined;

    return {
      id:
        serialNumber ||
        `usb-${device.vendorId}-${device.productId}`,
      name:
        device.productName ||
        `USB Printer ${device.vendorId}:${device.productId}`,
      address:
        `VID ${device.vendorId} • PID ${device.productId}`,
      type:
        'usb',
      vendorId:
        device.vendorId,
      productId:
        device.productId,
      serialNumber,
    };
  }
}
