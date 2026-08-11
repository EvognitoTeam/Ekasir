import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { orderItems, orders, products } from '@/db/schema';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

export const dynamic = 'force-dynamic';

type KitchenSession = JWTPayload & {
  userId?: number | string;
  mitraId?: number | string;
  branchId?: number | string | null;
  role?: string;
};

async function getAuthPayload(): Promise<KitchenSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;

  if (!token) return null;

  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as KitchenSession;
  } catch {
    return null;
  }
}

function getKitchenScope(payload: KitchenSession) {
  const mitraId = Number(payload.mitraId);
  const normalizedRole = String(payload.role ?? '').toLowerCase();
  const rawBranchId = payload.branchId;

  if (!Number.isInteger(mitraId) || mitraId <= 0) {
    return null;
  }

  if (!['owner', 'kitchen'].includes(normalizedRole)) {
    return null;
  }

  /*
   * Kitchen selalu mengikuti cabang pada sesi:
   * - branchId berisi angka: hanya cabang tersebut.
   * - branchId null/kosong: hanya outlet utama (branch_id IS NULL).
   *
   * Owner tidak dikunci cabang agar tetap dapat memantau seluruh mitra.
   */
  const isBranchScopedKitchen = normalizedRole === 'kitchen';
  const branchId =
    rawBranchId === null || rawBranchId === undefined || rawBranchId === ''
      ? null
      : Number(rawBranchId);

  if (
    branchId !== null &&
    (!Number.isInteger(branchId) || branchId <= 0)
  ) {
    return null;
  }

  return {
    mitraId,
    normalizedRole,
    isBranchScopedKitchen,
    branchId,
  };
}

// GET: mengambil tiket dapur sesuai scope mitra/cabang akun.
export async function GET() {
  try {
    const payload = await getAuthPayload();
    const scope = payload ? getKitchenScope(payload) : null;

    if (!scope) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const conditions = [eq(orders.mitra_id, scope.mitraId)];

    if (scope.isBranchScopedKitchen) {
      conditions.push(
        scope.branchId === null
          ? isNull(orders.branch_id)
          : eq(orders.branch_id, scope.branchId),
      );
    }

    const rawOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    const historyWithItems = await Promise.all(
      rawOrders.map(async (order) => {
        const items = await db
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
          .leftJoin(products, eq(orderItems.product_id, products.id))
          .where(eq(orderItems.order_id, order.id));

        const itemsWithParsedNotes = items.map((item) => {
          let parsedAddOns: unknown[] = [];

          if (item.notes) {
            if (typeof item.notes === 'string') {
              try {
                const parsed: unknown = JSON.parse(item.notes);
                parsedAddOns = Array.isArray(parsed) ? parsed : [parsed];
              } catch {
                parsedAddOns = [];
              }
            } else if (typeof item.notes === 'object') {
              parsedAddOns = Array.isArray(item.notes)
                ? item.notes
                : [item.notes];
            }
          }

          return {
            ...item,
            menuItemId: String(item.product_id),
            name: item.menu_name,
            selectedAddOnsDetails: parsedAddOns,
          };
        });

        return {
          ...order,
          orderType: order.table_number ? 'dine-in' : 'takeaway',
          items: itemsWithParsedNotes,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: historyWithItems,
      scope: {
        branchId: scope.isBranchScopedKitchen ? scope.branchId : null,
        allBranches: !scope.isBranchScopedKitchen,
      },
    });
  } catch (error) {
    console.error('Kitchen GET Error:', error);

    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

// PUT: memperbarui status hanya pada order yang berada dalam scope sesi.
export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    const scope = payload ? getKitchenScope(payload) : null;

    if (!scope) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      orderId?: string | number;
      status?: string;
    };

    const orderId = Number(body.orderId);
    const status = body.status;
    const allowedStatuses = ['confirmed', 'preparing', 'ready', 'completed'];

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0 ||
      !status ||
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid' },
        { status: 400 },
      );
    }

    const now = new Date();
    const updateData: Partial<typeof orders.$inferInsert> = {
      status: status as typeof orders.$inferInsert.status,
      updatedAt: now,
    };

    if (status === 'confirmed') updateData.confirmedAt = now;
    if (status === 'preparing') updateData.preparingAt = now;
    if (status === 'ready' || status === 'completed') updateData.readyAt = now;

    const updateConditions = [
      eq(orders.id, orderId),
      eq(orders.mitra_id, scope.mitraId),
    ];

    if (scope.isBranchScopedKitchen) {
      updateConditions.push(
        scope.branchId === null
          ? isNull(orders.branch_id)
          : eq(orders.branch_id, scope.branchId),
      );
    }

    const result = await db
      .update(orders)
      .set(updateData)
      .where(and(...updateConditions));

    if (result[0].affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pesanan tidak ditemukan atau berada di cabang lain.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Status pesanan diperbarui!',
    });
  } catch (error) {
    console.error('Kitchen PUT Order Error:', error);

    return NextResponse.json(
      { success: false, message: 'Gagal update status' },
      { status: 500 },
    );
  }
}
