import {
  NextResponse,
} from 'next/server';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

type UnknownRecord =
  Record<string, unknown>;

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
        /<\/p>/gi,
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
    image.startsWith('data:')
  ) {
    return image;
  }

  return `/${image}`;
}

async function fetchJson(
  url: URL,
  request: Request,
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
        headers: {
          Accept:
            'application/json',
          Cookie:
            request.headers.get(
              'cookie',
            ) ??
            '',
        },
      },
    );

  const result =
    await response.json();

  return {
    response,
    result,
  };
}

export async function GET(
  request: Request,
): Promise<Response> {
  const requestUrl =
    new URL(request.url);

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
        success: false,
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
        fetchJson(
          productsUrl,
          request,
        ),
        fetchJson(
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
          success: false,
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
        productsResult.result.data,
      )
        ? productsResult.result.data
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
        couponsResult.result.data,
      )
        ? couponsResult.result.data
        : [];

    const categories =
      rawCategories.map(
        (
          value: unknown,
          index: number,
        ) => {
          const row =
            asRecord(value);

          return {
            id:
              text(row.id) ||
              String(
                index + 1,
              ),
            name:
              text(row.name) ||
              `Kategori ${index + 1}`,
            slug:
              nullableText(
                row.slug,
              ) ??
              undefined,
          };
        },
      );

    const products =
      rawProducts.map(
        (
          value: unknown,
          index: number,
        ) => {
          const row =
            asRecord(value);

          const groups =
            Array.isArray(
              row.categorizedAddons,
            )
              ? row.categorizedAddons
              : [];

          return {
            id:
              text(row.id) ||
              String(
                index + 1,
              ),
            name:
              text(row.name) ||
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
              row.stock === null ||
              row.stock ===
                undefined
                ? null
                : numberValue(
                    row.stock,
                    0,
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
                      Boolean(
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
                          };
                        },
                      ),
                  };
                },
              ),
          };
        },
      );

    const promos =
      rawPromos.map(
        (
          value: unknown,
          index: number,
        ) => {
          const row =
            asRecord(value);

          return {
            id:
              Math.floor(
                numberValue(
                  row.id,
                  index + 1,
                ),
              ),
            title:
              text(row.title) ||
              `Promo ${index + 1}`,
            description:
              stripHtml(
                row.description,
              ),
            couponCode:
              text(
                row.coupon_code,
              ).toUpperCase(),
            discountRate:
              Math.max(
                0,
                numberValue(
                  row.discount_rate,
                ),
              ),
            discountPrice:
              Math.max(
                0,
                numberValue(
                  row.discount_price,
                ),
              ),
            isMemberOnly:
              Boolean(
                row.is_member_only,
              ),
            startDate:
              nullableText(
                row.start_date,
              ),
            expiredDate:
              nullableText(
                row.expired_date,
              ),
          };
        },
      );

    const mitraName =
      text(
        productsResult.result
          .mitraName,
      ) ||
      'EKASIR';

    const branchName =
      nullableText(
        productsResult.result
          .branchName,
      );

    return NextResponse.json(
      {
        success: true,
        data: {
          store: {
            name:
              branchName
                ? `${mitraName} - ${branchName}`
                : mitraName,
            mitraName,
            branchName,
            logoUrl:
              '/logo.png',
            tagline:
              nullableText(
                productsResult.result
                  .mitraWelcome,
              ),
            address:
              nullableText(
                productsResult.result
                  .mitraAddress,
              ),
            mitraId:
              0,
            branchId:
              null,
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
        success: false,
        message:
          error instanceof Error
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
