import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, products, categories, addonCategories, addons, productRecipes } from '@/db/schema'; 
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

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

// ============================================================================
// [GET] AMBIL DATA MENU (Kategori & Addon Global, Produk Per Cabang)
// ============================================================================
export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const reqBranchId = searchParams.get('branch_id'); 

    if (!slug) return NextResponse.json({ success: false, message: 'Slug toko wajib disertakan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Toko tidak ditemukan' }, { status: 404 });

    const currentMitra = foundMitra[0];
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (reqBranchId ? Number(reqBranchId) : null);

    // 🔴 1. Kondisi Khusus Produk (Terikat Cabang)
    const condsProd = [eq(products.mitra_id, currentMitra.id), isNull(products.deletedAt)];
    if (finalBranchId) condsProd.push(eq(products.branch_id, finalBranchId));

    // 🔴 2. TARIK DATA (Kategori & Addon Tanpa Filter Branch)
    const [dbCategories, dbProducts, dbAddonCategories, dbAddons] = await Promise.all([
      db.select().from(categories).where(and(eq(categories.mitra_id, currentMitra.id), isNull(categories.deletedAt))), // GLOBAL
      db.select().from(products).where(and(...condsProd)), // CABANG
      db.select().from(addonCategories).where(eq(addonCategories.mitra_id, currentMitra.id)), // GLOBAL
      db.select().from(addons).where(and(eq(addons.mitra_id, currentMitra.id), isNull(addons.deletedAt))) // GLOBAL
    ]);

    const mappedItems = dbProducts.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      categoryId: p.categories_id.toString(),
      basePrice: p.price,
      isAvailable: p.status === 1,
      image: p.image,
      description: p.description,
      stock: p.stock,
      addonGroups:
        typeof p.addon_id === 'string'
          ? (() => { try { return JSON.parse(p.addon_id); } catch { return []; } })()
          : Array.isArray(p.addon_id) ? p.addon_id : []
    }));

    return NextResponse.json({
      success: true,
      items: mappedItems,
      categories: dbCategories,
      addonCategories: dbAddonCategories,
      addons: dbAddons
    });

  } catch (error) {
    console.error("Fetch Menu Admin API Error:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}

// ============================================================================
// [PUT] UPDATE HARGA & STATUS MENU
// ============================================================================
export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // -- JALUR 1: BACA JSON (Edit Harga / Ketersediaan Menu) --
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { id, isAvailable, basePrice } = body;

      if (!id) return NextResponse.json({ success: false, message: 'ID Menu wajib disertakan' }, { status: 400 });

      const updateData: any = {};
      if (typeof isAvailable === 'boolean') updateData.status = isAvailable ? 1 : 0;
      if (typeof basePrice === 'number') updateData.price = basePrice;

      const conds = [eq(products.id, Number(id)), eq(products.mitra_id, Number(payload.mitraId))];
      if (payload.branchId) conds.push(eq(products.branch_id, Number(payload.branchId)));

      await db.update(products).set(updateData).where(and(...conds));
    } 
    // -- JALUR 2: BACA FORMDATA --
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const entity = formData.get('entity') as string;
      const id = formData.get('id');

      if (!id || !entity) return NextResponse.json({ success: false, message: 'ID dan Entity wajib disertakan' }, { status: 400 });

      // -- A. MENU (PRODUCTS) -> Edit per cabang --
      if (entity === 'menu') {
        const updateData: any = {};
        if (formData.has('name')) updateData.name = formData.get('name') as string;
        if (formData.has('price')) updateData.price = Number(formData.get('price'));
        if (formData.has('stock')) updateData.stock = Number(formData.get('stock'));
        if (formData.has('category_id')) updateData.categories_id = Number(formData.get('category_id'));
        if (formData.has('description')) updateData.description = formData.get('description') as string;
        if (formData.has('addon_id')) {
          try { updateData.addon_id = JSON.parse(formData.get('addon_id') as string); } catch(e) {}
        }
        
        if (formData.has('image')) {
          const file = formData.get('image') as File;
          if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const uploadDir = path.join(process.cwd(), 'public/uploads/menu');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            
            await writeFile(path.join(uploadDir, filename), buffer);
            updateData.image = `uploads/menu/${filename}`; 
          }
        }
        
        await db.transaction(async (tx) => {
          const conds = [eq(products.id, Number(id)), eq(products.mitra_id, Number(payload.mitraId))];
          if (payload.branchId) conds.push(eq(products.branch_id, Number(payload.branchId))); // Spesifik Cabang

          await tx.update(products).set(updateData).where(and(...conds));
        
          if (formData.has('recipes')) {
            const recipeList = JSON.parse(formData.get('recipes') as string);
            await tx.delete(productRecipes).where(eq(productRecipes.product_id, Number(id)));
            if (recipeList.length > 0) {
              await tx.insert(productRecipes).values(recipeList.map((r: any) => ({
                mitra_id: Number(payload.mitraId),
                branch_id: payload.branchId ? Number(payload.branchId) : null,
                product_id: Number(id),
                material_id: Number(r.materialId),
                amount_needed: r.amount.toString()
              })));
            }
          }
        });
      }
      
      // 🔴 B. KATEGORI -> Edit Global (Abaikan Cabang)
      else if (entity === 'category') {
        const name = formData.get('name') as string;
        if (name) {
          const conds = [eq(categories.id, Number(id)), eq(categories.mitra_id, Number(payload.mitraId))];
          await db.update(categories).set({ name }).where(and(...conds));
        }
      }

      // 🔴 C. ADDON -> Edit Global (Abaikan Cabang)
      else if (entity === 'addon') {
        const type = formData.get('type') as string;
        if (type === 'group') {
          const updateData: any = {};
          if (formData.has('name')) updateData.name = formData.get('name') as string;
          if (formData.has('is_required')) updateData.isRequired = Number(formData.get('is_required'));
          if (formData.has('max_selected')) updateData.maxSelected = Number(formData.get('max_selected'));

          const conds = [eq(addonCategories.id, Number(id)), eq(addonCategories.mitra_id, Number(payload.mitraId))];
          await db.update(addonCategories).set(updateData).where(and(...conds));
            
        } else if (type === 'item') {
          const updateData: any = {};
          if (formData.has('name')) updateData.name = formData.get('name') as string;
          if (formData.has('price')) updateData.price = Number(formData.get('price'));
          if (formData.has('category_id')) updateData.category_id = Number(formData.get('category_id'));

          const conds = [eq(addons.id, Number(id)), eq(addons.mitra_id, Number(payload.mitraId))];
          await db.update(addons).set(updateData).where(and(...conds));
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Data berhasil diperbarui' });
  } catch (error) {
    console.error("Update Master Data API Error:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan data' }, { status: 500 });
  }
}

// ============================================================================
// [POST] TAMBAH DATA MASTER BARU
// ============================================================================
export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const entity = formData.get('entity');

    // Tentukan Branch ID (Hanya untuk Menu)
    const inputBranchId = formData.get('branch_id');
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (inputBranchId ? Number(inputBranchId) : null);

    // 🔴 ========================= CATEGORY (Global = NULL)
    if (entity === 'category') {
      await db.insert(categories).values({
        mitra_id: Number(payload.mitraId),
        branch_id: null, // Paksa NULL agar global
        name: formData.get('name') as string,
        createdAt: new Date()
      });
      return NextResponse.json({ success: true });
    }

    // 🔴 ========================= ADDON (Global = NULL)
    if (entity === 'addon') {
      const type = formData.get('type');
      if (type === 'group') {
        await db.insert(addonCategories).values({
          mitra_id: Number(payload.mitraId),
          branch_id: null, // Paksa NULL
          name: formData.get('name') as string,
          isRequired: Number(formData.get('is_required')) || 0,
          maxSelected: Number(formData.get('max_selected')) || 1,
          createdAt: new Date()
        });
        return NextResponse.json({ success: true });
      }

      if (type === 'item') {
        await db.insert(addons).values({
          mitra_id: Number(payload.mitraId),
          branch_id: null, // Paksa NULL
          name: formData.get('name') as string,
          price: String(formData.get('price')),
          category_id: Number(formData.get('category_id')),
          createdAt: new Date()
        });
        return NextResponse.json({ success: true });
      }
    }

    // ========================= MENU / PRODUCTS (Terikat Cabang)
    let imagePath = null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (formData.has('image')) {
      const file = formData.get('image') as File;
      if (!allowedTypes.includes(file.type)) return NextResponse.json({ success: false, message: 'Format gambar tidak didukung' }, { status: 400 });
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ success: false, message: 'Ukuran gambar maksimal 5MB' }, { status: 400 });

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public/uploads/menu');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filename = `${Date.now()}.webp`;
        const compressedImage = await sharp(buffer)
          .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();

        await writeFile(path.join(uploadDir, filename), compressedImage);
        imagePath = `uploads/menu/${filename}`;
      }
    }

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(products)
        .values({
          mitra_id: Number(payload.mitraId),
          branch_id: finalBranchId, // 🔴 Masuk ke spesifik cabang
          name: formData.get('name') as string,
          price: Number(formData.get('price')),
          stock: Number(formData.get('stock')),
          categories_id: Number(formData.get('category_id')),
          description: (formData.get('description') as string) || '',
          image: imagePath,
          status: 1,
          addon_id: JSON.parse((formData.get('addon_id') as string) || '[]'),
          createdAt: new Date()
        })
        .$returningId();

      const productId = inserted[0].id;
      const recipes = JSON.parse((formData.get('recipes') as string) || '[]');

      if (recipes.length > 0) {
        await tx.insert(productRecipes).values(
          recipes.map((r: any) => ({
            mitra_id: Number(payload.mitraId),
            branch_id: finalBranchId, 
            product_id: productId,
            material_id: Number(r.materialId),
            amount_needed: r.amount.toString(),
          }))
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Berhasil tambah menu' });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}