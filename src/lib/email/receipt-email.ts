export type ReceiptEmailItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addons?: Array<{
    name: string;
    price: number;
  }>;
  note?: string | null;
};

export type ReceiptEmailData = {
  storeName: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  cashierName: string;
  createdAt: string;

  orderType:
    | 'takeaway'
    | 'dine-in';

  tableName?: string | null;

  paymentMethod:
    | 'cash'
    | 'qris';

  subtotal: number;
  discount: number;
  service: number;
  tax: number;
  grandTotal: number;
  cashReceived?: number | null;
  change?: number | null;

  items: ReceiptEmailItem[];
};

function formatRupiah(
  value: number,
): string {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style:
        'currency',
      currency:
        'IDR',
      maximumFractionDigits:
        0,
    },
  ).format(
    Number(
      value || 0,
    ),
  );
}

function escapeHtml(
  value: unknown,
): string {
  return String(
    value ?? '',
  )
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}

export function buildReceiptEmailHtml(
  data: ReceiptEmailData,
): string {
  const itemRows =
    data.items
      .map(
        (
          item,
        ) => {
          const addons =
            item.addons
              ?.map(
                (
                  addon,
                ) =>
                  `<div style="font-size:12px;color:#666;margin-top:2px;">
                    + ${escapeHtml(addon.name)} (${formatRupiah(addon.price)})
                  </div>`,
              )
              .join(
                '',
              ) ||
            '';

          const note =
            item.note
              ? `<div style="font-size:12px;color:#8a5a00;margin-top:2px;">
                  Catatan: ${escapeHtml(item.note)}
                </div>`
              : '';

          return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;">
                <div style="font-weight:700;color:#222;">
                  ${escapeHtml(item.name)}
                </div>
                <div style="font-size:12px;color:#777;margin-top:2px;">
                  ${item.quantity} × ${formatRupiah(item.unitPrice)}
                </div>
                ${addons}
                ${note}
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-weight:700;">
                ${formatRupiah(item.totalPrice)}
              </td>
            </tr>
          `;
        },
      )
      .join(
        '',
      );

  const orderTypeLabel =
    data.orderType ===
    'dine-in'
      ? 'Makan di Tempat'
      : 'Takeaway';

  const paymentLabel =
    data.paymentMethod ===
    'qris'
      ? 'QRIS'
      : 'Tunai';

  return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Struk ${escapeHtml(data.orderCode)}</title>
      </head>
      <body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <div style="max-width:640px;margin:0 auto;padding:24px 12px;">
          <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.08);">
            <div style="background:#0E5C37;color:#ffffff;padding:24px;text-align:center;">
              <h1 style="margin:0;font-size:24px;">
                ${escapeHtml(data.storeName)}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">
                Struk Transaksi
              </p>
            </div>

            <div style="padding:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:4px 0;color:#666;">No. Order</td>
                  <td style="padding:4px 0;text-align:right;font-weight:700;">
                    ${escapeHtml(data.orderCode)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#666;">Tanggal</td>
                  <td style="padding:4px 0;text-align:right;">
                    ${escapeHtml(data.createdAt)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#666;">Pelanggan</td>
                  <td style="padding:4px 0;text-align:right;">
                    ${escapeHtml(data.customerName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#666;">Kasir</td>
                  <td style="padding:4px 0;text-align:right;">
                    ${escapeHtml(data.cashierName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#666;">Layanan</td>
                  <td style="padding:4px 0;text-align:right;">
                    ${orderTypeLabel}
                  </td>
                </tr>
                ${
                  data.tableName
                    ? `
                      <tr>
                        <td style="padding:4px 0;color:#666;">Meja</td>
                        <td style="padding:4px 0;text-align:right;">
                          ${escapeHtml(data.tableName)}
                        </td>
                      </tr>
                    `
                    : ''
                }
                <tr>
                  <td style="padding:4px 0;color:#666;">Pembayaran</td>
                  <td style="padding:4px 0;text-align:right;">
                    ${paymentLabel}
                  </td>
                </tr>
              </table>

              <div style="margin:24px 0 8px;font-size:13px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.06em;">
                Detail Pesanan
              </div>

              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                ${itemRows}
              </table>

              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:20px;">
                <tr>
                  <td style="padding:5px 0;color:#666;">Subtotal</td>
                  <td style="padding:5px 0;text-align:right;">
                    ${formatRupiah(data.subtotal)}
                  </td>
                </tr>
                ${
                  data.discount > 0
                    ? `
                      <tr>
                        <td style="padding:5px 0;color:#c0392b;">Diskon</td>
                        <td style="padding:5px 0;text-align:right;color:#c0392b;">
                          -${formatRupiah(data.discount)}
                        </td>
                      </tr>
                    `
                    : ''
                }
                ${
                  data.service > 0
                    ? `
                      <tr>
                        <td style="padding:5px 0;color:#666;">Service</td>
                        <td style="padding:5px 0;text-align:right;">
                          ${formatRupiah(data.service)}
                        </td>
                      </tr>
                    `
                    : ''
                }
                ${
                  data.tax > 0
                    ? `
                      <tr>
                        <td style="padding:5px 0;color:#666;">Pajak</td>
                        <td style="padding:5px 0;text-align:right;">
                          ${formatRupiah(data.tax)}
                        </td>
                      </tr>
                    `
                    : ''
                }

                <tr>
                  <td style="padding:12px 0 5px;border-top:2px solid #222;font-size:16px;font-weight:800;">
                    Total
                  </td>
                  <td style="padding:12px 0 5px;border-top:2px solid #222;text-align:right;font-size:16px;font-weight:800;">
                    ${formatRupiah(data.grandTotal)}
                  </td>
                </tr>

                ${
                  data.paymentMethod ===
                    'cash' &&
                  data.cashReceived !==
                    null &&
                  data.cashReceived !==
                    undefined
                    ? `
                      <tr>
                        <td style="padding:5px 0;color:#666;">Uang Diterima</td>
                        <td style="padding:5px 0;text-align:right;">
                          ${formatRupiah(data.cashReceived)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;color:#666;">Kembalian</td>
                        <td style="padding:5px 0;text-align:right;">
                          ${formatRupiah(data.change || 0)}
                        </td>
                      </tr>
                    `
                    : ''
                }
              </table>

              <div style="margin-top:28px;padding:16px;border-radius:12px;background:#ECFDF5;text-align:center;color:#065F46;">
                Terima kasih telah berbelanja.
              </div>
            </div>
          </div>

          <p style="text-align:center;font-size:11px;color:#888;margin-top:16px;">
            Email ini dikirim otomatis oleh Evokasir.
          </p>
        </div>
      </body>
    </html>
  `;
}
