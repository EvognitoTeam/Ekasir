import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tableDevice, tableList, orders, reservations } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hex_id, secret_key } = body;

    if (!hex_id || !secret_key) {
      return NextResponse.json(
        { success: false, message: 'hex_id dan secret_key wajib dikirim.' },
        { status: 400 }
      );
    }

    // 1. Validasi perangkat di tabel table_device
    const [device] = await db
      .select({
        tableId: tableDevice.table_id,
        deviceStatus: tableDevice.status,
      })
      .from(tableDevice)
      .where(
        and(
          eq(tableDevice.hex_id, hex_id),
          eq(tableDevice.secret_key, secret_key),
          eq(tableDevice.status, 'active')
        )
      )
      .limit(1);

    if (!device || !device.tableId) {
      return NextResponse.json(
        { success: false, message: 'Perangkat tidak terdaftar atau tidak aktif.' },
        { status: 401 }
      );
    }

    const tableId = device.tableId;

    // 2. Ambil status operasional meja dari table_list
    const [tableInfo] = await db
      .select({ status: tableList.status })
      .from(tableList)
      .where(eq(tableList.id, tableId))
      .limit(1);

    const currentStatusInt = tableInfo?.status ?? 1;
    const statusMap = ["disabled", "available", "occupied", "reserved"];

    let orderCode = "";
    let customerName = "";

    // 3. Jika Occupied (2), ambil detail pesanan aktif
    if (currentStatusInt === 2) {
      const [activeOrder] = await db
        .select({
          order_code: orders.order_code,
          customer_name: orders.name,
        })
        .from(orders)
        .where(eq(orders.table_number, tableId))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      if (activeOrder) {
        orderCode = activeOrder.order_code || "";
        customerName = activeOrder.customer_name || "Tamu Umum";
      }
    } 
    // 4. Jika Reserved (3), ambil detail reservasi
    else if (currentStatusInt === 3) {
      const [upcomingRes] = await db
        .select({
          customer_name: reservations.customer_name,
          arrival_time: reservations.reserved_start,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.table_id, tableId),
            eq(reservations.status, 'pending')
          )
        )
        .orderBy(asc(reservations.reserved_start))
        .limit(1);

      if (upcomingRes) {
        customerName = `${upcomingRes.customer_name} (${upcomingRes.arrival_time})`;
      } else {
        customerName = "Belum ada tamu";
      }
    }

    return NextResponse.json({
      success: true,
      table_id: tableId,
      status: statusMap[currentStatusInt], // "available", "occupied", dll
      order_code: orderCode,
      customer_name: customerName,
    });

  } catch (error) {
    console.error('[API_IOT_DEVICES_ERROR]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}