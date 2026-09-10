import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { db } from '@/db';
import { mitra } from '@/db/schema';

import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import {
  GET as getProducts,
} from '@/app/api/products/route';

import {
  GET as getCoupons,
} from '@/app/api/coupons/route';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

type UnknownRecord =
  Record<string, unknown>;

type InternalRouteHandler =
  (
    request: NextRequest,
  ) =>
    Promise<Response> |
    Response;

function asRecord(
  value: unknown,
): UnknownRecord {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function nullableText(
  value: unknown,
): string | null {
  const result =
    text(value);

  return result ||
    null;
}

function stripHtml(
  value: unknown,
): string | null {
  const raw =
    nullableText(value);

  if (!raw) {
    return null;
  }

  const decoded =
    raw
      .replace(
        /<br\s*\/?>/gi,
        ' ',
      )
      .replace(
        /<\/?p>/gi,
        ' ',
      )
      .replace(
        /<[^>]*>/g,
        ' ',
      )
      .replace(
        /&nbsp;/gi,
        ' ',
      )
      .replace(
        /&amp;/gi,
        '&',
      )
      .replace(
        /&quot;/gi,
        '"',
      )
      .replace(
        /&#39;|&apos;/gi,
        "'",
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();

  return decoded ||
    null;
}

function numberValue(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value ===
      'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const raw =
    text(value)
      .replace(
        /rp/gi,
        '',
      )
      .replace(
        /\s+/g,
        '',
      );

  if (!raw) {
    return fallback;
  }

  let normalized =
    raw.replace(
      /[^0-9,.-]/g,
      '',
    );

  if (
    normalized.includes('.') &&
    normalized.includes(',')
  ) {
    normalized =
      normalized.lastIndexOf('.') >
      normalized.lastIndexOf(',')
        ? normalized.replace(
            /,/g,
            '',
          )
        : normalized
            .replace(
              /\./g,
              '',
            )
            .replace(
              ',',
              '.',
            );
  } else if (
    /^\d{1,3}(\.\d{3})+$/.test(
      normalized,
    )
  ) {
    normalized =
      normalized.replace(
        /\./g,
        '',
      );
  } else if (
    /^\d{1,3}(,\d{3})+$/.test(
      normalized,
    )
  ) {
    normalized =
      normalized.replace(
        /,/g,
        '',
      );
  } else {
    normalized =
      normalized.replace(
        ',',
        '.',
      );
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
}

function booleanValue(
  value: unknown,
): boolean {
  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  if (
    typeof value ===
    'number'
  ) {
    return value === 1;
  }

  const normalized =
    text(value)
      .toLowerCase();

  return [
    '1',
    'true',
    'yes',
    'on',
  ].includes(
    normalized,
  );
}

/**
 * Untuk gambar produk.
 *
 * Tetap mempertahankan fallback lama /logo.png agar perubahan bootstrap
 * tidak mengganggu ProductCard yang belum mempunyai placeholder sendiri.
 */
function imageUrl(
  value: unknown,
): string {
  const image =
    nullableText(value);

  if (!image) {
    return '/logo.png';
  }

  if (
    image.startsWith('/') ||
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('data:') ||
    image.startsWith('blob:')
  ) {
    return image;
  }

  return `/${image}`;
}

/**
 * Untuk identitas tenant/Kiosk.
 *
 * Source of truth adalah kolom `mitra.banner`.
 * Jika kosong, kembalikan null.
 *
 * Frontend KioskWelcome akan menampilkan icon Store default ketika
 * `banner === null`, sehingga TIDAK fallback ke /logo.png.
 */
function bannerUrl(
  value: unknown,
): string | null {
  const banner =
    nullableText(value);

  if (!banner) {
    return null;
  }

  if (
    banner.startsWith('/') ||
    banner.startsWith('http://') ||
    banner.startsWith('https://') ||
    banner.startsWith('data:') ||
    banner.startsWith('blob:')
  ) {
    return banner;
  }

  return `/${banner}`;
}

async function invokeInternalRoute(
  handler:
    InternalRouteHandler,
  url:
    URL,
  sourceRequest:
    Request,
) {
  /*
   * Tidak melakukan self-fetch HTTP ke origin aplikasi.
   * Route handler dipanggil langsung di proses Node.js.
   */
  const internalRequest =
    new NextRequest(
      url,
      {
        method:
          'GET',

        headers: {
          Accept:
            'application/json',

          Cookie:
            sourceRequest.headers.get(
              'cookie',
            ) ??
            '',
        },
      },
    );

  const response =
    await handler(
      internalRequest,
    );

  let result:
    unknown;

  try {
    result =
      await response.json();
  } catch {
    result = {
      success:
        false,

      message:
        'Internal route mengembalikan response yang tidak valid.',
    };
  }

  return {
    response,

    result:
      result as
        Record<string, unknown>,
  };
}

export async function GET(
  request: Request,
): Promise<Response> {
  const requestUrl =
    new URL(
      request.url,
    );

  const slug =
    text(
      requestUrl.searchParams.get(
        'slug',
      ),
    );

  const branchSlug =
    nullableText(
      requestUrl.searchParams.get(
        'branch_slug',
      ),
    );

  if (!slug) {
    return NextResponse.json(
      {
        success:
          false,

        message:
          'Slug mitra wajib diisi.',
      },
      {
        status:
          400,
      },
    );
  }

  try {
    /**
     * ==========================================================
     * MITRA
     * ==========================================================
     *
     * Bootstrap membaca `mitra.banner` langsung dari database.
     * Jangan hardcode /logo.png untuk identitas tenant.
     */
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

          banner:
            mitra.banner,
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
        .limit(
          1,
        );

    if (!targetMitra) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            'Mitra tidak ditemukan.',
        },
        {
          status:
            404,
        },
      );
    }

    const productsUrl =
      new URL(
        '/api/products',
        requestUrl.origin,
      );

    const couponsUrl =
      new URL(
        '/api/coupons',
        requestUrl.origin,
      );

    productsUrl.searchParams.set(
      'slug',
      slug,
    );

    couponsUrl.searchParams.set(
      'slug',
      slug,
    );

    if (branchSlug) {
      productsUrl.searchParams.set(
        'branch_slug',
        branchSlug,
      );

      couponsUrl.searchParams.set(
        'branch_slug',
        branchSlug,
      );
    }

    const [
      productsResult,
      couponsResult,
    ] =
      await Promise.all([
        invokeInternalRoute(
          getProducts,
          productsUrl,
          request,
        ),

        invokeInternalRoute(
          getCoupons,
          couponsUrl,
          request,
        ),
      ]);

    if (
      !productsResult.response.ok ||
      !productsResult.result
        ?.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            productsResult.result
              ?.message ??
            'Mitra atau cabang tidak ditemukan.',
        },
        {
          status:
            productsResult
              .response.status,
        },
      );
    }

    const rawProducts =
      Array.isArray(
        productsResult.result
          .data,
      )
        ? productsResult.result
            .data
        : [];

    const rawCategories =
      Array.isArray(
        productsResult.result
          .categoriesData,
      )
        ? productsResult.result
            .categoriesData
        : [];

    const rawPromos =
      couponsResult.response.ok &&
      couponsResult.result
        ?.success &&
      Array.isArray(
        couponsResult.result
          .data,
      )
        ? couponsResult.result
            .data
        : [];

    /**
     * ==========================================================
     * CATEGORY
     * ==========================================================
     */
    const categories =
      rawCategories.map(
        (
          value:
            unknown,
          index:
            number,
        ) => {
          const row =
            asRecord(
              value,
            );

          return {
            id:
              text(
                row.id,
              ) ||
              String(
                index +
                  1,
              ),

            name:
              text(
                row.name,
              ) ||
              `Kategori ${index + 1}`,

            slug:
              nullableText(
                row.slug,
              ) ??
              undefined,
          };
        },
      );

    /**
     * ==========================================================
     * PRODUCTS
     * ==========================================================
     */
    const products =
      rawProducts.map(
        (
          value:
            unknown,
          index:
            number,
        ) => {
          const row =
            asRecord(
              value,
            );

          const groups =
            Array.isArray(
              row.categorizedAddons,
            )
              ? row.categorizedAddons
              : [];

          return {
            id:
              text(
                row.id,
              ) ||
              String(
                index +
                  1,
              ),

            name:
              text(
                row.name,
              ) ||
              `Produk ${index + 1}`,

            description:
              stripHtml(
                row.description,
              ),

            price:
              Math.max(
                0,
                numberValue(
                  row.basePrice ??
                    row.price,
                ),
              ),

            imageUrl:
              imageUrl(
                row.image ??
                  row.imageUrl,
              ),

            categoryId:
              nullableText(
                row.categoryId,
              ),

            categoryName:
              nullableText(
                row.categoryName,
              ),

            isAvailable:
              row.isAvailable !==
              false,

            stock:
              row.stock ===
                null ||
              row.stock ===
                undefined
                ? null
                : Math.max(
                    0,
                    numberValue(
                      row.stock,
                      0,
                    ),
                  ),

            addOnGroups:
              groups.map(
                (
                  groupValue:
                    unknown,
                ) => {
                  const group =
                    asRecord(
                      groupValue,
                    );

                  const addOns =
                    Array.isArray(
                      group.addons,
                    )
                      ? group.addons
                      : [];

                  return {
                    categoryName:
                      text(
                        group.categoryName,
                      ) ||
                      'Tambahan',

                    maxSelected:
                      Math.max(
                        0,
                        Math.floor(
                          numberValue(
                            group.maxSelected ??
                              group.max_selected,
                            0,
                          ),
                        ),
                      ),

                    isRequired:
                      booleanValue(
                        group.isRequired ??
                          group.is_required,
                      ),

                    addOns:
                      addOns.map(
                        (
                          addOnValue:
                            unknown,
                          addOnIndex:
                            number,
                        ) => {
                          const addOn =
                            asRecord(
                              addOnValue,
                            );

                          return {
                            id:
                              Math.floor(
                                numberValue(
                                  addOn.id,
                                  addOnIndex +
                                    1,
                                ),
                              ),

                            name:
                              text(
                                addOn.name,
                              ) ||
                              `Add-on ${addOnIndex + 1}`,

                            price:
                              Math.max(
                                0,
                                numberValue(
                                  addOn.price,
                                ),
                              ),

                            /**
                             * Dipertahankan untuk UI Kiosk agar add-on
                             * yang stock-nya habis dapat dinonaktifkan.
                             */
                            stock:
                              addOn.stock ===
                                null ||
                              addOn.stock ===
                                undefined
                                ? null
                                : Math.max(
                                    0,
                                    numberValue(
                                      addOn.stock,
                                      0,
                                    ),
                                  ),

                            isTrackStock:
                              booleanValue(
                                addOn.is_track_stock ??
                                  addOn.isTrackStock,
                              ),
                          };
                        },
                      ),
                  };
                },
              ),
          };
        },
      );

    /**
     * ==========================================================
     * PROMOS
     * ==========================================================
     */
    const promos =
      rawPromos.map(
        (
          value:
            unknown,
          index:
            number,
        ) => {
          const row =
            asRecord(
              value,
            );

          return {
            id:
              Math.floor(
                numberValue(
                  row.id,
                  index +
                    1,
                ),
              ),

            title:
              text(
                row.title,
              ) ||
              `Promo ${index + 1}`,

            description:
              stripHtml(
                row.description,
              ),

            couponCode:
              text(
                row.coupon_code ??
                  row.couponCode ??
                  row.code,
              ).toUpperCase(),

            discountRate:
              Math.max(
                0,
                numberValue(
                  row.discount_rate ??
                    row.discountRate,
                ),
              ),

            discountPrice:
              Math.max(
                0,
                numberValue(
                  row.discount_price ??
                    row.discountPrice,
                ),
              ),

            isMemberOnly:
              booleanValue(
                row.is_member_only ??
                  row.isMemberOnly,
              ),

            startDate:
              nullableText(
                row.start_date ??
                  row.startDate,
              ),

            expiredDate:
              nullableText(
                row.expired_date ??
                  row.expiredDate,
              ),
          };
        },
      );

    /**
     * ==========================================================
     * STORE IDENTITY
     * ==========================================================
     */
    const mitraName =
      text(
        targetMitra.name ??
          productsResult.result
            .mitraName,
      ) ||
      'KALOO POS';

    const branchName =
      nullableText(
        productsResult.result
          .branchName,
      );

    const branchIdRaw =
      productsResult.result
        .branchId;

    const branchId =
      branchIdRaw ===
        null ||
      branchIdRaw ===
        undefined ||
      branchIdRaw ===
        ''
        ? null
        : Math.floor(
            numberValue(
              branchIdRaw,
              0,
            ),
          ) ||
          null;

    const banner =
      bannerUrl(
        targetMitra.banner,
      );

    return NextResponse.json(
      {
        success:
          true,

        data: {
          store: {
            /**
             * Display name untuk Kiosk.
             */
            name:
              branchName
                ? `${mitraName} - ${branchName}`
                : mitraName,

            mitraName,
            branchName,

            /**
             * Source-of-truth logo/branding tenant:
             * kolom DB `mitra.banner`.
             *
             * Jika null, KioskWelcome menampilkan icon Store default.
             */
            banner,

            /**
             * Compatibility sementara untuk KioskApp lama.
             * Nilainya sama dengan banner, TIDAK pernah /logo.png.
             *
             * Setelah seluruh frontend sudah memakai `banner`,
             * field ini boleh dihapus.
             */
            logoUrl:
              banner,

            tagline:
              nullableText(
                targetMitra.welcome ??
                  productsResult.result
                    .mitraWelcome,
              ),

            address:
              nullableText(
                targetMitra.address ??
                  productsResult.result
                    .mitraAddress,
              ),

            mitraId:
              Number(
                targetMitra.id,
              ),

            branchId,

            mitraSlug:
              slug,

            branchSlug,
          },

          categories,
          products,
          promos,
        },
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error(
      '[KIOSK_BOOTSTRAP_ERROR]',
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
            : 'Gagal memuat kiosk.',
      },
      {
        status:
          500,
      },
    );
  }
}
