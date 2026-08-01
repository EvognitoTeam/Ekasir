import {
  NextResponse,
} from 'next/server';

import {
  buildReceiptEmailHtml,
  type ReceiptEmailData,
} from '@/lib/email/receipt-email';

import {
  createMailer,
  getMailSender,
} from '@/lib/email/mailer';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

function isValidEmail(
  value: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    /*
     * Email tujuan boleh dikirim dari body untuk pengujian.
     * Data struk lainnya masih menggunakan dummy.
     */
    const recipient =
      String(
        body?.email ??
        '',
      ).trim();

    if (
      !recipient ||
      !isValidEmail(
        recipient,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Email tujuan tidak valid.',
        },
        {
          status:
            400,
        },
      );
    }

    const dummyReceipt:
      ReceiptEmailData = {
      storeName:
        'Evokasir Coffee',

      orderCode:
        'EVK-DUMMY-001',

      customerName:
        'Pelanggan Dummy',

      customerEmail:
        recipient,

      cashierName:
        'Kasir Demo',

      createdAt:
        new Intl.DateTimeFormat(
          'id-ID',
          {
            dateStyle:
              'medium',
            timeStyle:
              'short',
            timeZone:
              'Asia/Jakarta',
          },
        ).format(
          new Date(),
        ),

      orderType:
        'dine-in',

      tableName:
        'Meja A1',

      paymentMethod:
        'cash',

      subtotal:
        60000,

      discount:
        5000,

      service:
        5500,

      tax:
        6050,

      grandTotal:
        66550,

      cashReceived:
        100000,

      change:
        33450,

      items: [
        {
          name:
            'Kopi Susu Gula Aren',

          quantity:
            2,

          unitPrice:
            22000,

          totalPrice:
            44000,

          addons: [
            {
              name:
                'Extra Shot',

              price:
                5000,
            },
          ],

          note:
            'Es sedikit',
        },
        {
          name:
            'Croissant Butter',

          quantity:
            1,

          unitPrice:
            16000,

          totalPrice:
            16000,

          addons:
            [],

          note:
            null,
        },
      ],
    };

    const transporter =
      createMailer();

    await transporter.verify();

    const info =
      await transporter.sendMail({
        from:
          getMailSender(),

        to:
          recipient,

        replyTo:
          process.env.EMAIL_REPLY_TO ||
          undefined,

        subject:
          `Struk ${dummyReceipt.orderCode} - ${dummyReceipt.storeName}`,

        html:
          buildReceiptEmailHtml(
            dummyReceipt,
          ),

        text:
          [
            dummyReceipt.storeName,
            `Order: ${dummyReceipt.orderCode}`,
            `Pelanggan: ${dummyReceipt.customerName}`,
            `Total: Rp${dummyReceipt.grandTotal.toLocaleString('id-ID')}`,
          ].join(
            '\n',
          ),
      });

    return NextResponse.json({
      success:
        true,

      message:
        'Email struk dummy berhasil dikirim.',

      data: {
        recipient,
        messageId:
          info.messageId,
        orderCode:
          dummyReceipt.orderCode,
      },
    });
  } catch (
    error
  ) {
    console.error(
      '[TEST_RECEIPT_EMAIL_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Gagal mengirim email struk dummy.',
      },
      {
        status:
          500,
      },
    );
  }
}
