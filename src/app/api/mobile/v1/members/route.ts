import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { mitra, users } from '@/db/schema';
import { generateUniqueMemberId } from '@/lib/member/memberId';
import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { getMemberSummary } from '@/lib/mobile-api/member';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function POST(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const body = await request.json();

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!name || !email) {
      return mobileError(
        'MEMBER_DATA_INVALID',
        'Nama dan email member wajib diisi.',
        422,
      );
    }

    const existingRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (existingRows[0]) {
      return mobileError(
        'EMAIL_ALREADY_REGISTERED',
        'Email sudah terdaftar.',
        409,
      );
    }

    const mitraRows = await db
      .select({ name: mitra.mitra_name })
      .from(mitra)
      .where(and(eq(mitra.id, auth.mitraId), isNull(mitra.deletedAt)))
      .limit(1);

    const currentMitra = mitraRows[0];
    if (!currentMitra) {
      return mobileError('MITRA_NOT_FOUND', 'Mitra tidak ditemukan.', 404);
    }

    // Akun dibuat dengan password acak agar kolom password tetap valid.
    // Member dapat memakai alur reset password saat ingin login sebagai pelanggan.
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const memberId = await generateUniqueMemberId(db, currentMitra.name);
    const now = new Date();

    const insertResult = await db.insert(users).values({
      name,
      email,
      phone,
      password: passwordHash,
      memberId,
      mitra_id: auth.mitraId,
      branch_id: null,
      role: 'User',
      token: crypto.randomUUID().replaceAll('-', '').slice(0, 40),
      is_login: false,
      createdAt: now,
      updatedAt: now,
    });

    const member = await getMemberSummary({
      memberId,
      mitraId: auth.mitraId,
    });

    return mobileSuccess(
      member ?? {
        id: insertResult[0].insertId,
        memberId,
        name,
        email,
        phone,
        points: 0,
        tier: 'Bronze',
        totalOrders: 0,
        totalSpent: 0,
      },
      {
        message: 'Member berhasil dibuat.',
        status: 201,
      },
    );
  } catch (error) {
    console.error('POST mobile member error:', error);
    return mobileError('MEMBER_CREATE_FAILED', 'Gagal membuat member.', 500);
  }
}
