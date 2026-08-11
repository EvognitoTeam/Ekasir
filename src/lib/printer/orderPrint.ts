import type {
  Order,
} from '@/types/menu';

import type {
  PrinterDevice,
} from './types';

import {
  PrinterManager,
} from './PrinterManager';

type MenuProduct = {
  id:
    string |
    number;
  name:
    string;
  basePrice?:
    number |
    string;
  price?:
    number |
    string;
  categorizedAddons?:
    Array<{
      addons?:
        Array<{
          id:
            string |
            number;
          name:
            string;
          price?:
            number |
            string;
        }>;
    }>;
};

type ReceiptSettings = {
  paperWidth?:
    '58mm' |
    '80mm';
  autoCut?:
    boolean;
  feedLines?:
    number;
  logoUrl?:
    string;
  logoSize?:
    'small' |
    'medium' |
    'large';
  showLogo?:
    boolean;
  headerText?:
    string;
  footerText?:
    string;
  thankYouText?:
    string;
  showStoreName?:
    boolean;
  showCashier?:
    boolean;
  showCustomer?:
    boolean;
  showOrderNumber?:
    boolean;
  showOrderType?:
    boolean;
  showTable?:
    boolean;
  showAddons?:
    boolean;
  showNotes?:
    boolean;
  showSubtotal?:
    boolean;
  showDiscount?:
    boolean;
  showTax?:
    boolean;
  showServiceCharge?:
    boolean;
  showPaymentMethod?:
    boolean;
  showCashReceived?:
    boolean;
  showChange?:
    boolean;
};

type PrintOrderOptions = {
  order:
    Order;
  target:
    'kitchen' |
    'customer';
  printer:
    PrinterDevice;
  slug:
    string;
  storeName:
    string;
  cashierName:
    string;
  menuItems:
    MenuProduct[];
  settings:
    ReceiptSettings;
};

const ESC =
  0x1b;

const GS =
  0x1d;

const LF =
  0x0a;

const encoder =
  new TextEncoder();

function normalize(
  value:
    unknown,
) {
  return String(
    value ??
    ''
  ).trim();
}


function parseJsonArray(
  value:
    unknown,
): any[] {
  let current:
    unknown =
      value;

  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    if (
      Array.isArray(
        current
      )
    ) {
      return current;
    }

    if (
      current &&
      typeof current ===
        'object'
    ) {
      return [
        current,
      ];
    }

    if (
      typeof current !==
      'string'
    ) {
      return [];
    }

    const trimmed =
      current.trim();

    if (!trimmed) {
      return [];
    }

    try {
      current =
        JSON.parse(
          trimmed
        );
    } catch {
      return [];
    }
  }

  return Array.isArray(
    current
  )
    ? current
    : [];
}

function money(
  value:
    unknown,
) {
  return Number(
    value ||
    0
  ).toLocaleString(
    'id-ID'
  );
}

function getWidth(
  settings:
    ReceiptSettings,
) {
  return settings.paperWidth ===
    '80mm'
      ? 48
      : 32;
}

function separator(
  width:
    number,
) {
  return '-'.repeat(
    width
  );
}

function center(
  text:
    string,
  width:
    number,
) {
  const clean =
    normalize(
      text
    );

  if (
    clean.length >=
    width
  ) {
    return clean.slice(
      0,
      width
    );
  }

  return (
    ' '.repeat(
      Math.floor(
        (
          width -
          clean.length
        ) /
          2
      )
    ) +
    clean
  );
}

function wrapSingleLine(
  text:
    string,
  width:
    number,
) {
  const clean =
    String(
      text ??
      ''
    )
      .replace(
        /\r/g,
        ''
      )
      .trim();

  if (!clean) {
    return [
      '',
    ];
  }

  const words =
    clean.split(
      /[ \t]+/
    );

  const lines:
    string[] =
      [];

  let current =
    '';

  for (
    const word of
    words
  ) {
    if (!word) {
      continue;
    }

    if (
      word.length >
      width
    ) {
      if (
        current
      ) {
        lines.push(
          current
        );
        current =
          '';
      }

      for (
        let index = 0;
        index <
        word.length;
        index +=
        width
      ) {
        lines.push(
          word.slice(
            index,
            index +
              width
          )
        );
      }

      continue;
    }

    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      candidate.length <=
      width
    ) {
      current =
        candidate;
    } else {
      if (
        current
      ) {
        lines.push(
          current
        );
      }

      current =
        word;
    }
  }

  if (
    current
  ) {
    lines.push(
      current
    );
  }

  return lines;
}

