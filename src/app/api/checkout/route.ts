import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, mitra, tableList, settings, products, users } from '@/db/schema'; 
import { eq, and, inArray } from 'drizzle-orm';

// Helper: Generate 6 Karakter Acak (A-Z, 0-9)
function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      total, // subtotal sebelum diskon
      discount,
      totalAfterDiscount, // total bersih dari frontend
      customer, 
      cartItems, 
      discountId,
      slug,
      cashierId
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    // 1. Ambil data Mitra dan Setting Pajak dari DB
    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const mitraId = foundMitra[0].id;

    const foundSettings = await db.select().from(settings).where(eq(settings.mitraId, mitraId)).limit(1);
    const set = foundSettings[0] || { taxRate: 0, serviceRate: 0, isTaxIncluded: 0 };

    if (cashierId) {
      const checkCashier = await db.select()
        .from(users)
        .where(eq(users.id, Number(cashierId)))
        .limit(1);

      if (checkCashier.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Sesi Kasir tidak valid atau tidak ditemukan di database.' 
        }, { status: 401 });
      }
    }

    // 2. Perhitungan Pajak & Service di Backend
    const basePrice = Math.floor(Number(total) || 0); 
    const discountVal = Math.floor(Number(discount) || 0);
    const subTotal = basePrice - discountVal; 

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

    const frontendTotal = Math.floor(Number(totalAfterDiscount) || 0);
    if (finalGrandTotal !== frontendTotal) {
      console.error(`Mismatch Alert! Backend: ${finalGrandTotal} vs Frontend: ${frontendTotal}`);
      return NextResponse.json({ 
        success: false, 
        message: 'Terjadi ketidaksesuaian harga (Indikasi manipulasi data). Silakan muat ulang halaman.' 
      }, { status: 400 });
    }

    const generatedCode = generateOrderCode();
    const now = new Date();

    // 3. Transaksi Database
    const result = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;
      let manualInfo: string | null = null;

      if (customer.tableNumber && customer.tableNumber !== 'Walk-in') {
        const foundTable = await tx.select().from(tableList)
          .where(and(eq(tableList.mitra_id, mitraId), eq(tableList.table_code, customer.tableNumber))).limit(1);
        if (foundTable.length > 0) {
            finalTableId = foundTable[0].id;
        } else {
            manualInfo = customer.tableNumber;
        }
      }

      const [orderResult] = await tx.insert(orders).values({
        order_code: generatedCode,
        mitra_id: mitraId,
        user_id: customer.userId || null,
        cashier_id: cashierId ? Number(cashierId) : null,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone,
        table_number: finalTableId,
        manual_table_info: manualInfo,
        total_price: String(Math.floor(Number(total))),
        discount: String(discountVal),
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

      // 🔴 2. AMBIL NAMA PRODUK DARI DATABASE SEBELUM KE MIDTRANS
      const productIds = cartItems.map((item: any) => Number(item.menuItemId));
      const productNameMap = new Map();
      
      if (productIds.length > 0) {
        const productsData = await db.select({ 
            id: products.id, 
            name: products.name 
          })
          .from(products)
          .where(inArray(products.id, productIds));
          
        // 🔴 KUNCI PERBAIKAN 1: SET SEBAGAI STRING
        productsData.forEach(p => productNameMap.set(String(p.id), p.name));
      }

      // 🔴 3. Mapping Item Details (Sekarang pasti match dengan DB)
      const midtransItems = cartItems.map((item: any) => {
        // 🔴 KUNCI PERBAIKAN 2: GET SEBAGAI STRING
        const dbProductName = productNameMap.get(String(item.menuItemId)); 
        
        return {
          id: String(item.menuItemId).substring(0, 50),
          price: Math.floor(Number(item.priceAtOrder) || 0),
          quantity: Number(item.quantity) || 1,
          // 🔴 KUNCI PERBAIKAN 3: PRIORITASKAN NAMA DARI DB
          name: String(dbProductName || item.name || item.title || `Item ${item.menuItemId}`).substring(0, 50)
        };
      });

      // Diskon
      if (discountVal > 0) {
        midtransItems.push({
          id: 'DISC',
          price: -discountVal,
          quantity: 1,
          name: 'Discount/Promo'
        });
      }

      // Tax & Service jika Exclude
      if (set.isTaxIncluded === 0) {
        if (service > 0) midtransItems.push({ id: 'SRV', price: service, quantity: 1, name: 'Service Charge' });
        if (tax > 0) midtransItems.push({ id: 'TAX', price: tax, quantity: 1, name: 'Tax / PB1' });
      }

      // Validasi Penyeimbang
      const calculatedSum = midtransItems.reduce((sum: number, item: { price: number; quantity: number; }) => sum + (item.price * item.quantity), 0);
      if (calculatedSum !== finalGrandTotal) {
         const diff = finalGrandTotal - calculatedSum;
         midtransItems.push({
            id: 'ADJ',
            price: diff,
            quantity: 1,
            name: 'Rounding Adjustment'
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
          item_details: midtransItems,
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
        }).where(eq(orders.order_code, result.code));

        return NextResponse.json({ success: true, qrUrl: qrAction?.url, orderId: result.id, orderCode: result.code, expiryTime: data.expiry_time });
      }
      return NextResponse.json({ success: false, message: 'Midtrans gagal' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Pesanan dibuat (Cash)', orderId: result.id, orderCode: result.code });

  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}