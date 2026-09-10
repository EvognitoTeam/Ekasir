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
      getAvailability?(): Promise<boolean>;
    };
  };

type BleConnection = {
  device: WebBluetoothDevice;
  characteristic: GattCharacteristic;
  serviceUuid: string;
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
 * UUID umum printer BLE thermal / ESC-POS.
 *
 * Bluetooth Classic / SPP TIDAK dapat dipulihkan memakai Web Bluetooth.
 */
const COMMON_BLE_SERVICES = [
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

function normalizeName(
  value: unknown,
) {
  return String(
    value ??
      '',
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeUuid(
  value: unknown,
) {
  return String(
    value ??
      '',
  )
    .trim()
    .toLowerCase();
}

function currentOrigin() {
  if (
    typeof window ===
    'undefined'
  ) {
    return '';
  }

  return window.location.origin;
}

export class BluetoothDriver {
  /**
   * Deteksi Bluetooth harus dipicu oleh interaksi user karena memakai
   * navigator.bluetooth.requestDevice().
   *
   * Setelah user memilih device, browser memiliki permission untuk origin
   * tersebut. Metadata PrinterDevice yang dikembalikan menggunakan
   * BluetoothDevice.id asli.
   */
  static async scan():
    Promise<PrinterDevice[]> {
    const bluetooth =
      this.getWebBluetooth();

    const device =
      await bluetooth.requestDevice({
        acceptAllDevices:
          true,
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
          discovered.serviceUuid,

        characteristicUuid:
          discovered.characteristic.uuid,
      },
    ];
  }

  /**
   * Connect / reconnect TANPA membuka chooser.
   *
   * Jika page baru direload, getConnection() akan mencoba memulihkan
   * BluetoothDevice dari navigator.bluetooth.getDevices().
   */
  static async connect(
    printer: PrinterDevice,
  ) {
    const connection =
      await this.getConnection(
        printer,
        true,
      );

    this.syncPrinterMetadata(
      printer,
      connection,
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
    const direct =
      runtimeConnections.get(
        printer.id,
      );

    if (
      direct?.device.gatt
        ?.connected
    ) {
      return true;
    }

    /**
     * Printer.id bisa disembuhkan setelah getDevices() fallback-by-name.
     * Karena itu cek juga connection yang menunjuk device dengan nama sama.
     */
    const wantedName =
      normalizeName(
        printer.name,
      );

    if (
      !wantedName
    ) {
      return false;
    }

    for (
      const connection of
      runtimeConnections.values()
    ) {
      if (
        connection.device.gatt
          ?.connected &&
        normalizeName(
          connection.device.name,
        ) ===
          wantedName
      ) {
        return true;
      }
    }

    return false;
  }

  static async disconnect(
    printer: PrinterDevice,
  ) {
    const connection =
      this.findRuntimeConnection(
        printer,
      );

    try {
      connection?.device.gatt
        ?.disconnect?.();
    } finally {
      if (
        connection
      ) {
        runtimeConnections.delete(
          connection.device.id,
        );
        connectionPromises.delete(
          connection.device.id,
        );
      }

      runtimeConnections.delete(
        printer.id,
      );
      connectionPromises.delete(
        printer.id,
      );
    }
  }

  /**
   * Semua chunk ditulis SERIAL dan benar-benar di-await.
   *
   * Prioritas:
   * 1. writeValueWithResponse -> ada ACK GATT per chunk
   * 2. writeValueWithoutResponse -> fallback untuk printer yang hanya
   *    menyediakan mode tersebut.
   *
   * Setelah chunk terakhir, ada transport-drain kecil agar buffer BLE
   * selesai menerima data sebelum PrinterManager menghitung mechanical
   * completion.
   */
  static async print(
    printer: PrinterDevice,
    data: Uint8Array,
  ) {
    let lastError:
      unknown =
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

        this.syncPrinterMetadata(
          printer,
          connection,
        );

        await this.writeChunks(
          connection.characteristic,
          data,
        );

        await this.waitForTransportDrain(
          data,
          connection.characteristic,
        );

        return true;
      } catch (error) {
        lastError =
          error;

        const connection =
          this.findRuntimeConnection(
            printer,
          );

        if (
          connection
        ) {
          runtimeConnections.delete(
            connection.device.id,
          );
          connectionPromises.delete(
            connection.device.id,
          );
        }

        runtimeConnections.delete(
          printer.id,
        );
        connectionPromises.delete(
          printer.id,
        );

        if (
          attempt === 0
        ) {
          await this.delay(
            250,
          );
        }
      }
    }

    throw lastError instanceof
      Error
      ? lastError
      : new Error(
          'Koneksi Bluetooth printer gagal.',
        );
  }

  /**
   * Diagnostic helper untuk UI/logging.
   */
  static async getPermissionDiagnostics(
    printer?: PrinterDevice,
  ) {
    const bluetooth =
      this.getWebBluetooth();

    const supportsGetDevices =
      typeof bluetooth.getDevices ===
      'function';

    let available:
      boolean | null =
      null;

    if (
      typeof bluetooth.getAvailability ===
      'function'
    ) {
      try {
        available =
          await bluetooth.getAvailability();
      } catch {
        available =
          null;
      }
    }

    let rememberedDevices:
      WebBluetoothDevice[] =
      [];

    if (
      supportsGetDevices
    ) {
      try {
        rememberedDevices =
          await bluetooth.getDevices!();
      } catch {
        rememberedDevices =
          [];
      }
    }

    return {
      origin:
        currentOrigin(),

      available,

      supportsGetDevices,

      rememberedCount:
        rememberedDevices.length,

      remembered:
        rememberedDevices.map(
          (device) => ({
            id:
              device.id,
            name:
              device.name ||
              '',
          }),
        ),

      requestedPrinter:
        printer
          ? {
              id:
                printer.id,
              name:
                printer.name,
              type:
                printer.type,
              serviceUuid:
                printer.serviceUuid,
              characteristicUuid:
                printer.characteristicUuid,
            }
          : null,
    };
  }

  private static async writeChunks(
    characteristic:
      GattCharacteristic,
    data:
      Uint8Array,
  ) {
    /**
     * BLE thermal printer umumnya lebih stabil dengan packet lebih kecil.
     * write-with-response boleh sedikit lebih besar.
     */
    const useResponse =
      Boolean(
        characteristic.properties
          .write,
      );

    const chunkSize =
      useResponse
        ? 160
        : 120;

    for (
      let offset = 0;
      offset < data.length;
      offset += chunkSize
    ) {
      const chunk =
        data.slice(
          offset,
          offset +
            chunkSize,
        );

      if (
        useResponse
      ) {
        await characteristic
          .writeValueWithResponse(
            chunk,
          );

        /**
         * ACK GATT sudah ada, delay tipis cukup.
         */
        await this.delay(
          8,
        );
      } else if (
        characteristic.properties
          .writeWithoutResponse
      ) {
        await characteristic
          .writeValueWithoutResponse(
            chunk,
          );

        /**
         * Tanpa ACK, throttle lebih konservatif supaya buffer printer
         * tidak penuh dan supaya promise tidak terlalu jauh mendahului
         * printer.
         */
        await this.delay(
          28,
        );
      } else {
        throw new Error(
          'Characteristic Bluetooth tidak mendukung penulisan data.',
        );
      }
    }
  }

  /**
   * Hanya untuk memastikan buffer TRANSPORT selesai menerima data.
   * Ini bukan timer jeda antar-copy.
   *
   * Mechanical completion tetap ditangani PrinterManager.
   */
  private static async waitForTransportDrain(
    data:
      Uint8Array,
    characteristic:
      GattCharacteristic,
  ) {
    const useResponse =
      Boolean(
        characteristic.properties
          .write,
      );

    const byteFactor =
      useResponse
        ? 0.02
        : 0.06;

    const drainMs =
      Math.round(
        Math.max(
          useResponse
            ? 120
            : 300,

          Math.min(
            1800,
            data.length *
              byteFactor,
          ),
        ),
      );

    await this.delay(
      drainMs,
    );
  }

  private static delay(
    duration:
      number,
  ) {
    return new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          Math.max(
            0,
            duration,
          ),
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

    if (
      !bluetooth
    ) {
      throw new Error(
        'Browser tidak mendukung Web Bluetooth. Gunakan Chrome atau Edge pada secure context (HTTPS / localhost).',
      );
    }

    return bluetooth;
  }

  private static rememberDevice(
    device:
      WebBluetoothDevice,
    aliasId?: string,
  ) {
    runtimeDevices.set(
      device.id,
      device,
    );

    if (
      aliasId &&
      aliasId !==
        device.id
    ) {
      runtimeDevices.set(
        aliasId,
        device,
      );
    }

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

        /**
         * Alias runtimeDevices tetap disimpan. Object BluetoothDevice yang
         * sudah granted masih bisa dipakai untuk gatt.connect() lagi selama
         * page belum reload.
         */
      },
    );

    disconnectListeners.add(
      device.id,
    );
  }

  private static findRuntimeConnection(
    printer:
      PrinterDevice,
  ):
    BleConnection |
    undefined {
    const direct =
      runtimeConnections.get(
        printer.id,
      );

    if (
      direct
    ) {
      return direct;
    }

    const wantedName =
      normalizeName(
        printer.name,
      );

    if (
      !wantedName
    ) {
      return undefined;
    }

    for (
      const connection of
      runtimeConnections.values()
    ) {
      if (
        normalizeName(
          connection.device.name,
        ) ===
          wantedName
      ) {
        return connection;
      }
    }

    return undefined;
  }

  /**
   * Cari remembered BluetoothDevice setelah reload.
   *
   * Urutan matching:
   * 1. exact BluetoothDevice.id
   * 2. printer.address lama == candidate.id
   * 3. nama exact jika hanya ada satu kandidat
   * 4. bila ada beberapa nama sama, cek stored serviceUuid
   *
   * Fallback nama dibutuhkan karena beberapa kombinasi Chrome/Windows
   * dapat mengembalikan opaque id yang berbeda setelah permission/device
   * direfresh, sedangkan nama + service tetap sama.
   */
  private static async findDevice(
    printer:
      PrinterDevice,
  ):
    Promise<WebBluetoothDevice> {
    const cached =
      runtimeDevices.get(
        printer.id,
      );

    if (
      cached
    ) {
      return cached;
    }

    const wantedName =
      normalizeName(
        printer.name,
      );

    if (
      wantedName
    ) {
      for (
        const device of
        new Set(
          runtimeDevices.values(),
        )
      ) {
        if (
          normalizeName(
            device.name,
          ) ===
            wantedName
        ) {
          this.rememberDevice(
            device,
            printer.id,
          );

          this.syncPrinterIdentity(
            printer,
            device,
          );

          return device;
        }
      }
    }

    const bluetooth =
      this.getWebBluetooth();

    if (
      typeof bluetooth.getDevices !==
      'function'
    ) {
      throw new Error(
        `Browser ini dapat memilih printer Bluetooth, tetapi tidak menyediakan navigator.bluetooth.getDevices() untuk memulihkan permission setelah reload. Origin saat ini: ${currentOrigin() || '-'}. Gunakan Chrome/Edge terbaru melalui origin yang sama.`,
      );
    }

    let devices:
      WebBluetoothDevice[];

    try {
      devices =
        await bluetooth.getDevices();
    } catch (error) {
      const message =
        error instanceof
          Error
          ? error.message
          : String(
              error,
            );

      throw new Error(
        `Permission Bluetooth tidak dapat dibaca oleh browser pada origin ${currentOrigin() || '-'}. ${message}`,
      );
    }

    if (
      devices.length ===
      0
    ) {
      throw new Error(
        `Chrome tidak mengembalikan perangkat Bluetooth yang pernah diberi izin untuk origin ${currentOrigin() || '-'}. Pastikan URL/origin tidak berubah sejak printer dideteksi.`,
      );
    }

    /**
     * Exact ID adalah kandidat utama.
     */
    let device =
      devices.find(
        (candidate) =>
          candidate.id ===
            printer.id ||
          candidate.id ===
            printer.address,
      );

    if (
      !device &&
      wantedName
    ) {
      const sameName =
        devices.filter(
          (candidate) =>
            normalizeName(
              candidate.name,
            ) ===
              wantedName,
        );

      if (
        sameName.length ===
        1
      ) {
        device =
          sameName[0];
      } else if (
        sameName.length >
          1 &&
        printer.serviceUuid
      ) {
        device =
          await this.pickByServiceUuid(
            sameName,
            printer.serviceUuid,
          );
      }
    }

    if (
      !device
    ) {
      const rememberedNames =
        devices
          .map(
            (item) =>
              item.name ||
              '(tanpa nama)',
          )
          .join(
            ', ',
          );

      throw new Error(
        `Permission Bluetooth masih ada di browser, tetapi printer tersimpan "${printer.name}" tidak cocok dengan remembered device. Device yang tersedia: ${rememberedNames || '-'}.`,
      );
    }

    this.rememberDevice(
      device,
      printer.id,
    );

    this.syncPrinterIdentity(
      printer,
      device,
    );

    return device;
  }

  private static async pickByServiceUuid(
    devices:
      WebBluetoothDevice[],
    serviceUuid:
      string,
  ):
    Promise<
      WebBluetoothDevice |
      undefined
    > {
    const normalized =
      normalizeUuid(
        serviceUuid,
      );

    for (
      const device of
      devices
    ) {
      if (
        !device.gatt
      ) {
        continue;
      }

      try {
        const server =
          device.gatt.connected
            ? device.gatt
            : await device.gatt.connect();

        await server
          .getPrimaryService(
            normalized,
          );

        return device;
      } catch {
        // Coba candidate berikutnya.
      }
    }

    return undefined;
  }

  private static async getConnection(
    printer:
      PrinterDevice,
    forceReconnect =
      false,
  ):
    Promise<BleConnection> {
    if (
      !forceReconnect
    ) {
      const existing =
        this.findRuntimeConnection(
          printer,
        );

      if (
        existing?.device.gatt
          ?.connected
      ) {
        this.syncPrinterMetadata(
          printer,
          existing,
        );

        return existing;
      }

      const pending =
        connectionPromises.get(
          printer.id,
        );

      if (
        pending
      ) {
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

      this.syncPrinterMetadata(
        printer,
        connection,
      );

      runtimeConnections.set(
        connection.device.id,
        connection,
      );

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
    printer:
      PrinterDevice,
  ):
    Promise<BleConnection> {
    const device =
      await this.findDevice(
        printer,
      );

    if (
      !device.gatt
    ) {
      throw new Error(
        'Perangkat tidak menyediakan BLE GATT. Printer kemungkinan memakai Bluetooth Classic/SPP.',
      );
    }

    const server =
      device.gatt.connected
        ? device.gatt
        : await device.gatt.connect();

    /**
     * Coba UUID tersimpan dulu.
     * Jika firmware/device berubah atau UUID stale, jangan langsung gagal:
     * discovery ulang characteristic writable.
     */
    if (
      printer.serviceUuid &&
      printer.characteristicUuid
    ) {
      try {
        const service =
          await server.getPrimaryService(
            printer.serviceUuid,
          );

        const characteristic =
          await service.getCharacteristic(
            printer.characteristicUuid,
          );

        const connection:
          BleConnection = {
            device,
            characteristic,
            serviceUuid:
              service.uuid,
          };

        this.syncPrinterMetadata(
          printer,
          connection,
        );

        return connection;
      } catch {
        // Discovery ulang di bawah.
      }
    }

    const discovered =
      await this.discoverWritableCharacteristic(
        device,
      );

    this.syncPrinterMetadata(
      printer,
      discovered,
    );

    return discovered;
  }

  private static async discoverWritableCharacteristic(
    device:
      WebBluetoothDevice,
  ):
    Promise<BleConnection> {
    if (
      !device.gatt
    ) {
      throw new Error(
        'Printer tidak menyediakan BLE GATT. Jika printer hanya paired di Windows/Android tanpa service GATT, kemungkinan memakai Bluetooth Classic/SPP.',
      );
    }

    const server =
      device.gatt.connected
        ? device.gatt
        : await device.gatt.connect();

    let services:
      GattService[] =
      [];

    /**
     * getPrimaryServices() paling nyaman, tetapi Chrome hanya dapat
     * mengakses service yang sudah diizinkan saat requestDevice().
     */
    try {
      services =
        await server.getPrimaryServices();
    } catch {
      services =
        [];
    }

    /**
     * Tambahkan COMMON_BLE_SERVICES satu per satu jika tidak muncul lewat
     * getPrimaryServices().
     */
    for (
      const uuid of
      COMMON_BLE_SERVICES
    ) {
      if (
        services.some(
          (service) =>
            normalizeUuid(
              service.uuid,
            ) ===
              normalizeUuid(
                uuid,
              ),
        )
      ) {
        continue;
      }

      try {
        services.push(
          await server.getPrimaryService(
            uuid,
          ),
        );
      } catch {
        // Service tersebut tidak tersedia.
      }
    }

    for (
      const service of
      services
    ) {
      let characteristics:
        GattCharacteristic[];

      try {
        characteristics =
          await service.getCharacteristics();
      } catch {
        continue;
      }

      /**
       * Prefer characteristic yang support WRITE WITH RESPONSE jika ada.
       * Ini memberi kontrol flow yang lebih baik daripada no-response.
       */
      const writableWithResponse =
        characteristics.find(
          (characteristic) =>
            characteristic.properties
              .write,
        );

      const writable =
        writableWithResponse ||
        characteristics.find(
          (characteristic) =>
            characteristic.properties
              .writeWithoutResponse,
        );

      if (
        writable
      ) {
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

  private static syncPrinterIdentity(
    printer:
      PrinterDevice,
    device:
      WebBluetoothDevice,
  ) {
    /**
     * Mutasi object sengaja dilakukan supaya caller yang memegang reference
     * printer lama langsung mendapat ID actual hasil getDevices().
     *
     * PrinterManager akan menyimpan ulang object ini setelah connect sukses.
     */
    printer.id =
      device.id;

    printer.address =
      device.id;

    if (
      device.name
    ) {
      printer.name =
        device.name;
    }

    if (
      printer.type ===
      'bluetooth'
    ) {
      printer.type =
        'ble';
    }
  }

  private static syncPrinterMetadata(
    printer:
      PrinterDevice,
    connection:
      BleConnection,
  ) {
    this.syncPrinterIdentity(
      printer,
      connection.device,
    );

    printer.serviceUuid =
      connection.serviceUuid;

    printer.characteristicUuid =
      connection.characteristic.uuid;
  }
}
