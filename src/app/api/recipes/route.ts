import { NextResponse } from 'next/server';
import { db } from '@/db';
import { productRecipes, products, materials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return NextResponse.json({ success: false }, { status: 401 });
  
  const verified = await jwtVerify(token, SECRET_KEY);
  const mitraId = Number(verified.payload.mitraId);

  // Join untuk mendapatkan nama produk & nama bahan
  const data = await db.select({
    id: productRecipes.id,
    productId: productRecipes.product_id,
    materialId: productRecipes.material_id,
    amountNeeded: productRecipes.amount_needed,
    productName: products.name,
    materialName: materials.name,
    unit: materials.unit
  })
  .from(productRecipes)
  .leftJoin(products, eq(productRecipes.product_id, products.id))
  .leftJoin(materials, eq(productRecipes.material_id, materials.id))
  .where(eq(productRecipes.mitra_id, mitraId));

//   console.log("DEBUG DATA DARI DB:", data); // 🔴 LIHAT DI TERMINAL VS CODE

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return NextResponse.json({ success: false }, { status: 401 });
  
  const verified = await jwtVerify(token, SECRET_KEY);
  const mitraId = Number(verified.payload.mitraId);

  await db.insert(productRecipes).values({
    mitra_id: mitraId,
    product_id: body.productId,
    material_id: body.materialId,
    amount_needed: body.amount
  });

  return NextResponse.json({ success: true });
}