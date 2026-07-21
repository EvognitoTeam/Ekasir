import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db'; 
import { products, mitra, categories, addons, addonCategories, tableList, branches } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const tableCode = searchParams.get('tableCode');
    const branchSlug = searchParams.get('branch_slug');

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Nama kedai tidak valid' }, { status: 400 });
    }

    const targetMitra = await db.select().from(mitra).where(and(eq(mitra.mitra_slug, slug), isNull(mitra.deletedAt))).limit(1);
    if (targetMitra.length === 0) {
      return NextResponse.json({ success: false, message: `Kedai "${slug}" belum terdaftar di sistem kami.` }, { status: 404 });
    }

    const mitraId = targetMitra[0].id;
    let finalBranchId = null;
    let branchName = null;

    // 🔴 1. Ambil Menu (Produk) dengan Filter Cabang
    if (branchSlug) {
      const targetBranch = await db.select().from(branches)
        .where(and(eq(branches.mitra_id, mitraId), eq(branches.branch_slug, branchSlug), isNull(branches.deletedAt)))
        .limit(1);

      if (targetBranch.length === 0) {
        return NextResponse.json({ success: false, message: 'Cabang tidak ditemukan' }, { status: 404 });
      }
      finalBranchId = targetBranch[0].id;
      branchName = targetBranch[0].name;
    }
    const condsProd = [eq(products.mitra_id, mitraId), isNull(products.deletedAt)];
    if (finalBranchId) condsProd.push(eq(products.branch_id, finalBranchId));

    const getCondition = (tableField: any, deletedField?: any) => {
      const conds = [eq(tableField, mitraId)];
      if (deletedField) conds.push(isNull(deletedField));
      return conds;
    };

    // 🔴 2. Ambil Kategori & Addon (Tanpa Filter Cabang)
    const mitraCategories = await db.select().from(categories).where(and(...getCondition(categories.mitra_id, categories.deletedAt)));
    const allAddonCategories = await db.select().from(addonCategories).where(eq(addonCategories.mitra_id, mitraId));
    const allAddons = await db.select().from(addons).where(and(eq(addons.mitra_id, mitraId), isNull(addons.deletedAt)));
    
    const mitraProducts = await db.select().from(products).where(and(...condsProd));

    const formattedCategories = mitraCategories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      slug: c.name.toLowerCase().replace(/ /g, '-')
    }));
    
    const formattedProducts = mitraProducts.map((p) => {
      let parsedAddons = p.addon_id;
      if (typeof parsedAddons === 'string') {
        try { parsedAddons = JSON.parse(parsedAddons); } catch (e) { parsedAddons = []; }
      }

      const productAddonIds = Array.isArray(parsedAddons) ? parsedAddons.map(id => Number(id)) : [];

      const categorizedAddons = allAddonCategories.map(cat => {
        const items = allAddons.filter(a => 
          productAddonIds.includes(Number(a.id)) && Number(a.category_id) === Number(cat.id) 
        );
        return {
          categoryName: cat.name,
          maxSelected: cat.maxSelected,
          isRequired: cat.isRequired,
          addons: items.map(i => ({ id: Number(i.id), name: i.name, price: Number(i.price) }))
        };
      }).filter(group => group.addons.length > 0); 

      return {
        id: p.id.toString(),
        categoryId: p.categories_id?.toString(),
        name: p.name,
        description: p.description || '',
        image: p.image || '',
        basePrice: Number(p.price),
        isAvailable: p.status === 1,
        stock: p.stock,
        categorizedAddons: categorizedAddons
      };
    });

    let tableName = null;
    if (tableCode) {
      const tableConds = [eq(tableList.mitra_id, mitraId), eq(tableList.table_code, tableCode)];
      if (finalBranchId) tableConds.push(eq(tableList.branch_id, finalBranchId));

      const foundTable = await db.select().from(tableList).where(and(...tableConds)).limit(1);
      if (foundTable.length > 0) tableName = foundTable[0].table_name;
    }

    return NextResponse.json({
      success: true,
      mitraName: targetMitra[0].mitra_name,
      mitraAddress: targetMitra[0].mitra_address || 'Alamat belum diatur', 
      mitraWelcome: targetMitra[0].mitra_welcome || '',
      branchName: branchName,
      data: formattedProducts,
      categoriesData: formattedCategories,
      tableName: tableName
    });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data dari server' }, { status: 500 });
  }
}