import { NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET
);

async function getMitraId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get('ekasir_session')?.value;

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const verified = await jwtVerify(
    token,
    SECRET_KEY
  );

  const mitraId = Number(
    verified.payload.mitraId
  );

  if (!mitraId || mitraId === 0) {
    throw new Error('INVALID_MITRA');
  }

  return mitraId;
}

async function saveCompressedImage(file: File) {
  const bytes = await file.arrayBuffer();

  const buffer = Buffer.from(bytes);

  const fileName = `${Date.now()}.webp`;

  const uploadDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'raw_materials'
  );

  await fs.mkdir(uploadDir, {
    recursive: true,
  });

  const filePath = path.join(uploadDir, fileName);

  await sharp(buffer)
    .resize(600)
    .webp({
      quality: 75,
    })
    .toFile(filePath);

  return `/uploads/raw_materials/${fileName}`;
}

export async function GET() {
  try {
    const mitraId = await getMitraId();

    const data = await db
      .select()
      .from(materials)
      .where(eq(materials.mitra_id, mitraId));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 401,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const mitraId = await getMitraId();

    const formData = await request.formData();

    const name = formData.get('name') as string;
    const unit = formData.get('unit') as string;

    const stock = formData.get('stock') as string;

    const lowStock =
      formData.get(
        'low_stock_threshold'
      ) as string;

    const cost =
      formData.get('cost_per_unit') as string;

    const imageFile =
      formData.get('image') as File;

    let imagePath = '';

    if (imageFile && imageFile.size > 0) {
      imagePath = await saveCompressedImage(
        imageFile
      );
    }

    await db.insert(materials).values({
      mitra_id: mitraId,
      name,
      unit,
      stock,
      low_stock_threshold: lowStock,
      cost_per_unit: cost,
      image: imagePath,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'POST Material Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const formData = await request.formData();

    const id = Number(formData.get('id'));

    const stock = formData.get('stock');

    // PATCH cepat update stock
    if (
      stock !== null &&
      !formData.get('name')
    ) {
      await db
        .update(materials)
        .set({
          stock: stock.toString(),
        })
        .where(eq(materials.id, id));

      return NextResponse.json({
        success: true,
      });
    }

    const name = formData.get('name') as string;

    const unit = formData.get('unit') as string;

    const lowStock =
      formData.get(
        'low_stock_threshold'
      ) as string;

    const cost =
      formData.get('cost_per_unit') as string;

    const imageFile =
      formData.get('image') as File;

    const updateData: any = {
      name,
      unit,
      stock: stock?.toString(),
      low_stock_threshold: lowStock,
      cost_per_unit: cost,
    };

    if (imageFile && imageFile.size > 0) {
      const imagePath =
        await saveCompressedImage(imageFile);

      updateData.image = imagePath;
    }

    await db
      .update(materials)
      .set(updateData)
      .where(eq(materials.id, id));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'PATCH Material Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
      },
      {
        status: 500,
      }
    );
  }
}