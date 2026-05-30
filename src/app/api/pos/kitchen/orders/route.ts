import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema'; // 🔴 SESUAIKAN DENGAN NAMA TABEL ORDER LU
import { eq, and, desc, gte } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export const dynamic = 'force-dynamic';

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as any;
  } catch (err) {
    return null;
  }
}

// ─── [GET] AMBIL ORDERAN HARI INI KHUSUS KITCHEN ──────────
export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Ambil orders-nya dulu
    const rawOrders = await db.select()
      .from(orders)
      .where(
          eq(orders.mitra_id, Number(payload.mitraId)),
      )
      .orderBy(desc(orders.createdAt));

    // 2. Gabungkan dengan detail items menggunakan Promise.all
    const historyWithItems = await Promise.all(rawOrders.map(async (order) => {
      // Ambil items + join ke tabel menu buat ambil nama menu-nya
      const items = await db.select({
          id: orderItems.id,
          order_id: orderItems.order_id,
          product_id: orderItems.product_id,
          quantity: orderItems.quantity,
          price: orderItems.price,
          notes: orderItems.notes,
          // 🔴 AMBIL NAMA MENU DARI TABEL MENU
          menu_name: products.name 
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(eq(orderItems.order_id, order.id));
      
      // Parse notes (addons) agar formatnya sesuai dengan Kasir
      const itemsWithParsedNotes = items.map(item => {
        let parsedAddOns: any[] = [];
        if (item.notes) {
          if (typeof item.notes === 'string') {
            try { parsedAddOns = JSON.parse(item.notes); } catch (e) { parsedAddOns = []; }
          } else if (typeof item.notes === 'object') {
            parsedAddOns = Array.isArray(item.notes) ? item.notes : [item.notes];
          }
        }

        return {
          ...item,
          menuItemId: String(item.product_id), // Sesuai kebutuhan KitchenTicket
          name: item.menu_name,               // 🔴 Nama menu sudah masuk di sini
          selectedAddOnsDetails: parsedAddOns
        };
      });

      return {
        ...order,
        orderType: order.table_number ? 'dine-in' : 'takeaway',
        items: itemsWithParsedNotes
      };
    }));

    return NextResponse.json({ success: true, data: historyWithItems });
  } catch (error) {
    console.error("Kitchen GET Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── [PUT] UPDATE STATUS PESANAN DARI KITCHEN ──────────
export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
    }

    await db.update(orders)
      .set({ 
        status: status, 
        updatedAt: new Date() 
      })
      .where(
        and(
          // 🔴 WAJIB NUMBER: Mencegah error tipe data dari Drizzle
          eq(orders.id, Number(orderId)),
          eq(orders.mitra_id, Number(payload.mitraId))
        )
      );

    return NextResponse.json({ success: true, message: 'Status pesanan diperbarui!' });
  } catch (error) {
    console.error("Kitchen PUT Order Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal update status' }, { status: 500 });
  }
}