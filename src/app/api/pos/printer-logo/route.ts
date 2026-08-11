import {
  mkdir,
  unlink,
  writeFile,
} from 'fs/promises';

import path from 'path';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';

import {
  db,
} from '@/db';

import {
  mitra,
} from '@/db/schema';

const MAX_FILE_SIZE =
  2 * 1024 * 1024;

const ALLOWED_TYPES =
  new Map([
    [
      'image/png',
      'png',
    ],
    [
      'image/jpeg',
      'jpg',
    ],
    [
      'image/webp',
      'webp',
    ],
  ]);

function safeStoredPath(
  value:
    string |
    null |
    undefined,
) {
  if (!value) {
    return null;
  }

  if (
    !value.startsWith(
      '/uploads/mitra/banner/'
    )
  ) {
    return null;
  }

  return path.join(
    process.cwd(),
    'public',
    value.replace(
      /^\/+/,
      ''
    )
  );
}

export async function POST(
  request:
    NextRequest,
) {
  try {
    const formData =
      await request.formData();

    const slug =
      String(
        formData.get(
          'slug'
        ) ||
        ''
      ).trim();

    const uploaded =
      formData.get(
        'logo'
      );

    if (!slug) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Slug mitra diperlukan.',
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !uploaded ||
      !(
        uploaded instanceof
        File
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'File logo diperlukan.',
        },
        {
          status:
            400,
        }
      );
    }

    const extension =
      ALLOWED_TYPES.get(
        uploaded.type
      );

    if (!extension) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Logo hanya boleh PNG, JPG, JPEG, atau WEBP.',
        },
        {
          status:
            415,
        }
      );
    }

    if (
      uploaded.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success:
            false,
          message:
            'Ukuran logo maksimal 2 MB.',
        },
        {
          status:
            413,
        }
      );
    }

    const [
      existing,
    ] =
      await db
        .select({
          id:
            mitra.id,
          banner:
            mitra.banner,
        })
        .from(
          mitra
        )
        .where(
          and(
            eq(
              mitra.mitra_slug,
              slug
            ),
            isNull(
              mitra.deletedAt
            )
          )
        )
        .limit(
          1
        );

    if (!existing) {
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
        }
      );
    }

    const uploadDir =
      path.join(
        process.cwd(),
        'public',
        'uploads',
        'mitra',
        'banner'
      );

    await mkdir(
      uploadDir,
      {
        recursive:
          true,
      }
    );

    const filename =
      `${slug}-receipt-logo-${Date.now()}.${extension}`;

    const publicPath =
      `/uploads/mitra/banner/${filename}`;

    const buffer =
      Buffer.from(
        await uploaded.arrayBuffer()
      );

    await writeFile(
      path.join(
        uploadDir,
        filename
      ),
      buffer
    );

    await db
      .update(
        mitra
      )
      .set({
        banner:
          publicPath,
        updatedAt:
          new Date(),
      })
      .where(
        eq(
          mitra.id,
          existing.id
        )
      );

    const oldFile =
      safeStoredPath(
        existing.banner
      );

    if (
      oldFile &&
      oldFile !==
      path.join(
        process.cwd(),
        'public',
        publicPath.replace(
          /^\/+/,
          ''
        )
      )
    ) {
      await unlink(
        oldFile
      ).catch(
        () => undefined
      );
    }

    return NextResponse.json({
      success:
        true,
      message:
        'Logo berhasil diunggah dan disimpan pada banner mitra.',
      data: {
        banner:
          publicPath,
        logoUrl:
          publicPath,
      },
    });
  } catch (
    error
  ) {
    console.error(
      '[PRINTER_LOGO_UPLOAD_ERROR]',
      error
    );

    return NextResponse.json(
      {
        success:
          false,
        message:
          error instanceof
          Error
            ? error.message
            : 'Logo gagal diunggah.',
      },
      {
        status:
          500,
      }
    );
  }
}
