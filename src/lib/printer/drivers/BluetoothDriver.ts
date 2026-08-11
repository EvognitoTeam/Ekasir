import type {
  PrinterDevice,
} from '../types';

type GattCharacteristic = {
  uuid: string;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValueWithResponse(
    value: BufferSource,
  ): Promise<void>;
  writeValueWithoutResponse(
    value: BufferSource,
  ): Promise<void>;
};

type GattService = {
  uuid: string;
  getCharacteristics(): Promise<GattCharacteristic[]>;
  getCharacteristic(
    uuid: string,
  ): Promise<GattCharacteristic>;
};

type GattServer = {
  connected: boolean;
  connect(): Promise<GattServer>;
  disconnect?(): void;
  getPrimaryServices(): Promise<GattService[]>;
  getPrimaryService(
    uuid: string,
  ): Promise<GattService>;
};

type WebBluetoothDevice = {
  id: string;
  name?: string | null;
  gatt?: GattServer;
  addEventListener?(
    type: 'gattserverdisconnected',
    listener: () => void,
  ): void;
};

type BluetoothNavigator =
  Navigator & {
    bluetooth?: {
      requestDevice(options: {
        acceptAllDevices: boolean;
        optionalServices: string[];
      }): Promise<WebBluetoothDevice>;
      getDevices?(): Promise<WebBluetoothDevice[]>;
    };
  };

type BleConnection = {
  device: WebBluetoothDevice;
  characteristic: GattCharacteristic;
};

const runtimeDevices =
  new Map<string, WebBluetoothDevice>();

const runtimeConnections =
  new Map<string, BleConnection>();

const connectionPromises =
  new Map<string, Promise<BleConnection>>();

const disconnectListeners =
  new Set<string>();

/**
 * UUID umum untuk printer BLE. Printer Bluetooth Classic/SPP tidak dapat
 * diakses melalui Web Bluetooth browser.
 */
