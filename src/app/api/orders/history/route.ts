import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, coupon, tableList } from '@/db/schema'; 
import { eq, desc, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID diperlukan' }, { status: 400 });
  }

  try {
    const userOrders = await db.select({
        id: orders.id,
        order_code: orders.order_code,
        total_price: orders.total_price,
        total_after_discount: orders.totalAfterDiscount,
        discount: orders.discount,
        discount_id: orders.discountId,
        status: orders.status,
        created_at: orders.createdAt,
        coupon_code: coupon.coupon_code,
        table_name: tableList.table_name 
      })
      .from(orders)
      .leftJoin(coupon, eq(orders.discountId, coupon.id)) 
      .leftJoin(tableList, eq(orders.table_number, tableList.id)) 
      .where(eq(orders.user_id, Number(userId)))
      .orderBy(asc(orders.createdAt));

    const historyWithItems = await Promise.all(userOrders.map(async (order) => {
      const items = await db.select()
        .from(orderItems)
        .where(eq(orderItems.order_id, order.id));
      
      const itemsWithParsedNotes = items.map(item => {
        let parsedAddOns: any[] = [];
        console.log(item.notes);
        
        if (item.notes) {
          // 1. Jika tipe datanya masih String (misal dari kolom varchar/text)
          if (typeof item.notes === 'string') {
            if (item.notes !== "[]" && item.notes !== "") {
              try {
                parsedAddOns = JSON.parse(item.notes); 
              } catch (e) {
                console.error(`Gagal parse notes untuk item ID ${item.id}`);
              }
            }
          } 
          // 2. Jika Drizzle SUDAH otomatis mem-parsingnya menjadi Object/Array (tipe kolom json)
          else if (typeof item.notes === 'object') {
            parsedAddOns = item.notes as any[];
          }
        }

        return {
          ...item,
          selectedAddOnsDetails: parsedAddOns
        };
      });

      return {
        ...order,
        items: itemsWithParsedNotes
      };
    }));

    return NextResponse.json({ success: true, data: historyWithItems });
  } catch (error) {
    console.error("Error fetching order history:", error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil riwayat' }, { status: 500 });
  }
}