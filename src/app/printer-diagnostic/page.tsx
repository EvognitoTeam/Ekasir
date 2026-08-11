"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BatteryCharging,
  Bluetooth,
  CheckCircle2,
  Clipboard,
  Download,
  Loader2,
  Play,
  PlugZap,
  Radio,
  RefreshCcw,
  Search,
  Trash2,
  Unplug,
  XCircle,
} from "lucide-react";

type BluetoothCharacteristicPropertiesLike = {
  authenticatedSignedWrites?: boolean;
  broadcast?: boolean;
  indicate?: boolean;
  notify?: boolean;
  read?: boolean;
  reliableWrite?: boolean;
  writableAuxiliaries?: boolean;
  write?: boolean;
  writeWithoutResponse?: boolean;
};

type BluetoothRemoteGattCharacteristicLike = {
  uuid: string;
  properties: BluetoothCharacteristicPropertiesLike;
  value?: DataView | null;

  readValue(): Promise<DataView>;

  writeValue?(
    value: BufferSource,
  ): Promise<void>;

  writeValueWithResponse?(
    value: BufferSource,
  ): Promise<void>;

  writeValueWithoutResponse?(
    value: BufferSource,
  ): Promise<void>;

  startNotifications():
    Promise<BluetoothRemoteGattCharacteristicLike>;

  stopNotifications():
    Promise<BluetoothRemoteGattCharacteristicLike>;

  addEventListener(
    type: "characteristicvaluechanged",
    listener: EventListenerOrEventListenerObject,
  ): void;

  removeEventListener(
    type: "characteristicvaluechanged",
    listener: EventListenerOrEventListenerObject,
  ): void;
};

type BluetoothRemoteGattServiceLike = {
  uuid: string;

  getCharacteristics():
    Promise<
      BluetoothRemoteGattCharacteristicLike[]
    >;

  getCharacteristic(
    uuid: string,
  ): Promise<
    BluetoothRemoteGattCharacteristicLike
  >;
};

type BluetoothRemoteGattServerLike = {
  connected: boolean;

  connect():
    Promise<
      BluetoothRemoteGattServerLike
    >;

  disconnect(): void;

  getPrimaryServices():
    Promise<
      BluetoothRemoteGattServiceLike[]
    >;

  getPrimaryService(
    uuid: string,
  ): Promise<
      BluetoothRemoteGattServiceLike
    >;
};

type BluetoothDeviceLike = {
  id: string;
  name?: string | null;
  uuids?: string[];
  gatt?: BluetoothRemoteGattServerLike;

  addEventListener(
    type: "gattserverdisconnected",
    listener: EventListenerOrEventListenerObject,
  ): void;

  removeEventListener(
    type: "gattserverdisconnected",
    listener: EventListenerOrEventListenerObject,
  ): void;
};

type BluetoothNavigatorLike =
  Navigator & {
    bluetooth?: {
      requestDevice(
        options: {
          acceptAllDevices: boolean;
          optionalServices: string[];
        },
      ): Promise<BluetoothDeviceLike>;

      getDevices?():
        Promise<
          BluetoothDeviceLike[]
        >;
    };
  };

type CharacteristicResult = {
  uuid: string;
  properties: string[];
  readable: boolean;
  writable: boolean;
  notifiable: boolean;
  lastHex: string | null;
  lastDecimal: number[] | null;
  lastText: string | null;
  error: string | null;
};

type ServiceResult = {
  uuid: string;
  characteristics:
    CharacteristicResult[];
  error: string | null;
};

type BatteryResult = {
  supported: boolean;
  level: number | null;
  source: string;
  error: string | null;
};

type DiagnosticLog = {
  time: string;
  level:
    | "info"
    | "success"
    | "warning"
    | "error";
  message: string;
  data?: unknown;
};

const BATTERY_SERVICE =
  "0000180f-0000-1000-8000-00805f9b34fb";

const BATTERY_LEVEL_CHARACTERISTIC =
  "00002a19-0000-1000-8000-00805f9b34fb";

const DEVICE_INFORMATION_SERVICE =
  "0000180a-0000-1000-8000-00805f9b34fb";

const COMMON_PRINTER_SERVICES = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  BATTERY_SERVICE,
  DEVICE_INFORMATION_SERVICE,
];

const STORAGE_KEY =
  "satuusaha_printer_diagnostic_device";

