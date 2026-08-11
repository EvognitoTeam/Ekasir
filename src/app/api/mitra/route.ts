import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db'; // sesuaikan
import { mitra } from '@/db/schema'; // sesuaikan
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: 'Slug is required',
        },
        { status: 400 }
      );
    }

    const data = await db.query.mitra.findFirst({
      where: eq(mitra.mitra_slug, slug),
      columns: {
        id: true,
        mitra_name: true,
        mitra_welcome: true,
      },
    });

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mitra not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mitraName: data.mitra_name,
      mitraWelcome: data.mitra_welcome,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}