/**
 * Mempertahankan Enter dari textarea.
 * Baris kosong di input tetap menjadi baris kosong di struk.
 */
function wrapMultiline(
  text:
    string,
  width:
    number,
) {
  const rawLines =
    String(
      text ??
      ''
    )
      .replace(
        /\r/g,
        ''
      )
      .split(
        '\n'
      );

  const result:
    string[] =
      [];

  for (
    const rawLine of
    rawLines
  ) {
    if (
      rawLine.trim() ===
      ''
    ) {
      result.push(
        ''
      );
      continue;
    }

    result.push(
      ...wrapSingleLine(
        rawLine,
        width
      )
    );
  }

  return result;
}

function columns(
  left:
    string,
  right:
    string,
  width:
    number,
) {
  const safeRight =
    normalize(
      right
    );

  const rightWidth =
    Math.min(
      safeRight.length,
      Math.floor(
        width *
        0.42
      )
    );

  const leftWidth =
    Math.max(
      8,
      width -
      rightWidth -
      1
    );

  const leftLines =
    wrapSingleLine(
      left,
      leftWidth
    );

  return leftLines.map(
    (
      line,
      index
    ) =>
      index ===
      leftLines.length -
        1
        ? `${line.padEnd(
            leftWidth,
            ' '
          )} ${safeRight.padStart(
            rightWidth,
            ' '
          )}`
        : line
  );
}

function formatServiceType(
  value:
    unknown,
) {
  const normalized =
    normalize(
      value
    )
      .toLowerCase()
      .replace(
        /[-\s]+/g,
        '_'
      );

  if (
    [
      'dine_in',
      'dinein',
      'makan_di_tempat',
    ].includes(
      normalized
    )
  ) {
    return 'Dine In';
  }

  if (
    [
      'takeaway',
      'take_away',
      'bungkus',
      'walk_in',
      'walkin',
    ].includes(
      normalized
    )
  ) {
    return 'Takeaway';
  }

  return normalized
    .split(
      '_'
    )
    .filter(
      Boolean
    )
    .map(
      (
        part
      ) =>
        part.charAt(
          0
        ).toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      ' '
    );
}

function getManualTableInfo(
  order:
    Order,
) {
  return normalize(
    (order as any).manualTableInfo ??
    (order as any).manual_table_info
  );
}

function isTakeawayValue(
  value:
    unknown,
) {
  return [
    'takeaway',
    'take away',
    'take_away',
    'bungkus',
    'walk-in',
    'walk_in',
    'walk in',
  ].includes(
    normalize(
      value
    )
      .toLowerCase()
  );
}

function getPhysicalTableLabel(
  order:
    Order,
) {
  return normalize(
    (order as any).tableName ??
    (order as any).table_name ??
    (order as any).tableCode ??
    (order as any).table_code ??
    (order as any).tableNumberLabel ??
    (order as any).table_number_label ??
    (order as any).tableNumber ??
    (order as any).table_number
  );
}

/**
 * Aturan meja:
 *
 * 1. Ada table_number + manual_table_info = Takeaway
 *    => Layanan Takeaway, Meja tetap memakai meja fisik.
 *
 * 2. table_number kosong + manual_table_info bukan Takeaway
 *    => Layanan Dine In, Meja memakai manual_table_info.
 *
 * 3. table_number ada + bukan Takeaway
 *    => Layanan Dine In, Meja memakai meja fisik.
 *
 * 4. table_number kosong + manual_table_info = Takeaway
 *    => Layanan Takeaway, lokasi ditampilkan sebagai Takeaway.
 */
