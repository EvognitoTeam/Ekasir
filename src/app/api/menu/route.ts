import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  mitra,
  products,
  categories,
  addonCategories,
  addons,
  productRecipes,
} from '@/db/schema';
import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const dynamic =
  'force-dynamic';

const SECRET_KEY =
  new TextEncoder().encode(
    process.env.JWT_SECRET ||
      'rahasia-super-aman-evokasir-2026',
  );

type AuthPayload = {
  mitraId?:
    | number
    | string
    | null;

  branchId?:
    | number
    | string
    | null;

  role?: string | null;

  [key: string]:
    unknown;
};

async function getAuthPayload():
  Promise<AuthPayload | null> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      'ekasir_session',
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const verified =
      await jwtVerify(
        token,
        SECRET_KEY,
      );

    return verified.payload as AuthPayload;
  } catch {
    return null;
  }
}

function normalizeBranchId(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    String(value)
      .trim()
      .toLowerCase() ===
      'main'
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : null;
}

function normalizeRole(
  value: unknown,
): string {
  return String(
    value ?? '',
  )
    .trim()
    .toLowerCase();
}

/**
 * Branch Kasir/Kitchen HARUS mengikuti session.
 *
 * Owner boleh memilih branch melalui request branch_id.
 * Kalau tidak ada branch_id request, gunakan branch session Owner.
 *
 * NULL berarti MAIN/DEFAULT, bukan semua branch.
 */
function resolveBranchId(
  payload: AuthPayload,
  requestedBranchId?:
    unknown,
): number | null {
  const role =
    normalizeRole(
      payload.role,
    );

  if (
    role ===
      'cashier' ||
    role ===
      'kitchen'
  ) {
    return normalizeBranchId(
      payload.branchId,
    );
  }

  if (
    role ===
      'owner' &&
    requestedBranchId !==
      undefined
  ) {
    return normalizeBranchId(
      requestedBranchId,
    );
  }

  return normalizeBranchId(
    payload.branchId,
  );
}

/**
 * Tambahkan scope branch STRICT:
 *
 * branchId === null
 * => field IS NULL
 *
 * branchId === 5
 * => field = 5
 */
function branchCondition(
  field: any,
  branchId: number | null,
) {
  return branchId ===
    null
    ? isNull(field)
    : eq(
        field,
        branchId,
      );
}

async function assertMitraFromSlug(
  slug: string,
  payload: AuthPayload,
) {
  const foundMitra =
    await db
      .select()
      .from(
        mitra,
      )
      .where(
        eq(
          mitra.mitra_slug,
          slug,
        ),
      )
      .limit(
        1,
      );

  if (
    foundMitra.length ===
    0
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            success:
              false,
            message:
              'Toko tidak ditemukan',
          },
          {
            status:
              404,
          },
        ),
    };
  }

  const currentMitra =
    foundMitra[0];

  /*
   * Jangan izinkan staff dari mitra A membaca slug milik mitra B.
   */
  if (
    payload.mitraId !==
      null &&
    payload.mitraId !==
      undefined &&
    Number(
      payload.mitraId,
    ) !==
      Number(
        currentMitra.id,
      )
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            success:
              false,
            message:
              'Akses mitra tidak valid',
          },
          {
            status:
              403,
          },
        ),
    };
  }

  return {
    ok:
      true as const,
    mitra:
      currentMitra,
  };
}

