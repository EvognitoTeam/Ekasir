'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  ReactNode,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  AlignCenter,
  Bluetooth,
  Check,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Printer,
  Radio,
  Save,
  Settings2,
  Store,
  Trash2,
  Usb,
  X,
} from 'lucide-react';

import {
  PrinterManager,
} from '@/lib/printer/PrinterManager';

import type {
  PrinterDevice,
} from '@/lib/printer/types';

import {
  printOrder,
} from '@/lib/printer/orderPrint';

import {
  useMenuStore,
} from '@/store/menu.store';

import {
  Toast,
} from '@/utils/toast';

type PaperWidth =
  | '58mm'
  | '80mm';

type ReceiptLogoSize =
  | 'small'
  | 'medium'
  | 'large';

type PrinterSettingsTab =
  | 'device'
  | 'receipt'
  | 'content'
  | 'automation';

type CashierPrinterSettings = {
  paperWidth:
    PaperWidth;

  copies:
    number;

  copyDelayMs:
    number;

  autoPrint:
    boolean;

  autoCut:
    boolean;

  showLogo:
    boolean;

  logoUrl:
    string;

  logoSize:
    ReceiptLogoSize;

  headerText:
    string;

  footerText:
    string;

  thankYouText:
    string;

  showStoreName:
    boolean;

  showCashier:
    boolean;

  showCustomer:
    boolean;

  showOrderNumber:
    boolean;

  showOrderType:
    boolean;

  showTable:
    boolean;

  showAddons:
    boolean;

  showNotes:
    boolean;

  showSubtotal:
    boolean;

  showDiscount:
    boolean;

  showTax:
    boolean;

  showServiceCharge:
    boolean;

  showPaymentMethod:
    boolean;

  showCashReceived:
    boolean;

  showChange:
    boolean;

  feedLines:
    number;
};

const DEFAULT_PRINTER_SETTINGS:
  CashierPrinterSettings = {
    paperWidth:
      '58mm',

    copies:
      1,

    copyDelayMs:
      3000,

    autoPrint:
      true,

    autoCut:
      true,

    showLogo:
      true,

    /*
     * Tidak lagi hardcode /logo.png.
     * Jika mitra mempunyai banner, banner akan diambil dari /api/settings.
     */
    logoUrl:
      '',

    logoSize:
      'medium',

    headerText:
      '',

    footerText:
      '',

    thankYouText:
      'Terima kasih atas kunjungan Anda.',

    showStoreName:
      true,

    showCashier:
      true,

    showCustomer:
      true,

    showOrderNumber:
      true,

    showOrderType:
      true,

    showTable:
      true,

    showAddons:
      true,

    showNotes:
      true,

    showSubtotal:
      true,

    showDiscount:
      true,

    showTax:
      true,

    showServiceCharge:
      true,

    showPaymentMethod:
      true,

    showCashReceived:
      true,

    showChange:
      true,

    feedLines:
      3,
  };

const PRINTER_TEST_RECEIPT = {
  orderCode:
    'M8QTY0',

  customerName:
    'Pelanggan Umum',

  tableName:
    '01',

  item: {
    productId:
      '__KALOO_KIOSK_TEST_PRODUCT__',

    name:
      'Kopi Susu',

    addonName:
      'Extra shot',

    note:
      'Less ice, gula sedikit',

    quantity:
      1,

    basePrice:
      18000,

    addonPrice:
      3000,
  },

  subtotal:
    21000,

  discount:
    1000,

  service:
    1000,

  tax:
    2000,

  total:
    23000,

  cashReceived:
    25000,

  change:
    2000,
} as const;

type Props = {
  open:
    boolean;

  onClose:
    () => void;

  slug:
    string;

  storeName:
    string;
};

function clampInteger(
  value:
    unknown,
  min:
    number,
  max:
    number,
  fallback:
    number,
): number {
  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(
        parsed,
      ),
    ),
  );
}

function normalizeCopies(
  value:
    unknown,
): number {
  return clampInteger(
    value,
    1,
    5,
    1,
  );
}

function normalizeCopyDelayMs(
  value:
    unknown,
): number {
  return clampInteger(
    value,
    0,
    15000,
    3000,
  );
}

