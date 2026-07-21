import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';
import { db } from '@/db';
import {
  coupon,
  mitra,
  orderItems,
  orders,
  products,
  tableList,
} from '@/db/schema';
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026',
);

type AuthPayload = JWTPayload & {
  userId?: number;
  mitraId?: number;
  branchId?: number | null;
  slug?: string;
  role?: string;
};

async function getAuthPayload(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

function isBranchScopedRole(role?: string) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'cashier' || normalized === 'kitchen';
}

function branchCondition(branchId?: number | null): SQL {
  return branchId == null
    ? isNull(orders.branch_id)
    : eq(orders.branch_id, Number(branchId));
}

async function getCashierOrderScope(slug: string) {
  const payload = await getAuthPayload();

  if (!payload) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Sesi kasir tidak ditemukan atau sudah berakhir.' },
        { status: 401 },
      ),
    };
  }

  if (payload.slug !== slug) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Sesi kasir tidak sesuai dengan toko ini.' },
        { status: 403 },
      ),
    };
  }

  const role = String(payload.role || '').toLowerCase();
  if (!['owner', 'cashier', 'kitchen'].includes(role)) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Akun tidak memiliki akses operasional.' },
        { status: 403 },
      ),
    };
  }

  const foundMitra = await db
    .select({ id: mitra.id })
    .from(mitra)
    .where(eq(mitra.mitra_slug, slug))
    .limit(1);

  if (foundMitra.length === 0 || Number(payload.mitraId) !== foundMitra[0].id) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Mitra tidak ditemukan atau akses ditolak.' },
        { status: 403 },
      ),
    };
  }

  const conditions: SQL[] = [eq(orders.mitra_id, foundMitra[0].id)];

  // Kasir/Kitchen selalu dikunci ke cabang pada akun.
  // branchId null berarti outlet utama dan hanya boleh membaca branch_id IS NULL.
  if (isBranchScopedRole(payload.role)) {
    conditions.push(branchCondition(payload.branchId));
  }

  return {
    payload,
    condition: and(...conditions) as SQL,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const slug = searchParams.get('slug');

  if (!userId && !slug) {
    return NextResponse.json(
      { success: false, message: 'User ID atau Slug Toko diperlukan' },
      { status: 400 },
    );
  }

  try {
    let queryCondition: SQL;

    if (slug) {
      const scope = await getCashierOrderScope(slug);
      if ('error' in scope) return scope.error;
      queryCondition = scope.condition;
    } else {
      queryCondition = eq(orders.user_id, Number(userId));
    }

    const userOrders = await db
      .select({
        id: orders.id,
        order_code: orders.order_code,
        branch_id: orders.branch_id,
        total_price: orders.total_price,
        totalPrice: orders.total_price,
        total_after_discount: orders.totalAfterDiscount,
        discount: orders.discount,
        discount_id: orders.discountId,
        status: orders.status,
        createdAt: orders.createdAt,
        created_at: orders.createdAt,
        coupon_code: coupon.coupon_code,
        table_name: tableList.table_name,
        table_number: orders.table_number,
        paymentStatus: orders.payment_status,
        paymentMethod: orders.payment_method,
        customerName: orders.name,
      })
      .from(orders)
      .leftJoin(coupon, eq(orders.discountId, coupon.id))
      .leftJoin(tableList, eq(orders.table_number, tableList.id))
      .where(queryCondition)
      .orderBy(desc(orders.createdAt));

    const historyWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const itemConditions: SQL[] = [eq(orderItems.order_id, order.id)];

        // Pertahanan tambahan agar item lintas cabang tidak ikut terbaca jika data lama tidak konsisten.
        if (order.branch_id == null) {
          itemConditions.push(isNull(orderItems.branch_id));
        } else {
          itemConditions.push(eq(orderItems.branch_id, order.branch_id));
        }

        const items = await db
          .select()
          .from(orderItems)
          .where(and(...itemConditions));

        const itemsWithParsedNotes = items.map((item) => {
          let parsedAddOns: unknown[] = [];

          if (item.notes) {
            if (typeof item.notes === 'string') {
              if (item.notes !== '[]' && item.notes !== '') {
                try {
                  const parsed = JSON.parse(item.notes);
                  parsedAddOns = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  console.error(`Gagal parse notes untuk item ID ${item.id}`);
                }
              }
            } else if (typeof item.notes === 'object') {
              parsedAddOns = Array.isArray(item.notes) ? item.notes : [item.notes];
            }
          }

          return {
            ...item,
            menuItemId: String(item.product_id),
            selectedAddOnsDetails: parsedAddOns,
          };
        });

        return {
          ...order,
          orderType: order.table_number ? 'dine-in' : 'takeaway',
          adminNotes: '',
          items: itemsWithParsedNotes,
        };
      }),
    );

    return NextResponse.json({ success: true, data: historyWithItems });
  } catch (error) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pesanan' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { success: false, message: 'Slug Toko diperlukan' },
      { status: 400 },
    );
  }

  try {
    const scope = await getCashierOrderScope(slug);
    if ('error' in scope) return scope.error;

    const body = await request.json();
    const { orderId, status, paymentStatus, adminNotes, getPayment, cashChange } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'ID Pesanan diperlukan' },
        { status: 400 },
      );
    }

    const targetCondition = and(eq(orders.id, Number(orderId)), scope.condition);
    const targetOrder = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(targetCondition)
      .limit(1);

    if (targetOrder.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pesanan tidak ditemukan pada cabang kasir ini.',
        },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      const now = new Date();
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (paymentStatus) updateData.payment_status = paymentStatus;
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
      if (getPayment !== undefined && getPayment !== null) {
        updateData.getPayment = String(getPayment);
      }

      if (cashChange !== undefined && cashChange !== null) {
        updateData.cashChange = String(cashChange);
        updateData.payment_status = '2';
      }

      if (status) {
        updateData.status = status;

        if (status === 'confirmed') updateData.confirmedAt = now;
        if (status === 'preparing') updateData.preparingAt = now;
        if (status === 'ready' || status === 'completed') updateData.readyAt = now;
      }

      await tx.update(orders).set(updateData).where(targetCondition);

      const isFirstConfirmation =
        status === 'confirmed' && targetOrder[0].status !== 'confirmed';

      if (isFirstConfirmation) {
        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.order_id, Number(orderId)));

        for (const item of items) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(eq(products.id, item.product_id));
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data pesanan dan stok berhasil diperbarui',
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui data' },
      { status: 500 },
    );
  }
}
