import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';

import { users } from '@/db/schema';

type MemberIdDatabase = any;

/**
 * Mengambil tiga karakter alfanumerik pertama dari nama mitra.
 * Contoh: "Kopi Senja" -> "KOP".
 */
export function createMemberPrefix(mitraName: string): string {
  const normalized = mitraName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return normalized.slice(0, 3).padEnd(3, 'X');
}

/**
 * Membuat member ID unik dengan format:
 * [3 huruf mitra][2 digit tahun][2 digit bulan][4 digit acak]
 *
 * Contoh: KOP26071234
 */
export async function generateUniqueMemberId(
  database: MemberIdDatabase,
  mitraName: string,
  date = new Date(),
): Promise<string> {
  const prefix = createMemberPrefix(mitraName);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: '2-digit',
    month: '2-digit',
  }).formatToParts(date);
  const year = dateParts.find((part) => part.type === 'year')?.value;
  const month = dateParts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Gagal membentuk periode member ID.');
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const randomDigits = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
    const memberId = `${prefix}${year}${month}${randomDigits}`;

    const existing = await database
      .select()
      .from(users)
      .where(eq(users.memberId, memberId))
      .limit(1);

    if (existing.length === 0) {
      return memberId;
    }
  }

  throw new Error('Gagal membuat member ID unik setelah 30 percobaan.');
}