// ============================================================================
// [GET] AMBIL DATA MENU
// Produk + Addon STRICT per branch.
// Category tetap global per mitra.
// ============================================================================
export async function GET(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (!payload) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Unauthorized',
        },
        {
          status:
            401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const slug =
      searchParams.get(
        'slug',
      );

    const reqBranchId =
      searchParams.get(
        'branch_id',
      );

    if (!slug) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Slug toko wajib disertakan',
        },
        {
          status:
            400,
        },
      );
    }

    const mitraResult =
      await assertMitraFromSlug(
        slug,
        payload,
      );

    if (
      !mitraResult.ok
    ) {
      return mitraResult.response;
    }

    const currentMitra =
      mitraResult.mitra;

    const finalBranchId =
      resolveBranchId(
        payload,
        reqBranchId ??
          undefined,
      );

    /*
     * PRODUK:
     * NULL session -> hanya products.branch_id IS NULL.
     * branch N     -> hanya products.branch_id = N.
     */
    const condsProd = [
      eq(
        products.mitra_id,
        currentMitra.id,
      ),

      isNull(
        products.deletedAt,
      ),

      branchCondition(
        products.branch_id,
        finalBranchId,
      ),
    ];

    /*
     * ADDON juga STRICT per branch.
     */
    const condsAddonGroup = [
      eq(
        addonCategories.mitra_id,
        currentMitra.id,
      ),

      branchCondition(
        addonCategories.branch_id,
        finalBranchId,
      ),
    ];

    const condsAddonItem = [
      eq(
        addons.mitra_id,
        currentMitra.id,
      ),

      isNull(
        addons.deletedAt,
      ),

      branchCondition(
        addons.branch_id,
        finalBranchId,
      ),
    ];

    const [
      dbCategories,
      dbProducts,
      dbAddonCategories,
      dbAddons,
    ] =
      await Promise.all([
        /*
         * Category sengaja global per mitra sesuai desain existing.
         */
        db
          .select()
          .from(
            categories,
          )
          .where(
            and(
              eq(
                categories.mitra_id,
                currentMitra.id,
              ),
              isNull(
                categories.deletedAt,
              ),
            ),
          ),

        db
          .select()
          .from(
            products,
          )
          .where(
            and(
              ...condsProd,
            ),
          ),

        db
          .select()
          .from(
            addonCategories,
          )
          .where(
            and(
              ...condsAddonGroup,
            ),
          ),

        db
          .select()
          .from(
            addons,
          )
          .where(
            and(
              ...condsAddonItem,
            ),
          ),
      ]);

    const mappedItems =
      dbProducts.map(
        (
          product,
        ) => ({
          id:
            product.id.toString(),

          name:
            product.name,

          categoryId:
            product.categories_id.toString(),

          basePrice:
            product.price,

          isAvailable:
            product.status ===
            1,

          image:
            product.image,

          description:
            product.description,

          stock:
            product.stock,

          branch_id:
            product.branch_id,

          addonGroups:
            typeof product.addon_id ===
            'string'
              ? (() => {
                  try {
                    return JSON.parse(
                      product.addon_id,
                    );
                  } catch {
                    return [];
                  }
                })()
              : Array.isArray(
                    product.addon_id,
                  )
                ? product.addon_id
                : [],
        }),
      );

    return NextResponse.json({
      success:
        true,

      branch_id:
        finalBranchId,

      items:
        mappedItems,

      categories:
        dbCategories,

      addonCategories:
        dbAddonCategories,

      addons:
        dbAddons,
    });
  } catch (
    error
  ) {
    console.error(
      'Fetch Menu Admin API Error:',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,
        message:
          'Terjadi kesalahan internal server',
      },
      {
        status:
          500,
      },
    );
  }
}