function normalizeUuid(
  value: string,
): string {
  const normalized =
    value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (
    /^[0-9a-f]{4}$/.test(
      normalized,
    )
  ) {
    return `0000${normalized}-0000-1000-8000-00805f9b34fb`;
  }

  if (
    /^[0-9a-f]{8}$/.test(
      normalized,
    )
  ) {
    return `${normalized}-0000-1000-8000-00805f9b34fb`;
  }

  return normalized;
}

function bytesToHex(
  value: DataView,
): string {
  const bytes =
    new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );

  return Array.from(
    bytes,
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join(" ");
}

function bytesToDecimal(
  value: DataView,
): number[] {
  const bytes =
    new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );

  return Array.from(
    bytes,
  );
}

function bytesToText(
  value: DataView,
): string {
  const bytes =
    new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );

  try {
    return new TextDecoder()
      .decode(bytes)
      .replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        "",
      )
      .trim();
  } catch {
    return "";
  }
}

function getProperties(
  characteristic:
    BluetoothRemoteGattCharacteristicLike,
): string[] {
  const properties =
    characteristic.properties;

  return [
    properties.read
      ? "read"
      : null,

    properties.write
      ? "write"
      : null,

    properties.writeWithoutResponse
      ? "writeWithoutResponse"
      : null,

    properties.notify
      ? "notify"
      : null,

    properties.indicate
      ? "indicate"
      : null,

    properties.broadcast
      ? "broadcast"
      : null,

    properties.authenticatedSignedWrites
      ? "authenticatedSignedWrites"
      : null,

    properties.reliableWrite
      ? "reliableWrite"
      : null,

    properties.writableAuxiliaries
      ? "writableAuxiliaries"
      : null,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );
}

function isWritable(
  characteristic:
    BluetoothRemoteGattCharacteristicLike,
): boolean {
  return Boolean(
    characteristic.properties.write ||
      characteristic.properties
        .writeWithoutResponse,
  );
}

function isNotifiable(
  characteristic:
    BluetoothRemoteGattCharacteristicLike,
): boolean {
  return Boolean(
    characteristic.properties.notify ||
      characteristic.properties.indicate,
  );
}

function nowLabel(): string {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle:
        "short",
      timeStyle:
        "medium",
    },
  ).format(
    new Date(),
  );
}

