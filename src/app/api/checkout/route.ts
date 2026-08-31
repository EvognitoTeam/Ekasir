import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  addonCategories,
  addons,
  branches,
  coupon,
  couponBranches,
  couponUsages,
  mitra,
  orderItems,
  orders,
  products,
  settings,
  tableList,
  users,
} from '@/db/schema';

import { queueTableIoT } from '@/lib/iot/publish';

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckoutBody = {
  total?: unknown;
  discount?: unknown;
  totalAfterDiscount?: unknown;

  customer?: {
    userId?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    tableNumber?: unknown;
    serviceType?: unknown;
    manualTableInfo?: unknown;
    method?: unknown;
  };

  cartItems?: Array<{
    menuItemId?: unknown;
    product_id?: unknown;
    quantity?: unknown;
    selectedAddOns?: unknown;
    selectedAddOnsDetails?: unknown;
    priceAtOrder?: unknown;
    name?: unknown;
    title?: unknown;
    options?: unknown;
  }>;

  discountId?: unknown;
  slug?: unknown;

  branchSlug?: unknown;
  branch_slug?: unknown;
  branchId?: unknown;
  branch_id?: unknown;

  serviceType?: unknown;
  manualTableInfo?: unknown;

  idempotencyKey?: unknown;
  idempotency_key?: unknown;
};

type PaymentMethod = 'cash' | 'qris';

type MidtransItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

type NormalizedSubmittedAddonDetail = {
  id?: number;
  name: string;
  price: number;
  customerNote?: string;
};

type ResolvedAddonDetail = {
  id: number;
  name: string;
  price: number;
  categoryId: number | null;
  isTrackStock: boolean;
  stock: number;
};

type NormalizedCheckoutItem = {
  productId: number;
  quantity: number;
  fallbackName: string;
  requestedAddonIds: number[];
  submittedAddonDetails: NormalizedSubmittedAddonDetail[];
  price: number;
  selectedAddOnsDetails: Array<{
    id?: number;
    name: string;
    price: number;
    customer_note?: string;
  }>;
  resolvedAddons: ResolvedAddonDetail[];
};

class CheckoutError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(
    status: number,
    message: string,
    code = 'CHECKOUT_ERROR',
    details: unknown = null,
  ) {
    super(message);
    this.name = 'CheckoutError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function jsonError(
  status: number,
  message: string,
  code = 'REQUEST_FAILED',
  details: unknown = null,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        details,
      },
    },
    { status },
  );
}

function normalizeString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value ?? '').trim();
}

function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const method = normalizeString(value).toLowerCase();

  if (method === 'cash' || method === 'tunai') {
    return 'cash';
  }

  if (method === 'qris') {
    return 'qris';
  }

  return null;
}

function toInteger(value: unknown): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.floor(parsed);
}

function toPositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeRate(value: unknown): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  const phoneRegex = /^[+\d][\d\s\-()]{7,19}$/;

  return (
    phoneRegex.test(phone) &&
    cleaned.length >= 8 &&
    cleaned.length <= 15
  );
}

function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let index = 0; index < 6; index += 1) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length),
    );
  }

  return result;
}

function getIdempotencyKey(
  request: Request,
  body: CheckoutBody,
): string {
  return (
    request.headers.get('X-Idempotency-Key')?.trim() ||
    request.headers.get('Idempotency-Key')?.trim() ||
    normalizeString(body.idempotencyKey ?? body.idempotency_key)
  );
}

function calculatePlatformFee(
  grossAmount: number,
  rate: number,
): number {
  return Math.floor(grossAmount * (rate / 100));
}

function getMidtransUrl(production: boolean): string {
  return production
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';
}

function parseRepeatedJson(value: unknown): unknown {
  let current = value;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (typeof current !== 'string') {
      return current;
    }

    const trimmed = current.trim();

    if (!trimmed) {
      return [];
    }

    try {
      current = JSON.parse(trimmed);
    } catch {
      return current;
    }
  }

  return current;
}

function parsePositiveIntegerArray(value: unknown): number[] {
  const parsed = parseRepeatedJson(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return [
    ...new Set(
      parsed
        .map((item) => toPositiveInteger(item))
        .filter((item): item is number => item !== null),
    ),
  ];
}

function normalizeSubmittedAddonDetails(
  value: unknown,
): NormalizedSubmittedAddonDetail[] {
  const parsed = parseRepeatedJson(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  const result: NormalizedSubmittedAddonDetail[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }

    const detail = raw as Record<string, unknown>;
    const id = toPositiveInteger(
      detail.id ?? detail.addon_id ?? detail.addonId,
    );
    const name = normalizeString(
      detail.name ?? detail.addon_name ?? detail.addOnName ?? detail.label,
    ).slice(0, 255);
    const customerNote = normalizeString(
      detail.customer_note ??
        detail.customerNote ??
        detail.cust_notes ??
        detail.note,
    ).slice(0, 500);

    if (!id && !name && !customerNote) {
      continue;
    }

    result.push({
      ...(id ? { id } : {}),
      name,
      price: Math.max(
        0,
        toInteger(
          detail.price ?? detail.addon_price ?? detail.addonPrice,
        ),
      ),
      ...(customerNote ? { customerNote } : {}),
    });
  }

  return result;
}

function getRequestedAddonIds(
  selectedAddOns: unknown,
  submittedDetails: NormalizedSubmittedAddonDetail[],
): number[] {
  const idsFromSelectedAddOns = parsePositiveIntegerArray(selectedAddOns);

  if (idsFromSelectedAddOns.length > 0) {
    return idsFromSelectedAddOns;
  }

  return [
    ...new Set(
      submittedDetails
        .map((detail) => detail.id ?? null)
        .filter((id): id is number => id !== null),
    ),
  ];
}

function getInformationalNotes(
  submittedDetails: NormalizedSubmittedAddonDetail[],
): Array<{
  name: string;
  price: number;
  customer_note?: string;
}> {
  return submittedDetails
    .filter((detail) => {
      if (detail.customerNote) {
        return true;
      }

      return detail.name.toLowerCase().startsWith('size:');
    })
    .map((detail) => ({
      name: detail.name || 'Catatan',
      price: 0,
      ...(detail.customerNote
        ? { customer_note: detail.customerNote }
        : {}),
    }));
}

function parseApplicableItems(value: unknown): number[] {
  return parsePositiveIntegerArray(value);
}

function getSettingsCondition(
  mitraId: number,
  branchId: number | null,
) {
  if (branchId === null) {
    return and(
      eq(settings.mitraId, mitraId),
      isNull(settings.branch_id),
    );
  }

  return and(
    eq(settings.mitraId, mitraId),
    eq(settings.branch_id, branchId),
  );
}

async function findCheckoutSettings(
  mitraId: number,
  branchId: number | null,
) {
  if (branchId !== null) {
    const [branchSettings] = await db
      .select()
      .from(settings)
      .where(getSettingsCondition(mitraId, branchId))
      .limit(1);

    if (branchSettings) {
      return branchSettings;
    }
  }

  const [globalSettings] = await db
    .select()
    .from(settings)
    .where(getSettingsCondition(mitraId, null))
    .limit(1);

  return globalSettings ?? null;
}

async function resolveCheckoutBranch(
  mitraId: number,
  body: CheckoutBody,
): Promise<{
  id: number | null;
  slug: string | null;
  name: string | null;
}> {
  const requestedBranchId = toPositiveInteger(
    body.branchId ?? body.branch_id,
  );
  const requestedBranchSlug = normalizeString(
    body.branchSlug ?? body.branch_slug,
  );

  if (!requestedBranchId && !requestedBranchSlug) {
    return {
      id: null,
      slug: null,
      name: null,
    };
  }

  const conditions = [
    eq(branches.mitra_id, mitraId),
    isNull(branches.deletedAt),
  ];

  if (requestedBranchSlug) {
    conditions.push(
      eq(branches.branch_slug, requestedBranchSlug),
    );
  }

  if (requestedBranchId) {
    conditions.push(
      eq(branches.id, requestedBranchId),
    );
  }

  const [branch] = await db
    .select({
      id: branches.id,
      slug: branches.branch_slug,
      name: branches.name,
    })
    .from(branches)
    .where(and(...conditions))
    .limit(1);

  if (!branch) {
    throw new CheckoutError(
      404,
      'Cabang tidak ditemukan atau tidak sesuai dengan toko ini.',
      'BRANCH_NOT_FOUND',
      {
        branchId: requestedBranchId,
        branchSlug: requestedBranchSlug || null,
      },
    );
  }

  return branch;
}

async function findActiveCashier(
  mitraId: number,
  branchId: number | null,
) {
  const conditions = [
    eq(users.mitra_id, mitraId),
    eq(users.is_login, true),
    inArray(users.role, ['Cashier', 'Owner']),
    isNull(users.deletedAt),
  ];

  if (branchId !== null) {
    conditions.push(eq(users.branch_id, branchId));
  } else {
    conditions.push(isNull(users.branch_id));
  }

  const [cashier] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      mitraId: users.mitra_id,
      branchId: users.branch_id,
      loginAt: users.login_at,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.login_at), desc(users.id))
    .limit(1);

  return cashier ?? null;
}