function getTableAndService(
  order:
    Order,
) {
  const physicalTable =
    getPhysicalTableLabel(
      order
    );

  const manualTableInfo =
    getManualTableInfo(
      order
    );

  const manualIsTakeaway =
    isTakeawayValue(
      manualTableInfo
    );

  if (
    physicalTable &&
    manualIsTakeaway
  ) {
    return {
      service:
        'Takeaway',
      table:
        physicalTable,
    };
  }

  if (
    !physicalTable &&
    manualTableInfo &&
    !manualIsTakeaway
  ) {
    return {
      service:
        'Dine In',
      table:
        manualTableInfo,
    };
  }

  if (
    physicalTable
  ) {
    return {
      service:
        'Dine In',
      table:
        physicalTable,
    };
  }

  if (
    manualIsTakeaway
  ) {
    return {
      service:
        'Takeaway',
      table:
        'Takeaway',
    };
  }

  const explicitService =
    formatServiceType(
      (order as any).serviceType ??
      (order as any).service_type ??
      (order as any).orderType ??
      (order as any).order_type
    );

  return {
    service:
      explicitService ||
      'Dine In',
    table:
      manualTableInfo,
  };
}

function getVoucherCode(
  order:
    Order,
) {
  return normalize(
    (order as any).couponCode ??
    (order as any).coupon_code ??
    (order as any).voucherCode ??
    (order as any).voucher_code
  );
}

function isTaxIncluded(
  order:
    Order,
) {
  const raw =
    (order as any).isTaxIncluded ??
    (order as any).is_tax_included;

  return (
    raw ===
      true ||
    raw ===
      1 ||
    raw ===
      '1'
  );
}


function getOrderItems(
  order:
    Order,
  menuItems:
    MenuProduct[],
) {
  return (
    order.items ||
    []
  ).map(
    (
      rawItem:
        any
    ) => {
      const productId =
        rawItem.menuItemId ??
        rawItem.product_id;

      const product =
        menuItems.find(
          (
            item
          ) =>
            String(
              item.id
            ) ===
            String(
              productId
            )
        );

      const selectedAddonSource =
        rawItem.selectedAddOnsDetails ??
        rawItem.selected_add_ons_details ??
        rawItem.selectedAddOns ??
        rawItem.selected_add_ons;

      const selectedAddons =
        parseJsonArray(
          selectedAddonSource
        );

      /*
       * selectedAddOnsDetails adalah sumber utama. notes hanya fallback
       * untuk data lama yang belum mengirim field tersebut.
       */
      const rawAddons =
        selectedAddons.length >
          0
          ? selectedAddons
          : parseJsonArray(
              rawItem.notes
            );

      const addons:
        Array<{
          name:
            string;
          price:
            number;
        }> =
          [];

      /*
       * Catatan item hanya boleh berasal dari cust_notes. Field notes,
       * customer_note, atau nama add-on berawalan "Note:" tidak lagi
       * otomatis dicetak sebagai catatan.
       */
      let note =
        normalize(
          rawItem.cust_notes
        );

      if (
        Array.isArray(
          rawAddons
        )
      ) {
        for (
          const rawAddon of
          rawAddons
        ) {
          if (
            !rawAddon ||
            typeof rawAddon !==
              'object'
          ) {
            continue;
          }

          const custNotes =
            normalize(
              rawAddon.cust_notes
            );

          if (custNotes) {
            note =
              custNotes;
          }

          let name =
            normalize(
              rawAddon.name
            );

          let price =
            Number(
              rawAddon.price ||
              0
            );

          if (
            !name &&
            rawAddon.id
          ) {
            for (
              const category of
              product?.categorizedAddons ||
              []
            ) {
              const found =
                category.addons?.find(
                  (
                    addon
                  ) =>
                    String(
                      addon.id
                    ) ===
                    String(
                      rawAddon.id
                    )
                );

              if (found) {
                name =
                  found.name;

                price =
                  Number(
                    found.price ||
                    0
                  );

                break;
              }
            }
          }

          /*
           * Object khusus catatan yang hanya berisi cust_notes tidak
           * dimasukkan sebagai add-on kosong.
           */
          if (name) {
            addons.push({
              name,
              price,
            });
          }
        }
      }

      /*
       * Harga item untuk struk diambil dari daftar menu berdasarkan
       * product_id/menuItemId, bukan dari priceAtOrder milik order item.
       *
       * Beberapa endpoint menyimpan priceAtOrder sebagai total baris,
       * harga setelah add-on, atau nilai lama sehingga hasil kali quantity
       * dapat menjadi salah.
       */
      const menuUnitPrice =
        Number(
          product?.basePrice ??
          product?.price ??
          0
        );

      const fallbackOrderPrice =
        Number(
          rawItem.unitPrice ??
          rawItem.unit_price ??
          rawItem.price ??
          rawItem.priceAtOrder ??
          rawItem.price_at_order ??
          0
        );

      const resolvedUnitPrice =
        Number.isFinite(
          menuUnitPrice
        ) &&
        menuUnitPrice >
        0
          ? menuUnitPrice
          : (
              Number.isFinite(
                fallbackOrderPrice
              )
                ? fallbackOrderPrice
                : 0
            );

      return {
        productId:
          productId,

        name:
          product?.name ||
          rawItem.name ||
          'Produk',

        quantity:
          Math.max(
            1,
            Number(
              rawItem.quantity ||
              1
            )
          ),

        unitPrice:
          resolvedUnitPrice,

        addons,
        note,
      };
    }
  );
}