// ============================================================================
// [PUT] UPDATE MENU / ADDON
// Semua entity yang branch-specific harus STRICT mengikuti branch session.
// ============================================================================
export async function PUT(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (
      !payload ||
      normalizeRole(
        payload.role,
      ) ===
        'user'
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Akses ditolak.',
        },
        {
          status:
            401,
        },
      );
    }

    const mitraId =
      Number(
        payload.mitraId,
      );

    if (
      !Number.isInteger(
        mitraId,
      ) ||
      mitraId <= 0
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Mitra session tidak valid',
        },
        {
          status:
            401,
        },
      );
    }

    const contentType =
      request.headers.get(
        'content-type',
      ) ||
      '';

    // ------------------------------------------------------------------------
    // JALUR 1: JSON
    // Edit harga / availability produk.
    // ------------------------------------------------------------------------
    if (
      contentType.includes(
        'application/json',
      )
    ) {
      const body =
        await request.json();

      const {
        id,
        isAvailable,
        basePrice,
      } = body;

      if (!id) {
        return NextResponse.json(
          {
            success:
              false,
            message:
              'ID Menu wajib disertakan',
          },
          {
            status:
              400,
          },
        );
      }

      const updateData:
        Record<
          string,
          unknown
        > = {};

      if (
        typeof isAvailable ===
        'boolean'
      ) {
        updateData.status =
          isAvailable
            ? 1
            : 0;
      }

      if (
        typeof basePrice ===
        'number'
      ) {
        updateData.price =
          basePrice;
      }

      if (
        Object.keys(
          updateData,
        ).length ===
        0
      ) {
        return NextResponse.json(
          {
            success:
              false,
            message:
              'Tidak ada data yang diperbarui',
          },
          {
            status:
              400,
          },
        );
      }

      const finalBranchId =
        resolveBranchId(
          payload,
        );

      const conditions = [
        eq(
          products.id,
          Number(
            id,
          ),
        ),

        eq(
          products.mitra_id,
          mitraId,
        ),

        /*
         * PENTING:
         * branch NULL tetap harus IS NULL.
         */
        branchCondition(
          products.branch_id,
          finalBranchId,
        ),
      ];

      await db
        .update(
          products,
        )
        .set(
          updateData,
        )
        .where(
          and(
            ...conditions,
          ),
        );

      return NextResponse.json({
        success:
          true,
        message:
          'Data berhasil diperbarui',
      });
    }

    // ------------------------------------------------------------------------
    // JALUR 2: FORMDATA
    // ------------------------------------------------------------------------
    if (
      contentType.includes(
        'multipart/form-data',
      )
    ) {
      const formData =
        await request.formData();

      const entity =
        String(
          formData.get(
            'entity',
          ) ??
            '',
        );

      const id =
        formData.get(
          'id',
        );

      if (
        !id ||
        !entity
      ) {
        return NextResponse.json(
          {
            success:
              false,
            message:
              'ID dan Entity wajib disertakan',
          },
          {
            status:
              400,
          },
        );
      }

      const requestedBranchId =
        formData.get(
          'branch_id',
        );

      const finalBranchId =
        resolveBranchId(
          payload,
          requestedBranchId ??
            undefined,
        );

      // ----------------------------------------------------------------------
      // A. MENU / PRODUCTS
      // ----------------------------------------------------------------------
      if (
        entity ===
        'menu'
      ) {
        const updateData:
          Record<
            string,
            unknown
          > = {};

        if (
          formData.has(
            'name',
          )
        ) {
          updateData.name =
            formData.get(
              'name',
            ) as string;
        }

        if (
          formData.has(
            'price',
          )
        ) {
          updateData.price =
            Number(
              formData.get(
                'price',
              ),
            );
        }

        if (
          formData.has(
            'stock',
          )
        ) {
          updateData.stock =
            Number(
              formData.get(
                'stock',
              ),
            );
        }

        if (
          formData.has(
            'category_id',
          )
        ) {
          updateData.categories_id =
            Number(
              formData.get(
                'category_id',
              ),
            );
        }

        if (
          formData.has(
            'description',
          )
        ) {
          updateData.description =
            formData.get(
              'description',
            ) as string;
        }

        if (
          formData.has(
            'addon_id',
          )
        ) {
          try {
            updateData.addon_id =
              JSON.parse(
                formData.get(
                  'addon_id',
                ) as string,
              );
          } catch {
            return NextResponse.json(
              {
                success:
                  false,
                message:
                  'Format addon_id tidak valid',
              },
              {
                status:
                  400,
              },
            );
          }
        }

        if (
          formData.has(
            'image',
          )
        ) {
          const file =
            formData.get(
              'image',
            ) as File;

          const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
          ];

          if (
            file &&
            file.size > 0
          ) {
            if (
              !allowedTypes.includes(
                file.type,
              )
            ) {
              return NextResponse.json(
                {
                  success:
                    false,
                  message:
                    'Format gambar tidak didukung',
                },
                {
                  status:
                    400,
                },
              );
            }

            if (
              file.size >
              5 *
                1024 *
                1024
            ) {
              return NextResponse.json(
                {
                  success:
                    false,
                  message:
                    'Ukuran gambar maksimal 5MB',
                },
                {
                  status:
                    400,
                },
              );
            }

            const bytes =
              await file.arrayBuffer();

            const buffer =
              Buffer.from(
                bytes,
              );

            const uploadDir =
              path.join(
                process.cwd(),
                'public/uploads/menu',
              );

            if (
              !fs.existsSync(
                uploadDir,
              )
            ) {
              fs.mkdirSync(
                uploadDir,
                {
                  recursive:
                    true,
                },
              );
            }

            const filename =
              `${Date.now()}_edited.webp`;

            const compressedImage =
              await sharp(
                buffer,
              )
                .resize({
                  width:
                    800,
                  height:
                    800,
                  fit:
                    'inside',
                  withoutEnlargement:
                    true,
                })
                .webp({
                  quality:
                    75,
                })
                .toBuffer();

            await writeFile(
              path.join(
                uploadDir,
                filename,
              ),
              compressedImage,
            );

            updateData.image =
              `uploads/menu/${filename}`;
          }
        }

        await db.transaction(
          async (
            tx,
          ) => {
            const productConditions = [
              eq(
                products.id,
                Number(
                  id,
                ),
              ),

              eq(
                products.mitra_id,
                mitraId,
              ),

              branchCondition(
                products.branch_id,
                finalBranchId,
              ),
            ];

            await tx
              .update(
                products,
              )
              .set(
                updateData,
              )
              .where(
                and(
                  ...productConditions,
                ),
              );

            if (
              formData.has(
                'recipes',
              )
            ) {
              let recipeList:
                any[] = [];

              try {
                recipeList =
                  JSON.parse(
                    formData.get(
                      'recipes',
                    ) as string,
                  );
              } catch {
                throw new Error(
                  'Format recipes tidak valid',
                );
              }

              /*
               * product_id unique, tetapi kita tetap validate product
               * melalui branch-scoped UPDATE di atas.
               */
              await tx
                .delete(
                  productRecipes,
                )
                .where(
                  eq(
                    productRecipes.product_id,
                    Number(
                      id,
                    ),
                  ),
                );

              if (
                Array.isArray(
                  recipeList,
                ) &&
                recipeList.length >
                  0
              ) {
                await tx
                  .insert(
                    productRecipes,
                  )
                  .values(
                    recipeList.map(
                      (
                        recipe,
                      ) => ({
                        mitra_id:
                          mitraId,

                        branch_id:
                          finalBranchId,

                        product_id:
                          Number(
                            id,
                          ),

                        material_id:
                          Number(
                            recipe.materialId,
                          ),

                        amount_needed:
                          recipe.amount.toString(),
                      }),
                    ),
                  );
              }
            }
          },
        );

        return NextResponse.json({
          success:
            true,
          message:
            'Menu berhasil diperbarui',
        });
      }

      // ----------------------------------------------------------------------
      // B. CATEGORY
      // Tetap GLOBAL per mitra sesuai desain existing.
      // ----------------------------------------------------------------------
      if (
        entity ===
        'category'
      ) {
        const name =
          formData.get(
            'name',
          ) as string;

        if (name) {
          await db
            .update(
              categories,
            )
            .set({
              name,
            })
            .where(
              and(
                eq(
                  categories.id,
                  Number(
                    id,
                  ),
                ),

                eq(
                  categories.mitra_id,
                  mitraId,
                ),
              ),
            );
        }

        return NextResponse.json({
          success:
            true,
          message:
            'Kategori berhasil diperbarui',
        });
      }

      // ----------------------------------------------------------------------
      // C. ADDON
      // Addon group/item STRICT per branch.
      // ----------------------------------------------------------------------
      if (
        entity ===
        'addon'
      ) {
        const type =
          String(
            formData.get(
              'type',
            ) ??
              '',
          );

        if (
          type ===
          'group'
        ) {
          const updateData:
            Record<
              string,
              unknown
            > = {};

          if (
            formData.has(
              'name',
            )
          ) {
            updateData.name =
              formData.get(
                'name',
              ) as string;
          }

          if (
            formData.has(
              'is_required',
            )
          ) {
            updateData.isRequired =
              Number(
                formData.get(
                  'is_required',
                ),
              );
          }

          if (
            formData.has(
              'max_selected',
            )
          ) {
            updateData.maxSelected =
              Number(
                formData.get(
                  'max_selected',
                ),
              );
          }

          await db
            .update(
              addonCategories,
            )
            .set(
              updateData,
            )
            .where(
              and(
                eq(
                  addonCategories.id,
                  Number(
                    id,
                  ),
                ),

                eq(
                  addonCategories.mitra_id,
                  mitraId,
                ),

                branchCondition(
                  addonCategories.branch_id,
                  finalBranchId,
                ),
              ),
            );

          return NextResponse.json({
            success:
              true,
            message:
              'Grup addon berhasil diperbarui',
          });
        }

        if (
          type ===
          'item'
        ) {
          const updateData:
            Record<
              string,
              unknown
            > = {};

          if (
            formData.has(
              'name',
            )
          ) {
            updateData.name =
              formData.get(
                'name',
              ) as string;
          }

          if (
            formData.has(
              'price',
            )
          ) {
            updateData.price =
              Number(
                formData.get(
                  'price',
                ),
              );
          }

          if (
            formData.has(
              'category_id',
            )
          ) {
            updateData.category_id =
              Number(
                formData.get(
                  'category_id',
                ),
              );
          }

          if (
            formData.has(
              'stock',
            )
          ) {
            updateData.stock =
              Number(
                formData.get(
                  'stock',
                ),
              );
          }

          if (
            formData.has(
              'is_track_stock',
            )
          ) {
            updateData.is_track_stock =
              formData.get(
                'is_track_stock',
              ) ===
              '1';
          }

          await db
            .update(
              addons,
            )
            .set(
              updateData,
            )
            .where(
              and(
                eq(
                  addons.id,
                  Number(
                    id,
                  ),
                ),

                eq(
                  addons.mitra_id,
                  mitraId,
                ),

                branchCondition(
                  addons.branch_id,
                  finalBranchId,
                ),
              ),
            );

          return NextResponse.json({
            success:
              true,
            message:
              'Addon berhasil diperbarui',
          });
        }
      }

      return NextResponse.json(
        {
          success:
            false,
          message:
            'Entity tidak dikenali',
        },
        {
          status:
            400,
        },
      );
    }

    return NextResponse.json(
      {
        success:
          false,
        message:
          'Content-Type tidak didukung',
      },
      {
        status:
          415,
      },
    );
  } catch (
    error
  ) {
    console.error(
      'Update Master Data API Error:',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,
        message:
          error instanceof
            Error
            ? error.message
            : 'Terjadi kesalahan saat menyimpan data',
      },
      {
        status:
          500,
      },
    );
  }
}

