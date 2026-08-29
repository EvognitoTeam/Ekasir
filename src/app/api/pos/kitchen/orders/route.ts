import { NextResponse } from 'next/server';
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  orderItems,
  orders,
  products,
} from '@/db/schema';
import { requirePosAuth } from '@/lib/auth/posAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type KitchenStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'cancelled';

type KitchenTargetStatus =
  | 'preparing'
  | 'ready';

type KitchenOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: string | number | null;
  notes: unknown;
  menu_name: string | null;
};

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

function normalizeTargetStatus(value: unknown): KitchenTargetStatus | null {
  const status = normalizeString(value).toLowerCase();

  if (
    status === 'preparing' ||
    status === 'ready'
  ) {
    return status;
  }

  return null;
}

function parseOrderNotes(notes: unknown): unknown[] {
  if (notes === null || notes === undefined || notes === '') {
    return [];
  }

  if (Array.isArray(notes)) {
    return notes;
  }

  if (typeof notes === 'object') {
    return [notes];
  }

  if (typeof notes !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(notes) as unknown;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed !== null && parsed !== undefined) {
      return [parsed];
    }

    return [];
  } catch {
    return [];
  }
}

function isValidKitchenTransition(
  currentStatus: KitchenStatus,
  nextStatus: KitchenTargetStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  const transitions: Record<KitchenStatus, readonly KitchenTargetStatus[]> = {
    pending: [],
    confirmed: ['preparing'],
    preparing: ['ready'],
    ready: [],
    cancelled: [],
  };

  return transitions[currentStatus].includes(nextStatus);
}

function getExpectedNextStatus(
  currentStatus: KitchenStatus,
): KitchenTargetStatus | null {
  switch (currentStatus) {
    case 'confirmed':
      return 'preparing';
    case 'preparing':
      return 'ready';
    default:
      return null;
  }
}

function isKitchenStatus(value: unknown): value is KitchenStatus {
  return (
    value === 'pending' ||
    value === 'confirmed' ||
    value === 'preparing' ||
    value === 'ready' ||
    value === 'cancelled'
  );
}

/**
 * GET /api/pos/kitchen/orders
 *
 * Role:
 * - Owner   : dapat memantau seluruh order di mitranya, sama seperti behaviour lama.
 * - Kitchen : hanya order pada branch yang terikat di session.
 *
 * Perbaikan utama:
 * - auth memakai requirePosAuth() yang memverifikasi JWT + user DB + mitra DB.
 * - order soft-delete tidak ikut dikirim.
 * - menghilangkan N+1 query orderItems. Semua item diambil dengan satu query.
 * - response tetap mempertahankan bentuk yang dipakai Kitchen UI.
 */
export async function GET(): Promise<Response> {
  const auth = await requirePosAuth({
    roles: ['Owner', 'Kitchen'],
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { session } = auth;

  try {
    const orderConditions = [
      eq(orders.mitra_id, session.mitraId),
      isNull(orders.deletedAt),
    ];

    // Preserve behaviour lama:
    // Kitchen selalu branch-scoped, Owner dapat melihat seluruh mitra.
    if (session.role === 'Kitchen') {
      orderConditions.push(
        session.branchId === null
          ? isNull(orders.branch_id)
          : eq(orders.branch_id, session.branchId),
      );
    }

    const rawOrders = await db
      .select()
      .from(orders)
      .where(and(...orderConditions))
      .orderBy(desc(orders.createdAt));

    if (rawOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        scope: {
          branchId:
            session.role === 'Kitchen'
              ? session.branchId
              : null,
          allBranches: session.role === 'Owner',
        },
      });
    }

    const orderIds = rawOrders.map((order) => Number(order.id));

    const rawItems = await db
      .select({
        id: orderItems.id,
        order_id: orderItems.order_id,
        product_id: orderItems.product_id,
        quantity: orderItems.quantity,
        price: orderItems.price,
        notes: orderItems.notes,
        menu_name: products.name,
      })
      .from(orderItems)
      .leftJoin(
        products,
        eq(orderItems.product_id, products.id),
      )
      .where(inArray(orderItems.order_id, orderIds));

    const itemsByOrderId = new Map<number, KitchenOrderItem[]>();

    for (const item of rawItems) {
      const orderId = Number(item.order_id);
      const existing = itemsByOrderId.get(orderId) ?? [];

      existing.push({
        id: Number(item.id),
        order_id: orderId,
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        price: item.price,
        notes: item.notes,
        menu_name: item.menu_name,
      });

      itemsByOrderId.set(orderId, existing);
    }

    const historyWithItems = rawOrders.map((order) => {
      const orderId = Number(order.id);
      const items = itemsByOrderId.get(orderId) ?? [];

      const itemsWithParsedNotes = items.map((item) => ({
        ...item,
        menuItemId: String(item.product_id),
        name: item.menu_name,
        selectedAddOnsDetails: parseOrderNotes(item.notes),
      }));

      const manualTableInfo = normalizeString(order.manual_table_info);
      const isTakeaway = manualTableInfo.toLowerCase() === 'takeaway';

      return {
        ...order,
        orderType: isTakeaway ? 'takeaway' : 'dine-in',
        items: itemsWithParsedNotes,
      };
    });

    return NextResponse.json({
      success: true,
      data: historyWithItems,
      scope: {
        branchId:
          session.role === 'Kitchen'
            ? session.branchId
            : null,
        allBranches: session.role === 'Owner',
      },
    });
  } catch (error) {
    console.error('[KITCHEN_GET_ORDERS_ERROR]', error);

    return jsonError(
      500,
      'Terjadi kesalahan saat memuat pesanan dapur.',
      'KITCHEN_ORDER_LIST_FAILED',
    );
  }
}