function appendFinish(
  bytes:
    number[],
  settings:
    ReceiptSettings,
) {
  const feedLines =
    Math.max(
      0,
      Math.min(
        10,
        Number(
          settings.feedLines ??
          3
        )
      )
    );

  for (
    let index = 0;
    index <
    feedLines;
    index +=
    1
  ) {
    bytes.push(
      LF
    );
  }

  if (
    settings.autoCut !==
    false
  ) {
    bytes.push(
      GS,
      0x56,
      0x00
    );
  }
}

function appendText(
  bytes:
    number[],
  text:
    string,
) {
  bytes.push(
    ...encoder.encode(
      text
    )
  );
}

function resolveLogoUrl(
  logoUrl:
    string,
) {
  if (
    /^https?:\/\//i.test(
      logoUrl
    ) ||
    logoUrl.startsWith(
      'data:'
    ) ||
    logoUrl.startsWith(
      'blob:'
    )
  ) {
    return logoUrl;
  }

  if (
    typeof window !==
    'undefined'
  ) {
    return new URL(
      logoUrl.startsWith(
        '/'
      )
        ? logoUrl
        : `/${logoUrl}`,
      window.location.origin
    ).toString();
  }

  return logoUrl;
}

async function imageToEscPosRaster(
  imageUrl:
    string,
  settings:
    ReceiptSettings,
) {
  if (
    typeof document ===
      'undefined' ||
    typeof Image ===
      'undefined'
  ) {
    return new Uint8Array();
  }

  const image =
    new Image();

  image.crossOrigin =
    'anonymous';

  const loaded =
    new Promise<void>(
      (
        resolve,
        reject
      ) => {
        image.onload =
          () =>
            resolve();

        image.onerror =
          () =>
            reject(
              new Error(
                'Logo gagal dimuat untuk dicetak.'
              )
            );
      }
    );

  image.src =
    resolveLogoUrl(
      imageUrl
    );

  await loaded;

  const paperMaxWidth =
    settings.paperWidth ===
    '80mm'
      ? 512
      : 360;

  const sizeRatio =
    settings.logoSize ===
    'small'
      ? 0.42
      : settings.logoSize ===
        'large'
        ? 0.8
        : 0.6;

  const targetWidth =
    Math.max(
      80,
      Math.min(
        paperMaxWidth,
        Math.round(
          paperMaxWidth *
          sizeRatio
        )
      )
    );

  const targetHeight =
    Math.max(
      1,
      Math.round(
        image.height *
        (
          targetWidth /
          image.width
        )
      )
    );

  const canvas =
    document.createElement(
      'canvas'
    );

  canvas.width =
    targetWidth;

  canvas.height =
    targetHeight;

  const context =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:
          true,
      }
    );

  if (!context) {
    throw new Error(
      'Canvas logo tidak dapat dibuat.'
    );
  }

  context.fillStyle =
    '#ffffff';

  context.fillRect(
    0,
    0,
    targetWidth,
    targetHeight
  );

  context.drawImage(
    image,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const pixels =
    context.getImageData(
      0,
      0,
      targetWidth,
      targetHeight
    ).data;

  const widthBytes =
    Math.ceil(
      targetWidth /
      8
    );

  const raster =
    new Uint8Array(
      widthBytes *
      targetHeight
    );

  for (
    let y = 0;
    y <
    targetHeight;
    y +=
    1
  ) {
    for (
      let x = 0;
      x <
      targetWidth;
      x +=
      1
    ) {
      const pixelIndex =
        (
          y *
          targetWidth +
          x
        ) *
        4;

      const alpha =
        pixels[
          pixelIndex +
          3
        ] /
        255;

      const red =
        pixels[
          pixelIndex
        ];

      const green =
        pixels[
          pixelIndex +
          1
        ];

      const blue =
        pixels[
          pixelIndex +
          2
        ];

      const luminance =
        (
          0.299 *
          red +
          0.587 *
          green +
          0.114 *
          blue
        ) *
        alpha +
        255 *
        (
          1 -
          alpha
        );

      if (
        luminance <
        160
      ) {
        raster[
          y *
          widthBytes +
          Math.floor(
            x /
            8
          )
        ] |=
          0x80 >>
          (
            x %
            8
          );
      }
    }
  }

  const xLow =
    widthBytes &
    0xff;

  const xHigh =
    (
      widthBytes >>
      8
    ) &
    0xff;

  const yLow =
    targetHeight &
    0xff;

  const yHigh =
    (
      targetHeight >>
      8
    ) &
    0xff;

  return Uint8Array.from([
    ESC,
    0x61,
    0x01,
    GS,
    0x76,
    0x30,
    0x00,
    xLow,
    xHigh,
    yLow,
    yHigh,
    ...raster,
    LF,
    ESC,
    0x61,
    0x00,
  ]);
}

