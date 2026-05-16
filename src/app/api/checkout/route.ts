import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, mitra, tableList } from '@/db/schema'; // Pastikan path schema sudah benar
import { eq, and } from 'drizzle-orm';

// Helper: Generate 6 Karakter Acak (A-Z, 0-9)
function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      total, 
      discount,
      totalAfterDiscount,
      customer, 
      cartItems, 
      discountId,
      slug 
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    // 1. Cari Mitra ID
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    const mitraId = foundMitra[0].id;
    const generatedCode = generateOrderCode();

    // 2. TRANSAKSI DATABASE: Tahap Pertama (Simpan Order & Items)
    const result = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;

      if (customer.tableNumber && customer.tableNumber !== 'Walk-in') {
        const foundTable = await tx.select()
          .from(tableList)
          .where(
            and(
              eq(tableList.mitra_id, mitraId),
              eq(tableList.table_code, customer.tableNumber) // Mencocokkan 'T-01' dengan ID-nya
            )
          )
          .limit(1);
        
        if (foundTable.length > 0) {
          finalTableId = foundTable[0].id; // Ambil ID (integer)
        }
      }

      const [orderResult] = await tx.insert(orders).values({
        order_code: generatedCode,
        mitra_id: mitraId,
        user_id: customer.userId || null,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone,
        table_number: finalTableId,
        total_price: total,
        discount: discount || 0,
        totalAfterDiscount: totalAfterDiscount,
        payment_method: customer.method,
        discountId: discountId || null,
        payment_status: "1", // 1 = Pending
      });

      const newOrderId = orderResult.insertId;

      const itemsToInsert = cartItems.map((item: any) => ({
        order_id: newOrderId,
        product_id: item.menuItemId,
        mitra_id: mitraId,
        quantity: item.quantity,
        notes: JSON.stringify(item.selectedAddOnsDetails || []),
        price: item.priceAtOrder,
        createdAt: new Date(),
      }));

      await tx.insert(orderItems).values(itemsToInsert);
      return { id: newOrderId, code: generatedCode };
    });

    // 3. JIKA METODE QRIS: Hubungi Midtrans & Update Data Transaksi
    if (customer.method === 'qris') {
      const apiUrl = isProd
        ? 'https://api.midtrans.com/v2/charge'
        : 'https://api.sandbox.midtrans.com/v2/charge';

      const authString = Buffer.from(`${serverKey}:`).toString('base64');

      const payload = {
        payment_type: "qris",
        transaction_details: {
          order_id: `${result.code}-${Date.now()}`, // Gabungan kode agar unik di sistem Midtrans
          gross_amount: Math.round(totalAfterDiscount),
        },
        customer_details: {
          first_name: customer.name,
          email: customer.email,
          phone: customer.phone,
        }
      };

      const midtransRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify(payload)
      });

      const data = await midtransRes.json();

      // console.log(data);

      if (data.status_code === "201") {
        const qrAction = data.actions?.find((a: any) => a.name === 'generate-qr-code-v2');
        
        // 🔴 UPDATE TABEL ORDERS DENGAN DATA DARI MIDTRANS
        await db.update(orders)
          .set({
            transaction_id: data.transaction_id,
            payment_type: data.payment_type,
            issuer: data.acquirer || null, // acquirer biasanya berisi gopay/shopeepay dll
            qr_url: qrAction?.url,
            qr_string: data.qr_string,
            expiry_time: data.expiry_time ? new Date(data.expiry_time) : null,
            updatedAt: new Date(),
          })
          .where(eq(orders.order_code, result.code));

        return NextResponse.json({ 
          success: true, 
          qrUrl: qrAction?.url,
          orderId: result.id,
          orderCode: result.code,
          expiryTime: data.expiry_time
        });
      } else {
        // Jika Midtrans gagal, kita mungkin ingin menghapus order yang terlanjur dibuat atau menandainya error
        console.error("Midtrans Charge Failed:", data);
        return NextResponse.json({ success: false, message: 'Midtrans gagal memproses QRIS' }, { status: 400 });
      }
    }

    // 4. JIKA METODE CASH
    return NextResponse.json({ 
      success: true, 
      message: 'Pesanan berhasil dibuat (Cash)',
      orderId: result.id,
      orderCode: result.code 
    });

  } catch (error) {
    console.error("Checkout Transaction Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}