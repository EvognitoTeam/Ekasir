import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, mitra, tableList } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug Toko diperlukan' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, table_number, orderType, paymentMethod, items, subtotal, totalPrice } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    // 1. Cari Mitra ID
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    }
    const mitraId = foundMitra[0].id;
    const generatedCode = generateOrderCode();

    // 2. TRANSAKSI DATABASE: Simpan Order & Items (Drizzle Transaction)
    const result = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;

      // Logika Relasi Meja
      if (table_number) {
        // Cek apakah inputan adalah angka (ID) atau string manual (Pager)
        const isNumericId = !isNaN(Number(table_number));

        if (isNumericId) {
            // Coba cari berdasarkan ID (jika kasir pilih dari dropdown)
            const foundTable = await tx.select()
            .from(tableList)
            .where(and(eq(tableList.mitra_id, mitraId), eq(tableList.id, Number(table_number))))
            .limit(1);
            
            if (foundTable.length > 0) {
            finalTableId = foundTable[0].id;
            } else {
            // Jika ternyata angka itu bukan ID meja tapi nomor manual, simpan sebagai string/info
            // Lu bisa tambah kolom 'manual_table_info' di schema orders lu kalau mau
            }
        }
        }

      const [orderResult] = await tx.insert(orders).values({
        order_code: generatedCode,
        mitra_id: mitraId,
        user_id: null, 
        name: name || 'Tamu Kasir',
        table_number: finalTableId,
        status: 'confirmed', 
        is_cashouted: false,
        total_price: String(totalPrice),
        discount: "0", // 🔴 Perbaikan: Harus string karena tipe schema adalah decimal
        totalAfterDiscount: String(totalPrice), 
        payment_method: paymentMethod || 'cash',
        payment_status: paymentMethod === 'qris' ? '1' : '2', 
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newOrderId = orderResult.insertId;

      if (items && items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          order_id: newOrderId,
          product_id: Number(item.menuItemId),
          mitra_id: mitraId,
          quantity: item.quantity,
          notes: item.notes || "",
          price: String(item.price),
          createdAt: new Date(), // 🔴 Perbaikan: Pakai key camelCase sesuai schema.ts (createdAt)
        }));
        await tx.insert(orderItems).values(itemsToInsert);
      }

      return { id: newOrderId, code: generatedCode };
    });

    // 3. JIKA METODE QRIS: Hubungi Midtrans 
    if (paymentMethod === 'qris') {
      const apiUrl = isProd
        ? 'https://api.midtrans.com/v2/charge'
        : 'https://api.sandbox.midtrans.com/v2/charge';

      const authString = Buffer.from(`${serverKey}:`).toString('base64');

      const payload = {
        payment_type: "qris",
        transaction_details: {
          order_id: `${result.code}-${Date.now()}`, 
          gross_amount: Math.round(totalPrice),
        },
        customer_details: {
          first_name: name || 'Tamu Kasir POS',
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

      if (data.status_code === "201") {
        const qrAction = data.actions?.find((a: any) => a.name === 'generate-qr-code-v2');
        
        // UPDATE TABEL ORDERS DENGAN DATA DARI MIDTRANS
        await db.update(orders)
          .set({
            transaction_id: data.transaction_id,
            payment_type: data.payment_type,
            issuer: data.acquirer || null, 
            qr_url: qrAction?.url,
            qr_string: data.qr_string,
            expiry_time: data.expiry_time ? new Date(data.expiry_time) : null,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, result.id));

        return NextResponse.json({ 
          success: true, 
          message: 'Pesanan QRIS berhasil dibuat',
          data: {
            id: result.id,
            order_code: result.code,
            payment_status: '1',
            qr_url: qrAction?.url,
            expiryTime: data.expiry_time
          }
        });
      } else {
        console.error("Midtrans POS Charge Failed:", data);
        return NextResponse.json({ success: false, message: 'Gagal memproses QRIS Kasir' }, { status: 400 });
      }
    }

    // 4. JIKA METODE CASH
    return NextResponse.json({ 
      success: true, 
      message: 'Pesanan Tunai berhasil dibuat',
      data: {
        id: result.id,
        order_code: result.code,
        payment_status: '2',
      }
    });

  } catch (error) {
    console.error("POS Transaction Error:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem POS' }, { status: 500 });
  }
}