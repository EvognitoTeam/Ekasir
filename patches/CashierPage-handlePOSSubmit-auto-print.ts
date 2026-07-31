/*
 * GANTI handlePOSSubmit pada:
 * src/app/[mitraSlug]/cashier/page.tsx
 *
 * Prasyarat di file yang sama sudah tersedia:
 * - handlePrintOrder(order, target)
 * - setOrders
 * - setIsPOSMode
 * - Toast
 *
 * Handler ini selalu mencoba mencetak struk customer segera setelah
 * order berhasil dibuat. Gagal cetak tidak membatalkan order.
 */
const handlePOSSubmit =
  async (
    newOrder:
      Order,
  ) => {
    setOrders(
      (
        previous,
      ) => [
        newOrder,
        ...previous,
      ],
    );

    try {
      await handlePrintOrder(
        newOrder,
        'customer',
      );

      Toast.fire({
        icon:
          'success',
        title:
          'Pesanan dibuat dan struk customer dicetak',
      });
    } catch (
      error
    ) {
      console.error(
        '[AUTO_PRINT_CUSTOMER_ERROR]',
        error,
      );

      Toast.fire({
        icon:
          'warning',
        title:
          error instanceof
          Error
            ? `Pesanan dibuat, tetapi cetak gagal: ${error.message}`
            : 'Pesanan dibuat, tetapi struk customer gagal dicetak',
      });
    } finally {
      setIsPOSMode(
        false,
      );
    }
  };