// ============================================================================
// [POST] TAMBAH DATA MASTER BARU
// ============================================================================
export async function POST(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (
      !payload ||
      normalizeRole(
        payload.role,
      ) ===
        'user'
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Unauthorized',
        },
        {
          status:
            401,
        },
      );
    }

    const mitraId =
      Number(
        payload.mitraId,
      );

    if (
      !Number.isInteger(
        mitraId,
      ) ||
      mitraId <= 0
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Mitra session tidak valid',
        },
        {
          status:
            401,
        },
      );
    }

    const formData =
      await request.formData();

    const entity =
      String(
        formData.get(
          'entity',
        ) ??
          '',
      );

    const inputBranchId =
      formData.get(
        'branch_id',
      );

    /*
     * Cashier/Kitchen tidak boleh memilih branch sendiri.
     * Owner masih bisa memilih branch lewat formData branch_id.
     *
     * NULL = Main/Default.
     */
    const finalBranchId =
      resolveBranchId(
        payload,
        inputBranchId ??
          undefined,
      );

    // ------------------------------------------------------------------------
    // CATEGORY
    // Global per mitra.
    // ------------------------------------------------------------------------
    if (
      entity ===
      'category'
    ) {
      await db
        .insert(
          categories,
        )
        .values({
          mitra_id:
            mitraId,

          branch_id:
            null,

          name:
            formData.get(
              'name',
            ) as string,

          createdAt:
            new Date(),
        });

      return NextResponse.json({
        success:
          true,
      });
    }

    // ------------------------------------------------------------------------
    // ADDON
    // Sekarang branch-specific agar konsisten dengan GET/PUT.
    // ------------------------------------------------------------------------
    if (
      entity ===
      'addon'
    ) {
      const type =
        String(
          formData.get(
            'type',
          ) ??
            '',
        );

      if (
        type ===
        'group'
      ) {
        await db
          .insert(
            addonCategories,
          )
          .values({
            mitra_id:
              mitraId,

            branch_id:
              finalBranchId,

            name:
              formData.get(
                'name',
              ) as string,

            isRequired:
              Number(
                formData.get(
                  'is_required',
                ),
              ) ||
              0,

            maxSelected:
              Number(
                formData.get(
                  'max_selected',
                ),
              ) ||
              1,

            createdAt:
              new Date(),
          });

        return NextResponse.json({
          success:
            true,
        });
      }

      if (
        type ===
        'item'
      ) {
        await db
          .insert(
            addons,
          )
          .values({
            mitra_id:
              mitraId,

            branch_id:
              finalBranchId,

            name:
              formData.get(
                'name',
              ) as string,

            price:
              String(
                formData.get(
                  'price',
                ),
              ),

            category_id:
              Number(
                formData.get(
                  'category_id',
                ),
              ),

            stock:
              Number(
                formData.get(
                  'stock',
                ),
              ) ||
              0,

            is_track_stock:
              formData.get(
                'is_track_stock',
              ) ===
              '1',

            createdAt:
              new Date(),
          });

        return NextResponse.json({
          success:
            true,
        });
      }

      return NextResponse.json(
        {
          success:
            false,
          message:
            'Tipe addon tidak valid',
        },
        {
          status:
            400,
        },
      );
    }

    // ------------------------------------------------------------------------
    // MENU / PRODUCTS
    // ------------------------------------------------------------------------
    let imagePath:
      string | null =
        null;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      formData.has(
        'image',
      )
    ) {
      const file =
        formData.get(
          'image',
        ) as File;

      if (
        file &&
        file.size > 0
      ) {
        if (
          !allowedTypes.includes(
            file.type,
          )
        ) {
          return NextResponse.json(
            {
              success:
                false,
              message:
                'Format gambar tidak didukung',
            },
            {
              status:
                400,
            },
          );
        }

        if (
          file.size >
          5 *
            1024 *
            1024
        ) {
          return NextResponse.json(
            {
              success:
                false,
              message:
                'Ukuran gambar maksimal 5MB',
            },
            {
              status:
                400,
            },
          );
        }

        const bytes =
          await file.arrayBuffer();

        const buffer =
          Buffer.from(
            bytes,
          );

        const uploadDir =
          path.join(
            process.cwd(),
            'public/uploads/menu',
          );

        if (
          !fs.existsSync(
            uploadDir,
          )
        ) {
          fs.mkdirSync(
            uploadDir,
            {
              recursive:
                true,
            },
          );
        }

        const filename =
          `${Date.now()}.webp`;

        const compressedImage =
          await sharp(
            buffer,
          )
            .resize({
              width:
                800,
              height:
                800,
              fit:
                'inside',
              withoutEnlargement:
                true,
            })
            .webp({
              quality:
                75,
            })
            .toBuffer();

        await writeFile(
          path.join(
            uploadDir,
            filename,
          ),
          compressedImage,
        );

        imagePath =
          `uploads/menu/${filename}`;
      }
    }

    await db.transaction(
      async (
        tx,
      ) => {
        const inserted =
          await tx
            .insert(
              products,
            )
            .values({
              mitra_id:
                mitraId,

              branch_id:
                finalBranchId,

              name:
                formData.get(
                  'name',
                ) as string,

              price:
                Number(
                  formData.get(
                    'price',
                  ),
                ),

              stock:
                Number(
                  formData.get(
                    'stock',
                  ),
                ),

              categories_id:
                Number(
                  formData.get(
                    'category_id',
                  ),
                ),

              description:
                (
                  formData.get(
                    'description',
                  ) as string
                ) ||
                '',

              image:
                imagePath,

              status:
                1,

              addon_id:
                JSON.parse(
                  (
                    formData.get(
                      'addon_id',
                    ) as string
                  ) ||
                    '[]',
                ),

              createdAt:
                new Date(),
            })
            .$returningId();

        const productId =
          inserted[0].id;

        const recipes =
          JSON.parse(
            (
              formData.get(
                'recipes',
              ) as string
            ) ||
              '[]',
          );

        if (
          Array.isArray(
            recipes,
          ) &&
          recipes.length >
            0
        ) {
          await tx
            .insert(
              productRecipes,
            )
            .values(
              recipes.map(
                (
                  recipe: any,
                ) => ({
                  mitra_id:
                    mitraId,

                  branch_id:
                    finalBranchId,

                  product_id:
                    productId,

                  material_id:
                    Number(
                      recipe.materialId,
                    ),

                  amount_needed:
                    recipe.amount.toString(),
                }),
              ),
            );
        }
      },
    );

    return NextResponse.json({
      success:
        true,
      message:
        'Berhasil tambah menu',
    });
  } catch (
    error
  ) {
    console.error(
      'POST Master Data API Error:',
      error,
    );

    return NextResponse.json(
      {
        success:
          false,
        message:
          error instanceof
            Error
            ? error.message
            : 'Internal server error',
      },
      {
        status:
          500,
      },
    );
  }
}
