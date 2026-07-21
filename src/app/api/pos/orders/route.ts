import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, mitra, tableList, settings } from '@/db/schema'; 
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// Helper Auth
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

export async function POST(request: Request) {
  try {
    // 🔴 1. Ambil Auth Payload
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { 
      total, discount, totalAfterDiscount, customer, cartItems, discountId, cashierId, branch_id 
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    const mitraId = Number(payload.mitraId);
    
    // Kasir/Kitchen selalu memakai cabang dari sesi, termasuk outlet utama (branchId null).
    // Owner/User boleh memakai branch_id dari request karena dapat membuat pesanan untuk outlet yang dipilih.
    const normalizedRole = String(payload.role || '').toLowerCase();
    const isBranchScopedStaff = normalizedRole === 'cashier' || normalizedRole === 'kitchen';
    const finalBranchId = isBranchScopedStaff
      ? (payload.branchId == null ? null : Number(payload.branchId))
      : (branch_id == null || branch_id === '' ? null : Number(branch_id));

    const foundSettings = await db.select().from(settings)
      .where(and(eq(settings.mitraId, mitraId), finalBranchId ? eq(settings.branch_id, finalBranchId) : undefined))
      .limit(1);
    const set = foundSettings[0] || { taxRate: 0, serviceRate: 0, isTaxIncluded: 0 };

    const subTotal = Math.floor(Number(totalAfterDiscount) || 0);
    let tax = 0;
    let service = 0;
    let finalGrandTotal = 0;

    if (set.isTaxIncluded === 1) {
        const sRate = Number(set.serviceRate) / 100;
        const tRate = Number(set.taxRate) / 100;
        const trueBase = Math.floor(subTotal / ((1 + sRate) * (1 + tRate)));
        service = Math.floor(trueBase * sRate);
        tax = subTotal - trueBase - service;
        finalGrandTotal = subTotal;
    } else {
        service = Math.floor(subTotal * (Number(set.serviceRate) / 100));
        tax = Math.floor((subTotal + service) * (Number(set.taxRate) / 100));
        finalGrandTotal = subTotal + service + tax;
    }

    const generatedCode = generateOrderCode();
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;
      let manualInfo: string | null = null;

      if (customer.tableNumber && customer.tableNumber !== 'Walk-in') {
        const tableConditions = [eq(tableList.mitra_id, mitraId), eq(tableList.table_code, customer.tableNumber)];
        if (finalBranchId) tableConditions.push(eq(tableList.branch_id, finalBranchId)); // Pengecekan meja per cabang

        const foundTable = await tx.select().from(tableList).where(and(...tableConditions)).limit(1);
        if (foundTable.length > 0) finalTableId = foundTable[0].id;
        else manualInfo = customer.tableNumber;
      }

      const [orderResult] = await tx.insert(orders).values({
        order_code: generatedCode,
        mitra_id: mitraId,
        branch_id: finalBranchId, // 🔴 Masukkan branch_id
        cashier_id: cashierId || null,
        user_id: customer.userId || null,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone,
        table_number: finalTableId,
        manual_table_info: manualInfo,
        total_price: String(Math.floor(Number(total))),
        discount: String(Math.floor(Number(discount) || 0)),
        tax: String(tax),
        service: String(service),
        totalAfterDiscount: String(finalGrandTotal),
        payment_method: customer.method,
        discountId: discountId || null,
        status: "pending", 
        payment_status: "1",
        createdAt: now, 
        updatedAt: now, 
      });

      const newOrderId = orderResult.insertId;
      const itemsToInsert = cartItems.map((item: any) => ({
        order_id: newOrderId,
        product_id: item.menuItemId,
        mitra_id: mitraId,
        branch_id: finalBranchId, // 🔴 Masukkan branch_id
        quantity: item.quantity,
        notes: JSON.stringify(item.selectedAddOnsDetails || []),
        price: String(Math.floor(Number(item.priceAtOrder) || 0)),
        createdAt: now,
      }));

      await tx.insert(orderItems).values(itemsToInsert);
      return { id: newOrderId, code: generatedCode };
    });

    // 4. Proses Midtrans (jika QRIS)
    if (customer.method === 'qris') {
      const apiUrl = isProd ? 'https://api.midtrans.com/v2/charge' : 'https://api.sandbox.midtrans.com/v2/charge';
      const authString = Buffer.from(`${serverKey}:`).toString('base64');

      // 🔴 Siapkan Array item_details untuk Midtrans
      const midtransItems = cartItems.map((item: any) => ({
        id: String(item.menuItemId).substring(0, 50),
        price: Math.floor(Number(item.priceAtOrder) || 0),
        quantity: Number(item.quantity) || 1,
        // Potong nama maksimal 50 karakter agar Midtrans tidak error
        name: String(item.name || item.title || `Menu Item ${item.menuItemId}`).substring(0, 50) 
      }));

      // Tambahkan item "Diskon" jika ada (Format minus dibolehkan oleh Midtrans)
      if (Number(discount) > 0) {
        midtransItems.push({
          id: 'DISC',
          price: -Math.floor(Number(discount)),
          quantity: 1,
          name: 'Discount/Promo'
        });
      }

      // Tambahkan item "Pajak" dan "Service" HANYA jika Exclude Tax (Ditambahkan di akhir)
      if (set.isTaxIncluded === 0) {
        if (service > 0) {
          midtransItems.push({ id: 'SRV', price: service, quantity: 1, name: 'Service Charge' });
        }
        if (tax > 0) {
          midtransItems.push({ id: 'TAX', price: tax, quantity: 1, name: 'Tax / PB1' });
        }
      }

      // 🔴 VALIDASI & PENYEIMBANG (SANGAT PENTING!)
      // Midtrans menolak jika (total price * qty) dari items tidak sama dengan gross_amount.
      const calculatedSum = midtransItems.reduce((sum: number, item: { price: number; quantity: number; }) => sum + (item.price * item.quantity), 0);
      
      if (calculatedSum !== finalGrandTotal) {
         const diff = finalGrandTotal - calculatedSum;
         midtransItems.push({
            id: 'ADJ',
            price: diff,
            quantity: 1,
            name: 'Rounding Adjustment' // Item siluman penyerap selisih pembulatan
         });
      }

      const midtransRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${authString}` },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: {
            order_id: `${result.code}-${Date.now()}`,
            gross_amount: finalGrandTotal, 
          },
          item_details: midtransItems, // 🔴 Lempar list item ke Midtrans
          customer_details: { first_name: customer.name, email: customer.email, phone: customer.phone }
        })
      });

      const data = await midtransRes.json();
      if (data.status_code === "201") {
        const qrAction = data.actions?.find((a: any) => a.name === 'generate-qr-code-v2');
        await db.update(orders).set({
          transaction_id: data.transaction_id,
          qr_url: qrAction?.url,
          qr_string: data.qr_string,
          expiry_time: data.expiry_time ? new Date(data.expiry_time) : null,
          updatedAt: new Date(), 
        }).where(eq(orders.id, result.id));

        return NextResponse.json({ success: true, qrUrl: qrAction?.url, orderId: result.id, orderCode: result.code, expiryTime: data.expiry_time });
      }
      return NextResponse.json({ success: false, message: 'Midtrans gagal memproses QRIS' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Pesanan berhasil dibuat', orderId: result.id, orderCode: result.code });

  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}