/**
 * PUT /api/pos/kitchen/orders
 *
 * Kitchen hanya menangani lifecycle dapur:
 *
 * confirmed -> preparing -> ready -> completed
 *
 * Status "confirmed" sengaja TIDAK dibuat dari endpoint Kitchen ini.
 * Pada codebase sekarang, first-confirmation memiliki side-effect lain
 * (product stock / loyalty) di route order history. Membiarkan Kitchen
 * mengubah pending -> confirmed atau pending -> preparing akan melewati
 * side-effect tersebut.
 *
 * Setelah side-effect order dipindahkan ke OrderService bersama,
 * endpoint ini dan cashier dapat memakai service yang sama.
 */
export async function PUT(request: Request): Promise<Response> {
  const auth = await requirePosAuth({
    roles: ['Owner', 'Kitchen'],
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { session } = auth;

  let body: {
    orderId?: unknown;
    status?: unknown;
    slug?: unknown;
  };

  try {
    body = (await request.json()) as {
      orderId?: unknown;
      status?: unknown;
      slug?: unknown;
    };
  } catch {
    return jsonError(
      400,
      'Request body harus berupa JSON yang valid.',
      'INVALID_JSON',
    );
  }

  const orderId = toPositiveInteger(body.orderId);
  const nextStatus = normalizeTargetStatus(body.status);
  const requestSlug = normalizeString(body.slug);

  if (!orderId) {
    return jsonError(
      400,
      'Order ID tidak valid.',
      'KITCHEN_ORDER_ID_INVALID',
    );
  }

  if (!nextStatus) {
    return jsonError(
      400,
      'Status Kitchen tidak valid.',
      'KITCHEN_STATUS_INVALID',
      {
        allowedStatuses: [
          'preparing',
          'ready',
        ],
      },
    );
  }

  // UI Kitchen saat ini mengirim slug. Jadikan sebagai validasi tambahan,
  // bukan sebagai sumber tenant.
  if (requestSlug && requestSlug !== session.slug) {
    return jsonError(
      403,
      'Akses ditolak. Slug toko tidak sesuai dengan sesi Anda.',
      'KITCHEN_MITRA_MISMATCH',
    );
  }

  try {
    const targetConditions = [
      eq(orders.id, orderId),
      eq(orders.mitra_id, session.mitraId),
      isNull(orders.deletedAt),
    ];

    if (session.role === 'Kitchen') {
      targetConditions.push(
        session.branchId === null
          ? isNull(orders.branch_id)
          : eq(orders.branch_id, session.branchId),
      );
    }

    const [targetOrder] = await db
      .select({
        id: orders.id,
        status: orders.status,
        branchId: orders.branch_id,
      })
      .from(orders)
      .where(and(...targetConditions))
      .limit(1);

    if (!targetOrder) {
      return jsonError(
        404,
        'Pesanan tidak ditemukan atau berada di cabang lain.',
        'KITCHEN_ORDER_NOT_FOUND',
      );
    }

    if (!isKitchenStatus(targetOrder.status)) {
      return jsonError(
        409,
        'Status pesanan saat ini tidak dikenali.',
        'KITCHEN_CURRENT_STATUS_INVALID',
        {
          currentStatus: targetOrder.status,
        },
      );
    }

    const currentStatus = targetOrder.status;

    // Idempotent replay. Jika browser mengulang PUT yang sama,
    // jangan menulis timestamp baru.
    if (currentStatus === nextStatus) {
      return NextResponse.json({
        success: true,
        reused: true,
        message: 'Status pesanan sudah sesuai.',
        data: {
          orderId,
          previousStatus: currentStatus,
          status: nextStatus,
        },
      });
    }

    if (!isValidKitchenTransition(currentStatus, nextStatus)) {
      return jsonError(
        409,
        currentStatus === 'pending'
          ? 'Pesanan belum dikonfirmasi oleh flow order/cashier.'
          : 'Perubahan status pesanan tidak diperbolehkan.',
        'KITCHEN_INVALID_STATUS_TRANSITION',
        {
          currentStatus,
          requestedStatus: nextStatus,
          expectedStatus: getExpectedNextStatus(currentStatus),
        },
      );
    }

    const now = new Date();
    const updateData: Partial<typeof orders.$inferInsert> = {
      status: nextStatus,
      updatedAt: now,
    };

    if (nextStatus === 'preparing') {
      updateData.preparingAt = now;
    }

    if (nextStatus === 'ready') {
      updateData.readyAt = now;
    }


    // Compare-and-swap pada current status mencegah dua request bersamaan
    // melakukan transition berbeda dari state lama yang sama.
    const updateConditions = [
      ...targetConditions,
      eq(orders.status, currentStatus),
    ];

    const updateResult = await db
      .update(orders)
      .set(updateData)
      .where(and(...updateConditions));

    const header = updateResult[0] as {
      affectedRows?: number;
    };

    if (Number(header?.affectedRows ?? 0) === 0) {
      return jsonError(
        409,
        'Status pesanan berubah oleh perangkat lain. Silakan muat ulang data Kitchen.',
        'KITCHEN_STATUS_CONFLICT',
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Status pesanan diperbarui!',
      data: {
        orderId,
        previousStatus: currentStatus,
        status: nextStatus,
      },
    });
  } catch (error) {
    console.error('[KITCHEN_PUT_ORDER_ERROR]', error);

    return jsonError(
      500,
      'Gagal memperbarui status pesanan.',
      'KITCHEN_ORDER_UPDATE_FAILED',
    );
  }
}
