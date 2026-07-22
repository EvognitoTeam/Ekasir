import { and, asc, eq, isNull, like, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  addonCategories,
  addons,
  categories,
  products,
} from '@/db/schema';
import {
  requireMobileAuth,
  resolveMobileBranch,
} from '@/lib/mobile-api/auth';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const { searchParams } = new URL(request.url);
    const branchId = resolveMobileBranch(auth, searchParams.get('branch_id'));
    const search = String(searchParams.get('search') ?? '').trim();
    const categoryId = Number(searchParams.get('category_id') ?? 0);
    const page = Math.max(Number(searchParams.get('page') ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(products.mitra_id, auth.mitraId),
      isNull(products.deletedAt),
      branchId ? eq(products.branch_id, branchId) : isNull(products.branch_id),
    ];

    if (categoryId > 0) conditions.push(eq(products.categories_id, categoryId));
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`),
        )!,
      );
    }

    const [rows, countRows, categoryRows, addonCategoryRows, addonRows] =
      await Promise.all([
        db
          .select()
          .from(products)
          .where(and(...conditions))
          .orderBy(asc(products.name))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(and(...conditions)),
        db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.mitra_id, auth.mitraId),
              isNull(categories.deletedAt),
            ),
          )
          .orderBy(asc(categories.name)),
        db
          .select()
          .from(addonCategories)
          .where(eq(addonCategories.mitra_id, auth.mitraId)),
        db
          .select()
          .from(addons)
          .where(
            and(eq(addons.mitra_id, auth.mitraId), isNull(addons.deletedAt)),
          ),
      ]);

    const data = rows.map((product) => {
      let parsedIds: unknown = product.addon_id;
      if (typeof parsedIds === 'string') {
        try {
          parsedIds = JSON.parse(parsedIds);
        } catch {
          parsedIds = [];
        }
      }

      const addonIds = Array.isArray(parsedIds)
        ? parsedIds.map(Number).filter(Number.isInteger)
        : [];

      const addonGroups = addonCategoryRows
        .map((category) => ({
          id: category.id,
          name: category.name,
          maxSelected: category.maxSelected,
          isRequired: Boolean(category.isRequired),
          items: addonRows
            .filter(
              (addon) =>
                addonIds.includes(Number(addon.id)) &&
                Number(addon.category_id) === Number(category.id),
            )
            .map((addon) => ({
              id: addon.id,
              name: addon.name,
              price: Number(addon.price),
            })),
        }))
        .filter((group) => group.items.length > 0);

      return {
        id: product.id,
        categoryId: product.categories_id,
        name: product.name,
        description: product.description ?? '',
        image: product.image ?? '',
        price: Number(product.price),
        stock: product.stock,
        isAvailable: product.status === 1 && Number(product.stock ?? 1) > 0,
        addonGroups,
      };
    });

    return mobileSuccess(data, {
      meta: {
        page,
        limit,
        total: Number(countRows[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countRows[0]?.count ?? 0) / limit),
        categories: categoryRows.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      },
    });
  } catch (error) {
    console.error('GET mobile products error:', error);
    return mobileError('PRODUCTS_FETCH_FAILED', 'Gagal mengambil produk.', 500);
  }
}
