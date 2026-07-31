/*
 * Pada CashierPOS.tsx, setelah response checkout sukses:
 *
 * Pastikan order yang dikirim ke onSubmitOrder berasal dari result.printOrder.
 * Route sudah mengembalikan seluruh harga, tax, service, meja, pembayaran,
 * dan item yang sama dengan hasil perhitungan server/self-checkout.
 */

const result =
  await response.json();

if (
  !response.ok ||
  !result.success
) {
  throw new Error(
    result.message ||
    'Gagal membuat pesanan',
  );
}

const createdOrder:
  Order =
    (
      result.printOrder ??
      result.data
    ) as Order;

/*
 * Jangan lagi membangun subtotal/tax/total dari state frontend di sini.
 * Gunakan hasil server supaya angka struk sama dengan database dan
 * self-checkout.
 */
await onSubmitOrder(
  createdOrder,
);

/*
 * Bila QRIS tetap perlu menampilkan modal QR setelah order dibuat:
 */
if (
  result.paymentMethod ===
    'qris' &&
  result.qrUrl
) {
  setQrisData({
    qrUrl:
      result.qrUrl,

    orderCode:
      result.orderCode,

    optimisticOrder:
      createdOrder,
  });
}
