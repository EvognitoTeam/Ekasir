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

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

function jsonError(
  status: number,
  message: string,
  code = 'PRODUCTS_ERROR',
  details: unknown = null,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        details,
      },
    },
    {
      status,
    },
  );
}

function normalizeString(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function parseAddonIds(
  value: unknown,
): number[] {
  let parsed:
    unknown = value;

  if (
    typeof parsed ===
    'string'
  ) {
    const trimmed =
      parsed.trim();

    if (!trimmed) {
      return [];
    }

    try {
      parsed =
        JSON.parse(
          trimmed,
        );
    } catch {
      return [];
    }
  }

  if (
    !Array.isArray(
      parsed,
    )
  ) {
    return [];
  }

  return parsed
    .map(
      (value) =>
        Number(value),
    )
    .filter(
      (value) =>
        Number.isInteger(
          value,
        ) &&
        value > 0,
    );
}

export async function GET(
  request: NextRequest,
): Promise<Response> {
  const {
    searchParams,
  } =
    new URL(
      request.url,
    );

  const slug =
    normalizeString(
      searchParams.get(
        'slug',
      ),
    );

  const tableCode =
    normalizeString(
      searchParams.get(
        'tableCode',
      ),
    );

  const branchSlug =
    normalizeString(
      searchParams.get(
        'branch_slug',
      ) ??
      searchParams.get(
        'branchSlug',
      ),
    );

  if (!slug) {
    return jsonError(
      400,
      'Nama kedai tidak valid.',
      'MITRA_SLUG_REQUIRED',
    );
  }

  let step =
    'INIT';

  try {
    /*
     * ==================================================
     * MITRA
     * ==================================================
     *
     * Select kolom yang benar-benar dipakai.
     * Jangan .select() semua kolom agar endpoint tidak
     * ikut rusak bila schema.ts punya kolom baru yang
     * migration database-nya belum dijalankan.
     */
    step =
      'FIND_MITRA';

    const [
      targetMitra,
    ] =
      await db
        .select({
          id:
            mitra.id,

          name:
            mitra.mitra_name,

          address:
            mitra.mitra_address,

          welcome:
            mitra.mitra_welcome,
        })
        .from(
          mitra,
        )
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
      return jsonError(
        404,
        `Kedai "${slug}" belum terdaftar di sistem kami.`,
        'MITRA_NOT_FOUND',
      );
    }

    const mitraId =
      Number(
        targetMitra.id,
      );

    let finalBranchId:
      number | null =
        null;

    let branchName:
      string | null =
        null;

    /*
     * ==================================================
     * BRANCH
     * ==================================================
     */
    if (branchSlug) {
      step =
        'FIND_BRANCH';

      const [
        targetBranch,
      ] =
        await db
          .select({
            id:
              branches.id,

            name:
              branches.name,
          })
          .from(
            branches,
          )
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
        return jsonError(
          404,
          'Cabang tidak ditemukan.',
          'BRANCH_NOT_FOUND',
        );
      }

      finalBranchId =
        Number(
          targetBranch.id,
        );

      branchName =
        targetBranch.name;
    }

    /*
     * ==================================================
     * CATEGORIES
     * ==================================================
     */
    step =
      'LOAD_CATEGORIES';

    const mitraCategories =
      await db
        .select({
          id:
            categories.id,

          name:
            categories.name,
        })
        .from(
          categories,
        )
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
     * ==================================================
     * ADDON CATEGORY
     * ==================================================
     */
    step =
      'LOAD_ADDON_CATEGORIES';

    const addonCategoryConditions = [
      eq(
        addonCategories.mitra_id,
        mitraId,
      ),
    ];

    if (
      finalBranchId !==
      null
    ) {
      addonCategoryConditions.push(
        eq(
          addonCategories.branch_id,
          finalBranchId,
        ),
      );
    } else {
      addonCategoryConditions.push(
        isNull(
          addonCategories.branch_id,
        ),
      );
    }

    const allAddonCategories =
      await db
        .select({
          id:
            addonCategories.id,

          name:
            addonCategories.name,

          maxSelected:
            addonCategories.maxSelected,

          isRequired:
            addonCategories.isRequired,
        })
        .from(
          addonCategories,
        )
        .where(
          and(
            ...addonCategoryConditions,
          ),
        );

    /*
     * ==================================================
     * ADDONS
     * ==================================================
     */
    step =
      'LOAD_ADDONS';

    const addonConditions = [
      eq(
        addons.mitra_id,
        mitraId,
      ),
      isNull(
        addons.deletedAt,
      ),
    ];

    if (
      finalBranchId !==
      null
    ) {
      addonConditions.push(
        eq(
          addons.branch_id,
          finalBranchId,
        ),
      );
    } else {
      addonConditions.push(
        isNull(
          addons.branch_id,
        ),
      );
    }

    const allAddons =
      await db
        .select({
          id:
            addons.id,

          categoryId:
            addons.category_id,

          name:
            addons.name,

          price:
            addons.price,

          stock:
            addons.stock,

          isTrackStock:
            addons.is_track_stock,
        })
        .from(
          addons,
        )
        .where(
          and(
            ...addonConditions,
          ),
        );

    /*
     * ==================================================
     * PRODUCTS
     * ==================================================
     */
    step =
      'LOAD_PRODUCTS';

    const productConditions = [
      eq(
        products.mitra_id,
        mitraId,
      ),
      isNull(
        products.deletedAt,
      ),
    ];

    if (
      finalBranchId !==
      null
    ) {
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

    const mitraProducts =
      await db
        .select({
          id:
            products.id,

          categoryId:
            products.categories_id,

          name:
            products.name,

          description:
            products.description,

          image:
            products.image,

          price:
            products.price,

          status:
            products.status,

          stock:
            products.stock,

          branchId:
            products.branch_id,

          addonIds:
            products.addon_id,
        })
        .from(
          products,
        )
        .where(
          and(
            ...productConditions,
          ),
        );

    /*
     * ==================================================
     * FORMAT CATEGORIES
     * ==================================================
     */
    const activeCategoryIds =
      new Set(
        mitraProducts
          .map(
            (product) =>
              product.categoryId,
          )
          .filter(
            (
              categoryId,
            ): categoryId is number =>
              categoryId !==
              null,
          )
          .map(
            (categoryId) =>
              Number(
                categoryId,
              ),
          ),
      );

    const formattedCategories =
      mitraCategories
        .filter(
          (category) =>
            activeCategoryIds.has(
              Number(
                category.id,
              ),
            ),
        )
        .map(
          (category) => ({
            id:
              String(
                category.id,
              ),

            name:
              category.name,

            slug:
              String(
                category.name,
              )
                .toLowerCase()
                .trim()
                .replace(
                  /\s+/g,
                  '-',
                ),
          }),
        );

    /*
     * ==================================================
     * FORMAT PRODUCTS + ADDONS
     * ==================================================
     */
    const formattedProducts =
      mitraProducts.map(
        (product) => {
          const productAddonIds =
            parseAddonIds(
              product.addonIds,
            );

          const categorizedAddons =
            allAddonCategories
              .map(
                (
                  addonCategory,
                ) => {
                  const items =
                    allAddons.filter(
                      (
                        addon,
                      ) =>
                        productAddonIds.includes(
                          Number(
                            addon.id,
                          ),
                        ) &&
                        Number(
                          addon.categoryId,
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
                        (
                          addon,
                        ) => ({
                          id:
                            Number(
                              addon.id,
                            ),

                          name:
                            addon.name,

                          price:
                            Number(
                              addon.price ??
                              0,
                            ),

                          stock:
                            addon.stock,

                          is_track_stock:
                            addon.isTrackStock,
                        }),
                      ),
                  };
                },
              )
              .filter(
                (
                  group,
                ) =>
                  group.addons
                    .length >
                  0,
              );

          return {
            id:
              String(
                product.id,
              ),

            categoryId:
              product.categoryId
                ? String(
                    product.categoryId,
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
                product.price ??
                0,
              ),

            isAvailable:
              Number(
                product.status,
              ) === 1,

            stock:
              product.stock,

            branchId:
              product.branchId ??
              null,

            categorizedAddons,
          };
        },
      );

    /*
     * ==================================================
     * TABLE
     * ==================================================
     */
    let tableName:
      string | null =
        'Table Not Found';

    let tableId:
      number | null =
        null;

    let resolvedTableCode:
      string | null =
        null;

    if (tableCode) {
      step =
        'FIND_TABLE';

      const tableConditions = [
        eq(
          tableList.mitra_id,
          mitraId,
        ),

        eq(
          tableList.table_code,
          tableCode,
        ),

        isNull(
          tableList.deletedAt,
        ),
      ];

      if (
        finalBranchId !==
        null
      ) {
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

      const [
        foundTable,
      ] =
        await db
          .select({
            id:
              tableList.id,

            tableCode:
              tableList.table_code,

            tableName:
              tableList.table_name,
          })
          .from(
            tableList,
          )
          .where(
            and(
              ...tableConditions,
            ),
          )
          .limit(1);

      if (foundTable) {
        tableId =
          Number(
            foundTable.id,
          );

        tableName =
          foundTable.tableName;

        resolvedTableCode =
          foundTable.tableCode;
      }
    }

    return NextResponse.json({
      success: true,

      mitraName:
        targetMitra.name,

      mitraAddress:
        targetMitra.address ||
        'Alamat belum diatur',

      mitraWelcome:
        targetMitra.welcome ||
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
      '[PRODUCTS_GET_ERROR]',
      {
        step,
        error,
      },
    );

    const databaseMessage =
      error instanceof
        Error
        ? error.message
        : String(
            error,
          );

    return jsonError(
      500,
      'Gagal mengambil data produk dari server.',
      'PRODUCTS_GET_FAILED',
      process.env.NODE_ENV ===
        'development'
        ? {
            step,
            message:
              databaseMessage,
          }
        : {
            step,
          },
    );
  }
}
