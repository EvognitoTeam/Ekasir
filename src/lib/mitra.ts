import { db } from '@/db';
import { mitra } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getMitraBySlug(slug: string) {
  return await db.query.mitra.findFirst({
    where: eq(mitra.mitra_slug, slug),
    columns: {
      mitra_name: true,
      mitra_welcome: true,
    },
  });
}