async function compensateRejectedQrisOrder(
  orderId: number,
  mitraId: number,
  branchId: number | null,
  tableId: number | null,
  couponId: number | null,
  items: NormalizedCheckoutItem[],
  reason: string,
) {
  try {
    await db.transaction(async (tx) => {
      const [targetOrder] = await tx
        .select({
          id: orders.id,
          status: orders.status,
          paymentStatus: orders.payment_status,
        })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.mitra_id, mitraId),
            isNull(orders.deletedAt),
          ),
        )
        .limit(1);

      if (!targetOrder) {
        return;
      }

      if (
        targetOrder.status === 'cancelled' ||
        targetOrder.paymentStatus === '2'
      ) {
        return;
      }

      await tx
        .update(orders)
        .set({
          status: 'cancelled',
          payment_status: '3',
          cancelledAt: new Date(),
          cancelReason: reason.slice(0, 255),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.mitra_id, mitraId),
          ),
        );

      for (const item of items) {
        for (const selectedAddon of item.resolvedAddons) {
          if (!selectedAddon.isTrackStock) {
            continue;
          }

          const restoreConditions = [
            eq(addons.id, selectedAddon.id),
            eq(addons.mitra_id, mitraId),
            eq(addons.is_track_stock, true),
            isNull(addons.deletedAt),
          ];

          if (branchId !== null) {
            restoreConditions.push(eq(addons.branch_id, branchId));
          } else {
            restoreConditions.push(isNull(addons.branch_id));
          }

          await tx
            .update(addons)
            .set({
              stock: sql`${addons.stock} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(and(...restoreConditions));
        }
      }

      if (couponId !== null) {
        const [usage] = await tx
          .select({
            id: couponUsages.id,
          })
          .from(couponUsages)
          .where(
            and(
              eq(couponUsages.order_id, orderId),
              eq(couponUsages.coupon_id, couponId),
              eq(couponUsages.mitra_id, mitraId),
            ),
          )
          .limit(1);

        if (usage) {
          await tx
            .delete(couponUsages)
            .where(eq(couponUsages.id, usage.id));

          await tx
            .update(coupon)
            .set({
              already_used: sql`GREATEST(${coupon.already_used} - 1, 0)`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.mitra_id, mitraId),
                isNull(coupon.deletedAt),
              ),
            );
        }
      }

      if (tableId !== null) {
        const tableConditions = [
          eq(tableList.id, tableId),
          eq(tableList.mitra_id, mitraId),
          isNull(tableList.deletedAt),
        ];

        if (branchId !== null) {
          tableConditions.push(eq(tableList.branch_id, branchId));
        } else {
          tableConditions.push(isNull(tableList.branch_id));
        }

        await tx
          .update(tableList)
          .set({
            status: 1,
            updatedAt: new Date(),
          })
          .where(and(...tableConditions));
      }
    });

    if (tableId !== null) {
      queueTableIoT(
        tableId,
        'checkout-qris-compensated',
      );
    }
  } catch (compensationError) {
    console.error('[QRIS_COMPENSATION_ERROR]', {
      orderId,
      mitraId,
      compensationError,
    });
  }
}

function assertCouponUsageLimits(
  foundCoupon: typeof coupon.$inferSelect,
  userId: number | null,
  userUsages: Array<{ createdAt: Date }>,
  now: Date,
) {
  const maxUsePerUser = foundCoupon.is_claimable
    ? 1
    : Number(foundCoupon.max_use_per_user ?? 0);
  const dailyLimit = Number(foundCoupon.daily_user_limit ?? 0);
  const monthlyLimit = Number(foundCoupon.monthly_user_limit ?? 0);
  const yearlyLimit = Number(foundCoupon.yearly_user_limit ?? 0);

  const requiresUser =
    maxUsePerUser > 0 ||
    dailyLimit > 0 ||
    monthlyLimit > 0 ||
    yearlyLimit > 0;

  if (!requiresUser) {
    return;
  }

  if (!userId) {
    throw new CheckoutError(
      401,
      'Kupon ini memerlukan Member yang valid.',
      'MEMBER_LOGIN_REQUIRED',
    );
  }

  const totalUsage = userUsages.length;

  if (maxUsePerUser > 0 && totalUsage >= maxUsePerUser) {
    throw new CheckoutError(
      400,
      foundCoupon.is_claimable
        ? 'Voucher spesial ini sudah pernah digunakan.'
        : 'Anda sudah mencapai batas maksimal penggunaan promo ini.',
      'COUPON_USER_LIMIT_REACHED',
    );
  }

  if (dailyLimit > 0) {
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const dailyUsage = userUsages.filter(
      (usage) => usage.createdAt >= startOfDay,
    ).length;

    if (dailyUsage >= dailyLimit) {
      throw new CheckoutError(
        400,
        'Batas harian kupon ini telah habis.',
        'COUPON_DAILY_LIMIT_REACHED',
      );
    }
  }

  if (monthlyLimit > 0) {
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const monthlyUsage = userUsages.filter(
      (usage) => usage.createdAt >= startOfMonth,
    ).length;

    if (monthlyUsage >= monthlyLimit) {
      throw new CheckoutError(
        400,
        'Batas bulanan penggunaan kupon ini telah habis.',
        'COUPON_MONTHLY_LIMIT_REACHED',
      );
    }
  }

  if (yearlyLimit > 0) {
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const yearlyUsage = userUsages.filter(
      (usage) => usage.createdAt >= startOfYear,
    ).length;

    if (yearlyUsage >= yearlyLimit) {
      throw new CheckoutError(
        400,
        'Batas tahunan penggunaan kupon ini telah habis.',
        'COUPON_YEARLY_LIMIT_REACHED',
      );
    }
  }
}

async function validateAndCalculateCoupon(
  discountId: number | null,
  mitraId: number,
  branchId: number | null,
  customerUserId: number | null,
  items: NormalizedCheckoutItem[],
): Promise<{
  id: number | null;
  discountValue: number;
}> {
  if (discountId === null) {
    return {
      id: null,
      discountValue: 0,
    };
  }

  const [foundCoupon] = await db
    .select()
    .from(coupon)
    .where(
      and(
        eq(coupon.id, discountId),
        eq(coupon.mitra_id, mitraId),
        isNull(coupon.deletedAt),
      ),
    )
    .limit(1);

  if (!foundCoupon) {
    throw new CheckoutError(
      400,
      'Voucher atau kupon diskon tidak ditemukan.',
      'INVALID_DISCOUNT',
    );
  }

  const now = new Date();

  if (
    foundCoupon.start_date &&
    new Date(foundCoupon.start_date) > now
  ) {
    throw new CheckoutError(
      400,
      'Promo ini belum dimulai.',
      'COUPON_NOT_STARTED',
    );
  }

  if (
    foundCoupon.expired_date &&
    new Date(foundCoupon.expired_date) < now
  ) {
    throw new CheckoutError(
      400,
      'Kupon sudah kedaluwarsa.',
      'COUPON_EXPIRED',
    );
  }

  if (
    foundCoupon.max_use > 0 &&
    foundCoupon.already_used >= foundCoupon.max_use
  ) {
    throw new CheckoutError(
      400,
      'Kuota promo ini sudah habis.',
      'COUPON_GLOBAL_LIMIT_REACHED',
    );
  }

  const [branchMappings, userUsages] = await Promise.all([
    db
      .select({
        branchId: couponBranches.branch_id,
      })
      .from(couponBranches)
      .where(eq(couponBranches.coupon_id, foundCoupon.id)),

    customerUserId
      ? db
          .select({
            createdAt: couponUsages.createdAt,
          })
          .from(couponUsages)
          .where(
            and(
              eq(couponUsages.coupon_id, foundCoupon.id),
              eq(couponUsages.user_id, customerUserId),
            ),
          )
      : Promise.resolve([] as Array<{ createdAt: Date }>),
  ]);

  const branchIds = branchMappings.map((mapping) => mapping.branchId);
  const appliesToBranch =
    branchIds.length === 0 ||
    (branchId !== null && branchIds.includes(branchId));

  if (!appliesToBranch) {
    throw new CheckoutError(
      400,
      'Kupon tidak berlaku di outlet ini.',
      'COUPON_BRANCH_NOT_ALLOWED',
    );
  }

  const isMemberOnly =
    foundCoupon.is_member_only === true ||
    Number(foundCoupon.is_member_only) === 1;

  if (isMemberOnly && customerUserId === null) {
    throw new CheckoutError(
      401,
      'Kupon ini khusus Member. Silakan login atau pilih Member terlebih dahulu.',
      'MEMBER_LOGIN_REQUIRED',
    );
  }

  if (foundCoupon.is_claimable) {
    if (foundCoupon.claimed_by_user_id === null) {
      throw new CheckoutError(
        403,
        'Voucher ini harus diklaim terlebih dahulu.',
        'COUPON_NOT_CLAIMED',
      );
    }

    if (foundCoupon.claimed_by_user_id !== customerUserId) {
      throw new CheckoutError(
        403,
        'Kupon tidak valid atau dimiliki Member lain.',
        'COUPON_OWNER_MISMATCH',
      );
    }
  }

  assertCouponUsageLimits(
    foundCoupon,
    customerUserId,
    userUsages,
    now,
  );

  const applicableProductIds = parseApplicableItems(
    foundCoupon.applicable_items,
  );

  const applicableSubtotal =
    applicableProductIds.length === 0
      ? items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        )
      : items.reduce((sum, item) => {
          if (!applicableProductIds.includes(item.productId)) {
            return sum;
          }

          return sum + item.price * item.quantity;
        }, 0);

  if (applicableSubtotal <= 0) {
    return {
      id: foundCoupon.id,
      discountValue: 0,
    };
  }

  const discountRate = Math.max(
    0,
    Number(foundCoupon.discount_rate ?? 0),
  );
  const discountPrice = Math.max(
    0,
    toInteger(foundCoupon.discount_price ?? 0),
  );

  let discountValue = 0;

  if (discountRate > 0 && discountPrice > 0) {
    const calculatedPercentage = Math.floor(
      applicableSubtotal * (discountRate / 100),
    );

    discountValue = Math.min(
      calculatedPercentage,
      discountPrice,
    );
  } else if (discountRate > 0) {
    discountValue = Math.floor(
      applicableSubtotal * (discountRate / 100),
    );
  } else if (discountPrice > 0) {
    discountValue = Math.min(
      discountPrice,
      applicableSubtotal,
    );
  }

  discountValue = Math.max(
    0,
    Math.min(discountValue, applicableSubtotal),
  );

  return {
    id: foundCoupon.id,
    discountValue,
  };
}

export async function POST(request: Request): Promise<Response> {
  let checkoutStep = 'START';

  try {
    checkoutStep = 'PARSE_REQUEST';

    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
      checkoutStep = 'REQUEST_PARSED';
    } catch {
      return jsonError(
        400,
        'Request body harus berupa JSON yang valid.',
        'INVALID_JSON',
      );
    }

    const customer = body.customer;
    const cartItems = body.cartItems;
    const slug = normalizeString(body.slug);
    const idempotencyKey = getIdempotencyKey(request, body);

    if (!slug) {
      return jsonError(
        400,
        'Slug toko wajib diisi.',
        'SLUG_REQUIRED',
      );
    }

    if (!idempotencyKey) {
      return jsonError(
        400,
        'Idempotency key wajib dikirim.',
        'IDEMPOTENCY_KEY_REQUIRED',
      );
    }

    if (idempotencyKey.length > 100) {
      return jsonError(
        400,
        'Idempotency key maksimal 100 karakter.',
        'IDEMPOTENCY_KEY_TOO_LONG',
      );
    }

    if (!customer || !Array.isArray(cartItems) || cartItems.length === 0) {
      return jsonError(
        400,
        'Data pelanggan dan keranjang wajib diisi.',
        'INVALID_CHECKOUT_DATA',
      );
    }

    if (cartItems.length > 100) {
      return jsonError(
        400,
        'Jumlah baris item dalam satu checkout terlalu banyak.',
        'TOO_MANY_CART_ITEMS',
      );
    }

    const customerName = normalizeString(customer.name).slice(0, 255);
    const customerEmail = normalizeString(customer.email)
      .toLowerCase()
      .slice(0, 255);
    const customerPhone = normalizeString(customer.phone).slice(0, 255);
    const paymentMethod = normalizePaymentMethod(customer.method);

    if (!customerName) {
      return jsonError(
        400,
        'Nama pelanggan wajib diisi.',
        'CUSTOMER_NAME_REQUIRED',
      );
    }

    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(customerEmail)) {
        return jsonError(
          400,
          'Format email tidak valid.',
          'INVALID_EMAIL_FORMAT',
        );
      }
    }

    if (customerPhone && !isValidPhoneNumber(customerPhone)) {
      return jsonError(
        400,
        'Format nomor telepon tidak valid. Gunakan 8 hingga 15 digit angka.',
        'INVALID_PHONE_FORMAT',
      );
    }

    if (!paymentMethod) {
      return jsonError(
        400,
        'Metode pembayaran tidak valid.',
        'INVALID_PAYMENT_METHOD',
        {
          submittedMethod: normalizeString(customer.method),
          allowedPaymentMethods: ['cash', 'qris'],
        },
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (paymentMethod === 'qris' && !serverKey) {
      return jsonError(
        500,
        'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
        'MIDTRANS_NOT_CONFIGURED',
      );
    }

    checkoutStep = 'FIND_MITRA';

    const [foundMitra] = await db
      .select()
      .from(mitra)
      .where(
        and(
          eq(mitra.mitra_slug, slug),
          eq(mitra.status, 1),
          isNull(mitra.deletedAt),
        ),
      )
      .limit(1);

    if (!foundMitra) {
      return jsonError(
        404,
        'Mitra tidak ditemukan atau sedang tidak aktif.',
        'MITRA_NOT_FOUND',
      );
    }

    const mitraId = foundMitra.id;

    checkoutStep = 'RESOLVE_BRANCH';

    const resolvedBranch = await resolveCheckoutBranch(
      mitraId,
      body,
    );
    const branchId = resolvedBranch.id;

    checkoutStep = 'CHECK_IDEMPOTENCY';

    const [existingOrder] = await db
      .select({
        id: orders.id,
        orderCode: orders.order_code,
        branchId: orders.branch_id,
        paymentMethod: orders.payment_method,
        paymentStatus: orders.payment_status,
        status: orders.status,
        tableId: orders.table_number,
        totalAfterDiscount: orders.totalAfterDiscount,
        qrUrl: orders.qr_url,
        qrString: orders.qr_string,
        expiryTime: orders.expiry_time,
        transactionId: orders.transaction_id,
      })
      .from(orders)
      .where(
        and(
          eq(orders.mitra_id, mitraId),
          eq(orders.idempotencyKey, idempotencyKey),
          isNull(orders.deletedAt),
        ),
      )
      .limit(1);

    if (existingOrder) {
      if (
        existingOrder.status === 'cancelled' ||
        existingOrder.paymentStatus === '3'
      ) {
        return jsonError(
          409,
          'Percobaan checkout sebelumnya dengan idempotency key ini gagal. Silakan kirim checkout baru.',
          'PREVIOUS_CHECKOUT_FAILED',
          {
            orderId: existingOrder.id,
            orderCode: existingOrder.orderCode,
          },
        );
      }

      if ((existingOrder.branchId ?? null) !== branchId) {
        return jsonError(
          409,
          'Idempotency key sudah digunakan pada scope cabang yang berbeda.',
          'IDEMPOTENCY_SCOPE_CONFLICT',
        );
      }

      if (existingOrder.tableId !== null) {
        queueTableIoT(
          existingOrder.tableId,
          'checkout-idempotent-replay',
        );
      }

      return NextResponse.json({
        success: true,
        reused: true,
        idempotentReplay: true,
        message: 'Request checkout ini sudah pernah diproses.',
        orderId: existingOrder.id,
        orderCode: existingOrder.orderCode,
        paymentMethod: existingOrder.paymentMethod,
        paymentStatus: existingOrder.paymentStatus,
        status: existingOrder.status,
        transactionId: existingOrder.transactionId ?? null,
        qrUrl: existingOrder.qrUrl ?? null,
        qrString: existingOrder.qrString ?? null,
        expiryTime: existingOrder.expiryTime ?? null,
        totals: {
          grandTotal: Number(existingOrder.totalAfterDiscount ?? 0),
        },
      });
    }

    checkoutStep = 'FIND_SETTINGS';

    const foundSetting = await findCheckoutSettings(
      mitraId,
      branchId,
    );

    const taxRate = normalizeRate(foundSetting?.taxRate ?? 0);
    const serviceRate = normalizeRate(foundSetting?.serviceRate ?? 0);
    const isTaxIncluded = Number(foundSetting?.isTaxIncluded ?? 0) === 1;
    const platformFeeRate = normalizeRate(foundMitra.cashout ?? 0);

    checkoutStep = 'FIND_ACTIVE_CASHIER';

    const activeCashier = await findActiveCashier(
      mitraId,
      branchId,
    );

    if (!activeCashier) {
      return jsonError(
        409,
        branchId !== null
          ? 'Tidak ada kasir aktif yang sedang login pada cabang ini.'
          : 'Tidak ada kasir pusat yang sedang login.',
        'ACTIVE_CASHIER_NOT_FOUND',
        {
          mitraId,
          branchId,
          branchSlug: resolvedBranch.slug,
        },
      );
    }

    checkoutStep = 'NORMALIZE_ITEMS';

    const normalizedItemsRaw = cartItems.map((item, index) => {
      const productId = toPositiveInteger(
        item.menuItemId ?? item.product_id,
      );
      const quantity = toInteger(item.quantity);

      if (productId === null || quantity <= 0) {
        throw new CheckoutError(
          400,
          `Item keranjang ke-${index + 1} tidak valid.`,
          'INVALID_CART_ITEM',
          { index },
        );
      }

      if (quantity > 999) {
        throw new CheckoutError(
          400,
          `Quantity item ke-${index + 1} terlalu besar.`,
          'INVALID_ITEM_QUANTITY',
          { index, quantity },
        );
      }

      const submittedAddonDetails = normalizeSubmittedAddonDetails(
        item.selectedAddOnsDetails,
      );

      return {
        productId,
        quantity,
        requestedAddonIds: getRequestedAddonIds(
          item.selectedAddOns,
          submittedAddonDetails,
        ),
        submittedAddonDetails,
        fallbackName: normalizeString(item.name ?? item.title).slice(0, 255),
      };
    });

    const productIds = [
      ...new Set(normalizedItemsRaw.map((item) => item.productId)),
    ];

    checkoutStep = 'FIND_PRODUCTS';

    const productConditions = [
      inArray(products.id, productIds),
      eq(products.mitra_id, mitraId),
      eq(products.status, 1),
      isNull(products.deletedAt),
    ];

    if (branchId !== null) {
      productConditions.push(eq(products.branch_id, branchId));
    } else {
      productConditions.push(isNull(products.branch_id));
    }

    const databaseProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        addonIds: products.addon_id,
        mitraId: products.mitra_id,
        branchId: products.branch_id,
      })
      .from(products)
      .where(and(...productConditions));

    const productMap = new Map(
      databaseProducts.map((product) => [Number(product.id), product]),
    );

    for (const item of normalizedItemsRaw) {
      if (!productMap.has(item.productId)) {
        return jsonError(
          400,
          `Produk ID ${item.productId} tidak ditemukan, tidak aktif, atau bukan milik outlet ini.`,
          'PRODUCT_NOT_FOUND',
          {
            productId: item.productId,
            mitraId,
            branchId,
          },
        );
      }
    }

    checkoutStep = 'RESOLVE_ADDONS';

    const allowedAddonIdsByProduct = new Map<number, number[]>();
    const allAllowedAddonIds = new Set<number>();

    for (const product of databaseProducts) {
      const ids = parsePositiveIntegerArray(product.addonIds);
      allowedAddonIdsByProduct.set(Number(product.id), ids);

      for (const id of ids) {
        allAllowedAddonIds.add(id);
      }
    }

    for (const item of normalizedItemsRaw) {
      const allowedIds = allowedAddonIdsByProduct.get(item.productId) ?? [];

      for (const addonId of item.requestedAddonIds) {
        if (!allowedIds.includes(addonId)) {
          return jsonError(
            400,
            `Add-on ID ${addonId} tidak tersedia untuk produk ini.`,
            'ADDON_NOT_ALLOWED_FOR_PRODUCT',
            {
              productId: item.productId,
              addonId,
            },
          );
        }
      }
    }

    const addonMap = new Map<number, ResolvedAddonDetail>();
    const addonCategoryMap = new Map<
      number,
      {
        id: number;
        isRequired: number;
        maxSelected: number;
      }
    >();

    if (allAllowedAddonIds.size > 0) {
      const addonConditions = [
        inArray(addons.id, [...allAllowedAddonIds]),
        eq(addons.mitra_id, mitraId),
        eq(addons.is_active, true),
        isNull(addons.deletedAt),
      ];

      if (branchId !== null) {
        addonConditions.push(eq(addons.branch_id, branchId));
      } else {
        addonConditions.push(isNull(addons.branch_id));
      }

      const databaseAddons = await db
        .select({
          id: addons.id,
          name: addons.name,
          price: addons.price,
          categoryId: addons.category_id,
          stock: addons.stock,
          isTrackStock: addons.is_track_stock,
        })
        .from(addons)
        .where(and(...addonConditions));

      for (const addon of databaseAddons) {
        addonMap.set(Number(addon.id), {
          id: Number(addon.id),
          name: addon.name,
          price: Math.max(0, toInteger(addon.price)),
          categoryId:
            addon.categoryId === null ? null : Number(addon.categoryId),
          isTrackStock: addon.isTrackStock === true,
          stock: Math.max(0, toInteger(addon.stock)),
        });
      }

      const categoryIds = [
        ...new Set(
          databaseAddons
            .map((addon) =>
              addon.categoryId === null ? null : Number(addon.categoryId),
            )
            .filter((id): id is number => id !== null),
        ),
      ];

      if (categoryIds.length > 0) {
        const categoryConditions = [
          inArray(addonCategories.id, categoryIds),
          eq(addonCategories.mitra_id, mitraId),
        ];

        if (branchId !== null) {
          categoryConditions.push(eq(addonCategories.branch_id, branchId));
        } else {
          categoryConditions.push(isNull(addonCategories.branch_id));
        }

        const databaseCategories = await db
          .select({
            id: addonCategories.id,
            isRequired: addonCategories.isRequired,
            maxSelected: addonCategories.maxSelected,
          })
          .from(addonCategories)
          .where(and(...categoryConditions));

        for (const category of databaseCategories) {
          addonCategoryMap.set(Number(category.id), {
            id: Number(category.id),
            isRequired: Number(category.isRequired ?? 0),
            maxSelected: Number(category.maxSelected ?? 0),
          });
        }
      }
    }

    const normalizedItems: NormalizedCheckoutItem[] = [];

    for (const item of normalizedItemsRaw) {
      const dbProduct = productMap.get(item.productId)!;
      const allowedIds = allowedAddonIdsByProduct.get(item.productId) ?? [];
      const availableAllowedAddons = allowedIds
        .map((id) => addonMap.get(id))
        .filter((addon): addon is ResolvedAddonDetail => Boolean(addon));

      const selectedAddons: ResolvedAddonDetail[] = [];

      for (const addonId of item.requestedAddonIds) {
        const foundAddon = addonMap.get(addonId);

        if (!foundAddon) {
          return jsonError(
            400,
            `Add-on ID ${addonId} tidak ditemukan, tidak aktif, atau bukan milik outlet ini.`,
            'ADDON_NOT_FOUND',
            {
              productId: item.productId,
              addonId,
              branchId,
            },
          );
        }

        selectedAddons.push(foundAddon);
      }

      const categorySelectionCount = new Map<number, number>();

      for (const selectedAddon of selectedAddons) {
        if (selectedAddon.categoryId === null) {
          continue;
        }

        categorySelectionCount.set(
          selectedAddon.categoryId,
          (categorySelectionCount.get(selectedAddon.categoryId) ?? 0) + 1,
        );
      }

      const productCategoryIds = [
        ...new Set(
          availableAllowedAddons
            .map((addon) => addon.categoryId)
            .filter((id): id is number => id !== null),
        ),
      ];

      for (const categoryId of productCategoryIds) {
        const category = addonCategoryMap.get(categoryId);

        if (!category) {
          continue;
        }

        const selectedCount = categorySelectionCount.get(categoryId) ?? 0;

        if (category.isRequired === 1 && selectedCount < 1) {
          return jsonError(
            400,
            'Pilihan add-on wajib belum lengkap.',
            'REQUIRED_ADDON_MISSING',
            {
              productId: item.productId,
              categoryId,
            },
          );
        }

        if (
          category.maxSelected > 0 &&
          selectedCount > category.maxSelected
        ) {
          return jsonError(
            400,
            'Jumlah pilihan add-on melebihi batas kategori.',
            'ADDON_MAX_SELECTION_EXCEEDED',
            {
              productId: item.productId,
              categoryId,
              maxSelected: category.maxSelected,
              selectedCount,
            },
          );
        }
      }

      for (const selectedAddon of selectedAddons) {
        if (
          selectedAddon.isTrackStock &&
          selectedAddon.stock < item.quantity
        ) {
          return jsonError(
            409,
            `Stok add-on ${selectedAddon.name} tidak mencukupi.`,
            'ADDON_OUT_OF_STOCK',
            {
              addonId: selectedAddon.id,
              availableStock: selectedAddon.stock,
              requestedQuantity: item.quantity,
            },
          );
        }
      }

      let itemPrice = toInteger(dbProduct.price);

      for (const selectedAddon of selectedAddons) {
        itemPrice += selectedAddon.price;
      }

      const resolvedDetails = selectedAddons.map((selectedAddon) => ({
        id: selectedAddon.id,
        name: selectedAddon.name,
        price: selectedAddon.price,
      }));

      normalizedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        fallbackName: item.fallbackName,
        requestedAddonIds: item.requestedAddonIds,
        submittedAddonDetails: item.submittedAddonDetails,
        price: itemPrice,
        selectedAddOnsDetails: [
          ...getInformationalNotes(item.submittedAddonDetails),
          ...resolvedDetails,
        ],
        resolvedAddons: selectedAddons,
      });
    }

    const basePrice = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (basePrice <= 0) {
      return jsonError(
        400,
        'Subtotal tidak valid.',
        'INVALID_ORDER_AMOUNT',
        {
          subtotal: basePrice,
        },
      );
    }

    const customerUserId = toPositiveInteger(customer.userId);

    if (customerUserId !== null) {
      const [foundCustomer] = await db
        .select({
          id: users.id,
          role: users.role,
        })
        .from(users)
        .where(
          and(
            eq(users.id, customerUserId),
            eq(users.mitra_id, mitraId),
            // eq(users.role, 'User'),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!foundCustomer) {
        return jsonError(
          400,
          'Member tidak ditemukan pada mitra ini.',
          'CUSTOMER_NOT_FOUND',
        );
      }
    }

    checkoutStep = 'VALIDATE_COUPON';

    const submittedDiscountId = toPositiveInteger(body.discountId);
    const validatedCoupon = await validateAndCalculateCoupon(
      submittedDiscountId,
      mitraId,
      branchId,
      customerUserId,
      normalizedItems,
    );

    const validDiscountId = validatedCoupon.id;
    const discountValue = Math.max(
      0,
      Math.min(validatedCoupon.discountValue, basePrice),
    );

    const subtotalAfterDiscount = basePrice - discountValue;

    let tax = 0;
    let service = 0;
    let finalGrandTotal = 0;

    if (isTaxIncluded) {
      const serviceDecimal = serviceRate / 100;
      const taxDecimal = taxRate / 100;
      const divisor = (1 + serviceDecimal) * (1 + taxDecimal);
      const trueBase =
        divisor > 0
          ? Math.floor(subtotalAfterDiscount / divisor)
          : subtotalAfterDiscount;

      service = Math.floor(trueBase * serviceDecimal);
      tax = subtotalAfterDiscount - trueBase - service;
      finalGrandTotal = subtotalAfterDiscount;
    } else {
      service = Math.floor(
        subtotalAfterDiscount * (serviceRate / 100),
      );
      tax = Math.floor(
        (subtotalAfterDiscount + service) * (taxRate / 100),
      );
      finalGrandTotal = subtotalAfterDiscount + service + tax;
    }

    const frontendTotal = toInteger(body.totalAfterDiscount);

    if (finalGrandTotal !== frontendTotal) {
      return jsonError(
        400,
        'Terjadi ketidaksesuaian harga. Silakan muat ulang halaman.',
        'TOTAL_MISMATCH',
        {
          backendTotal: finalGrandTotal,
          frontendTotal,
          subtotal: basePrice,
          discount: discountValue,
          tax,
          service,
          branchId,
        },
      );
    }

    const platformFee = calculatePlatformFee(
      finalGrandTotal,
      platformFeeRate,
    );

    const generatedCode = generateOrderCode();
    const now = new Date();
    const midtransOrderId =
      paymentMethod === 'qris'
        ? `KALOOPOS-${mitraId}-${generatedCode}`
        : null;

    checkoutStep = 'START_TRANSACTION';

    const transactionResult = await db.transaction(async (tx) => {
      let finalTableId: number | null = null;
      let manualTableInfo: string | null = null;

      const tableNumber = normalizeString(customer.tableNumber);
      const serviceType = normalizeString(
        customer.serviceType ?? body.serviceType,
      ).toLowerCase();
      const submittedManualTableInfo = normalizeString(
        customer.manualTableInfo ?? body.manualTableInfo,
      ).slice(0, 100);

      const isTakeaway =
        serviceType === 'takeaway' ||
        submittedManualTableInfo.toLowerCase() === 'takeaway';

      if (
        tableNumber &&
        tableNumber.toLowerCase() !== 'walk-in'
      ) {
        const tableConditions = [
          eq(tableList.mitra_id, mitraId),
          eq(tableList.table_code, tableNumber),
          isNull(tableList.deletedAt),
        ];

        if (branchId !== null) {
          tableConditions.push(eq(tableList.branch_id, branchId));
        } else {
          tableConditions.push(isNull(tableList.branch_id));
        }

        const [foundTable] = await tx
          .select({ id: tableList.id })
          .from(tableList)
          .where(and(...tableConditions))
          .limit(1);

        if (foundTable) {
          finalTableId = foundTable.id;

          await tx
            .update(tableList)
            .set({
              status: 2,
              updatedAt: now,
            })
            .where(
              and(
                eq(tableList.id, finalTableId),
                eq(tableList.mitra_id, mitraId),
              ),
            );
        }
      }

      if (isTakeaway) {
        manualTableInfo = 'Takeaway';
      } else if (
        !finalTableId &&
        tableNumber &&
        tableNumber.toLowerCase() !== 'walk-in'
      ) {
        manualTableInfo = tableNumber.slice(0, 100);
      }

      checkoutStep = 'LOCK_COUPON';

      if (validDiscountId !== null && discountValue > 0) {
        await tx.execute(sql`
          SELECT id
          FROM coupon
          WHERE id = ${validDiscountId}
            AND mitra_id = ${mitraId}
          FOR UPDATE
        `);

        const [lockedCoupon] = await tx
          .select()
          .from(coupon)
          .where(
            and(
              eq(coupon.id, validDiscountId),
              eq(coupon.mitra_id, mitraId),
              isNull(coupon.deletedAt),
            ),
          )
          .limit(1);

        if (!lockedCoupon) {
          throw new CheckoutError(
            409,
            'Kupon tidak lagi tersedia.',
            'COUPON_CHANGED_DURING_CHECKOUT',
          );
        }

        const couponNow = new Date();

        if (
          lockedCoupon.start_date &&
          new Date(lockedCoupon.start_date) > couponNow
        ) {
          throw new CheckoutError(
            409,
            'Promo belum dimulai.',
            'COUPON_NOT_STARTED',
          );
        }

        if (
          lockedCoupon.expired_date &&
          new Date(lockedCoupon.expired_date) < couponNow
        ) {
          throw new CheckoutError(
            409,
            'Kupon sudah kedaluwarsa.',
            'COUPON_EXPIRED',
          );
        }

        if (
          lockedCoupon.max_use > 0 &&
          lockedCoupon.already_used >= lockedCoupon.max_use
        ) {
          throw new CheckoutError(
            409,
            'Kuota promo ini baru saja habis.',
            'COUPON_GLOBAL_LIMIT_REACHED',
          );
        }

        if (
          lockedCoupon.is_member_only &&
          customerUserId === null
        ) {
          throw new CheckoutError(
            401,
            'Kupon ini khusus Member.',
            'MEMBER_LOGIN_REQUIRED',
          );
        }

        if (
          lockedCoupon.is_claimable &&
          lockedCoupon.claimed_by_user_id !== customerUserId
        ) {
          throw new CheckoutError(
            403,
            'Voucher ini bukan milik Member yang dipilih.',
            'COUPON_OWNER_MISMATCH',
          );
        }

        const lockedUserUsages = customerUserId
          ? await tx
              .select({
                createdAt: couponUsages.createdAt,
              })
              .from(couponUsages)
              .where(
                and(
                  eq(couponUsages.coupon_id, validDiscountId),
                  eq(couponUsages.user_id, customerUserId),
                ),
              )
          : [];

        assertCouponUsageLimits(
          lockedCoupon,
          customerUserId,
          lockedUserUsages,
          couponNow,
        );
      }

      checkoutStep = 'PREPARE_ORDER_INSERT';

      const orderValues: typeof orders.$inferInsert = {
        order_code: generatedCode,
        mitra_id: mitraId,
        branch_id: branchId,
        user_id: customerUserId,
        cashier_id: activeCashier.id,
        name: customerName,
        email: customerEmail || null,
        phone_number: customerPhone || null,
        table_number: finalTableId,
        manual_table_info: manualTableInfo,
        total_price: String(basePrice),
        tax: String(tax),
        service: String(service),
        discount: String(discountValue),
        discountId: validDiscountId,
        totalAfterDiscount: String(finalGrandTotal),
        payment_method: paymentMethod,
        idempotencyKey,
        platformFee: String(platformFee),
        platformFeeRate: String(platformFeeRate),
        paymentPaidAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        status: 'pending',
        payment_status: '1',
        is_cashouted: false,
        createdAt: now,
        updatedAt: now,
      };

      checkoutStep = 'INSERT_ORDER';

      const insertResults = await tx
        .insert(orders)
        .values(orderValues);
      const insertResult = insertResults[0];

      if (!insertResult || !insertResult.insertId) {
        throw new Error(
          'Order berhasil diproses tetapi insertId tidak dikembalikan database.',
        );
      }

      const newOrderId = Number(insertResult.insertId);

      checkoutStep = 'PREPARE_ORDER_ITEMS';

      const itemsToInsert: Array<typeof orderItems.$inferInsert> =
        normalizedItems.map((item) => ({
          order_id: newOrderId,
          product_id: item.productId,
          mitra_id: mitraId,
          branch_id: branchId,
          quantity: item.quantity,
          notes: item.selectedAddOnsDetails,
          price: String(item.price),
          createdAt: now,
          updatedAt: now,
        }));

      checkoutStep = 'INSERT_ORDER_ITEMS';

      await tx
        .insert(orderItems)
        .values(itemsToInsert);

      checkoutStep = 'DEDUCT_ADDON_STOCKS';

      for (const item of normalizedItems) {
        for (const selectedAddon of item.resolvedAddons) {
          if (!selectedAddon.isTrackStock) {
            continue;
          }

          const stockConditions = [
            eq(addons.id, selectedAddon.id),
            eq(addons.mitra_id, mitraId),
            eq(addons.is_active, true),
            eq(addons.is_track_stock, true),
            isNull(addons.deletedAt),
            gte(addons.stock, item.quantity),
          ];

          if (branchId !== null) {
            stockConditions.push(eq(addons.branch_id, branchId));
          } else {
            stockConditions.push(isNull(addons.branch_id));
          }

          const updateResult = await tx
            .update(addons)
            .set({
              stock: sql`${addons.stock} - ${item.quantity}`,
              updatedAt: now,
            })
            .where(and(...stockConditions));

          const header = updateResult[0] as {
            affectedRows?: number;
          };

          if (Number(header?.affectedRows ?? 0) !== 1) {
            throw new CheckoutError(
              409,
              `Stok add-on ${selectedAddon.name} tidak mencukupi.`,
              'ADDON_OUT_OF_STOCK',
              {
                addonId: selectedAddon.id,
                requestedQuantity: item.quantity,
              },
            );
          }
        }
      }

      checkoutStep = 'RECORD_COUPON_USAGE';

      if (validDiscountId !== null && discountValue > 0) {
        await tx
          .update(coupon)
          .set({
            already_used: sql`${coupon.already_used} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(coupon.id, validDiscountId),
              eq(coupon.mitra_id, mitraId),
              isNull(coupon.deletedAt),
            ),
          );

        await tx
          .insert(couponUsages)
          .values({
            coupon_id: validDiscountId,
            order_id: newOrderId,
            mitra_id: mitraId,
            user_id: customerUserId,
            discount_amount: String(discountValue),
            createdAt: now,
          });
      }

      return {
        id: newOrderId,
        code: generatedCode,
        midtransOrderId,
        finalTableId,
      };
    });

    /*
     * Setelah transaction commit, minta IoT Gateway membaca ulang state
     * meja/order dari DB lalu push full snapshot ke ESP32.
     */
    if (transactionResult.finalTableId !== null) {
      queueTableIoT(
        transactionResult.finalTableId,
        `checkout-created:${paymentMethod}`,
      );
    }

    if (paymentMethod === 'cash') {
      return NextResponse.json(
        {
          success: true,
          message: 'Pesanan cash berhasil dibuat.',
          orderId: transactionResult.id,
          orderCode: transactionResult.code,
          paymentMethod,
          totals: {
            subtotal: basePrice,
            discount: discountValue,
            service,
            tax,
            grandTotal: finalGrandTotal,
          },
        },
        { status: 201 },
      );
    }

    const productNameMap = new Map(
      databaseProducts.map((product) => [
        String(product.id),
        product.name,
      ]),
    );

    const midtransItems: MidtransItem[] = normalizedItems.map(
      (item) => ({
        id: String(item.productId).substring(0, 50),
        price: item.price,
        quantity: item.quantity,
        name: String(
          productNameMap.get(String(item.productId)) ||
            item.fallbackName ||
            `Item ${item.productId}`,
        ).substring(0, 50),
      }),
    );

    if (discountValue > 0) {
      midtransItems.push({
        id: 'DISC',
        price: -discountValue,
        quantity: 1,
        name: 'Discount/Promo',
      });
    }

    if (!isTaxIncluded) {
      if (service > 0) {
        midtransItems.push({
          id: 'SRV',
          price: service,
          quantity: 1,
          name: 'Service Charge',
        });
      }

      if (tax > 0) {
        midtransItems.push({
          id: 'TAX',
          price: tax,
          quantity: 1,
          name: 'Tax / PB1',
        });
      }
    }

    const calculatedMidtransTotal = midtransItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (calculatedMidtransTotal !== finalGrandTotal) {
      midtransItems.push({
        id: 'ADJ',
        price: finalGrandTotal - calculatedMidtransTotal,
        quantity: 1,
        name: 'Rounding Adjustment',
      });
    }

    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    checkoutStep = 'MIDTRANS_CHARGE';

    const midtransResponse = await fetch(getMidtransUrl(isProduction), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: {
          order_id: transactionResult.midtransOrderId,
          gross_amount: finalGrandTotal,
        },
        item_details: midtransItems,
        customer_details: {
          first_name: customerName,
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
        },
      }),
    });

    let midtransData: Record<string, any>;

    try {
      midtransData = (await midtransResponse.json()) as Record<string, any>;
    } catch {
      throw new CheckoutError(
        502,
        'Midtrans mengembalikan response yang tidak valid.',
        'MIDTRANS_INVALID_RESPONSE',
        {
          orderCode: transactionResult.code,
        },
      );
    }

    if (!midtransResponse.ok || midtransData.status_code !== '201') {
      await compensateRejectedQrisOrder(
        transactionResult.id,
        mitraId,
        branchId,
        transactionResult.finalTableId,
        validDiscountId,
        normalizedItems,
        normalizeString(midtransData.status_message) ||
          'Midtrans menolak pembuatan transaksi QRIS.',
      );

      return jsonError(
        502,
        normalizeString(midtransData.status_message) ||
          'Midtrans gagal membuat transaksi QRIS.',
        'MIDTRANS_CHARGE_FAILED',
        {
          orderId: transactionResult.id,
          orderCode: transactionResult.code,
          midtransStatusCode: midtransData.status_code ?? null,
        },
      );
    }

    const qrAction = Array.isArray(midtransData.actions)
      ? midtransData.actions.find(
          (action: { name?: string; url?: string }) =>
            action.name === 'generate-qr-code',
        )
      : null;

    checkoutStep = 'UPDATE_QRIS_ORDER';

    const expiryTime = midtransData.expiry_time
      ? new Date(midtransData.expiry_time)
      : null;

    await db
      .update(orders)
      .set({
        transaction_id: midtransData.transaction_id ?? null,
        payment_type: midtransData.payment_type ?? 'qris',
        issuer: midtransData.issuer ?? null,
        qr_url: qrAction?.url ?? null,
        qr_string: midtransData.qr_string ?? null,
        expiry_time: expiryTime,
        payment_status: '1',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, transactionResult.id),
          eq(orders.mitra_id, mitraId),
          isNull(orders.deletedAt),
        ),
      );

    if (transactionResult.finalTableId !== null) {
      queueTableIoT(
        transactionResult.finalTableId,
        'checkout-qris-ready',
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'QRIS berhasil dibuat.',
        orderId: transactionResult.id,
        orderCode: transactionResult.code,
        paymentMethod: 'qris',
        transactionId: midtransData.transaction_id ?? null,
        qrUrl: qrAction?.url ?? null,
        qrString: midtransData.qr_string ?? null,
        expiryTime,
        totals: {
          subtotal: basePrice,
          discount: discountValue,
          service,
          tax,
          grandTotal: finalGrandTotal,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error('[WEBSITE_CHECKOUT_ERROR]', {
      checkoutStep,
      error,
    });

    if (error instanceof CheckoutError) {
      return jsonError(
        error.status,
        error.message,
        error.code,
        error.details,
      );
    }

    if (
      errorMessage.toLowerCase().includes('duplicate') &&
      errorMessage.toLowerCase().includes('idempotency')
    ) {
      return jsonError(
        409,
        'Request checkout yang sama sedang atau sudah diproses.',
        'IDEMPOTENCY_CONFLICT',
      );
    }

    return jsonError(
      500,
      'Internal Server Error',
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development'
        ? {
            checkoutStep,
            message: errorMessage,
            stack: error instanceof Error ? error.stack : null,
          }
        : null,
    );
  }
}