const COMMON_BLE_SERVICES = [
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

export class BluetoothDriver {
  static async scan(): Promise<PrinterDevice[]> {
    const bluetooth =
      this.getWebBluetooth();

    const device =
      await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices:
          COMMON_BLE_SERVICES,
      });

    this.rememberDevice(
      device,
    );

    const discovered =
      await this.discoverWritableCharacteristic(
        device,
      );

    runtimeConnections.set(
      device.id,
      discovered,
    );

    return [
      {
        id: device.id,
        name:
          device.name ||
          'BLE Printer',
        address: device.id,
        type: 'ble',
        serviceUuid:
          discovered.serviceUuid,
        characteristicUuid:
          discovered.characteristic.uuid,
      },
    ];
  }

  static async connect(
    printer: PrinterDevice,
  ) {
    const connection =
      await this.getConnection(
        printer,
        true,
      );

    runtimeConnections.set(
      printer.id,
      connection,
    );

    return true;
  }

  static async reconnect(
    printer: PrinterDevice,
  ) {
    return this.connect(
      printer,
    );
  }

  static isConnected(
    printer: PrinterDevice,
  ) {
    return Boolean(
      runtimeConnections
        .get(printer.id)
        ?.device.gatt
        ?.connected,
    );
  }

  static async disconnect(
    printer: PrinterDevice,
  ) {
    const connection =
      runtimeConnections.get(
        printer.id,
      );

    try {
      connection?.device.gatt
        ?.disconnect?.();
    } finally {
      runtimeConnections.delete(
        printer.id,
      );
      connectionPromises.delete(
        printer.id,
      );
    }
  }

  static async print(
    printer: PrinterDevice,
    data: Uint8Array,
  ) {
    let lastError: unknown =
      null;

    for (
      let attempt = 0;
      attempt < 2;
      attempt += 1
    ) {
      try {
        const connection =
          await this.getConnection(
            printer,
            attempt > 0,
          );

        await this.writeChunks(
          connection.characteristic,
          data,
        );

        return true;
      } catch (error) {
        lastError = error;
        runtimeConnections.delete(
          printer.id,
        );
        connectionPromises.delete(
          printer.id,
        );

        if (attempt === 0) {
          await this.delay(150);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(
          'Koneksi Bluetooth printer gagal.',
        );
  }

  private static async writeChunks(
    characteristic: GattCharacteristic,
    data: Uint8Array,
  ) {
    const chunkSize = 180;

    for (
      let offset = 0;
      offset < data.length;
      offset += chunkSize
    ) {
      const chunk = data.slice(
        offset,
        offset + chunkSize,
      );

      if (
        characteristic.properties
          .writeWithoutResponse
      ) {
        await characteristic.writeValueWithoutResponse(
          chunk,
        );
      } else if (
        characteristic.properties
          .write
      ) {
        await characteristic.writeValueWithResponse(
          chunk,
        );
      } else {
        throw new Error(
          'Characteristic Bluetooth tidak mendukung penulisan data.',
        );
      }

      await this.delay(12);
    }
  }

  private static delay(
    duration: number,
  ) {
    return new Promise<void>(
      (resolve) => {
        if (
          typeof window !==
          'undefined'
        ) {
          window.setTimeout(
            resolve,
            duration,
          );
          return;
        }

        setTimeout(
          resolve,
          duration,
        );
      },
    );
  }

  private static getWebBluetooth() {
    if (
      typeof navigator ===
      'undefined'
    ) {
      throw new Error(
        'Web Bluetooth tidak tersedia di lingkungan ini.',
      );
    }

    const bluetooth =
      (
        navigator as
          BluetoothNavigator
      ).bluetooth;

    if (!bluetooth) {
      throw new Error(
        'Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge melalui HTTPS.',
      );
    }

    return bluetooth;
  }

  private static rememberDevice(
    device: WebBluetoothDevice,
  ) {
    runtimeDevices.set(
      device.id,
      device,
    );

    if (
      disconnectListeners.has(
        device.id,
      )
    ) {
      return;
    }

    device.addEventListener?.(
      'gattserverdisconnected',
      () => {
        runtimeConnections.delete(
          device.id,
        );
        connectionPromises.delete(
          device.id,
        );
      },
    );

    disconnectListeners.add(
      device.id,
    );
  }

  private static async findDevice(
    printer: PrinterDevice,
  ) {
    const cached =
      runtimeDevices.get(
        printer.id,
      );

    if (cached) {
      return cached;
    }

    const bluetooth =
      this.getWebBluetooth();

    if (
      typeof bluetooth.getDevices ===
      'function'
    ) {
      const devices =
        await bluetooth.getDevices();

      const device =
        devices.find(
          (candidate) =>
            candidate.id ===
            printer.id,
        );

      if (device) {
        this.rememberDevice(
          device,
        );
        return device;
      }
    }

    throw new Error(
      'Izin perangkat Bluetooth tidak tersedia lagi. Tekan Deteksi Bluetooth dan pilih ulang printer.',
    );
  }

  private static async getConnection(
    printer: PrinterDevice,
    forceReconnect = false,
  ): Promise<BleConnection> {
    if (!forceReconnect) {
      const existing =
        runtimeConnections.get(
          printer.id,
        );

      if (
        existing?.device.gatt
          ?.connected
      ) {
        return existing;
      }

      const pending =
        connectionPromises.get(
          printer.id,
        );

      if (pending) {
        return pending;
      }
    }

    const pendingConnection =
      this.createConnection(
        printer,
      );

    connectionPromises.set(
      printer.id,
      pendingConnection,
    );

    try {
      const connection =
        await pendingConnection;

      runtimeConnections.set(
        printer.id,
        connection,
      );

      return connection;
    } finally {
      connectionPromises.delete(
        printer.id,
      );
    }
  }

  private static async createConnection(
    printer: PrinterDevice,
  ): Promise<BleConnection> {
    const device =
      await this.findDevice(
        printer,
      );

    if (!device.gatt) {
      throw new Error(
        'Perangkat tidak menyediakan BLE GATT. Printer kemungkinan memakai Bluetooth Classic/SPP.',
      );
    }

    if (
      printer.serviceUuid &&
      printer.characteristicUuid
    ) {
      const server =
        device.gatt.connected
          ? device.gatt
          : await device.gatt.connect();

      const service =
        await server.getPrimaryService(
          printer.serviceUuid,
        );

      const characteristic =
        await service.getCharacteristic(
          printer.characteristicUuid,
        );

      return {
        device,
        characteristic,
      };
    }

    return this.discoverWritableCharacteristic(
      device,
    );
  }

  private static async discoverWritableCharacteristic(
    device: WebBluetoothDevice,
  ): Promise<
    BleConnection & {
      serviceUuid: string;
    }
  > {
    if (!device.gatt) {
      throw new Error(
        'Printer tidak menyediakan BLE GATT. Jika printer hanya paired di Android, kemungkinan menggunakan Bluetooth Classic/SPP.',
      );
    }

    const server =
      device.gatt.connected
        ? device.gatt
        : await device.gatt.connect();

    let services: GattService[];

    try {
      services =
        await server.getPrimaryServices();
    } catch {
      services = [];

      for (
        const uuid of
        COMMON_BLE_SERVICES
      ) {
        try {
          services.push(
            await server.getPrimaryService(
              uuid,
            ),
          );
        } catch {
          // Service tidak tersedia.
        }
      }
    }

    for (
      const service of services
    ) {
      const characteristics =
        await service.getCharacteristics();

      const writable =
        characteristics.find(
          (characteristic) =>
            characteristic.properties
              .writeWithoutResponse ||
            characteristic.properties
              .write,
        );

      if (writable) {
        return {
          device,
          characteristic:
            writable,
          serviceUuid:
            service.uuid,
        };
      }
    }

    throw new Error(
      'Characteristic BLE yang dapat ditulis tidak ditemukan. Printer kemungkinan Bluetooth Classic/SPP atau UUID vendor belum didaftarkan.',
    );
  }
}
