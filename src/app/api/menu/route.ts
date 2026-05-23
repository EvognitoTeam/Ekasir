import { NextResponse } from 'next/server';
import { db } from '@/db';
// 🔴 Import disesuaikan dengan schema aslimu
import { mitra, products, categories, addonCategories, addons, productRecipes } from '@/db/schema'; 
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { numeric } from 'drizzle-orm/pg-core';
import sharp from 'sharp';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

let mitraId = "";
// ============================================================================
// [GET] AMBIL DATA MENU (Menerjemahkan format DB ke format UI Frontend)
// ============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Slug toko wajib disertakan' }, { status: 400 });
    }

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) {
      return NextResponse.json({ success: false, message: 'Toko tidak ditemukan' }, { status: 404 });
    }

    const currentMitra = foundMitra[0];
    mitraId = currentMitra.id.toString();


    // 🔴 1. TARIK SEMUA DATA SEKALIGUS (Menu, Kategori, Addon Group, Addon Item)
    const [dbCategories, dbProducts, dbAddonCategories, dbAddons] = await Promise.all([
      // Kategori
      db.select().from(categories).where(
        and(
          eq(categories.mitra_id, currentMitra.id),
          isNull(categories.deletedAt)
        )
      ),
      // Produk
      db.select().from(products).where(
        and(
          eq(products.mitra_id, currentMitra.id),
          isNull(products.deletedAt)
        )
      ),
      // Addon Categories (Di skemamu tidak ada kolom deletedAt)
      db.select().from(addonCategories).where(
        eq(addonCategories.mitra_id, currentMitra.id)
      ),
      // Addons
      db.select().from(addons).where(
        and(
          eq(addons.mitra_id, currentMitra.id),
          isNull(addons.deletedAt)
        )
      )
    ]);

    // Translator Database ke Frontend untuk Produk
    const mappedItems = dbProducts.map(p => ({
      id: p.id.toString(),
      name: p.name,
      categoryId: p.categories_id.toString(),
      basePrice: p.price,
      isAvailable: p.status === 1,
      image: p.image,
      description: p.description, // Pastikan deskripsi ikut dikirim
      stock: p.stock,
      addonGroups: p.addon_id || []
    }));

    return NextResponse.json({
      success: true,
      items: mappedItems,
      categories: dbCategories,
      addonCategories: dbAddonCategories, // 🔴 Kirim ke frontend
      addons: dbAddons                    // 🔴 Kirim ke frontend
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
    // 1. CEK KEAMANAN & SESI
    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    let payload;
    try {
      const verified = await jwtVerify(token, SECRET_KEY);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Sesi kadaluarsa.' }, { status: 401 });
    }

    if (payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 403 });
    }

    // 2. CEK TIPE KONTEN REQUEST (Bilingual: JSON vs FormData)
    const contentType = request.headers.get('content-type') || '';

    // ==========================================================
    // JALUR 1: BACA JSON (Dari Tombol Toggle Tersedia / Edit Harga Cepat)
    // ==========================================================
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { id, isAvailable, basePrice } = body;

      if (!id) return NextResponse.json({ success: false, message: 'ID Menu wajib disertakan' }, { status: 400 });

      const updateData: any = {};
      if (typeof isAvailable === 'boolean') updateData.status = isAvailable ? 1 : 0;
      if (typeof basePrice === 'number') updateData.price = basePrice;

      await db
        .update(products)
        .set(updateData)
        .where(
          and(
            eq(products.id, Number(id)),
            eq(products.mitra_id, Number(payload.mitraId)) 
          )
        );
    } 
    // ==========================================================
    // JALUR 2: BACA FORMDATA (Dari Modal Master Data Manager)
    // ==========================================================
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const entity = formData.get('entity') as string;
      const id = formData.get('id');

      if (!id || !entity) {
        return NextResponse.json({ success: false, message: 'ID dan Entity wajib disertakan' }, { status: 400 });
      }

      // -- A. JIKA YANG DI-EDIT ADALAH MENU (PRODUCTS)
      if (entity === 'menu') {
        const rawRecipes = formData.get('recipes');
    console.log("DEBUG - Raw Recipes:", rawRecipes); 

    if (rawRecipes) {
        try {
            const recipeList = JSON.parse(rawRecipes as string);
            console.log("DEBUG - Parsed Recipes:", recipeList); // Cek isi datanya
        } catch (e) {
            console.error("DEBUG - JSON Parse Error:", e);
        }
    }
    
    const updateData: any = {};
    if (formData.has('name')) updateData.name = formData.get('name') as string;
    if (formData.has('price')) updateData.price = Number(formData.get('price'));
    if (formData.has('stock')) updateData.stock = Number(formData.get('stock'));
            if (formData.has('category_id')) updateData.categories_id = Number(formData.get('category_id'));
            if (formData.has('description')) updateData.description = formData.get('description') as string;
            if (formData.has('addon_id')) {
              try {
                // Ubah string '' kembali jadi JSON/Array
                updateData.addon_id = JSON.parse(formData.get('addon_id') as string);
              } catch(e) {}
            }
            
            
            // TODO: Jika ada file upload (formData.get('image')), tambahkan logika upload ke server/cloud di sini, 
            // lalu simpan nama filenya ke updateData.image
            // 🔴 LOGIKA UPLOAD GAMBAR
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
            await tx.update(products)
              .set(updateData)
              .where(and(eq(products.id, Number(id)), eq(products.mitra_id, Number(payload.mitraId))));
            
            if (formData.has('recipes')) {
                  const recipeList = JSON.parse(formData.get('recipes') as string);
                  
                  // 1. Delete resep lama
                  await tx.delete(productRecipes).where(eq(productRecipes.product_id, Number(id)));
                  
                  // 2. Insert resep baru
                  if (recipeList.length > 0) {
                      await tx.insert(productRecipes).values(recipeList.map((r: any) => ({
                          mitra_id: Number(payload.mitraId),
                          product_id: Number(id),
                          material_id: Number(r.materialId),
                          amount_needed: r.amount.toString()
                      })));
                  }
          }
        });
      }
      
      // -- B. JIKA YANG DI-EDIT ADALAH KATEGORI
      else if (entity === 'category') {
        const name = formData.get('name') as string;
        if (name) {
          await db.update(categories)
            .set({ name })
            .where(and(eq(categories.id, Number(id)), eq(categories.mitra_id, Number(payload.mitraId))));
        }
      }

      // -- C. JIKA YANG DI-EDIT ADALAH ADDON
      else if (entity === 'addon') {
        const type = formData.get('type') as string;
        
        if (type === 'group') {
          // Edit Kategori Addon Induk
          const updateData: any = {};
          if (formData.has('name')) updateData.name = formData.get('name') as string;
          if (formData.has('is_required')) updateData.isRequired = Number(formData.get('is_required'));
          if (formData.has('max_selected')) updateData.maxSelected = Number(formData.get('max_selected'));

          await db.update(addonCategories)
            .set(updateData)
            .where(and(eq(addonCategories.id, Number(id)), eq(addonCategories.mitra_id, Number(payload.mitraId))));
            
        } else if (type === 'item') {
          // Edit Item Addon
          const updateData: any = {};
          if (formData.has('name')) updateData.name = formData.get('name') as string;
          if (formData.has('price')) updateData.price = Number(formData.get('price'));
          if (formData.has('category_id')) updateData.category_id = Number(formData.get('category_id'));

          await db.update(addons)
            .set(updateData)
            .where(and(eq(addons.id, Number(id)), eq(addons.mitra_id, Number(payload.mitraId))));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data berhasil diperbarui'
    });

  } catch (error) {
    console.error("Update Master Data API Error:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ekasir_session')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const verified = await jwtVerify(token, SECRET_KEY);
    const payload: any = verified.payload;

    const formData = await request.formData();

    const entity = formData.get('entity');

    // =========================
    // CATEGORY
    // =========================
    if (entity === 'category') {
      await db.insert(categories).values({
        mitra_id: Number(payload.mitraId),
        name: formData.get('name') as string,
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true
      });
    }

    // =========================
    // ADDON
    // =========================
    if (entity === 'addon') {
      const type = formData.get('type');

      // GROUP
      if (type === 'group') {
        await db.insert(addonCategories).values({
          mitra_id: Number(payload.mitraId),
          name: formData.get('name') as string,
          isRequired:
            Number(formData.get('is_required')) || 0,
          maxSelected:
            Number(formData.get('max_selected')) || 1,
          createdAt: new Date()
        });

        return NextResponse.json({
          success: true
        });
      }

      // ITEM
      if (type === 'item') {
        await db.insert(addons).values({
          mitra_id: Number(payload.mitraId),
          name: formData.get('name') as string,
          price: String(formData.get('price')),
          category_id: Number(
            formData.get('category_id')
          ),
          createdAt: new Date()
        });

        return NextResponse.json({
          success: true
        });
      }
    }

    // =========================
    // MENU
    // =========================

    let imagePath = null;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (formData.has('image')) {
      const file = formData.get('image') as File;

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Format gambar tidak didukung'
          },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            message: 'Ukuran gambar maksimal 5MB'
          },
          { status: 400 }
        );
      }

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(
          process.cwd(),
          'public/uploads/menu'
        );

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, {
            recursive: true
          });
        }

        // nama file webp
        const filename = `${Date.now()}.webp`;

        // compress + resize
        const compressedImage = await sharp(buffer)
          .resize({
            width: 800,
            height: 800,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: 75
          })
          .toBuffer();

        await writeFile(
          path.join(uploadDir, filename),
          compressedImage
        );

        imagePath = `uploads/menu/${filename}`;
      }
    }

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(products)
        .values({
          mitra_id: Number(payload.mitraId),
          name: formData.get('name') as string,
          price: Number(formData.get('price')),
          stock: Number(formData.get('stock')),
          categories_id: Number(
            formData.get('category_id')
          ),
          description:
            (formData.get('description') as string) || '',
          image: imagePath,
          status: 1,
          addon_id: JSON.parse(
            (formData.get('addon_ids') as string) || '[]'
          ),
          createdAt: new Date()
        })
        .$returningId();

      const productId = inserted[0].id;

      const recipes = JSON.parse(
        (formData.get('recipes') as string) || '[]'
      );

      if (recipes.length > 0) {
        await tx.insert(productRecipes).values(
          recipes.map((r: any) => ({
            mitra_id: Number(payload.mitraId),
            product_id: productId,
            material_id: Number(r.materialId),
            amount_needed: r.amount.toString(),
            createdAt: new Date()
          }))
        );
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Berhasil tambah menu'
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}