function printTimestamp() {
  return new Date()
    .toLocaleString(
      'id-ID',
      {
        timeZone:
          'Asia/Jakarta',
        dateStyle:
          'medium',
        timeStyle:
          'medium',
      }
    );
}

async function buildKitchenTicket(
  options:
    PrintOrderOptions,
) {
  const {
    order,
    storeName,
    cashierName,
    menuItems,
    settings,
  } =
    options;

  const width =
    getWidth(
      settings
    );

  const items =
    getOrderItems(
      order,
      menuItems
    );

  const orderCode =
    normalize(
      (order as any).order_code ??
      order.id
    );

  const tableAndService =
    getTableAndService(
      order
    );

  const orderType =
    tableAndService.service;

  const table =
    tableAndService.table;

  const customer =
    normalize(
      (order as any).customerName ??
      (order as any).name
    );

  const lines:
    string[] =
      [];

  lines.push(
    center(
      'ORDER DAPUR',
      width
    )
  );

  lines.push(
    center(
      storeName,
      width
    )
  );

  lines.push(
    separator(
      width
    )
  );

  lines.push(
    ...columns(
      'ORDER',
      `#${orderCode}`,
      width
    )
  );

  if (
    orderType
  ) {
    lines.push(
      ...columns(
        'LAYANAN',
        orderType,
        width
      )
    );
  }

  if (
    table
  ) {
    lines.push(
      ...columns(
        'MEJA/LOKASI',
        table,
        width
      )
    );
  }

  if (
    customer
  ) {
    lines.push(
      ...columns(
        'NAMA',
        customer,
        width
      )
    );
  }

  if (
    cashierName
  ) {
    lines.push(
      ...columns(
        'KASIR',
        cashierName,
        width
      )
    );
  }

  lines.push(
    separator(
      width
    )
  );

  for (
    const item of
    items
  ) {
    lines.push(
      `${item.quantity}x ${item.name}`
    );

    if (
      settings.showAddons !==
      false
    ) {
      for (
        const addon of
        item.addons
      ) {
        lines.push(
          `  + ${addon.name}`
        );
      }
    }

    if (
      settings.showNotes !==
        false &&
      item.note
    ) {
      lines.push(
        ...wrapMultiline(
          `  CATATAN: ${item.note}`,
          width
        )
      );
    }

    lines.push(
      ''
    );
  }

  const adminNotes =
    normalize(
      (order as any).adminNotes ??
      (order as any).admin_notes
    );

  if (
    adminNotes
  ) {
    lines.push(
      separator(
        width
      )
    );

    lines.push(
      ...wrapMultiline(
        `CATATAN KASIR: ${adminNotes}`,
        width
      )
    );
  }

  lines.push(
    separator(
      width
    )
  );

  lines.push(
    center(
      `Waktu Cetak: ${printTimestamp()}`,
      width
    )
  );

  lines.push(
    center(
      'Powered By Evognito Team',
      width
    )
  );

  const bytes:
    number[] =
      [
        ESC,
        0x40,
      ];

  appendText(
    bytes,
    lines.join(
      '\n'
    )
  );

  appendFinish(
    bytes,
    settings
  );

  return Uint8Array.from(
    bytes
  );
}

