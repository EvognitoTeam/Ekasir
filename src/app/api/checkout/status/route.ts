import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderCode = searchParams.get('orderCode');

  if (!orderCode) {
    return NextResponse.json({ success: false, message: 'Missing Order Code' }, { status: 400 });
  }

  try {
    const result = await db.select({
      status: orders.payment_status
    })
    .from(orders)
    .where(eq(orders.order_code, orderCode))
    .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      paymentStatus: result[0].status // Nilai 1 (Pending), 2 (Paid), 3 (Failed)
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}