import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  branches,
  mitra,
  orders,
  tableDevice,
  tableList,
} from '@/db/schema';
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
} from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import {
  getTableIoTStatuses,
  queueIoTDeviceReconnect,
  queueTableIoT,
  queueTablePagerIoT,
  setTablePagerIoT,
} from '@/lib/iot/publish';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'rahasia-super-aman-evokasir-2026',
);

const MAX_BULK_TABLES = 30;

function generateTableCode() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    {
      length: 6,
    },
    () =>
      chars[
        Math.floor(
          Math.random() *
            chars.length,
        )
      ],
  ).join('');
}

async function getAuthPayload() {
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
    return (
      await jwtVerify(
        token,
        SECRET_KEY,
      )
    ).payload as {
      branchId?:
        | number
        | string;
      role?: string;
    };
  } catch {
    return null;
  }
}

async function getMitraBySlug(
  slug: string,
) {
  return db
    .select()
    .from(mitra)
    .where(
      eq(
        mitra.mitra_slug,
        slug,
      ),
    )
    .limit(1);
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

function getPayloadBranchId(
  branchId:
    | number
    | string
    | undefined,
): number | null | 'main' {
  if (
    branchId ===
      undefined ||
    branchId ===
      null ||
    branchId ===
      ''
  ) {
    return null;
  }

  if (
    String(
      branchId,
    ).toLowerCase() ===
    'main'
  ) {
    return 'main';
  }

  const parsed =
    Number(branchId);

  if (
    Number.isInteger(
      parsed,
    ) &&
    parsed > 0
  ) {
    return parsed;
  }

  return null;
}

export async function GET(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const slug =
      searchParams.get(
        'slug',
      );

    const requestedBranchId =
      searchParams.get(
        'branch_id',
      );

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug toko diperlukan',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      !foundMitra.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const conditions = [
      eq(
        tableList.mitra_id,
        foundMitra[0].id,
      ),
      isNull(
        tableList.deletedAt,
      ),
    ];

    const sessionBranch =
      getPayloadBranchId(
        payload.branchId,
      );

    const finalBranchId =
      sessionBranch ??
      (
        requestedBranchId ===
        'main'
          ? 'main'
          : requestedBranchId
            ? Number(
                requestedBranchId,
              )
            : null
      );

    if (
      finalBranchId ===
      'main'
    ) {
      conditions.push(
        isNull(
          tableList.branch_id,
        ),
      );
    } else if (
      finalBranchId
    ) {
      conditions.push(
        eq(
          tableList.branch_id,
          Number(
            finalBranchId,
          ),
        ),
      );
    }

    const tables =
      await db
        .select({
          id:
            tableList.id,
          table_code:
            tableList.table_code,
          table_name:
            tableList.table_name,
          capacity:
            tableList.capacity,
          status:
            tableList.status,
          branch_id:
            tableList.branch_id,
          branch_name:
            branches.name,
          branch_slug:
            branches.branch_slug,
        })
        .from(
          tableList,
        )
        .leftJoin(
          branches,
          eq(
            tableList.branch_id,
            branches.id,
          ),
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .orderBy(
          asc(
            tableList.table_name,
          ),
        );

    const tableIds =
      tables.map(
        (
          table,
        ) =>
          Number(
            table.id,
          ),
      );

    const iotStatuses =
      await getTableIoTStatuses(
        tableIds,
      );

    /*
     * Assignment device ke meja ditentukan oleh table_id.
     * iot_devices.status adalah status ALAT, bukan status meja.
     *
     * Karena itu device tetap harus tampil di Kasir walaupun:
     * inactive / maintenance / banned.
     */
    const assignedDevices =
      tableIds.length >
      0
        ? await db
            .select({
              id:
                tableDevice.id,
              tableId:
                tableDevice.table_id,
              hexId:
                tableDevice.hex_id,
              serialNumber:
                tableDevice.serial_number,
              deviceStatus:
                tableDevice.status,
            })
            .from(
              tableDevice,
            )
            .where(
              and(
                eq(
                  tableDevice.mitra_id,
                  foundMitra[0].id,
                ),
                inArray(
                  tableDevice.table_id,
                  tableIds,
                ),
              ),
            )
        : [];

    const deviceByTable =
      new Map<
        number,
        {
          id: number;
          hexId:
            | string
            | null;
          serialNumber:
            | string
            | null;
          deviceStatus:
            | 'active'
            | 'inactive'
            | 'maintenance'
            | 'banned'
            | null;
        }
      >();

    /*
     * Kalau data lama ternyata punya lebih dari satu device pada satu meja,
     * prioritaskan device berdasarkan status operasional untuk display.
     */
    const devicePriority = {
      active: 0,
      inactive: 1,
      maintenance: 2,
      banned: 3,
    } as const;

    assignedDevices.sort(
      (
        first,
        second,
      ) => {
        const firstPriority =
          devicePriority[
            (
              first.deviceStatus ||
              'banned'
            ) as keyof typeof devicePriority
          ] ??
          99;

        const secondPriority =
          devicePriority[
            (
              second.deviceStatus ||
              'banned'
            ) as keyof typeof devicePriority
          ] ??
          99;

        return (
          firstPriority -
          secondPriority
        );
      },
    );

    for (
      const device of
      assignedDevices
    ) {
      const deviceTableId =
        Number(
          device.tableId ??
          0,
        );

      if (
        deviceTableId >
          0 &&
        !deviceByTable.has(
          deviceTableId,
        )
      ) {
        deviceByTable.set(
          deviceTableId,
          {
            id:
              Number(
                device.id,
              ),
            hexId:
              device.hexId,
            serialNumber:
              device.serialNumber,
            deviceStatus:
              (
                device.deviceStatus as
                  | 'active'
                  | 'inactive'
                  | 'maintenance'
                  | 'banned'
                  | null
              ) ??
              null,
          },
        );
      }
    }

    const iotByTable =
      new Map(
        iotStatuses.map(
          (
            item,
          ) => [
            Number(
              item.tableId,
            ),
            item,
          ],
        ),
      );

    const tablesWithIoT =
      tables.map(
        (
          table,
        ) => {
          const tableId =
            Number(
              table.id,
            );

          const iot =
            iotByTable.get(
              tableId,
            );

          const device =
            deviceByTable.get(
              tableId,
            );

          return {
            ...table,
            /*
             * Registered/assigned di UI berarti ada row iot_devices
             * dengan table_id meja ini, terlepas dari status alat.
             */
            iot_registered:
              Boolean(
                device,
              ),
            iot_registered_count:
              device
                ? 1
                : 0,
            iot_online:
              Boolean(
                iot?.online,
              ),
            iot_online_count:
              Number(
                iot?.onlineCount ??
                  0,
              ),
            iot_pager_active:
              Boolean(
                iot?.pagerActive,
              ),
            iot_pager_source:
              iot?.pagerSource ??
              null,

            iot_device_id:
              device?.id ??
              null,

            iot_device_hex:
              device?.hexId ??
              null,

            iot_device_serial:
              device?.serialNumber ??
              null,

            /*
             * Status ALAT dari iot_devices:
             * active | inactive | maintenance | banned
             */
            iot_device_status:
              device?.deviceStatus ??
              null,
          };
        },
      );

    return NextResponse.json({
      success: true,
      data:
        tablesWithIoT,
    });
  } catch (error) {
    console.error(
      'GET tables error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal mengambil data meja',
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const slug =
      searchParams.get(
        'slug',
      );

    const body =
      await request.json();

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Slug toko diperlukan',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      !foundMitra.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const count =
      Math.min(
        Math.max(
          Number(
            body.count ||
              1,
          ),
          1,
        ),
        MAX_BULK_TABLES,
      );

    const capacity =
      Math.max(
        Number(
          body.capacity ||
            4,
        ),
        1,
      );

    const status =
      [
        0,
        1,
        2,
        3,
      ].includes(
        Number(
          body.status,
        ),
      )
        ? Number(
            body.status,
          )
        : 1;

    const prefix =
      String(
        body.prefix ||
          body.name ||
          'Meja',
      )
        .trim()
        .slice(
          0,
          15,
        ) ||
      'Meja';

    const startNumber =
      Math.max(
        Number(
          body.start_number ||
            1,
        ),
        1,
      );

    const sessionBranch =
      getPayloadBranchId(
        payload.branchId,
      );

    const finalBranchId =
      sessionBranch ===
      'main'
        ? null
        : sessionBranch ??
          (
            body.branch_id
              ? Number(
                  body.branch_id,
                )
              : null
          );

    const values =
      Array.from(
        {
          length: count,
        },
        (
          _,
          index,
        ) => ({
          mitra_id:
            foundMitra[0].id,
          branch_id:
            finalBranchId,
          table_name:
            count === 1 &&
            body.name
              ? String(
                  body.name,
                )
                  .trim()
                  .slice(
                    0,
                    20,
                  )
              : `${prefix} ${
                  startNumber +
                  index
                }`.slice(
                  0,
                  20,
                ),
          table_code:
            generateTableCode(),
          capacity,
          status,
          createdAt:
            new Date(),
          updatedAt:
            new Date(),
        }),
      );

    await db
      .insert(
        tableList,
      )
      .values(
        values,
      );

    return NextResponse.json({
      success: true,
      count:
        values.length,
      message:
        `${values.length} meja berhasil dibuat`,
    });
  } catch (error) {
    console.error(
      'POST tables error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal membuat meja',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const payload =
      await getAuthPayload();

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    const slug =
      searchParams.get(
        'slug',
      );

    const body =
      await request.json();

    if (
      !slug ||
      !body.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Data tidak lengkap',
        },
        {
          status: 400,
        },
      );
    }

    const foundMitra =
      await getMitraBySlug(
        slug,
      );

    if (
      !foundMitra.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Mitra tidak ditemukan',
        },
        {
          status: 404,
        },
      );
    }

    const tableId =
      Number(
        body.id,
      );

    if (
      !Number.isInteger(
        tableId,
      ) ||
      tableId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'ID meja tidak valid',
        },
        {
          status: 400,
        },
      );
    }

    const conditions = [
      eq(
        tableList.id,
        tableId,
      ),
      eq(
        tableList.mitra_id,
        foundMitra[0].id,
      ),
      isNull(
        tableList.deletedAt,
      ),
    ];

    const sessionBranch =
      getPayloadBranchId(
        payload.branchId,
      );

    if (
      sessionBranch ===
      'main'
    ) {
      conditions.push(
        isNull(
          tableList.branch_id,
        ),
      );
    } else if (
      sessionBranch
    ) {
      conditions.push(
        eq(
          tableList.branch_id,
          sessionBranch,
        ),
      );
    }

    const [currentTable] =
      await db
        .select({
          id:
            tableList.id,
          table_name:
            tableList.table_name,
          status:
            tableList.status,
        })
        .from(
          tableList,
        )
        .where(
          and(
            ...conditions,
          ),
        )
        .limit(
          1,
        );

    if (!currentTable) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Meja tidak ditemukan atau berada di cabang lain',
        },
        {
          status: 404,
        },
      );
    }

    /*
     * ============================================================
     * CASHIER MANUAL TABLE STATUS
     * ============================================================
     *
     * Kasir boleh mengatur:
     * 0 = DISABLED
     * 1 = AVAILABLE
     * 2 = OCCUPIED
     *
     * RESERVED (3) tetap dikelola oleh flow reservation.
     */
    if (
      body.action ===
      'set-status'
    ) {
      const role =
        normalizeRole(
          payload.role,
        );

      if (
        role !==
          'cashier' &&
        role !==
          'owner'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Hanya Cashier atau Owner yang dapat mengubah status meja',
          },
          {
            status: 403,
          },
        );
      }

      const nextStatus =
        Number(
          body.status,
        );

      if (
        ![
          0,
          1,
          2,
        ].includes(
          nextStatus,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Status manual hanya boleh AVAILABLE, OCCUPIED, atau DISABLED',
          },
          {
            status: 400,
          },
        );
      }

      const currentStatus =
        Number(
          currentTable.status,
        );

      if (
        currentStatus ===
        3
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Meja RESERVED harus diubah melalui flow reservasi',
          },
          {
            status: 409,
          },
        );
      }

      if (
        currentStatus ===
        nextStatus
      ) {
        queueTableIoT(
          tableId,
          `cashier-table-status-refresh:${nextStatus}`,
        );

        return NextResponse.json({
          success: true,
          reused: true,
          message:
            'Status meja sudah sesuai',
          data: {
            id:
              tableId,
            status:
              nextStatus,
          },
        });
      }

      /*
       * Jangan membuat meja AVAILABLE/DISABLED jika meja sedang OCCUPIED
       * dan masih mempunyai order aktif.
       */
      if (
        currentStatus ===
          2 &&
        (
          nextStatus ===
            0 ||
          nextStatus ===
            1
        )
      ) {
        const activeOrderConditions = [
          eq(
            orders.mitra_id,
            foundMitra[0].id,
          ),
          eq(
            orders.table_number,
            tableId,
          ),
          inArray(
            orders.status,
            [
              'pending',
              'confirmed',
              'preparing',
              'ready',
            ],
          ),
          isNull(
            orders.deletedAt,
          ),
        ];

        if (
          sessionBranch ===
          'main'
        ) {
          activeOrderConditions.push(
            isNull(
              orders.branch_id,
            ),
          );
        } else if (
          sessionBranch
        ) {
          activeOrderConditions.push(
            eq(
              orders.branch_id,
              sessionBranch,
            ),
          );
        }

        const [
          activeOrder,
        ] =
          await db
            .select({
              id:
                orders.id,
              orderCode:
                orders.order_code,
              status:
                orders.status,
            })
            .from(
              orders,
            )
            .where(
              and(
                ...activeOrderConditions,
              ),
            )
            .limit(
              1,
            );

        if (
          activeOrder
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                'Meja masih memiliki pesanan aktif',
              data: {
                orderId:
                  activeOrder.id,
                orderCode:
                  activeOrder.orderCode,
                orderStatus:
                  activeOrder.status,
              },
            },
            {
              status: 409,
            },
          );
        }
      }

      await db
        .update(
          tableList,
        )
        .set({
          status:
            nextStatus,
          updatedAt:
            new Date(),
        })
        .where(
          and(
            ...conditions,
          ),
        );

      if (
        nextStatus !==
        2
      ) {
        queueTablePagerIoT(
          tableId,
          false,
          `cashier-table-status:${nextStatus}`,
          'manual',
        );
      }

      queueTableIoT(
        tableId,
        `cashier-table-status:${nextStatus}`,
      );

      return NextResponse.json({
        success: true,
        message:
          nextStatus ===
            0
            ? 'Meja dinonaktifkan'
            : nextStatus ===
                1
              ? 'Meja menjadi tersedia'
              : 'Meja menjadi occupied',
        data: {
          id:
            tableId,
          status:
            nextStatus,
        },
      });
    }

    /*
     * ============================================================
     * CASHIER DEVICE CLAIM / ASSIGN VIA SERIAL NUMBER
     * ============================================================
     *
     * Device identity sudah HARUS diprovision di iot_devices.
     *
     * Kasir / Mitra hanya:
     * 1. memilih meja dari UI,
     * 2. memasukkan serial_number,
     * 3. backend mencari device tersebut,
     * 4. jika mitra_id NULL -> claim ke mitra ini,
     * 5. jika mitra_id = mitra ini -> boleh reassign meja,
     * 6. jika mitra_id = mitra lain -> TOLAK.
     *
     * Backend TIDAK membuat device baru dan TIDAK mengubah:
     * - serial_number
     * - hex_id
     * - secret_key
     *
     * Yang boleh berubah hanya:
     * - mitra_id (hanya jika sebelumnya NULL)
     * - table_id
     * - updatedAt
     *
     * iot_devices.status TIDAK diubah di flow ini karena merupakan
     * status operasional ALAT:
     * active | inactive | maintenance | banned.
     */
    if (
      body.action ===
      'device-bind'
    ) {
      const role =
        normalizeRole(
          payload.role,
        );

      if (
        role !==
          'cashier' &&
        role !==
          'owner'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Hanya Cashier atau Owner yang dapat memasang device',
          },
          {
            status: 403,
          },
        );
      }

      const serialNumber =
        String(
          body.serialNumber ??
          '',
        )
          .trim()
          .toUpperCase();

      if (!serialNumber) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Serial number device wajib diisi',
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Device harus SUDAH ADA di database.
       *
       * Tidak ada INSERT device dari route Cashier.
       */
      const matchingDevices =
        await db
          .select({
            id:
              tableDevice.id,
            mitraId:
              tableDevice.mitra_id,
            tableId:
              tableDevice.table_id,
            hexId:
              tableDevice.hex_id,
            serialNumber:
              tableDevice.serial_number,
            secretKey:
              tableDevice.secret_key,
            status:
              tableDevice.status,
          })
          .from(
            tableDevice,
          )
          .where(
            eq(
              tableDevice.serial_number,
              serialNumber,
            ),
          );

      if (
        matchingDevices.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Serial number device tidak terdaftar di database',
          },
          {
            status: 404,
          },
        );
      }

      /*
       * Serial number idealnya unique.
       * Kalau data DB bermasalah/duplicate, jangan menebak device mana.
       */
      if (
        matchingDevices.length >
        1
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Serial number terduplikasi di database. Hubungi administrator.',
          },
          {
            status: 409,
          },
        );
      }

      const existingDevice =
        matchingDevices[0];

      /*
       * Device yang sudah diklaim mitra lain tidak boleh dipakai.
       */
      if (
        existingDevice.mitraId !==
          null &&
        Number(
          existingDevice.mitraId,
        ) !==
          Number(
            foundMitra[0].id,
          )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Device sudah dimiliki mitra lain dan tidak dapat digunakan',
          },
          {
            status: 409,
          },
        );
      }

      /*
       * Status alat tidak diubah oleh Kasir.
       *
       * Device maintenance / banned tidak boleh di-assign untuk dipakai.
       * Device inactive tetap boleh di-assign, tetapi tidak akan ONLINE
       * sampai status alat diaktifkan oleh flow/admin yang berwenang.
       */
      if (
        existingDevice.status ===
          'maintenance'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Device sedang berstatus MAINTENANCE dan belum dapat digunakan',
          },
          {
            status: 409,
          },
        );
      }

      if (
        existingDevice.status ===
          'banned'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Device berstatus BANNED dan tidak dapat digunakan',
          },
          {
            status: 403,
          },
        );
      }

      /*
       * Identity provisioning harus lengkap.
       * Cashier tidak boleh membuat / memperbaiki hex_id atau secret_key.
       */
      if (
        !existingDevice.hexId ||
        !existingDevice.secretKey
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Provisioning device belum lengkap. HEX ID atau secret key belum tersedia.',
          },
          {
            status: 409,
          },
        );
      }

      const previousTableId =
        existingDevice.tableId
          ? Number(
              existingDevice.tableId,
            )
          : null;

      /*
       * Cari device aktif lain yang sedang berada pada meja tujuan.
       * Karena satu meja hanya boleh punya satu device aktif,
       * device lama pada meja tujuan akan dinonaktifkan.
       */
      const devicesOnTargetTable =
        await db
          .select({
            id:
              tableDevice.id,
            hexId:
              tableDevice.hex_id,
            serialNumber:
              tableDevice.serial_number,
          })
          .from(
            tableDevice,
          )
          .where(
            and(
              eq(
                tableDevice.mitra_id,
                foundMitra[0].id,
              ),
              eq(
                tableDevice.table_id,
                tableId,
              ),
            ),
          );

      await db.transaction(
        async (
          tx,
        ) => {
          /*
           * Nonaktifkan device aktif lain pada meja tujuan,
           * tetapi jangan nonaktifkan device yang sedang kita assign
           * jika memang dia sudah berada di meja tersebut.
           */
          for (
            const targetDevice of
            devicesOnTargetTable
          ) {
            if (
              Number(
                targetDevice.id,
              ) ===
              Number(
                existingDevice.id,
              )
            ) {
              continue;
            }

            await tx
              .update(
                tableDevice,
              )
              .set({
                /*
                 * Device status tetap milik lifecycle alat.
                 * Yang dilepas hanya assignment meja.
                 */
                table_id:
                  null,
                updatedAt:
                  new Date(),
              })
              .where(
                eq(
                  tableDevice.id,
                  targetDevice.id,
                ),
              );
          }

          /*
           * Claim / assign device.
           *
           * mitra_id hanya diisi jika sebelumnya NULL.
           * Jika sudah sama dengan current mitra, nilainya dipertahankan.
           *
           * Identity fields tidak disentuh.
           */
          await tx
            .update(
              tableDevice,
            )
            .set({
              mitra_id:
                existingDevice.mitraId ===
                null
                  ? foundMitra[0].id
                  : existingDevice.mitraId,

              table_id:
                tableId,

              /*
               * Jangan sentuh iot_devices.status di sini.
               */
              updatedAt:
                new Date(),
            })
            .where(
              eq(
                tableDevice.id,
                existingDevice.id,
              ),
            );
        },
      );

      /*
       * Device lain yang digantikan pada meja tujuan harus reconnect.
       * Karena status-nya sekarang inactive, auth berikutnya akan ditolak.
       */
      for (
        const targetDevice of
        devicesOnTargetTable
      ) {
        if (
          Number(
            targetDevice.id,
          ) ===
          Number(
            existingDevice.id,
          )
        ) {
          continue;
        }

        if (
          targetDevice.hexId
        ) {
          queueIoTDeviceReconnect(
            targetDevice.hexId,
          );
        }
      }

      /*
       * Kalau device dipindahkan dari meja lama ke meja baru,
       * matikan pager state meja lama supaya tidak diwariskan ke
       * device lain yang mungkin dipasang kemudian.
       */
      if (
        previousTableId &&
        previousTableId !==
          tableId
      ) {
        queueTablePagerIoT(
          previousTableId,
          false,
          'device-moved-to-another-table',
          'manual',
        );

        queueTableIoT(
          previousTableId,
          'device-moved-to-another-table',
        );
      }

      /*
       * Reconnect device yang baru di-assign.
       * Gateway akan auth ulang dan membaca table_id terbaru dari DB.
       */
      queueIoTDeviceReconnect(
        existingDevice.hexId,
      );

      queueTableIoT(
        tableId,
        previousTableId &&
        previousTableId !==
          tableId
          ? 'cashier-device-reassigned'
          : 'cashier-device-assigned',
      );

      return NextResponse.json({
        success: true,
        message:
          previousTableId &&
          previousTableId !==
            tableId
            ? `Device ${serialNumber} dipindahkan ke ${currentTable.table_name || `Meja ${tableId}`}`
            : `Device ${serialNumber} berhasil dipasang ke ${currentTable.table_name || `Meja ${tableId}`}`,
        data: {
          id:
            tableId,
          serialNumber,
          previousTableId,
          mitraId:
            existingDevice.mitraId ===
            null
              ? foundMitra[0].id
              : existingDevice.mitraId,

          deviceStatus:
            existingDevice.status,
        },
      });
    }

    /*
     * ============================================================
     * CASHIER DEVICE UNBIND
     * ============================================================
     *
     * Unbind HANYA melepas assignment meja:
     * table_id = NULL.
     *
     * mitra_id tetap karena ownership device tidak dilepas.
     * status alat juga tetap:
     * active / inactive / maintenance / banned.
     */
    if (
      body.action ===
      'device-unbind'
    ) {
      const role =
        normalizeRole(
          payload.role,
        );

      if (
        role !==
          'cashier' &&
        role !==
          'owner'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Hanya Cashier atau Owner yang dapat melepas device dari meja',
          },
          {
            status: 403,
          },
        );
      }

      const devices =
        await db
          .select({
            id:
              tableDevice.id,
            hexId:
              tableDevice.hex_id,
            serialNumber:
              tableDevice.serial_number,
            deviceStatus:
              tableDevice.status,
          })
          .from(
            tableDevice,
          )
          .where(
            and(
              eq(
                tableDevice.mitra_id,
                foundMitra[0].id,
              ),
              eq(
                tableDevice.table_id,
                tableId,
              ),
            ),
          );

      if (
        devices.length ===
        0
      ) {
        return NextResponse.json({
          success: true,
          reused: true,
          message:
            'Meja tidak memiliki device',
        });
      }

      await db
        .update(
          tableDevice,
        )
        .set({
          table_id:
            null,
          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              tableDevice.mitra_id,
              foundMitra[0].id,
            ),
            eq(
              tableDevice.table_id,
              tableId,
            ),
          ),
        );

      for (
        const device of
        devices
      ) {
        if (
          device.hexId
        ) {
          queueIoTDeviceReconnect(
            device.hexId,
          );
        }
      }

      queueTablePagerIoT(
        tableId,
        false,
        'cashier-device-unbind',
        'manual',
      );

      queueTableIoT(
        tableId,
        'cashier-device-unbind',
      );

      return NextResponse.json({
        success: true,
        message:
          'Device berhasil dilepas dari meja. Ownership dan status alat tetap.',
        data: {
          tableId,
          devices:
            devices.map(
              (
                device,
              ) => ({
                serialNumber:
                  device.serialNumber,
                deviceStatus:
                  device.deviceStatus,
              }),
            ),
        },
      });
    }

    /*
     * ============================================================
     * CASHIER MANUAL PAGER
     * ============================================================
     */
    if (
      body.action ===
      'pager'
    ) {
      const role =
        normalizeRole(
          payload.role,
        );

      if (
        role !==
          'cashier' &&
        role !==
          'owner'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Hanya Cashier atau Owner yang dapat memanggil pager',
          },
          {
            status: 403,
          },
        );
      }

      const pagerActive =
        body.pagerActive ===
        true;

      /*
       * Saat menyalakan pager manual, device harus benar-benar online.
       * Tombol client juga disembunyikan ketika offline, tetapi server
       * tetap melakukan validasi ulang untuk menghindari stale UI.
       */
      if (
        pagerActive
      ) {
        const [
          iotStatus,
        ] =
          await getTableIoTStatuses(
            [
              tableId,
            ],
          );

        if (
          !iotStatus?.online
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                'Perangkat IoT meja sedang offline',
            },
            {
              status: 409,
            },
          );
        }
      }

      const pagerResult =
        await setTablePagerIoT(
          tableId,
          pagerActive,
          pagerActive
            ? 'cashier-manual-pager-on'
            : 'cashier-manual-pager-off',
          'manual',
        );

      if (!pagerResult) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Gateway IoT tidak dapat mengubah pager',
          },
          {
            status: 503,
          },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          pagerActive
            ? 'Pager meja dinyalakan'
            : 'Pager meja dimatikan',
        data: {
          id:
            tableId,
          pagerActive,
        },
      });
    }

    /*
     * ============================================================
     * CASHIER RELEASE TABLE
     * ============================================================
     *
     * Order completed tidak otomatis me-release meja.
     * Cashier menekan "Kosongkan Meja" setelah customer benar-benar pergi.
     *
     * table_list.status:
     * 1 = AVAILABLE
     * 2 = OCCUPIED
     * 3 = RESERVED
     */
    if (
      body.action ===
      'release'
    ) {
      const role =
        normalizeRole(
          payload.role,
        );

      if (
        role !==
          'cashier' &&
        role !==
          'owner'
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Hanya Cashier atau Owner yang dapat mengosongkan meja',
          },
          {
            status: 403,
          },
        );
      }

      const currentStatus =
        Number(
          currentTable.status,
        );

      if (
        currentStatus ===
        1
      ) {
        queueTableIoT(
          tableId,
          'table-release-idempotent',
        );

        return NextResponse.json({
          success: true,
          reused: true,
          message:
            'Meja sudah tersedia',
          data: {
            id:
              tableId,
            status:
              1,
          },
        });
      }

      if (
        currentStatus ===
        3
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Meja masih RESERVED. Ubah melalui flow reservasi.',
          },
          {
            status: 409,
          },
        );
      }

      if (
        currentStatus ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Meja sedang dinonaktifkan',
          },
          {
            status: 409,
          },
        );
      }

      if (
        currentStatus !==
        2
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Status meja tidak dapat dikosongkan',
          },
          {
            status: 409,
          },
        );
      }

      /*
       * Jangan jadikan AVAILABLE jika masih ada order aktif.
       */
      const activeOrderConditions = [
        eq(
          orders.mitra_id,
          foundMitra[0].id,
        ),
        eq(
          orders.table_number,
          tableId,
        ),
        inArray(
          orders.status,
          [
            'pending',
            'confirmed',
            'preparing',
            'ready',
          ],
        ),
        isNull(
          orders.deletedAt,
        ),
      ];

      if (
        sessionBranch ===
        'main'
      ) {
        activeOrderConditions.push(
          isNull(
            orders.branch_id,
          ),
        );
      } else if (
        sessionBranch
      ) {
        activeOrderConditions.push(
          eq(
            orders.branch_id,
            sessionBranch,
          ),
        );
      }

      const [activeOrder] =
        await db
          .select({
            id:
              orders.id,
            order_code:
              orders.order_code,
            status:
              orders.status,
          })
          .from(
            orders,
          )
          .where(
            and(
              ...activeOrderConditions,
            ),
          )
          .limit(
            1,
          );

      if (activeOrder) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Meja masih memiliki pesanan aktif dan belum boleh dikosongkan',
            data: {
              orderId:
                activeOrder.id,
              orderCode:
                activeOrder.order_code,
              orderStatus:
                activeOrder.status,
            },
          },
          {
            status: 409,
          },
        );
      }

      await db
        .update(
          tableList,
        )
        .set({
          status: 1,
          updatedAt:
            new Date(),
        })
        .where(
          and(
            ...conditions,
            eq(
              tableList.status,
              2,
            ),
          ),
        );

      /*
       * Gateway baca ulang DB.
       * Karena status sekarang 1, ESP32 berubah OCCUPIED -> AVAILABLE.
       */
      queueTablePagerIoT(
        tableId,
        false,
        'cashier-table-released',
        'manual',
      );

      queueTableIoT(
        tableId,
        'cashier-table-released',
      );

      return NextResponse.json({
        success: true,
        message:
          `${currentTable.table_name || `Meja ${tableId}`} sekarang tersedia`,
        data: {
          id:
            tableId,
          status:
            1,
        },
      });
    }

    /*
     * ============================================================
     * DELETE / SOFT DELETE
     * ============================================================
     */
    if (
      body.isDeleted
    ) {
      await db
        .update(
          tableList,
        )
        .set({
          deletedAt:
            new Date(),
          updatedAt:
            new Date(),
        })
        .where(
          and(
            ...conditions,
          ),
        );

      return NextResponse.json({
        success: true,
        message:
          'Meja berhasil dihapus',
      });
    }

    /*
     * ============================================================
     * NORMAL TABLE UPDATE
     * ============================================================
     */
    const update:
      Partial<
        typeof tableList.$inferInsert
      > = {
        updatedAt:
          new Date(),
      };

    if (
      typeof body.name ===
      'string'
    ) {
      update.table_name =
        body.name
          .trim()
          .slice(
            0,
            20,
          );
    }

    if (
      body.capacity !==
      undefined
    ) {
      update.capacity =
        Math.max(
          Number(
            body.capacity,
          ),
          1,
        );
    }

    let tableStatusChanged =
      false;

    if (
      body.status !==
        undefined &&
      [
        0,
        1,
        2,
        3,
      ].includes(
        Number(
          body.status,
        ),
      )
    ) {
      update.status =
        Number(
          body.status,
        );

      tableStatusChanged =
        Number(
          currentTable.status,
        ) !==
        Number(
          body.status,
        );
    }

    /*
     * Staff yang terikat cabang tidak boleh memindahkan meja.
     */
    if (
      !sessionBranch &&
      body.branch_id !==
        undefined
    ) {
      update.branch_id =
        body.branch_id
          ? Number(
              body.branch_id,
            )
          : null;
    }

    await db
      .update(
        tableList,
      )
      .set(
        update,
      )
      .where(
        and(
          ...conditions,
        ),
      );

    /*
     * Setiap perubahan status fisik meja harus segera dikirim ke IoT.
     *
     * 1 -> AVAILABLE
     * 2 -> OCCUPIED
     * 3 -> RESERVED
     * 0 -> DISABLED
     */
    if (
      tableStatusChanged
    ) {
      const nextTableStatus =
        Number(
          body.status,
        );

      if (
        nextTableStatus !==
        2
      ) {
        queueTablePagerIoT(
          tableId,
          false,
          `table-status:${nextTableStatus}`,
          'manual',
        );
      }

      queueTableIoT(
        tableId,
        `table-status:${nextTableStatus}`,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Meja berhasil diperbarui',
    });
  } catch (error) {
    console.error(
      'PUT tables error:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Gagal memperbarui meja',
      },
      {
        status: 500,
      },
    );
  }
}
