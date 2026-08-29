import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { db } from '@/db';

import {
  products,
  mitra,
  categories,
  addons,
  addonCategories,
  tableList,
  branches,
} from '@/db/schema';

import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
): Promise<Response> {
  try {
    const { searchParams } =
      new URL(request.url);

    const slug =
      searchParams
        .get('slug')
        ?.trim();

    const tableCode =
      searchParams
        .get('tableCode')
        ?.trim();

    const branchSlug =
      searchParams
        .get('branch_slug')
        ?.trim();

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Nama kedai tidak valid',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Ambil data mitra.
     */
    const [targetMitra] = await db
      .select()
      .from(mitra)
      .where(
        and(
          eq(
            mitra.mitra_slug,
            slug,
          ),
          isNull(
            mitra.deletedAt,
          ),
        ),
      )
      .limit(1);

    if (!targetMitra) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Kedai "${slug}" belum terdaftar di sistem kami.`,
        },
        {
          status: 404,
        },
      );
    }

    const mitraId =
      targetMitra.id;

    let finalBranchId:
      | number
      | null = null;

    let branchName:
      | string
      | null = null;

    /*
     * Jika URL memiliki branch_slug,
     * cari dan validasi cabangnya.
     */
    if (branchSlug) {
      const [targetBranch] =
        await db
          .select({
            id:
              branches.id,

            name:
              branches.name,
          })
          .from(branches)
          .where(
            and(
              eq(
                branches.mitra_id,
                mitraId,
              ),
              eq(
                branches.branch_slug,
                branchSlug,
              ),
              isNull(
                branches.deletedAt,
              ),
            ),
          )
          .limit(1);

      if (!targetBranch) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Cabang tidak ditemukan',
          },
          {
            status: 404,
          },
        );
      }

      finalBranchId =
        targetBranch.id;

      branchName =
        targetBranch.name;
    }

    /*
     * Filter produk:
     *
     * - Jika ada branch_slug:
     *   hanya produk cabang tersebut.
     *
     * - Jika tidak ada branch_slug:
     *   hanya produk pusat dengan branch_id NULL.
     */
    const productConditions = [
      eq(
        products.mitra_id,
        mitraId,
      ),
      isNull(
        products.deletedAt,
      ),
    ];

    if (finalBranchId !== null) {
      productConditions.push(
        eq(
          products.branch_id,
          finalBranchId,
        ),
      );
    } else {
      productConditions.push(
        isNull(
          products.branch_id,
        ),
      );
    }

    /*
     * Ambil kategori milik mitra.
     */
    const mitraCategories =
      await db
        .select()
        .from(categories)
        .where(
          and(
            eq(
              categories.mitra_id,
              mitraId,
            ),
            isNull(
              categories.deletedAt,
            ),
          ),
        );

    /*
     * 🔴 Filter Grup Addon & Addon berdasarkan Cabang (Sama seperti produk)
     */
    const addonCategoryConditions = [
      eq(
        addonCategories.mitra_id,
        mitraId,
      ),
    ];

    const addonConditions = [
      eq(
        addons.mitra_id,
        mitraId,
      ),
      isNull(
        addons.deletedAt,
      ),
    ];

    if (finalBranchId !== null) {
      addonCategoryConditions.push(eq(addonCategories.branch_id, finalBranchId));
      addonConditions.push(eq(addons.branch_id, finalBranchId));
    } else {
      addonCategoryConditions.push(isNull(addonCategories.branch_id));
      addonConditions.push(isNull(addons.branch_id));
    }

    const allAddonCategories =
      await db
        .select()
        .from(addonCategories)
        .where(
          and(
            ...addonCategoryConditions
          ),
        );

    const allAddons =
      await db
        .select()
        .from(addons)
        .where(
          and(
            ...addonConditions
          ),
        );

    /*
     * Ambil produk sesuai cabang atau pusat.
     */
    const mitraProducts =
      await db
        .select()
        .from(products)
        .where(
          and(
            ...productConditions,
          ),
        );

    /*
     * 🔴 Filter Kategori agar hanya menampilkan yang ada produknya di cabang ini
     */
    const activeCategoryIds = new Set(
      mitraProducts
        .map(p => p.categories_id)
        .filter(id => id !== null)
    );

    const formattedCategories =
      mitraCategories
        .filter(category => activeCategoryIds.has(category.id))
        .map(
          (category) => ({
            id:
              String(category.id),

            name:
              category.name,

            slug:
              category.name
                .toLowerCase()
                .trim()
                .replace(
                  /\s+/g,
                  '-',
                ),
          }),
        );

    const formattedProducts =
      mitraProducts.map(
        (product) => {
          let parsedAddons:
            unknown =
            product.addon_id;

          if (
            typeof parsedAddons ===
            'string'
          ) {
            try {
              parsedAddons =
                JSON.parse(
                  parsedAddons,
                );
            } catch {
              parsedAddons = [];
            }
          }

          const productAddonIds =
            Array.isArray(
              parsedAddons,
            )
              ? parsedAddons
                  .map(
                    (addonId) =>
                      Number(
                        addonId,
                      ),
                  )
                  .filter(
                    (addonId) =>
                      Number.isInteger(
                        addonId,
                      ) &&
                      addonId > 0,
                  )
              : [];

          const categorizedAddons =
            allAddonCategories
              .map(
                (
                  addonCategory,
                ) => {
                  const items =
                    allAddons.filter(
                      (addon) =>
                        productAddonIds.includes(
                          Number(
                            addon.id,
                          ),
                        ) &&
                        Number(
                          addon.category_id,
                        ) ===
                          Number(
                            addonCategory.id,
                          ),
                    );

                  return {
                    categoryName:
                      addonCategory.name,

                    maxSelected:
                      addonCategory.maxSelected,

                    isRequired:
                      addonCategory.isRequired,

                    addons:
                      items.map(
                        (addon) => ({
                          id:
                            Number(
                              addon.id,
                            ),

                          name:
                            addon.name,

                          price:
                            Number(
                              addon.price,
                            ),
                            
                          // 🔴 Kirim Data Stok ke Frontend
                          stock: 
                            addon.stock,
                            
                          is_track_stock: 
                            addon.is_track_stock,
                        }),
                      ),
                  };
                },
              )
              .filter(
                (group) =>
                  group.addons.length >
                  0,
              );

          return {
            id:
              String(product.id),

            categoryId:
              product.categories_id
                ? String(
                    product.categories_id,
                  )
                : null,

            name:
              product.name,

            description:
              product.description ||
              '',

            image:
              product.image ||
              '',

            basePrice:
              Number(
                product.price,
              ),

            isAvailable:
              product.status === 1,

            stock:
              product.stock,

            branchId:
              product.branch_id ??
              null,

            categorizedAddons,
          };
        },
      );

    let tableName:
      | string
      | null = 'Table Not Found';

    let tableId:
      | number
      | null = null;

    let resolvedTableCode:
      | string
      | null = null;

    if (tableCode) {
      const tableConditions = [
        eq(
          tableList.mitra_id,
          mitraId,
        ),
        eq(
          tableList.table_code,
          tableCode,
        ),
      ];

      /*
       * Aturan penting:
       * Jika URL memiliki cabang: meja harus berasal dari cabang tersebut.
       * Jika URL tidak memiliki cabang: meja harus memiliki branch_id NULL.
       */
      if (finalBranchId !== null) {
        tableConditions.push(
          eq(
            tableList.branch_id,
            finalBranchId,
          ),
        );
      } else {
        tableConditions.push(
          isNull(
            tableList.branch_id,
          ),
        );
      }

      if (
        'deletedAt' in tableList
      ) {
        tableConditions.push(
          isNull(
            tableList.deletedAt,
          ),
        );
      }

      const [foundTable] =
        await db
          .select({
            id:
              tableList.id,

            tableCode:
              tableList.table_code,

            tableName:
              tableList.table_name,

            branchId:
              tableList.branch_id,
          })
          .from(tableList)
          .where(
            and(
              ...tableConditions,
            ),
          )
          .limit(1);

      if (foundTable) {
        tableId =
          foundTable.id;

        tableName =
          foundTable.tableName;

        resolvedTableCode =
          foundTable.tableCode;
      }
    }

    return NextResponse.json({
      success: true,

      mitraName:
        targetMitra.mitra_name,

      mitraAddress:
        targetMitra.mitra_address ||
        'Alamat belum diatur',

      mitraWelcome:
        targetMitra.mitra_welcome ||
        '',

      branchId:
        finalBranchId,

      branchName,

      data:
        formattedProducts,

      categoriesData:
        formattedCategories,

      tableId,
      tableCode:
        resolvedTableCode,
      tableName,
    });
  } catch (error) {
    console.error(
      'Database Error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal mengambil data dari server',
      },
      {
        status: 500,
      },
    );
  }
}