function wait(
  milliseconds:
    number,
): Promise<void> {
  if (
    milliseconds <=
    0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (
      resolve,
    ) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function waitAfterCopy(
  printer:
    PrinterDevice,
  slug:
    string,
  delayMs:
    number,
): Promise<void> {
  if (
    delayMs <=
    0
  ) {
    return;
  }

  const manager =
    PrinterManager as unknown as {
      waitAfterPhysicalPrint?: (
        printer:
          PrinterDevice,
        slug:
          string,
        delayMs:
          number,
      ) => Promise<void>;

      waitUntilIdle?: (
        printer:
          PrinterDevice,
        slug:
          string,
      ) => Promise<void>;

      waitForIdle?: (
        printer:
          PrinterDevice,
        slug:
          string,
      ) => Promise<void>;
    };

  /*
   * Manager terbaru KALOO punya waitAfterPhysicalPrint().
   * Kalau deployment masih memakai manager lama, fallback ke idle + timer.
   */
  if (
    typeof manager
      .waitAfterPhysicalPrint ===
    'function'
  ) {
    await manager
      .waitAfterPhysicalPrint(
        printer,
        slug,
        delayMs,
      );

    return;
  }

  if (
    typeof manager
      .waitUntilIdle ===
    'function'
  ) {
    await manager
      .waitUntilIdle(
        printer,
        slug,
      );
  } else if (
    typeof manager
      .waitForIdle ===
    'function'
  ) {
    await manager
      .waitForIdle(
        printer,
        slug,
      );
  }

  await wait(
    delayMs,
  );
}

function createPrinterTestOrder() {
  const sample =
    PRINTER_TEST_RECEIPT;

  return {
    id:
      -999001,

    order_code:
      sample.orderCode,

    orderCode:
      sample.orderCode,

    status:
      'completed',

    customerName:
      sample.customerName,

    name:
      sample.customerName,

    tableName:
      sample.tableName,

    table_name:
      sample.tableName,

    tableNumber:
      sample.tableName,

    table_number:
      sample.tableName,

    orderType:
      'dine-in',

    order_type:
      'dine-in',

    serviceType:
      'dine_in',

    service_type:
      'dine_in',

    paymentMethod:
      'cash',

    payment_method:
      'cash',

    paymentStatus:
      '2',

    payment_status:
      '2',

    totalPrice:
      sample.subtotal,

    total_price:
      sample.subtotal,

    discount:
      sample.discount,

    service:
      sample.service,

    tax:
      sample.tax,

    totalAfterDiscount:
      sample.total,

    total_after_discount:
      sample.total,

    getPayment:
      String(
        sample.cashReceived,
      ),

    get_payment:
      String(
        sample.cashReceived,
      ),

    cashChange:
      String(
        sample.change,
      ),

    cash_change:
      String(
        sample.change,
      ),

    items: [
      {
        menuItemId:
          sample.item.productId,

        product_id:
          sample.item.productId,

        name:
          sample.item.name,

        quantity:
          sample.item.quantity,

        price:
          sample.item.basePrice,

        selectedAddOnsDetails: [
          {
            id:
              '__KALOO_KIOSK_TEST_ADDON__',

            name:
              sample.item.addonName,

            price:
              sample.item.addonPrice,
          },
          {
            cust_notes:
              sample.item.note,
          },
        ],
      },
    ],
  };
}

function createPrinterTestMenuItems() {
  const sample =
    PRINTER_TEST_RECEIPT;

  return [
    {
      id:
        sample.item.productId,

      name:
        sample.item.name,

      price:
        sample.item.basePrice,

      basePrice:
        sample.item.basePrice,

      categorizedAddons: [
        {
          addons: [
            {
              id:
                '__KALOO_KIOSK_TEST_ADDON__',

              name:
                sample.item.addonName,

              price:
                sample.item.addonPrice,
            },
          ],
        },
      ],
    },
  ];
}

export default function PrinterSettingsModal({
  open,
  onClose,
  slug,
  storeName,
}: Props) {
  const [
    printers,
    setPrinters,
  ] =
    useState<
      PrinterDevice[]
    >([]);

  const [
    savedPrinters,
    setSavedPrinters,
  ] =
    useState<
      PrinterDevice[]
    >([]);

  const [
    selectedPrinter,
    setSelectedPrinter,
  ] =
    useState<
      PrinterDevice | null
    >(
      null,
    );

  const [
    isScanningPrinter,
    setIsScanningPrinter,
  ] =
    useState(
      false,
    );

  const [
    scanningTransport,
    setScanningTransport,
  ] =
    useState<
      | 'usb'
      | 'bluetooth'
      | null
    >(
      null,
    );

  const [
    printerSettings,
    setPrinterSettings,
  ] =
    useState<
      CashierPrinterSettings
    >(
      DEFAULT_PRINTER_SETTINGS,
    );

  const [
    tab,
    setTab,
  ] =
    useState<
      PrinterSettingsTab
    >(
      'device',
    );

  const [
    isSavingPrinterSettings,
    setIsSavingPrinterSettings,
  ] =
    useState(
      false,
    );

  const [
    isTestingPrinter,
    setIsTestingPrinter,
  ] =
    useState(
      false,
    );

  const [
    testPrintProgress,
    setTestPrintProgress,
  ] =
    useState<{
      phase:
        | 'idle'
        | 'printing'
        | 'waiting';

      current:
        number;

      total:
        number;
    }>({
      phase:
        'idle',

      current:
        0,

      total:
        0,
    });

  const [
    logoLoadFailed,
    setLogoLoadFailed,
  ] =
    useState(
      false,
    );

  const fileInputRef =
    useRef<
      HTMLInputElement | null
    >(
      null,
    );

  useEffect(
    () => {
      if (
        !open ||
        !slug
      ) {
        return;
      }

      let cancelled =
        false;

      const restore =
        async () => {
          const settingsKey =
            `evo_printer_settings_${slug}`;

          let restored:
            CashierPrinterSettings = {
              ...DEFAULT_PRINTER_SETTINGS,
            };

          try {
            const raw =
              localStorage.getItem(
                settingsKey,
              );

            if (raw) {
              const parsed =
                JSON.parse(
                  raw,
                ) as Partial<CashierPrinterSettings>;

              restored = {
                ...restored,
                ...parsed,

                copies:
                  normalizeCopies(
                    parsed.copies,
                  ),

                copyDelayMs:
                  normalizeCopyDelayMs(
                    parsed.copyDelayMs,
                  ),
              };

              /*
               * Hapus fallback branding lama.
               */
              if (
                restored.logoUrl ===
                '/logo.png'
              ) {
                restored.logoUrl =
                  '';
              }
            }
          } catch (
            error
          ) {
            console.error(
              'Gagal memulihkan pengaturan printer:',
              error,
            );
          }

          /*
           * Jika belum ada logo tersimpan, gunakan banner mitra yang sama
           * dengan Kiosk dan Cashier.
           */
          if (
            !restored.logoUrl
          ) {
            try {
              const response =
                await fetch(
                  `/api/settings?slug=${encodeURIComponent(
                    slug,
                  )}`,
                  {
                    method:
                      'GET',

                    cache:
                      'no-store',

                    headers: {
                      Accept:
                        'application/json',
                    },
                  },
                );

              const result =
                await response.json();

              const banner =
                String(
                  result?.data
                    ?.banner ??
                    '',
                ).trim();

              if (
                response.ok &&
                result?.success &&
                banner
              ) {
                restored.logoUrl =
                  banner;
              }
            } catch (
              error
            ) {
              console.warn(
                'Banner mitra tidak dapat dimuat untuk preview printer:',
                error,
              );
            }
          }

          if (
            cancelled
          ) {
            return;
          }

          setPrinterSettings(
            restored,
          );

          setLogoLoadFailed(
            false,
          );

          try {
            setSavedPrinters(
              PrinterManager.getPrinters(
                slug,
              ),
            );

            setSelectedPrinter(
              PrinterManager.getPrinter(
                slug,
              ),
            );
          } catch (
            error
          ) {
            console.error(
              'Gagal memulihkan printer:',
              error,
            );
          }
        };

      void restore();

      return () => {
        cancelled =
          true;
      };
    },
    [
      open,
      slug,
    ],
  );

  useEffect(
    () => {
      setLogoLoadFailed(
        false,
      );
    },
    [
      printerSettings
        .logoUrl,
    ],
  );

  const updatePrinterSetting =
    <
      K extends keyof CashierPrinterSettings,
    >(
      key:
        K,
      value:
        CashierPrinterSettings[K],
    ) => {
      setPrinterSettings(
        (
          current,
        ) => ({
          ...current,
          [
            key
          ]:
            value,
        }),
      );
    };

  const syncSavedPrinters =
    () => {
      setSavedPrinters(
        PrinterManager.getPrinters(
          slug,
        ),
      );
    };

  const saveAllPrinterSettings =
    async () => {
      if (!slug) {
        return;
      }

      setIsSavingPrinterSettings(
        true,
      );

      try {
        const normalizedSettings = {
          ...printerSettings,

          copies:
            normalizeCopies(
              printerSettings
                .copies,
            ),

          copyDelayMs:
            normalizeCopyDelayMs(
              printerSettings
                .copyDelayMs,
            ),
        };

        localStorage.setItem(
          `evo_printer_settings_${slug}`,
          JSON.stringify(
            normalizedSettings,
          ),
        );

        setPrinterSettings(
          normalizedSettings,
        );

        if (
          selectedPrinter
        ) {
          await PrinterManager.savePrinter(
            selectedPrinter,
            slug,
          );

          await PrinterManager.setActivePrinter(
            selectedPrinter,
            slug,
          );

          syncSavedPrinters();
        }

        Toast.fire({
          icon:
            'success',

          title:
            'Pengaturan printer disimpan',

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        console.error(
          'Gagal menyimpan pengaturan printer:',
          error,
        );

        Toast.fire({
          icon:
            'error',

          title:
            'Pengaturan printer gagal disimpan',

          topLayer:
            true,
        });
      } finally {
        setIsSavingPrinterSettings(
          false,
        );
      }
    };

  const handleScanPrinter =
    async (
      transport?:
        | 'usb'
        | 'bluetooth',
    ) => {
      if (
        isScanningPrinter
      ) {
        return;
      }

      setIsScanningPrinter(
        true,
      );

      setScanningTransport(
        transport ??
          null,
      );

      try {
        const devices =
          transport
            ? await PrinterManager.scanByType(
                transport,
              )
            : await PrinterManager.scan();

        setPrinters(
          (
            current,
          ) => {
            const merged = [
              ...current,
              ...devices,
            ];

            return Array.from(
              new Map(
                merged.map(
                  (
                    printer,
                  ) => [
                    `${printer.type}:${printer.id}`,
                    printer,
                  ],
                ),
              ).values(),
            );
          },
        );

        if (
          devices.length ===
          0
        ) {
          Toast.fire({
            icon:
              'info',

            title:
              transport ===
              'usb'
                ? 'Printer USB belum ditemukan'
                : transport ===
                    'bluetooth'
                  ? 'Printer Bluetooth belum ditemukan'
                  : 'Printer belum ditemukan',

            topLayer:
              true,
          });
        }
      } catch (
        error
      ) {
        console.error(
          'Gagal mendeteksi printer:',
          error,
        );

        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Gagal mendeteksi printer',

          topLayer:
            true,
        });
      } finally {
        setIsScanningPrinter(
          false,
        );

        setScanningTransport(
          null,
        );
      }
    };

  const selectPrinter =
    async (
      printer:
        PrinterDevice,
    ) => {
      try {
        setSelectedPrinter(
          printer,
        );

        await PrinterManager.setActivePrinter(
          printer,
          slug,
        );
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Printer tidak dapat dipilih',

          topLayer:
            true,
        });
      }
    };

  const saveSelectedPrinter =
    async () => {
      if (
        !selectedPrinter
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            'Pilih printer terlebih dahulu',

          topLayer:
            true,
        });

        return;
      }

      try {
        await PrinterManager.savePrinter(
          selectedPrinter,
          slug,
        );

        await PrinterManager.setActivePrinter(
          selectedPrinter,
          slug,
        );

        syncSavedPrinters();

        Toast.fire({
          icon:
            'success',

          title:
            `${selectedPrinter.name} disimpan`,

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Printer gagal disimpan',

          topLayer:
            true,
        });
      }
    };

  const removeSavedPrinter =
    (
      printer:
        PrinterDevice,
    ) => {
      try {
        PrinterManager.removePrinter(
          printer,
          slug,
        );

        syncSavedPrinters();

        setPrinters(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                !(
                  item.id ===
                    printer.id &&
                  item.type ===
                    printer.type
                ),
            ),
        );

        if (
          selectedPrinter
            ?.id ===
            printer.id &&
          selectedPrinter
            .type ===
            printer.type
        ) {
          setSelectedPrinter(
            PrinterManager.getPrinter(
              slug,
            ),
          );
        }

        Toast.fire({
          icon:
            'success',

          title:
            'Printer dihapus dari daftar tersimpan',

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Printer gagal dihapus',

          topLayer:
            true,
        });
      }
    };

  const handleConnectPrinter =
    async () => {
      if (
        !selectedPrinter
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            'Pilih printer terlebih dahulu',

          topLayer:
            true,
        });

        return;
      }

      try {
        await PrinterManager.savePrinter(
          selectedPrinter,
          slug,
        );

        await PrinterManager.setActivePrinter(
          selectedPrinter,
          slug,
        );

        syncSavedPrinters();

        await PrinterManager.connect(
          selectedPrinter,
          slug,
        );

        Toast.fire({
          icon:
            'success',

          title:
            `Terhubung ke ${selectedPrinter.name}`,

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        console.error(
          'Gagal menghubungkan printer:',
          error,
        );

        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Gagal menghubungkan printer',

          topLayer:
            true,
        });
      }
    };

  const handleLogoUpload =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        '';

      if (!file) {
        return;
      }

      const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/webp',
      ];

      if (
        !allowedTypes.includes(
          file.type,
        )
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            'Logo hanya boleh PNG, JPG, JPEG, atau WEBP',

          topLayer:
            true,
        });

        return;
      }

      if (
        file.size >
        2 *
          1024 *
          1024
      ) {
        Toast.fire({
          icon:
            'error',

          title:
            'Ukuran logo maksimal 2 MB',

          topLayer:
            true,
        });

        return;
      }

      try {
        const formData =
          new FormData();

        formData.append(
          'slug',
          slug,
        );

        formData.append(
          'logo',
          file,
        );

        const response =
          await fetch(
            '/api/pos/printer-logo',
            {
              method:
                'POST',

              body:
                formData,
            },
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Logo gagal diunggah',
          );
        }

        /*
         * DB memakai kolom mitra.banner.
         * Prioritaskan banner daripada alias logoUrl.
         */
        const banner =
          String(
            result.data
              ?.banner ??
              result.data
                ?.logoUrl ??
              '',
          ).trim();

        updatePrinterSetting(
          'logoUrl',
          banner,
        );

        updatePrinterSetting(
          'showLogo',
          Boolean(
            banner,
          ),
        );

        Toast.fire({
          icon:
            'success',

          title:
            'Banner mitra berhasil diperbarui',

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        console.error(
          'Upload logo gagal:',
          error,
        );

        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Logo gagal diunggah',

          topLayer:
            true,
        });
      }
    };

  const handleTestPrint =
    async () => {
      if (
        !selectedPrinter ||
        isTestingPrinter
      ) {
        if (
          !selectedPrinter
        ) {
          Toast.fire({
            icon:
              'error',

            title:
              'Pilih printer terlebih dahulu',

            topLayer:
              true,
          });
        }

        return;
      }

      const copies =
        normalizeCopies(
          printerSettings
            .copies,
        );

      const copyDelayMs =
        normalizeCopyDelayMs(
          printerSettings
            .copyDelayMs,
        );

      const testOrder =
        createPrinterTestOrder();

      const menuItems = [
        ...createPrinterTestMenuItems(),
        ...(
          useMenuStore.getState()
            .items as any[]
        ),
      ];

      setIsTestingPrinter(
        true,
      );

      try {
        await PrinterManager.savePrinter(
          selectedPrinter,
          slug,
        );

        await PrinterManager.setActivePrinter(
          selectedPrinter,
          slug,
        );

        syncSavedPrinters();

        for (
          let index = 0;
          index <
          copies;
          index +=
          1
        ) {
          const copyNumber =
            index +
            1;

          setTestPrintProgress({
            phase:
              'printing',

            current:
              copyNumber,

            total:
              copies,
          });

          const copyLabel =
            copyNumber >
            1
              ? `COPY #${copyNumber - 1}`
              : '';

          await printOrder({
            order:
              testOrder as any,

            target:
              'customer',

            printer:
              selectedPrinter,

            slug,

            storeName,

            cashierName:
              'Kiosk',

            menuItems:
              menuItems as any,

            settings: {
              ...printerSettings,

              copies:
                1,

              copyDelayMs,

              copyLabel,
            } as any,
          });

          if (
            copyNumber <
              copies &&
            copyDelayMs >
              0
          ) {
            setTestPrintProgress({
              phase:
                'waiting',

              current:
                copyNumber,

              total:
                copies,
            });

            await waitAfterCopy(
              selectedPrinter,
              slug,
              copyDelayMs,
            );
          }
        }

        Toast.fire({
          icon:
            'success',

          title:
            copies >
            1
              ? `Test receipt ${copies} salinan selesai`
              : 'Test receipt selesai',

          topLayer:
            true,
        });
      } catch (
        error
      ) {
        console.error(
          'Test print gagal:',
          error,
        );

        Toast.fire({
          icon:
            'error',

          title:
            error instanceof
            Error
              ? error.message
              : 'Printer belum terhubung',

          topLayer:
            true,
        });
      } finally {
        setIsTestingPrinter(
          false,
        );

        setTestPrintProgress({
          phase:
            'idle',

          current:
            0,

          total:
            0,
        });
      }
    };

  const navigation = [
    {
      id:
        'device',

      label:
        'Printer',

      description:
        'Perangkat & koneksi',

      icon:
        Printer,
    },

    {
      id:
        'receipt',

      label:
        'Identitas',

      description:
        'Banner & teks struk',

      icon:
        FileText,
    },

    {
      id:
        'content',

      label:
        'Isi Struk',

      description:
        'Field yang dicetak',

      icon:
        AlignCenter,
    },

    {
      id:
        'automation',

      label:
        'Otomatisasi',

      description:
        'Auto print & cutter',

      icon:
        Settings2,
    },
  ] as const;

  const activePrinterName =
    selectedPrinter
      ?.name ??
    'Belum memilih printer';

  const unsavedDetectedPrinters =
    printers.filter(
      (
        printer,
      ) =>
        !savedPrinters.some(
          (
            saved,
          ) =>
            saved.id ===
              printer.id &&
            saved.type ===
              printer.type,
        ),
    );

  const contentSettings:
    Array<{
      key:
        keyof CashierPrinterSettings;

      label:
        string;
    }> = [
      {
        key:
          'showStoreName',
        label:
          'Nama toko',
      },
      {
        key:
          'showCashier',
        label:
          'Nama kasir / terminal',
      },
      {
        key:
          'showCustomer',
        label:
          'Pelanggan',
      },
      {
        key:
          'showOrderNumber',
        label:
          'Nomor pesanan',
      },
      {
        key:
          'showOrderType',
        label:
          'Tipe layanan',
      },
      {
        key:
          'showTable',
        label:
          'Nomor meja',
      },
      {
        key:
          'showAddons',
        label:
          'Add-on produk',
      },
      {
        key:
          'showNotes',
        label:
          'Catatan pesanan',
      },
      {
        key:
          'showSubtotal',
        label:
          'Subtotal',
      },
      {
        key:
          'showDiscount',
        label:
          'Diskon',
      },
      {
        key:
          'showTax',
        label:
          'Pajak',
      },
      {
        key:
          'showServiceCharge',
        label:
          'Service charge',
      },
      {
        key:
          'showPaymentMethod',
        label:
          'Metode pembayaran',
      },
      {
        key:
          'showCashReceived',
        label:
          'Uang diterima',
      },
      {
        key:
          'showChange',
        label:
          'Kembalian',
      },
    ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity:
              0,
          }}
          animate={{
            opacity:
              1,
          }}
          exit={{
            opacity:
              0,
          }}
          onClick={
            onClose
          }
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{
              opacity:
                0,
              y:
                28,
              scale:
                0.985,
            }}
            animate={{
              opacity:
                1,
              y:
                0,
              scale:
                1,
            }}
            exit={{
              opacity:
                0,
              y:
                28,
              scale:
                0.985,
            }}
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
            className="flex h-[96dvh] w-full max-w-[1220px] overflow-hidden rounded-t-[30px] bg-[#f5f5f1] shadow-2xl sm:h-[92dvh] sm:rounded-[30px]"
          >
            <aside className="hidden w-[235px] shrink-0 flex-col bg-[#11110f] text-white md:flex">
              <div className="border-b border-white/10 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                  <Printer className="h-5 w-5" />
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-white/35">
                  Kiosk Hardware
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                  Print Station
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  Pengaturan printer yang sama dengan terminal Kasir.
                </p>
              </div>

              <nav className="flex-1 space-y-2 p-3">
                {navigation.map(
                  (
                    item,
                  ) => {
                    const Icon =
                      item.icon;

                    const active =
                      tab ===
                      item.id;

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          setTab(
                            item.id,
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                          active
                            ? 'bg-white text-black'
                            : 'text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            active
                              ? 'bg-black text-white'
                              : 'bg-white/10'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-sm font-black">
                            {
                              item.label
                            }
                          </p>

                          <p
                            className={`mt-0.5 text-xs ${
                              active
                                ? 'text-black/40'
                                : 'text-white/30'
                            }`}
                          >
                            {
                              item.description
                            }
                          </p>
                        </div>
                      </button>
                    );
                  },
                )}
              </nav>

              <div className="border-t border-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-white/30">
                  Printer aktif
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      selectedPrinter
                        ? 'bg-emerald-400'
                        : 'bg-white/20'
                    }`}
                  />

                  <p className="min-w-0 truncate text-sm font-black">
                    {
                      activePrinterName
                    }
                  </p>
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="shrink-0 border-b border-black/[0.07] bg-white px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-black/30">
                      Printer Setup
                    </p>

                    <h3 className="mt-1 text-xl font-black tracking-[-0.035em]">
                      {
                        navigation.find(
                          (
                            item,
                          ) =>
                            item.id ===
                            tab,
                        )
                          ?.label ??
                        'Printer'
                      }
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        isSavingPrinterSettings
                      }
                      onClick={() =>
                        void saveAllPrinterSettings()
                      }
                      className="hidden h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white transition hover:bg-black/85 sm:flex disabled:opacity-40"
                    >
                      {isSavingPrinterSettings ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      Simpan
                    </button>

                    <button
                      type="button"
                      onClick={
                        onClose
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-black/45 transition hover:bg-[#f2f2ee] hover:text-black"
                      aria-label="Tutup pengaturan printer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {navigation.map(
                    (
                      item,
                    ) => {
                      const Icon =
                        item.icon;

                      const active =
                        tab ===
                        item.id;

                      return (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            setTab(
                              item.id,
                            )
                          }
                          className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black ${
                            active
                              ? 'bg-black text-white'
                              : 'border border-black/[0.07] bg-white text-black/45'
                          }`}
                        >
                          <Icon className="h-4 w-4" />

                          {
                            item.label
                          }
                        </button>
                      );
                    },
                  )}
                </div>
              </header>

              <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                <main className="min-h-0 overflow-y-auto p-4 sm:p-5 lg:p-6">
                  {tab ===
                    'device' && (
                    <div className="space-y-5">
                      <section className="overflow-hidden rounded-[24px] border border-black/[0.07] bg-white">
                        <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                          <div className="p-5">
                            <p className="text-xs font-black uppercase tracking-[0.13em] text-black/30">
                              Perangkat terpilih
                            </p>

                            <div className="mt-3 flex items-center gap-3">
                              <span
                                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                                  selectedPrinter
                                    ? 'bg-black text-white'
                                    : 'bg-[#efefeb] text-black/25'
                                }`}
                              >
                                <Printer className="h-6 w-6" />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-base font-black">
                                  {
                                    activePrinterName
                                  }
                                </p>

                                <p className="mt-1 truncate text-sm font-semibold text-black/35">
                                  {
                                    selectedPrinter
                                      ?.address ??
                                    'Pilih printer dari daftar di bawah'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex min-w-[190px] flex-col justify-center gap-2 border-t border-black/[0.07] bg-[#fafaf8] p-4 sm:border-l sm:border-t-0">
                            <button
                              type="button"
                              disabled={
                                !selectedPrinter
                              }
                              onClick={() =>
                                void handleConnectPrinter()
                              }
                              className="h-11 rounded-xl bg-black px-4 text-sm font-black text-white disabled:opacity-30"
                            >
                              Hubungkan
                            </button>

                            <button
                              type="button"
                              disabled={
                                !selectedPrinter ||
                                isTestingPrinter
                              }
                              onClick={() =>
                                void handleTestPrint()
                              }
                              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-black disabled:opacity-30"
                            >
                              {isTestingPrinter ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}

                              {isTestingPrinter &&
                              testPrintProgress.total >
                                0
                                ? testPrintProgress.phase ===
                                  'waiting'
                                  ? `Jeda ${testPrintProgress.current}/${testPrintProgress.total}`
                                  : `Cetak ${testPrintProgress.current}/${testPrintProgress.total}`
                                : 'Test Receipt'}
                            </button>
                          </div>
                        </div>
                      </section>

                      <section>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h4 className="text-base font-black">
                              Deteksi printer
                            </h4>

                            <p className="mt-1 text-sm leading-6 text-black/40">
                              Scan printer thermal melalui USB atau Bluetooth.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:flex">
                            <button
                              type="button"
                              disabled={
                                isScanningPrinter
                              }
                              onClick={() =>
                                void handleScanPrinter(
                                  'usb',
                                )
                              }
                              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.09] bg-white px-4 text-sm font-black disabled:opacity-40"
                            >
                              {scanningTransport ===
                              'usb' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Usb className="h-4 w-4" />
                              )}

                              USB
                            </button>

                            <button
                              type="button"
                              disabled={
                                isScanningPrinter
                              }
                              onClick={() =>
                                void handleScanPrinter(
                                  'bluetooth',
                                )
                              }
                              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-black text-white disabled:opacity-40"
                            >
                              {scanningTransport ===
                              'bluetooth' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Bluetooth className="h-4 w-4" />
                              )}

                              Bluetooth
                            </button>
                          </div>
                        </div>

                        {savedPrinters.length >
                          0 && (
                          <div className="mb-5">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-black/35">
                              Printer tersimpan (
                              {
                                savedPrinters.length
                              }
                              )
                            </p>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {savedPrinters.map(
                                (
                                  printer,
                                ) => (
                                  <DeviceTile
                                    key={`saved-${printer.type}-${printer.id}`}
                                    printer={
                                      printer
                                    }
                                    selected={
                                      selectedPrinter
                                        ?.id ===
                                        printer.id &&
                                      selectedPrinter
                                        .type ===
                                        printer.type
                                    }
                                    saved
                                    onSelect={() =>
                                      void selectPrinter(
                                        printer,
                                      )
                                    }
                                    onRemove={() =>
                                      removeSavedPrinter(
                                        printer,
                                      )
                                    }
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-black/35">
                          Hasil scan
                        </p>

                        {unsavedDetectedPrinters.length ===
                          0 &&
                        !isScanningPrinter ? (
                          <div className="rounded-[22px] border border-dashed border-black/12 bg-white px-5 py-10 text-center">
                            <Radio className="mx-auto h-7 w-7 text-black/20" />

                            <p className="mt-3 text-base font-black">
                              Belum ada printer baru
                            </p>

                            <p className="mt-1 text-sm leading-6 text-black/35">
                              Jalankan scan USB atau Bluetooth untuk mencari perangkat.
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {unsavedDetectedPrinters.map(
                              (
                                printer,
                              ) => (
                                <DeviceTile
                                  key={`detected-${printer.type}-${printer.id}`}
                                  printer={
                                    printer
                                  }
                                  selected={
                                    selectedPrinter
                                      ?.id ===
                                      printer.id &&
                                    selectedPrinter
                                      .type ===
                                      printer.type
                                  }
                                  onSelect={() =>
                                    void selectPrinter(
                                      printer,
                                    )
                                  }
                                />
                              ),
                            )}
                          </div>
                        )}
                      </section>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <WorkbenchCard
                          title="Ukuran kertas"
                          description="Sesuaikan dengan roll thermal printer."
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                '58mm',
                                '80mm',
                              ] as const
                            ).map(
                              (
                                width,
                              ) => (
                                <button
                                  key={
                                    width
                                  }
                                  type="button"
                                  onClick={() =>
                                    updatePrinterSetting(
                                      'paperWidth',
                                      width,
                                    )
                                  }
                                  className={`h-12 rounded-xl border font-mono text-sm font-black ${
                                    printerSettings.paperWidth ===
                                    width
                                      ? 'border-black bg-black text-white'
                                      : 'border-black/[0.08] bg-[#f5f5f1] text-black/45'
                                  }`}
                                >
                                  {
                                    width
                                  }
                                </button>
                              ),
                            )}
                          </div>
                        </WorkbenchCard>

                        <WorkbenchCard
                          title="Jumlah salinan"
                          description="Original + salinan tambahan."
                        >
                          <NumberStepper
                            value={
                              printerSettings
                                .copies
                            }
                            min={
                              1
                            }
                            max={
                              5
                            }
                            onChange={(
                              value,
                            ) =>
                              updatePrinterSetting(
                                'copies',
                                value,
                              )
                            }
                          />

                          <p className="mt-3 text-sm leading-6 text-black/40">
                            {printerSettings.copies ===
                            1
                              ? 'Hanya 1 cetakan original.'
                              : `1 original + ${printerSettings.copies - 1} copy. Copy berikutnya diberi label COPY #1, COPY #2, dan seterusnya.`}
                          </p>
                        </WorkbenchCard>

                        <WorkbenchCard
                          title="Jeda antar salinan"
                          description="Mulai setelah job sebelumnya selesai."
                        >
                          <div className="flex items-center gap-3">
                            <NumberStepper
                              value={
                                Math.round(
                                  printerSettings.copyDelayMs /
                                    1000,
                                )
                              }
                              min={
                                0
                              }
                              max={
                                15
                              }
                              onChange={(
                                seconds,
                              ) =>
                                updatePrinterSetting(
                                  'copyDelayMs',
                                  seconds *
                                    1000,
                                )
                              }
                            />

                            <span className="text-sm font-black text-black/40">
                              detik
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-black/40">
                            Default 3 detik dan hanya berlaku di antara copy.
                          </p>
                        </WorkbenchCard>
                      </div>

                      <button
                        type="button"
                        disabled={
                          !selectedPrinter
                        }
                        onClick={() =>
                          void saveSelectedPrinter()
                        }
                        className="h-12 w-full rounded-xl border border-black/[0.08] bg-white text-sm font-black disabled:opacity-30"
                      >
                        Simpan printer terpilih
                      </button>
                    </div>
                  )}

                  {tab ===
                    'receipt' && (
                    <div className="space-y-4">
                      <WorkbenchCard
                        title="Banner / logo struk"
                        description="Menggunakan banner mitra yang sama dengan Kiosk dan Kasir."
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              updatePrinterSetting(
                                'showLogo',
                                !printerSettings.showLogo,
                              )
                            }
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black ${
                              printerSettings.showLogo
                                ? 'bg-black text-white'
                                : 'bg-[#ecece7] text-black/45'
                            }`}
                          >
                            {printerSettings.showLogo && (
                              <Check className="h-4 w-4" />
                            )}

                            {printerSettings.showLogo
                              ? 'Logo aktif'
                              : 'Logo mati'}
                          </button>

                          <input
                            ref={
                              fileInputRef
                            }
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={
                              handleLogoUpload
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              fileInputRef.current?.click()
                            }
                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-black"
                          >
                            <ImageIcon className="h-4 w-4" />

                            Ganti banner
                          </button>
                        </div>

                        <div className="mt-4 rounded-2xl bg-[#f5f5f1] p-3">
                          {printerSettings.logoUrl &&
                          !logoLoadFailed ? (
                            <div className="flex items-center justify-between gap-4">
                              <img
                                src={
                                  printerSettings.logoUrl
                                }
                                alt="Banner mitra"
                                className="h-20 w-20 rounded-xl bg-white object-contain p-2"
                                onError={() =>
                                  setLogoLoadFailed(
                                    true,
                                  )
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  updatePrinterSetting(
                                    'logoUrl',
                                    '',
                                  )
                                }
                                className="flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-black text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />

                                Hapus
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-black/35">
                                <Store className="h-5 w-5" />
                              </span>

                              <div>
                                <p className="text-sm font-black">
                                  Banner belum tersedia
                                </p>

                                <p className="mt-1 text-sm leading-6 text-black/40">
                                  Receipt akan dicetak tanpa gambar sampai banner mitra tersedia.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {(
                            [
                              'small',
                              'medium',
                              'large',
                            ] as ReceiptLogoSize[]
                          ).map(
                            (
                              size,
                            ) => (
                              <button
                                key={
                                  size
                                }
                                type="button"
                                onClick={() =>
                                  updatePrinterSetting(
                                    'logoSize',
                                    size,
                                  )
                                }
                                className={`h-11 rounded-xl text-sm font-black capitalize ${
                                  printerSettings.logoSize ===
                                  size
                                    ? 'bg-black text-white'
                                    : 'bg-[#ecece7] text-black/45'
                                }`}
                              >
                                {
                                  size ===
                                  'small'
                                    ? 'Kecil'
                                    : size ===
                                        'large'
                                      ? 'Besar'
                                      : 'Sedang'
                                }
                              </button>
                            ),
                          )}
                        </div>
                      </WorkbenchCard>

                      <WorkbenchCard
                        title="Teks header"
                        description="Ditampilkan sebelum informasi transaksi."
                      >
                        <textarea
                          value={
                            printerSettings.headerText
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePrinterSetting(
                              'headerText',
                              event.target.value,
                            )
                          }
                          placeholder="Contoh: Selamat datang di toko kami"
                          className="min-h-28 w-full resize-none rounded-xl border border-black/[0.08] bg-[#f5f5f1] p-4 text-sm font-semibold outline-none transition focus:border-black/25 focus:bg-white"
                        />
                      </WorkbenchCard>

                      <WorkbenchCard
                        title="Teks footer"
                        description="Ditampilkan setelah rincian pembayaran."
                      >
                        <textarea
                          value={
                            printerSettings.footerText
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePrinterSetting(
                              'footerText',
                              event.target.value,
                            )
                          }
                          placeholder="Contoh: Barang yang sudah dibeli tidak dapat dikembalikan"
                          className="min-h-28 w-full resize-none rounded-xl border border-black/[0.08] bg-[#f5f5f1] p-4 text-sm font-semibold outline-none transition focus:border-black/25 focus:bg-white"
                        />
                      </WorkbenchCard>

                      <WorkbenchCard
                        title="Ucapan terima kasih"
                        description="Kalimat penutup utama pada struk."
                      >
                        <input
                          value={
                            printerSettings.thankYouText
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePrinterSetting(
                              'thankYouText',
                              event.target.value,
                            )
                          }
                          className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#f5f5f1] px-4 text-sm font-bold outline-none transition focus:border-black/25 focus:bg-white"
                        />
                      </WorkbenchCard>
                    </div>
                  )}

                  {tab ===
                    'content' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {contentSettings.map(
                        (
                          setting,
                        ) => {
                          const checked =
                            Boolean(
                              printerSettings[
                                setting.key
                              ],
                            );

                          return (
                            <button
                              key={
                                setting.key
                              }
                              type="button"
                              onClick={() =>
                                updatePrinterSetting(
                                  setting.key,
                                  !checked as never,
                                )
                              }
                              className={`flex min-h-[68px] items-center justify-between gap-3 rounded-[18px] border p-4 text-left transition ${
                                checked
                                  ? 'border-black bg-white'
                                  : 'border-black/[0.06] bg-[#ecece7] text-black/45'
                              }`}
                            >
                              <span className="text-sm font-black">
                                {
                                  setting.label
                                }
                              </span>

                              <MiniSwitch
                                checked={
                                  checked
                                }
                              />
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}

                  {tab ===
                    'automation' && (
                    <div className="space-y-3">
                      <AutomationRow
                        title="Cetak otomatis"
                        description="Cetak receipt customer setelah transaksi Kiosk berhasil."
                        checked={
                          printerSettings.autoPrint
                        }
                        onChange={(
                          checked,
                        ) =>
                          updatePrinterSetting(
                            'autoPrint',
                            checked,
                          )
                        }
                      />

                      <AutomationRow
                        title="Auto-cutter"
                        description="Potong kertas setelah satu receipt selesai dicetak."
                        checked={
                          printerSettings.autoCut
                        }
                        onChange={(
                          checked,
                        ) =>
                          updatePrinterSetting(
                            'autoCut',
                            checked,
                          )
                        }
                      />

                      <WorkbenchCard
                        title="Feed lines"
                        description="Jarak kosong sebelum cutter."
                      >
                        <NumberStepper
                          value={
                            printerSettings.feedLines
                          }
                          min={
                            0
                          }
                          max={
                            10
                          }
                          onChange={(
                            value,
                          ) =>
                            updatePrinterSetting(
                              'feedLines',
                              value,
                            )
                          }
                        />
                      </WorkbenchCard>
                    </div>
                  )}

                  <details className="mt-5 overflow-hidden rounded-[22px] border border-black/[0.07] bg-white lg:hidden">
                    <summary className="flex min-h-14 cursor-pointer items-center justify-between px-4 text-sm font-black">
                      Preview Struk

                      <Monitor className="h-4 w-4 text-black/40" />
                    </summary>

                    <div className="border-t border-black/[0.07] bg-[#e9e9e4] p-4">
                      <ReceiptPreview
                        storeName={
                          storeName
                        }
                        cashierName="Kiosk"
                        settings={
                          printerSettings
                        }
                      />
                    </div>
                  </details>
                </main>

                <aside className="hidden min-h-0 border-l border-black/[0.07] bg-[#e9e9e4] lg:flex lg:flex-col">
                  <div className="border-b border-black/[0.07] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.13em] text-black/30">
                          Live Preview
                        </p>

                        <p className="mt-1 text-base font-black">
                          Receipt Customer
                        </p>
                      </div>

                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black/45">
                        <Monitor className="h-4 w-4" />
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <ReceiptPreview
                      storeName={
                        storeName
                      }
                      cashierName="Kiosk"
                      settings={
                        printerSettings
                      }
                    />
                  </div>

                  <div className="border-t border-black/[0.07] bg-white p-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <QuickStat
                        label="Paper"
                        value={
                          printerSettings.paperWidth
                        }
                      />

                      <QuickStat
                        label="Copies"
                        value={String(
                          printerSettings.copies,
                        )}
                      />

                      <QuickStat
                        label="Delay"
                        value={`${Math.round(
                          printerSettings.copyDelayMs /
                            1000,
                        )}s`}
                      />

                      <QuickStat
                        label="Auto"
                        value={
                          printerSettings.autoPrint
                            ? 'ON'
                            : 'OFF'
                        }
                      />
                    </div>
                  </div>
                </aside>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.07] bg-white p-4 sm:hidden">
                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  className="h-12 rounded-xl border border-black/[0.08] px-4 text-sm font-black"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  disabled={
                    isSavingPrinterSettings
                  }
                  onClick={() =>
                    void saveAllPrinterSettings()
                  }
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  {isSavingPrinterSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  Simpan Pengaturan
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeviceTile({
  printer,
  selected,
  saved =
    false,
  onSelect,
  onRemove,
}: {
  printer:
    PrinterDevice;

  selected:
    boolean;

  saved?:
    boolean;

  onSelect:
    () => void;

  onRemove?:
    () => void;
}) {
  const isBluetooth =
    printer.type ===
      'bluetooth' ||
    printer.type ===
      'ble';

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border bg-white ${
        selected
          ? 'border-black ring-1 ring-black'
          : 'border-black/[0.07]'
      }`}
    >
      <button
        type="button"
        onClick={
          onSelect
        }
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? 'bg-black text-white'
              : 'bg-[#ecece7] text-black/40'
          }`}
        >
          {isBluetooth ? (
            <Bluetooth className="h-4 w-4" />
          ) : (
            <Usb className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">
            {
              printer.name
            }
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-black/35">
            {
              printer.address ||
              printer.id
            }
          </p>
        </div>

        {selected && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-black" />
        )}
      </button>

      {saved &&
      onRemove && (
        <button
          type="button"
          onClick={
            onRemove
          }
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
          title="Hapus printer tersimpan"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function WorkbenchCard({
  title,
  description,
  children,
}: {
  title:
    string;

  description?:
    string;

  children:
    ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-black/[0.07] bg-white p-4">
      <p className="text-base font-black">
        {
          title
        }
      </p>

      {description && (
        <p className="mt-1 text-sm leading-6 text-black/40">
          {
            description
          }
        </p>
      )}

      <div className="mt-4">
        {
          children
        }
      </div>
    </section>
  );
}

function AutomationRow({
  title,
  description,
  checked,
  onChange,
}: {
  title:
    string;

  description:
    string;

  checked:
    boolean;

  onChange:
    (
      checked:
        boolean,
    ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className="flex w-full items-center justify-between gap-5 rounded-[20px] border border-black/[0.07] bg-white p-4 text-left"
    >
      <div>
        <p className="text-base font-black">
          {
            title
          }
        </p>

        <p className="mt-1 text-sm leading-6 text-black/40">
          {
            description
          }
        </p>
      </div>

      <MiniSwitch
        checked={
          checked
        }
      />
    </button>
  );
}

function MiniSwitch({
  checked,
}: {
  checked:
    boolean;
}) {
  return (
    <span
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked
          ? 'bg-black'
          : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked
            ? 'translate-x-6'
            : 'translate-x-1'
        }`}
      />
    </span>
  );
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
}: {
  value:
    number;

  min:
    number;

  max:
    number;

  onChange:
    (
      value:
        number,
    ) => void;
}) {
  return (
    <div className="flex w-44 items-center justify-between rounded-xl bg-[#ecece7] p-1.5">
      <button
        type="button"
        disabled={
          value <=
          min
        }
        onClick={() =>
          onChange(
            Math.max(
              min,
              value -
                1,
            ),
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-black disabled:opacity-30"
      >
        −
      </button>

      <strong className="font-mono text-sm">
        {
          value
        }
      </strong>

      <button
        type="button"
        disabled={
          value >=
          max
        }
        onClick={() =>
          onChange(
            Math.min(
              max,
              value +
                1,
            ),
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-lg font-black text-white disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function QuickStat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl bg-[#f5f5f1] px-2 py-2.5">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-black/30">
        {
          label
        }
      </p>

      <p className="mt-1 font-mono text-sm font-black">
        {
          value
        }
      </p>
    </div>
  );
}

function ReceiptPreview({
  storeName,
  cashierName,
  settings,
}: {
  storeName:
    string;

  cashierName:
    string;

  settings:
    CashierPrinterSettings;
}) {
  const sample =
    PRINTER_TEST_RECEIPT;

  const hasLogo =
    settings.showLogo &&
    Boolean(
      settings.logoUrl,
    );

  return (
    <div className="flex justify-center py-2">
      <div
        className={`w-full bg-white px-5 py-6 font-mono text-[11px] leading-relaxed text-black shadow-xl ${
          settings.paperWidth ===
          '80mm'
            ? 'max-w-[310px]'
            : 'max-w-[245px]'
        }`}
      >
        {hasLogo && (
          <div className="mb-4 flex justify-center">
            <img
              src={
                settings.logoUrl
              }
              alt="Logo"
              className={`w-auto object-contain ${
                settings.logoSize ===
                'small'
                  ? 'h-8'
                  : settings.logoSize ===
                      'large'
                    ? 'h-16'
                    : 'h-11'
              }`}
            />
          </div>
        )}

        {settings.showStoreName && (
          <p className="text-center text-sm font-black uppercase">
            {
              storeName
            }
          </p>
        )}

        {settings.headerText && (
          <p className="mt-2 whitespace-pre-wrap text-center">
            {
              settings.headerText
            }
          </p>
        )}

        <div className="my-4 border-t border-dashed border-black/30" />

        {settings.showOrderNumber && (
          <PreviewRow
            label="Order"
            value={`#${sample.orderCode}`}
          />
        )}

        {settings.showCashier && (
          <PreviewRow
            label="Kasir"
            value={
              cashierName
            }
          />
        )}

        {settings.showCustomer && (
          <PreviewRow
            label="Customer"
            value={
              sample.customerName
            }
          />
        )}

        {settings.showOrderType && (
          <PreviewRow
            label="Tipe"
            value="Dine In"
          />
        )}

        {settings.showTable && (
          <PreviewRow
            label="Meja"
            value={
              sample.tableName
            }
          />
        )}

        <div className="my-4 border-t border-dashed border-black/30" />

        <p className="flex justify-between gap-2 font-bold">
          <span>
            {
              sample.item.quantity
            }
            x{' '}
            {
              sample.item.name
            }
          </span>

          <span>
            {formatReceiptNumber(
              sample.item.basePrice *
                sample.item.quantity,
            )}
          </span>
        </p>

        {settings.showAddons && (
          <p className="mt-1 flex justify-between gap-2 pl-3 text-black/50">
            <span>
              +{' '}
              {
                sample.item.addonName
              }
            </span>

            <span>
              {formatReceiptNumber(
                sample.item.addonPrice,
              )}
            </span>
          </p>
        )}

        {settings.showNotes && (
          <p className="mt-1 pl-3 text-black/50">
            Catatan:{' '}
            {
              sample.item.note
            }
          </p>
        )}

        <div className="my-4 border-t border-dashed border-black/30" />

        {settings.showSubtotal && (
          <PreviewRow
            label="Subtotal"
            value={formatReceiptNumber(
              sample.subtotal,
            )}
          />
        )}

        {settings.showDiscount && (
          <PreviewRow
            label="Diskon"
            value={`-${formatReceiptNumber(
              sample.discount,
            )}`}
          />
        )}

        {settings.showServiceCharge && (
          <PreviewRow
            label="Service"
            value={formatReceiptNumber(
              sample.service,
            )}
          />
        )}

        {settings.showTax && (
          <PreviewRow
            label="Pajak"
            value={formatReceiptNumber(
              sample.tax,
            )}
          />
        )}

        <p className="mt-2 flex justify-between gap-2 text-sm font-black">
          <span>
            TOTAL
          </span>

          <span>
            {formatReceiptNumber(
              sample.total,
            )}
          </span>
        </p>

        {settings.showPaymentMethod && (
          <div className="mt-3">
            <PreviewRow
              label="Bayar"
              value="CASH"
            />
          </div>
        )}

        {settings.showCashReceived && (
          <PreviewRow
            label="Diterima"
            value={formatReceiptNumber(
              sample.cashReceived,
            )}
          />
        )}

        {settings.showChange && (
          <PreviewRow
            label="Kembali"
            value={formatReceiptNumber(
              sample.change,
            )}
          />
        )}

        {settings.footerText && (
          <>
            <div className="my-4 border-t border-dashed border-black/30" />

            <p className="whitespace-pre-wrap text-center">
              {
                settings.footerText
              }
            </p>
          </>
        )}

        {settings.thankYouText && (
          <p className="mt-5 text-center font-bold">
            {
              settings.thankYouText
            }
          </p>
        )}

        <div
          style={{
            height:
              `${settings.feedLines * 6}px`,
          }}
        />
      </div>
    </div>
  );
}

function formatReceiptNumber(
  value:
    number,
): string {
  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits:
        0,
    },
  ).format(
    value,
  );
}

function PreviewRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="mb-1 flex justify-between gap-3">
      <span>
        {
          label
        }
      </span>

      <strong className="text-right">
        {
          value
        }
      </strong>
    </div>
  );
}
