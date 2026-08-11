import { NextResponse } from 'next/server';
import { db } from '@/db';
// 🔴 Import table_list (sesuaikan nama export-nya di schema.ts kamu)
import { orders, tableList } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, message: 'Code required' }, { status: 400 });
  }

  try {
    // 🔴 MELAKUKAN JOIN KE TABLE_LIST
    const result = await db
      .select({
        id: orders.id,
        order_code: orders.order_code,
        status: orders.status,
        payment_status: orders.payment_status,
        payment_method: orders.payment_method,
        table_number: orders.table_number, // ID meja yang disimpan di order
        // Ambil nama asli meja dari table_list
        table_name: tableList.table_name, 
      })
      .from(orders)
      // 🔴 Join: orders.tableNumber berelasi dengan tableList.id
      .leftJoin(tableList, eq(orders.table_number, tableList.id))
      .where(eq(orders.order_code, code))
      .limit(1);
      // console.log(result);
    
    if (result.length > 0) {
      // Karena result adalah array (limit 1), kita kirim objek pertama
      return NextResponse.json({ success: true, data: result });
    }
    
    return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
  } catch (error) {
    console.error("Tracking API Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}