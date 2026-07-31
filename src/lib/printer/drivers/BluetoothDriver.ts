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
    value:
      BufferSource,
  ): Promise<void>;
  writeValueWithoutResponse(
    value:
      BufferSource,
  ): Promise<void>;
};

type GattService = {
  uuid: string;
  getCharacteristics():
    Promise<
      GattCharacteristic[]
    >;
  getCharacteristic(
    uuid:
      string,
  ):
    Promise<
      GattCharacteristic
    >;
};

type GattServer = {
  connected: boolean;
  connect():
    Promise<
      GattServer
    >;
  getPrimaryServices():
    Promise<
      GattService[]
    >;
  getPrimaryService(
    uuid:
      string,
  ):
    Promise<
      GattService
    >;
};

type WebBluetoothDevice = {
  id: string;
  name?: string | null;
  gatt?: GattServer;
};

type BluetoothNavigator =
  Navigator & {
    bluetooth?: {
      requestDevice(options: {
        acceptAllDevices:
          boolean;
        optionalServices:
          string[];
      }):
        Promise<
          WebBluetoothDevice
        >;
      getDevices?():
        Promise<
          WebBluetoothDevice[]
        >;
    };
  };

type BleConnection = {
  device:
    WebBluetoothDevice;
  characteristic:
    GattCharacteristic;
};

const runtimeDevices =
  new Map<
    string,
    WebBluetoothDevice
  >();

const runtimeConnections =
  new Map<
    string,
    BleConnection
  >();

/**
 * UUID yang umum ditemukan pada printer BLE.
 * Printer Bluetooth Classic/SPP tidak dapat diakses oleh Web Bluetooth.
 */
const COMMON_BLE_SERVICES =
  [
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '000018f0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  ];

export class BluetoothDriver {
  static async scan():
    Promise<
      PrinterDevice[]
    > {
    const bluetooth =
      this.getWebBluetooth();

    const device =
      await bluetooth.requestDevice({
        acceptAllDevices:
          true,
        optionalServices:
          COMMON_BLE_SERVICES,
      });

    runtimeDevices.set(
      device.id,
      device
    );

    const discovered =
      await this.discoverWritableCharacteristic(
        device
      );

    runtimeConnections.set(
      device.id,
      discovered
    );

    return [
      {
        id:
          device.id,
        name:
          device.name ||
          'BLE Printer',
        address:
          device.id,
        type:
          'ble',
        serviceUuid:
          discovered.characteristic
            ? discovered.serviceUuid
            : undefined,
        characteristicUuid:
          discovered.characteristic.uuid,
      },
    ];
  }

  static async connect(
    printer:
      PrinterDevice,
  ) {
    const connection =
      await this.getConnection(
        printer
      );

    runtimeConnections.set(
      printer.id,
      connection
    );

    return true;
  }

  static async print(
    printer:
      PrinterDevice,
    data:
      Uint8Array,
  ) {
    const connection =
      await this.getConnection(
        printer
      );

    const characteristic =
      connection.characteristic;

    const chunkSize =
      180;

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

      if (
        characteristic.properties
          .writeWithoutResponse
      ) {
        await characteristic.writeValueWithoutResponse(
          chunk
        );
      } else if (
        characteristic.properties
          .write
      ) {
        await characteristic.writeValueWithResponse(
          chunk
        );
      } else {
        throw new Error(
          'Characteristic Bluetooth tidak mendukung penulisan data.'
        );
      }

      await new Promise(
        (
          resolve
        ) =>
          window.setTimeout(
            resolve,
            12
          )
      );
    }

    return true;
  }

  private static getWebBluetooth() {
    if (
      typeof navigator ===
      'undefined'
    ) {
      throw new Error(
        'Web Bluetooth tidak tersedia di lingkungan ini.'
      );
    }

    const bluetooth =
      (
        navigator as
          BluetoothNavigator
      ).bluetooth;

    if (!bluetooth) {
      throw new Error(
        'Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge melalui HTTPS.'
      );
    }

    return bluetooth;
  }

  private static async findDevice(
    printer:
      PrinterDevice,
  ) {
    const cached =
      runtimeDevices.get(
        printer.id
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
          (
            candidate
          ) =>
            candidate.id ===
            printer.id
        );

      if (device) {
        runtimeDevices.set(
          printer.id,
          device
        );

        return device;
      }
    }

    throw new Error(
      'Akses perangkat Bluetooth tidak tersedia lagi. Tekan Deteksi Bluetooth dan pilih ulang printer.'
    );
  }

  private static async getConnection(
    printer:
      PrinterDevice,
  ):
    Promise<
      BleConnection
    > {
    const existing =
      runtimeConnections.get(
        printer.id
      );

    if (
      existing?.device.gatt
        ?.connected
    ) {
      return existing;
    }

    const device =
      await this.findDevice(
        printer
      );

    if (!device.gatt) {
      throw new Error(
        'Perangkat ini tidak menyediakan GATT. Kemungkinan printer memakai Bluetooth Classic/SPP yang tidak dapat dicetak dari browser.'
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
          printer.serviceUuid
        );

      const characteristic =
        await service.getCharacteristic(
          printer.characteristicUuid
        );

      return {
        device,
        characteristic,
      };
    }

    return this.discoverWritableCharacteristic(
      device
    );
  }

  private static async discoverWritableCharacteristic(
    device:
      WebBluetoothDevice,
  ):
    Promise<
      BleConnection & {
        serviceUuid:
          string;
      }
    > {
    if (!device.gatt) {
      throw new Error(
        'Printer tidak menyediakan BLE GATT. Jika printer hanya paired di Android, kemungkinan menggunakan Bluetooth Classic/SPP dan tidak kompatibel dengan Chrome.'
      );
    }

    const server =
      device.gatt.connected
        ? device.gatt
        : await device.gatt.connect();

    let services:
      GattService[];

    try {
      services =
        await server.getPrimaryServices();
    } catch {
      services =
        [];

      for (
        const uuid of
        COMMON_BLE_SERVICES
      ) {
        try {
          services.push(
            await server.getPrimaryService(
              uuid
            )
          );
        } catch {
          // Service tidak tersedia.
        }
      }
    }

    for (
      const service of
      services
    ) {
      const characteristics =
        await service.getCharacteristics();

      const writable =
        characteristics.find(
          (
            characteristic
          ) =>
            characteristic.properties
              .writeWithoutResponse ||
            characteristic.properties
              .write
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
      'Characteristic BLE yang dapat ditulis tidak ditemukan. Printer kemungkinan Bluetooth Classic/SPP atau memakai UUID vendor yang belum didaftarkan.'
    );
  }
}
