import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db'; // Sesuaikan jika lokasi file db kamu berbeda
import { products, mitra, categories, addons, addonCategories, tableList } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 1. Tangkap slug dari URL (misal: /api/products?slug=demo)
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const tableCode = searchParams.get('tableCode');

    // Jika tidak ada slug di URL, tolak permintaannya
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Nama kedai tidak valid' }, { status: 400 });
    }

    // 2. PENGECEKAN SLUG: Cari toko di database berdasarkan slug
    const targetMitra = await db.select()
                              .from(mitra)
                              .where(and(eq(mitra.mitra_slug, slug),isNull(mitra.deletedAt)))
                              .limit(1);

    // Jika array kosong (toko tidak ada), kembalikan pesan error
    if (targetMitra.length === 0) {
      return NextResponse.json({ success: false, message: `Kedai "${slug}" belum terdaftar di sistem kami.` }, { status: 404 });
    }

    // 3. Jika toko ditemukan, ambil ID tokonya
    const mitraId = targetMitra[0].id;

    // AMBIL SEMUA KATEGORI MILIK MITRA INI
    const mitraCategories = await db.select()
                                    .from(categories)
                                    .where(and(
                                        eq(categories.mitra_id, mitraId),
                                        isNull(categories.deletedAt) // <-- Syarat Soft Delete
                                      ));

    const allAddonCategories = await db.select().from(addonCategories).where(eq(addonCategories.mitra_id, mitraId));
    const allAddons = await db.select().from(addons).where(eq(addons.mitra_id, mitraId));
    // 4. Cari produk HANYA yang milik toko tersebut
    const mitraProducts = await db.select()
                               .from(products)
                               .where(and(
                                   eq(products.mitra_id, mitraId),
                                   isNull(products.deletedAt) // <-- Syarat Soft Delete
                                 ));

    // Mapping format Kategori agar sesuai UI
    const formattedCategories = mitraCategories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      slug: c.name.toLowerCase().replace(/ /g, '-') // Membuat slug untuk icon lucide
    }));
    
    // Mapping format Produk
    const formattedProducts = mitraProducts.map((p) => {
      // 1. Ambil array ID dari kolom JSON (pastikan aman jika null)
      const productAddonIds = Array.isArray(p.addon_id) ? p.addon_id.map(id => Number(id)) : [];

      // 2. Kelompokkan Addons berdasarkan Kategori secara aman
      const categorizedAddons = allAddonCategories.map(cat => {
        // Cari item yang: 
        // a. Ada di daftar addon_id produk ini
        // b. Milik kategori ini
        const items = allAddons.filter(a => 
          productAddonIds.includes(Number(a.id)) && 
          Number(a.category_id) === Number(cat.id) // Pastikan menggunakan camelCase categoryId sesuai schema
        );
        
        return {
          categoryName: cat.name,
          maxSelected: cat.maxSelected,
          isRequired: cat.isRequired,
          addons: items.map(i => ({
            id: Number(i.id),
            name: i.name,
            price: Number(i.price)
          }))
        };
      }).filter(group => group.addons.length > 0); // Buang kategori yang kosong untuk produk ini

      return {
        id: p.id.toString(),
        categoryId: p.categories_id?.toString(),
        name: p.name,
        description: p.description || '',
        image: p.image || '',
        basePrice: Number(p.price),
        isAvailable: p.status === 1,
        stock: p.stock,
        // Kirim categorizedAddons, bukan addons biasa
        categorizedAddons: categorizedAddons
      };
    });

    let tableName = null;
    if (tableCode) {
      const foundTable = await db.select()
        .from(tableList)
        .where(
          and(
            eq(tableList.mitra_id, mitraId), // Pastikan meja milik toko ini
            eq(tableList.table_code, tableCode)   // Cocokkan kodenya
          )
        )
        .limit(1);
      
      if (foundTable.length > 0) {
        tableName = foundTable[0].table_name; // Sesuaikan dengan nama kolom di database kamu
      }
    }

    // 6. Kirim data sukses ke Frontend
    return NextResponse.json({
      success: true,
      mitraName: targetMitra[0].mitra_name,
      mitraAddress: targetMitra[0].mitra_address || 'Alamat belum diatur', // Ambil alamat dari DB
      mitraWelcome: targetMitra[0].mitra_welcome || '', // Ambil alamat dari DB
      data: formattedProducts,
      categoriesData: formattedCategories,
      tableName: tableName
    });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data dari server' }, { status: 500 });
  }
}