export default function PrinterDiagnosticPage() {
  const [
    device,
    setDevice,
  ] =
    useState<
      BluetoothDeviceLike | null
    >(null);

  const [
    server,
    setServer,
  ] =
    useState<
      BluetoothRemoteGattServerLike | null
    >(null);

  const [
    services,
    setServices,
  ] =
    useState<
      ServiceResult[]
    >([]);

  const [
    battery,
    setBattery,
  ] =
    useState<
      BatteryResult
    >({
      supported:
        false,
      level:
        null,
      source:
        "belum diuji",
      error:
        null,
    });

  const [
    logs,
    setLogs,
  ] =
    useState<
      DiagnosticLog[]
    >([]);

  const [
    isBusy,
    setIsBusy,
  ] =
    useState(
      false,
    );

  const [
    customServiceUuid,
    setCustomServiceUuid,
  ] =
    useState(
      "",
    );

  const [
    customCharacteristicUuid,
    setCustomCharacteristicUuid,
  ] =
    useState(
      "",
    );

  const [
    customReadResult,
    setCustomReadResult,
  ] =
    useState(
      "",
    );

  const [
    notificationValues,
    setNotificationValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const notificationHandlersRef =
    useRef<
      Map<
        string,
        {
          characteristic:
            BluetoothRemoteGattCharacteristicLike;
          handler:
            EventListener;
        }
      >
    >(
      new Map(),
    );

  const [
    isMounted,
    setIsMounted,
  ] =
    useState(
      false,
    );

  const [
    bluetoothSupported,
    setBluetoothSupported,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      setIsMounted(
        true,
      );

      setBluetoothSupported(
        Boolean(
          (
            navigator as
              BluetoothNavigatorLike
          ).bluetooth,
        ),
      );
    },
    [],
  );

  const addLog =
    useCallback(
      (
        level:
          DiagnosticLog["level"],
        message:
          string,
        data?:
          unknown,
      ) => {
        setLogs(
          current => [
            {
              time:
                nowLabel(),
              level,
              message,
              data,
            },
            ...current,
          ].slice(
            0,
            200,
          ),
        );
      },
      [],
    );

  const stopAllNotifications =
    useCallback(
      async () => {
        const entries =
          Array.from(
            notificationHandlersRef
              .current
              .entries(),
          );

        for (
          const [
            key,
            entry,
          ] of entries
        ) {
          try {
            entry.characteristic
              .removeEventListener(
                "characteristicvaluechanged",
                entry.handler,
              );

            await entry.characteristic
              .stopNotifications();
          } catch {
            // Abaikan ketika koneksi sudah putus.
          }

          notificationHandlersRef
            .current.delete(
              key,
            );
        }

        setNotificationValues(
          {},
        );
      },
      [],
    );

  const handleDisconnected =
    useCallback(
      () => {
        setServer(
          null,
        );

        addLog(
          "warning",
          "Koneksi GATT terputus.",
        );
      },
      [
        addLog,
      ],
    );

  useEffect(
    () => {
      return () => {
        void stopAllNotifications();

        if (
          device
        ) {
          device.removeEventListener(
            "gattserverdisconnected",
            handleDisconnected,
          );
        }
      };
    },
    [
      device,
      handleDisconnected,
      stopAllNotifications,
    ],
  );

  const connectDevice =
    useCallback(
      async (
        selectedDevice:
          BluetoothDeviceLike,
      ) => {
        if (
          !selectedDevice.gatt
        ) {
          throw new Error(
            "Perangkat tidak menyediakan BLE GATT. Kemungkinan menggunakan Bluetooth Classic/SPP.",
          );
        }

        const connectedServer =
          selectedDevice.gatt.connected
            ? selectedDevice.gatt
            : await selectedDevice.gatt
                .connect();

        setServer(
          connectedServer,
        );

        addLog(
          "success",
          "Berhasil terhubung ke GATT.",
          {
            id:
              selectedDevice.id,
            name:
              selectedDevice.name,
            advertisedUuids:
              selectedDevice.uuids ??
              [],
          },
        );

        return connectedServer;
      },
      [
        addLog,
      ],
    );

  const chooseDevice =
    async () => {
      if (
        !bluetoothSupported
      ) {
        addLog(
          "error",
          "Web Bluetooth tidak tersedia. Gunakan Chrome/Edge melalui HTTPS atau localhost.",
        );

        return;
      }

      setIsBusy(
        true,
      );

      try {
        const bluetooth =
          (
            navigator as
              BluetoothNavigatorLike
          ).bluetooth;

        if (
          !bluetooth
        ) {
          throw new Error(
            "Web Bluetooth tidak tersedia.",
          );
        }

        const additionalService =
          normalizeUuid(
            customServiceUuid,
          );

        const optionalServices =
          Array.from(
            new Set(
              [
                ...COMMON_PRINTER_SERVICES,
                additionalService,
              ].filter(
                Boolean,
              ),
            ),
          );

        const selected =
          await bluetooth.requestDevice({
            acceptAllDevices:
              true,
            optionalServices,
          });

        if (
          device
        ) {
          device.removeEventListener(
            "gattserverdisconnected",
            handleDisconnected,
          );
        }

        selected.addEventListener(
          "gattserverdisconnected",
          handleDisconnected,
        );

        setDevice(
          selected,
        );

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            id:
              selected.id,
            name:
              selected.name ??
              "",
          }),
        );

        addLog(
          "info",
          "Perangkat dipilih.",
          {
            id:
              selected.id,
            name:
              selected.name,
            advertisedUuids:
              selected.uuids ??
              [],
            requestedOptionalServices:
              optionalServices,
          },
        );

        await connectDevice(
          selected,
        );
      } catch (
        error
      ) {
        addLog(
          "error",
          error instanceof
            Error
            ? error.message
            : "Gagal memilih perangkat.",
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const restoreGrantedDevice =
    useCallback(
      async () => {
        if (
          !bluetoothSupported
        ) {
          return;
        }

        const bluetooth =
          (
            navigator as
              BluetoothNavigatorLike
          ).bluetooth;

        if (
          !bluetooth ||
          typeof bluetooth.getDevices !==
            "function"
        ) {
          addLog(
            "warning",
            "Browser tidak menyediakan bluetooth.getDevices(), sehingga perangkat lama tidak dapat dipulihkan otomatis.",
          );

          return;
        }

        const storedRaw =
          localStorage.getItem(
            STORAGE_KEY,
          );

        if (!storedRaw) {
          return;
        }

        let storedId =
          "";

        try {
          storedId =
            String(
              JSON.parse(
                storedRaw,
              )?.id ??
                "",
            );
        } catch {
          return;
        }

        if (!storedId) {
          return;
        }

        setIsBusy(
          true,
        );

        try {
          const grantedDevices =
            await bluetooth.getDevices();

          const restored =
            grantedDevices.find(
              candidate =>
                candidate.id ===
                storedId,
            );

          if (!restored) {
            addLog(
              "warning",
              "Perangkat tersimpan tidak ditemukan pada daftar izin browser.",
            );

            return;
          }

          restored.addEventListener(
            "gattserverdisconnected",
            handleDisconnected,
          );

          setDevice(
            restored,
          );

          addLog(
            "info",
            "Perangkat lama ditemukan tanpa pairing ulang.",
            {
              id:
                restored.id,
              name:
                restored.name,
            },
          );

          await connectDevice(
            restored,
          );
        } catch (
          error
        ) {
          addLog(
            "error",
            error instanceof
              Error
              ? error.message
              : "Gagal memulihkan perangkat.",
          );
        } finally {
          setIsBusy(
            false,
          );
        }
      },
      [
        addLog,
        bluetoothSupported,
        connectDevice,
        handleDisconnected,
      ],
    );

  useEffect(
    () => {
      if (
        !isMounted
      ) {
        return;
      }

      void restoreGrantedDevice();
    },
    [
      isMounted,
      restoreGrantedDevice,
    ],
  );

  const reconnect =
    async () => {
      if (!device) {
        addLog(
          "warning",
          "Pilih perangkat terlebih dahulu.",
        );

        return;
      }

      setIsBusy(
        true,
      );

      try {
        await connectDevice(
          device,
        );
      } catch (
        error
      ) {
        addLog(
          "error",
          error instanceof
            Error
            ? error.message
            : "Reconnect gagal.",
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const disconnect =
    async () => {
      await stopAllNotifications();

      if (
        device?.gatt
          ?.connected
      ) {
        device.gatt.disconnect();
      }

      setServer(
        null,
      );

      addLog(
        "info",
        "Perangkat diputuskan secara manual.",
      );
    };

  const inspectServices =
    async () => {
      if (
        !device
      ) {
        addLog(
          "warning",
          "Pilih perangkat terlebih dahulu.",
        );

        return;
      }

      setIsBusy(
        true,
      );

      try {
        const activeServer =
          server?.connected
            ? server
            : await connectDevice(
                device,
              );

        let discoveredServices:
          BluetoothRemoteGattServiceLike[] =
            [];

        try {
          discoveredServices =
            await activeServer
              .getPrimaryServices();
        } catch (
          error
        ) {
          addLog(
            "warning",
            "getPrimaryServices() gagal. Mencoba UUID service yang sudah didaftarkan.",
            error instanceof
              Error
              ? error.message
              : error,
          );

          const serviceCandidates =
            Array.from(
              new Set(
                [
                  ...COMMON_PRINTER_SERVICES,
                  normalizeUuid(
                    customServiceUuid,
                  ),
                ].filter(
                  Boolean,
                ),
              ),
            );

          for (
            const uuid of
            serviceCandidates
          ) {
            try {
              const found =
                await activeServer
                  .getPrimaryService(
                    uuid,
                  );

              discoveredServices.push(
                found,
              );
            } catch {
              // UUID tidak tersedia pada printer.
            }
          }
        }

        const results:
          ServiceResult[] =
            [];

        for (
          const service of
          discoveredServices
        ) {
          try {
            const characteristics =
              await service
                .getCharacteristics();

            const characteristicResults:
              CharacteristicResult[] =
                [];

            for (
              const characteristic of
              characteristics
            ) {
              let lastHex:
                string | null =
                  null;

              let lastDecimal:
                number[] | null =
                  null;

              let lastText:
                string | null =
                  null;

              let readError:
                string | null =
                  null;

              if (
                characteristic.properties
                  .read
              ) {
                try {
                  const value =
                    await characteristic
                      .readValue();

                  lastHex =
                    bytesToHex(
                      value,
                    );

                  lastDecimal =
                    bytesToDecimal(
                      value,
                    );

                  lastText =
                    bytesToText(
                      value,
                    );
                } catch (
                  error
                ) {
                  readError =
                    error instanceof
                      Error
                      ? error.message
                      : "Read gagal.";
                }
              }

              characteristicResults.push({
                uuid:
                  characteristic.uuid,

                properties:
                  getProperties(
                    characteristic,
                  ),

                readable:
                  Boolean(
                    characteristic.properties
                      .read,
                  ),

                writable:
                  isWritable(
                    characteristic,
                  ),

                notifiable:
                  isNotifiable(
                    characteristic,
                  ),

                lastHex,
                lastDecimal,
                lastText,
                error:
                  readError,
              });
            }

            results.push({
              uuid:
                service.uuid,
              characteristics:
                characteristicResults,
              error:
                null,
            });
          } catch (
            error
          ) {
            results.push({
              uuid:
                service.uuid,
              characteristics:
                [],
              error:
                error instanceof
                  Error
                  ? error.message
                  : "Gagal membaca characteristic.",
            });
          }
        }

        setServices(
          results,
        );

        addLog(
          "success",
          `Pemeriksaan selesai: ${results.length} service ditemukan.`,
          results,
        );
      } catch (
        error
      ) {
        addLog(
          "error",
          error instanceof
            Error
            ? error.message
            : "Gagal memeriksa service.",
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const readBattery =
    async () => {
      if (!device) {
        addLog(
          "warning",
          "Pilih perangkat terlebih dahulu.",
        );

        return;
      }

      setIsBusy(
        true,
      );

      try {
        const activeServer =
          server?.connected
            ? server
            : await connectDevice(
                device,
              );

        const batteryService =
          await activeServer
            .getPrimaryService(
              BATTERY_SERVICE,
            );

        const batteryCharacteristic =
          await batteryService
            .getCharacteristic(
              BATTERY_LEVEL_CHARACTERISTIC,
            );

        const value =
          await batteryCharacteristic
            .readValue();

        if (
          value.byteLength <
            1
        ) {
          throw new Error(
            "Characteristic baterai tidak mengembalikan data.",
          );
        }

        const level =
          Math.max(
            0,
            Math.min(
              100,
              value.getUint8(
                0,
              ),
            ),
          );

        const result:
          BatteryResult = {
          supported:
            true,
          level,
          source:
            BATTERY_LEVEL_CHARACTERISTIC,
          error:
            null,
        };

        setBattery(
          result,
        );

        addLog(
          "success",
          `Battery Service terbaca: ${level}%.`,
          result,
        );
      } catch (
        error
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "Battery Service tidak tersedia.";

        setBattery({
          supported:
            false,
          level:
            null,
          source:
            BATTERY_SERVICE,
          error:
            message,
        });

        addLog(
          "warning",
          "Battery Service standar tidak dapat dibaca.",
          message,
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const readCustomCharacteristic =
    async () => {
      if (!device) {
        addLog(
          "warning",
          "Pilih perangkat terlebih dahulu.",
        );

        return;
      }

      const serviceUuid =
        normalizeUuid(
          customServiceUuid,
        );

      const characteristicUuid =
        normalizeUuid(
          customCharacteristicUuid,
        );

      if (
        !serviceUuid ||
        !characteristicUuid
      ) {
        addLog(
          "warning",
          "Isi UUID service dan characteristic terlebih dahulu.",
        );

        return;
      }

      setIsBusy(
        true,
      );

      try {
        const activeServer =
          server?.connected
            ? server
            : await connectDevice(
                device,
              );

        const service =
          await activeServer
            .getPrimaryService(
              serviceUuid,
            );

        const characteristic =
          await service
            .getCharacteristic(
              characteristicUuid,
            );

        const value =
          await characteristic
            .readValue();

        const result = {
          hex:
            bytesToHex(
              value,
            ),
          decimal:
            bytesToDecimal(
              value,
            ),
          text:
            bytesToText(
              value,
            ),
        };

        setCustomReadResult(
          JSON.stringify(
            result,
            null,
            2,
          ),
        );

        addLog(
          "success",
          "Custom characteristic berhasil dibaca.",
          {
            serviceUuid,
            characteristicUuid,
            result,
          },
        );
      } catch (
        error
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "Custom read gagal.";

        setCustomReadResult(
          message,
        );

        addLog(
          "error",
          message,
          {
            serviceUuid,
            characteristicUuid,
          },
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const startNotification =
    async (
      serviceUuid:
        string,
      characteristicUuid:
        string,
    ) => {
      if (!device) {
        return;
      }

      const key =
        `${serviceUuid}:${characteristicUuid}`;

      if (
        notificationHandlersRef
          .current.has(
            key,
          )
      ) {
        return;
      }

      setIsBusy(
        true,
      );

      try {
        const activeServer =
          server?.connected
            ? server
            : await connectDevice(
                device,
              );

        const service =
          await activeServer
            .getPrimaryService(
              serviceUuid,
            );

        const characteristic =
          await service
            .getCharacteristic(
              characteristicUuid,
            );

        const handler:
          EventListener =
            event => {
              const target =
                event.target as
                  BluetoothRemoteGattCharacteristicLike;

              const value =
                target.value;

              if (!value) {
                return;
              }

              const formatted =
                [
                  `HEX: ${bytesToHex(value)}`,
                  `DEC: ${bytesToDecimal(value).join(", ")}`,
                  `TEXT: ${bytesToText(value) || "-"}`,
                ].join(
                  "\n",
                );

              setNotificationValues(
                current => ({
                  ...current,
                  [key]:
                    formatted,
                }),
              );

              addLog(
                "info",
                `Notification diterima dari ${characteristicUuid}.`,
                formatted,
              );
            };

        characteristic.addEventListener(
          "characteristicvaluechanged",
          handler,
        );

        await characteristic
          .startNotifications();

        notificationHandlersRef
          .current.set(
            key,
            {
              characteristic,
              handler,
            },
          );

        addLog(
          "success",
          `Notification aktif: ${characteristicUuid}`,
        );
      } catch (
        error
      ) {
        addLog(
          "error",
          error instanceof
            Error
            ? error.message
            : "Gagal mengaktifkan notification.",
        );
      } finally {
        setIsBusy(
          false,
        );
      }
    };

  const stopNotification =
    async (
      serviceUuid:
        string,
      characteristicUuid:
        string,
    ) => {
      const key =
        `${serviceUuid}:${characteristicUuid}`;

      const entry =
        notificationHandlersRef
          .current.get(
            key,
          );

      if (!entry) {
        return;
      }

      try {
        entry.characteristic
          .removeEventListener(
            "characteristicvaluechanged",
            entry.handler,
          );

        await entry.characteristic
          .stopNotifications();
      } catch {
        // Abaikan.
      }

      notificationHandlersRef
        .current.delete(
          key,
        );

      setNotificationValues(
        current => {
          const next = {
            ...current,
          };

          delete next[key];

          return next;
        },
      );

      addLog(
        "info",
        `Notification dihentikan: ${characteristicUuid}`,
      );
    };

  const diagnosticExport =
    useMemo(
      () => ({
        generatedAt:
          new Date()
            .toISOString(),

        browser: {
          userAgent:
            typeof navigator !==
              "undefined"
              ? navigator.userAgent
              : "",

          webBluetoothSupported:
            bluetoothSupported,
        },

        device: device
          ? {
              id:
                device.id,
              name:
                device.name ??
                null,
              advertisedUuids:
                device.uuids ??
                [],
              connected:
                Boolean(
                  device.gatt
                    ?.connected,
                ),
            }
          : null,

        battery,
        services,
        notificationValues,
        logs:
          [...logs].reverse(),
      }),
      [
        battery,
        bluetoothSupported,
        device,
        logs,
        notificationValues,
        services,
      ],
    );

  const copyDiagnostics =
    async () => {
      try {
        await navigator.clipboard
          .writeText(
            JSON.stringify(
              diagnosticExport,
              null,
              2,
            ),
          );

        addLog(
          "success",
          "Hasil diagnosis disalin ke clipboard.",
        );
      } catch (
        error
      ) {
        addLog(
          "error",
          error instanceof
            Error
            ? error.message
            : "Gagal menyalin hasil diagnosis.",
        );
      }
    };

  const downloadDiagnostics =
    () => {
      const blob =
        new Blob(
          [
            JSON.stringify(
              diagnosticExport,
              null,
              2,
            ),
          ],
          {
            type:
              "application/json",
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        url;

      anchor.download =
        `printer-ble-diagnostic-${Date.now()}.json`;

      anchor.click();

      URL.revokeObjectURL(
        url,
      );
    };

  const clearSavedDevice =
    async () => {
      await disconnect();

      if (
        device
      ) {
        device.removeEventListener(
          "gattserverdisconnected",
          handleDisconnected,
        );
      }

      localStorage.removeItem(
        STORAGE_KEY,
      );

      setDevice(
        null,
      );

      setServices(
        [],
      );

      setBattery({
        supported:
          false,
        level:
          null,
        source:
          "belum diuji",
        error:
          null,
      });

      addLog(
        "info",
        "Referensi perangkat lokal dihapus. Izin browser harus dihapus melalui pengaturan situs bila ingin benar-benar pair ulang.",
      );
    };

  if (
    !isMounted
  ) {
    return (
      <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
        <div className="mx-auto flex min-h-[70dvh] max-w-5xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />

            <span className="text-sm font-bold text-stone-600">
              Menyiapkan BLE Diagnostic...
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                SatuUsaha Printer Tools
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight">
                BLE Service & Battery Diagnostic
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                Halaman ini memeriksa UUID service, characteristic, properti read/write/notify,
                Battery Service standar, serta data mentah dari printer Bluetooth Low Energy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold",
                  device?.gatt?.connected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-600",
                ].join(" ")}
              >
                {device?.gatt?.connected
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <XCircle className="h-4 w-4" />}

                {device?.gatt?.connected
                  ? "Terhubung"
                  : "Terputus"}
              </span>
            </div>
          </div>
        </header>

        {!bluetoothSupported && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Web Bluetooth tidak tersedia. Gunakan Chrome atau Edge pada Android/desktop melalui HTTPS
            atau localhost. Printer Bluetooth Classic/SPP tidak dapat diperiksa dari Web Bluetooth.
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Bluetooth className="h-5 w-5 text-emerald-700" />
              Perangkat
            </h2>

            <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-stone-500">Nama</span>
                <strong>{device?.name || "-"}</strong>

                <span className="text-stone-500">Device ID</span>
                <span className="break-all font-mono text-xs">
                  {device?.id || "-"}
                </span>

                <span className="text-stone-500">Advertised UUID</span>
                <span className="break-all font-mono text-xs">
                  {device?.uuids?.length
                    ? device.uuids.join(", ")
                    : "Tidak diinformasikan browser"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBusy || !bluetoothSupported}
                onClick={chooseDevice}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {isBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}

                Pilih Printer
              </button>

              <button
                type="button"
                disabled={isBusy || !device}
                onClick={reconnect}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Reconnect
              </button>

              <button
                type="button"
                disabled={!device?.gatt?.connected}
                onClick={disconnect}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold disabled:opacity-50"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>

              <button
                type="button"
                onClick={clearSavedDevice}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Lokal
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-black">
              <BatteryCharging className="h-5 w-5 text-emerald-700" />
              Battery Service
            </h2>

            <div className="mt-4 flex min-h-28 items-center justify-center rounded-2xl bg-stone-50">
              {battery.supported && battery.level !== null ? (
                <div className="text-center">
                  <div className="text-5xl font-black text-emerald-700">
                    {battery.level}%
                  </div>

                  <p className="mt-1 text-xs text-stone-500">
                    UUID 0x2A19
                  </p>
                </div>
              ) : (
                <div className="px-4 text-center">
                  <div className="text-lg font-black text-stone-500">
                    Belum terbaca
                  </div>

                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {battery.error ||
                      "Tekan tombol untuk menguji Battery Service standar 0x180F."}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isBusy || !device}
              onClick={readBattery}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-black text-white disabled:opacity-50"
            >
              <BatteryCharging className="h-4 w-4" />
              Baca Baterai
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black">
                <Radio className="h-5 w-5 text-emerald-700" />
                Service dan Characteristic
              </h2>

              <p className="mt-1 text-xs text-stone-500">
                Service yang dapat terlihat dibatasi oleh optionalServices saat pemilihan perangkat.
              </p>
            </div>

            <button
              type="button"
              disabled={isBusy || !device}
              onClick={inspectServices}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {isBusy
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" />}

              Periksa Semua
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                Belum ada hasil pemeriksaan.
              </div>
            ) : (
              services.map(service => (
                <article
                  key={service.uuid}
                  className="overflow-hidden rounded-2xl border border-stone-200"
                >
                  <div className="bg-stone-100 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                      Service UUID
                    </p>

                    <code className="mt-1 block break-all text-sm font-bold">
                      {service.uuid}
                    </code>
                  </div>

                  {service.error ? (
                    <div className="p-4 text-sm text-red-700">
                      {service.error}
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {service.characteristics.map(characteristic => {
                        const notificationKey =
                          `${service.uuid}:${characteristic.uuid}`;

                        const notificationActive =
                          notificationHandlersRef.current.has(
                            notificationKey,
                          );

                        return (
                          <div
                            key={characteristic.uuid}
                            className="p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-500">
                                  Characteristic UUID
                                </p>

                                <code className="mt-1 block break-all text-sm">
                                  {characteristic.uuid}
                                </code>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {characteristic.properties.map(property => (
                                    <span
                                      key={property}
                                      className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                                    >
                                      {property}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {characteristic.notifiable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (notificationActive) {
                                      void stopNotification(
                                        service.uuid,
                                        characteristic.uuid,
                                      );
                                    } else {
                                      void startNotification(
                                        service.uuid,
                                        characteristic.uuid,
                                      );
                                    }
                                  }}
                                  className={[
                                    "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold",
                                    notificationActive
                                      ? "bg-red-50 text-red-700"
                                      : "bg-blue-50 text-blue-700",
                                  ].join(" ")}
                                >
                                  <Radio className="h-3.5 w-3.5" />
                                  {notificationActive
                                    ? "Stop Notify"
                                    : "Start Notify"}
                                </button>
                              )}
                            </div>

                            {(characteristic.lastHex ||
                              characteristic.error) && (
                              <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-950 p-3 text-xs leading-5 text-stone-100">
{characteristic.error
  ? `READ ERROR: ${characteristic.error}`
  : [
      `HEX  : ${characteristic.lastHex || "-"}`,
      `DEC  : ${characteristic.lastDecimal?.join(", ") || "-"}`,
      `TEXT : ${characteristic.lastText || "-"}`,
    ].join("\n")}
                              </pre>
                            )}

                            {notificationValues[
                              notificationKey
                            ] && (
                              <pre className="mt-3 overflow-x-auto rounded-xl bg-blue-950 p-3 text-xs leading-5 text-blue-100">
{notificationValues[
  notificationKey
]}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black">
            <PlugZap className="h-5 w-5 text-emerald-700" />
            Uji UUID Manual
          </h2>

          <p className="mt-1 text-xs leading-5 text-stone-500">
            Isi UUID vendor yang diperoleh dari dokumentasi, aplikasi BLE scanner,
            atau chrome://bluetooth-internals. Setelah menambah UUID service baru,
            tekan Pilih Printer lagi karena optionalServices ditentukan saat pairing.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold text-stone-600">
                Service UUID
              </span>

              <input
                value={customServiceUuid}
                onChange={event =>
                  setCustomServiceUuid(
                    event.target.value,
                  )}
                placeholder="Contoh: FFE0 atau UUID lengkap"
                className="min-h-11 w-full rounded-xl border border-stone-300 px-3 font-mono text-sm outline-none focus:border-emerald-600"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-stone-600">
                Characteristic UUID
              </span>

              <input
                value={customCharacteristicUuid}
                onChange={event =>
                  setCustomCharacteristicUuid(
                    event.target.value,
                  )}
                placeholder="Contoh: FFE1 atau UUID lengkap"
                className="min-h-11 w-full rounded-xl border border-stone-300 px-3 font-mono text-sm outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={isBusy || !device}
            onClick={readCustomCharacteristic}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Baca Characteristic
          </button>

          {customReadResult && (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-950 p-4 text-xs leading-5 text-stone-100">
              {customReadResult}
            </pre>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">
                Log Diagnosis
              </h2>

              <p className="mt-1 text-xs text-stone-500">
                Kirim file JSON hasil diagnosis untuk dianalisis lebih lanjut.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyDiagnostics}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-bold"
              >
                <Clipboard className="h-4 w-4" />
                Salin
              </button>

              <button
                type="button"
                onClick={downloadDiagnostics}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 text-xs font-bold text-white"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </button>

              <button
                type="button"
                onClick={() =>
                  setLogs(
                    [],
                  )}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-300 px-3 text-xs font-bold"
              >
                Bersihkan
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                Belum ada log.
              </p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.time}-${index}`}
                  className="rounded-xl border border-stone-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={[
                        "text-xs font-black uppercase",
                        log.level === "success"
                          ? "text-emerald-700"
                          : log.level === "error"
                            ? "text-red-700"
                            : log.level === "warning"
                              ? "text-amber-700"
                              : "text-blue-700",
                      ].join(" ")}
                    >
                      {log.level}
                    </span>

                    <span className="text-[10px] text-stone-400">
                      {log.time}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium">
                    {log.message}
                  </p>

                  {log.data !== undefined && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-950 p-2 text-[10px] leading-4 text-stone-100">
{typeof log.data === "string"
  ? log.data
  : JSON.stringify(
      log.data,
      null,
      2,
    )}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          <strong>Catatan penting:</strong> browser tidak dapat menampilkan semua UUID vendor secara bebas.
          Hanya service yang diiklankan atau dimasukkan ke <code>optionalServices</code> yang dapat diakses.
          Untuk UUID yang benar-benar belum diketahui, gunakan aplikasi seperti nRF Connect di Android atau
          halaman <code>chrome://bluetooth-internals/#devices</code> pada Chrome desktop, lalu masukkan UUID-nya
          ke kolom uji manual dan pilih printer kembali.
        </section>
      </div>
    </main>
  );
}
