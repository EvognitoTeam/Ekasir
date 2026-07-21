import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
// 🔴 Sesuaikan import schema lu, misal tabel 'transactions' atau 'subscriptions'
import { orders } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // 1. Ambil payload dari Midtrans
    const body = await request.json();

    const {
      order_id,
      transaction_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = body;

    // 2. VALIDASI KEAMANAN (SIGNATURE KEY) - JANGAN DI-SKIP!
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''; // Ambil dari .env
    
    // Midtrans rule: SHA512(order_id + status_code + gross_amount + ServerKey)
    const rawString = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const hashedKey = crypto.createHash('sha512').update(rawString).digest('hex');

    // Kalau hasil hash beda sama yang dikirim Midtrans, TENDANG!
    if (hashedKey !== signature_key) {
      console.error(`🚨 ALERT: Fake Midtrans notification for Order ${order_id}!`);
      return NextResponse.json({ message: 'Invalid Signature' }, { status: 403 });
    }

    // 3. TRANSLATE STATUS TRANSAKSI MIDTRANS
    let paymentStatus: '1' | '2' | '3' | '4' = '1';

    if (transaction_status === 'capture') {
      if (fraud_status === 'challenge') {
        paymentStatus = '4';
      } else if (fraud_status === 'accept') {
        paymentStatus = '2';
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = '2'; // Ini yang paling sering dipakai (LUNAS)
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      paymentStatus = '3';
    } else if (transaction_status === 'pending') {
      paymentStatus = '1';
    }

    // 4. UPDATE DATABASE MENGGUNAKAN DRIZZLE
    // Cari transaksi berdasarkan order_id dan update statusnya
    await db.update(orders)
      .set({ 
        payment_status: paymentStatus,
        updatedAt: new Date() // Opsional: catat waktu update
      })
      .where(eq(orders.transaction_id, transaction_id));

    console.log(`✅ Order ${order_id} berhasil diupdate menjadi: ${paymentStatus}`);

    // 5. KASIH RESPONSE 200 OK KE MIDTRANS
    // Ini wajib, kalau nggak, Midtrans bakal ngirim notifikasi ini terus-terusan
    return NextResponse.json({ success: true, message: 'Notification Processed' });

  } catch (error) {
    console.error("Midtrans Webhook Error:", error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}