async function buildCustomerReceipt(
  options:
    PrintOrderOptions,
) {
  const {
    order,
    storeName,
    cashierName,
    menuItems,
    settings,
  } =
    options;

  const width =
    getWidth(
      settings
    );

  const items =
    getOrderItems(
      order,
      menuItems
    );

  const bytes:
    number[] =
      [
        ESC,
        0x40,
      ];

  if (
    settings.showLogo !==
      false &&
    settings.logoUrl
  ) {
    try {
      const logoBytes =
        await imageToEscPosRaster(
          settings.logoUrl,
          settings
        );

      bytes.push(
        ...logoBytes
      );
    } catch (
      error
    ) {
      console.warn(
        'Logo gagal dicetak, struk teks tetap dilanjutkan:',
        error
      );
    }
  }

  const lines:
    string[] =
      [];

  if (
    settings.headerText
  ) {
    for (
      const headerLine of
      wrapMultiline(
        settings.headerText,
        width
      )
    ) {
      lines.push(
        headerLine
          ? center(
              headerLine,
              width
            )
          : ''
      );
    }
  }

  if (
    settings.showStoreName !==
    false
  ) {
    lines.push(
      center(
        storeName,
        width
      )
    );
  }

  lines.push(
    separator(
      width
    )
  );

  if (
    settings.showOrderNumber !==
    false
  ) {
    lines.push(
      ...columns(
        'Order',
        `#${
          (order as any).order_code ||
          order.id
        }`,
        width
      )
    );
  }

  if (
    settings.showCashier !==
      false &&
    cashierName
  ) {
    lines.push(
      ...columns(
        'Kasir',
        cashierName,
        width
      )
    );
  }

  if (
    settings.showCustomer !==
    false
  ) {
    const customer =
      normalize(
        (order as any).customerName ??
        (order as any).name
      );

    if (
      customer
    ) {
      lines.push(
        ...columns(
          'Pelanggan',
          customer,
          width
        )
      );
    }
  }

  const tableAndService =
    getTableAndService(
      order
    );

  const orderType =
    tableAndService.service;

  if (
    settings.showOrderType !==
      false &&
    orderType
  ) {
    lines.push(
      ...columns(
        'Layanan',
        orderType,
        width
      )
    );
  }

  const table =
    tableAndService.table;

  if (
    settings.showTable !==
      false &&
    table
  ) {
    lines.push(
      ...columns(
        'Meja/Lokasi',
        table,
        width
      )
    );
  }

  lines.push(
    separator(
      width
    )
  );

  for (
    const item of
    items
  ) {
    lines.push(
      ...columns(
        `${item.quantity}x ${item.name}`,
        money(
          item.quantity *
          item.unitPrice
        ),
        width
      )
    );

    if (
      settings.showAddons !==
      false
    ) {
      for (
        const addon of
        item.addons
      ) {
        lines.push(
          ...columns(
            `  + ${addon.name}`,
            addon.price >
            0
              ? money(
                  addon.price
                )
              : '',
            width
          )
        );
      }
    }

    if (
      settings.showNotes !==
        false &&
      item.note
    ) {
      lines.push(
        ...wrapMultiline(
          `  Catatan: ${item.note}`,
          width
        )
      );
    }
  }

  lines.push(
    separator(
      width
    )
  );

  const subtotal =
    Number(
      (order as any).subtotal ??
      (order as any).totalPrice ??
      (order as any).total_price ??
      0
    );

  if (
    settings.showSubtotal !==
    false
  ) {
    lines.push(
      ...columns(
        'Subtotal',
        money(
          subtotal
        ),
        width
      )
    );
  }

  const discount =
    Number(
      (order as any).discount ??
      (order as any).discountAmount ??
      (order as any).discount_amount ??
      0
    );

  if (
    settings.showDiscount !==
      false &&
    discount >
    0
  ) {
    const voucherCode =
      getVoucherCode(
        order
      );

    if (
      voucherCode
    ) {
      lines.push(
        ...columns(
          'Voucher',
          voucherCode.toUpperCase(),
          width
        )
      );
    }

    lines.push(
      ...columns(
        voucherCode
          ? 'Diskon Voucher'
          : 'Diskon',
        `-${money(
          discount
        )}`,
        width
      )
    );
  }

  const tax =
    Number(
      (order as any).tax ??
      0
    );

  if (
    !isTaxIncluded(
      order
    ) &&
    settings.showTax !==
      false &&
    tax >
    0
  ) {
    lines.push(
      ...columns(
        'Pajak',
        money(
          tax
        ),
        width
      )
    );
  }

  const service =
    Number(
      (order as any).serviceCharge ??
      (order as any).service_charge ??
      (order as any).service ??
      0
    );

  if (
    !isTaxIncluded(
      order
    ) &&
    settings.showServiceCharge !==
      false &&
    service >
    0
  ) {
    lines.push(
      ...columns(
        'Layanan',
        money(
          service
        ),
        width
      )
    );
  }

  lines.push(
    separator(
      width
    )
  );

  lines.push(
    ...columns(
      'TOTAL',
      money(
        (order as any).totalAfterDiscount ??
        (order as any).total_after_discount ??
        (order as any).totalPrice ??
        (order as any).total_price ??
        0
      ),
      width
    )
  );

  if (
    settings.showPaymentMethod !==
    false
  ) {
    lines.push(
      ...columns(
        'Pembayaran',
        normalize(
          (order as any).paymentMethod ??
          (order as any).payment_method ??
          'cash'
        ).toUpperCase(),
        width
      )
    );
  }

  const received =
    Number(
      (order as any).getPayment ??
      (order as any).get_payment ??
      0
    );

  if (
    settings.showCashReceived !==
      false &&
    received >
    0
  ) {
    lines.push(
      ...columns(
        'Diterima',
        money(
          received
        ),
        width
      )
    );
  }

  const change =
    Number(
      (order as any).cashChange ??
      (order as any).cash_change ??
      0
    );

  if (
    settings.showChange !==
      false &&
    received >
    0
  ) {
    lines.push(
      ...columns(
        'Kembalian',
        money(
          change
        ),
        width
      )
    );
  }

  if (
    settings.footerText
  ) {
    lines.push(
      separator(
        width
      )
    );

    for (
      const footerLine of
      wrapMultiline(
        settings.footerText,
        width
      )
    ) {
      lines.push(
        footerLine
          ? center(
              footerLine,
              width
            )
          : ''
      );
    }
  }

  if (
    settings.thankYouText
  ) {
    lines.push(
      ''
    );

    for (
      const thankLine of
      wrapMultiline(
        settings.thankYouText,
        width
      )
    ) {
      lines.push(
        thankLine
          ? center(
              thankLine,
              width
            )
          : ''
      );
    }
  }

  lines.push(
    ''
  );

  lines.push(
    center(
      `Waktu Cetak: ${printTimestamp()}`,
      width
    )
  );

  lines.push(
    center(
      'Powered By Evognito Team',
      width
    )
  );

  appendText(
    bytes,
    lines.join(
      '\n'
    )
  );

  appendFinish(
    bytes,
    settings
  );

  return Uint8Array.from(
    bytes
  );
}

export async function printOrder(
  options:
    PrintOrderOptions,
) {
  const bytes =
    options.target ===
    'kitchen'
      ? await buildKitchenTicket(
          options
        )
      : await buildCustomerReceipt(
          options
        );

  await PrinterManager.printBytes(
    bytes,
    options.printer,
    options.slug
  );
}