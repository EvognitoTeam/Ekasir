import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, coupon, tableList, mitra } from '@/db/schema'; 
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const slug = searchParams.get('slug');

  if (!userId && !slug) {
    return NextResponse.json({ success: false, message: 'User ID atau Slug Toko diperlukan' }, { status: 400 });
  }

  try {
    let queryCondition;

    // 1. Kondisi jika yang hit API adalah aplikasi Kasir (pakai slug)
    if (slug) {
      const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
      if (foundMitra.length === 0) {
        return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
      }
      queryCondition = eq(orders.mitra_id, foundMitra[0].id);
    } 
    // 2. Kondisi jika yang hit API adalah app Pelanggan (pakai userId)
    else if (userId) {
      queryCondition = eq(orders.user_id, Number(userId));
    }

    const userOrders = await db.select({
        id: orders.id,
        order_code: orders.order_code,
        total_price: orders.total_price,
        totalPrice: orders.total_price, // Alias camelCase untuk Kasir
        total_after_discount: orders.totalAfterDiscount,
        discount: orders.discount,
        discount_id: orders.discountId,
        status: orders.status,
        createdAt: orders.createdAt,    // Alias camelCase untuk Kasir
        created_at: orders.createdAt,
        coupon_code: coupon.coupon_code,
        table_name: tableList.table_name,
        table_number: orders.table_number,
        paymentStatus: orders.payment_status,
        paymentMethod: orders.payment_method,
        customerName: orders.name, // Lempar nama customer biar kasir bisa panggil
      })
      .from(orders)
      .leftJoin(coupon, eq(orders.discountId, coupon.id)) 
      .leftJoin(tableList, eq(orders.table_number, tableList.id)) 
      .where(queryCondition)
      .orderBy(desc(orders.createdAt)); // Orderan terbaru tampil duluan

    const historyWithItems = await Promise.all(userOrders.map(async (order) => {
      const items = await db.select()
        .from(orderItems)
        .where(eq(orderItems.order_id, order.id));
      
      const itemsWithParsedNotes = items.map(item => {
        let parsedAddOns: any[] = [];
        
        if (item.notes) {
          // Jika masih string (misal lolos dari driver Drizzle)
          if (typeof item.notes === 'string') {
            if (item.notes !== "[]" && item.notes !== "") {
              try {
                parsedAddOns = JSON.parse(item.notes); 
              } catch (e) {
                console.error(`Gagal parse notes untuk item ID ${item.id}`);
              }
            }
          } 
          // Jika Drizzle sudah nge-parse JSON-nya secara native
          else if (typeof item.notes === 'object') {
            parsedAddOns = item.notes as any;
            if (!Array.isArray(parsedAddOns)) parsedAddOns = [parsedAddOns];
          }
        }

        return {
          ...item,
          // 🔴 Alias Penting: Ganti product_id dari DB jadi menuItemId sesuai kebutuhan frontend Kasir
          menuItemId: String(item.product_id), 
          selectedAddOnsDetails: parsedAddOns
        };
      });

      return {
        ...order,
        // 🔴 Spoofing Data: Mengakali kolom yang nggak ada di database
        orderType: order.table_number ? 'dine-in' : 'takeaway', 
        adminNotes: '', 
        items: itemsWithParsedNotes
      };
    }));

    return NextResponse.json({ success: true, data: historyWithItems });
  } catch (error) {
    console.error("Error fetching order history:", error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data pesanan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, message: 'Slug Toko diperlukan' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, adminNotes } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'ID Pesanan diperlukan' }, { status: 400 });
    }

    // 1. Siapkan keranjang data yang mau di-update
    const updateData: any = {
      updatedAt: new Date()
    };

    // 2. Update status order (kalau ada)
    if (status) {
      updateData.status = status;
    }
    
    // 3. Update status pembayaran (kalau ada)
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    // 🔴 4. BARU: Simpan catatan kasir ke database
    if (adminNotes !== undefined) { 
      // Kita pakai !== undefined supaya kalau kasir ngehapus catatannya (ngirim string kosong ""), tetep ke-save jadi kosong.
      updateData.admin_notes = adminNotes;
    }

    // Eksekusi Update ke Database MySQL
    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, Number(orderId)));

    return NextResponse.json({ 
      success: true, 
      message: 'Data pesanan berhasil diperbarui' 
    });

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan internal saat memperbarui pesanan' 
    }, { status: 500 });
  }
}