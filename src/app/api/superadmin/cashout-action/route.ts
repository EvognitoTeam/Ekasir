import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cashouts, orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

export async function POST(request: Request) {
  try {
    // 1. Verifikasi Superadmin
    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (String(payload.role).toLowerCase() !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 2. Ambil payload body
    const { id, action } = await request.json();
    if (!id || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 });
    }

    // 3. Eksekusi Database dalam Transaksi
    await db.transaction(async (tx) => {
      // Update tabel cashout
      await tx
        .update(cashouts)
        .set({ status: action, updatedAt: new Date() })
        .where(eq(cashouts.id, id));

      // LOGIKA ROLLBACK PENTING: Jika ditolak, order dikembalikan ke status belum dicairkan!
      if (action === 'rejected') {
        await tx
          .update(orders)
          .set({ 
            is_cashouted: false, 
            cashout_id: null, // Lepaskan ikatan relasi id cashout
            time_cashout: null 
          })
          .where(eq(orders.cashout_id, id));
      }
    });

    return NextResponse.json({ success: true, message: `Cashout berhasil di-${action}` });
  } catch (error) {
    console.error('[CASHOUT_ACTION_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}