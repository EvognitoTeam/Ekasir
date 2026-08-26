import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tableList, orders, reservations } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    // 1. Await params sesuai standar Next.js terbaru
    const resolvedParams = await params;
    const tableId = parseInt(resolvedParams.tableId, 10);
    
    if (!Number.isFinite(tableId)) {
      return NextResponse.json({ success: false, message: 'Invalid table ID' }, { status: 400 });
    }

    // 2. Ambil status meja dari table_list
    const [tableInfo] = await db
      .select({ status: tableList.status })
      .from(tableList)
      .where(eq(tableList.id, tableId))
      .limit(1);

    const currentStatusInt = tableInfo?.status ?? 1;
    const statusMap = ["disabled", "available", "occupied", "reserved"];
    
    let orderCode = "";
    let customerName = "";

    // 3. Jika Occupied (2), ambil detail pesanan terakhir
    if (currentStatusInt === 2) {
      const [activeOrder] = await db
        .select({
          order_code: orders.order_code,
          customer_name: orders.name
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
          arrival_time: reservations.reserved_start
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
      status: statusMap[currentStatusInt], // "available", "occupied", dll
      order_code: orderCode,
      customer_name: customerName
    });

  } catch (error) {
    console.error('[API_IOT_STATUS_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}