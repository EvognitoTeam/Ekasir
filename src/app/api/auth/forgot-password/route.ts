import {
  NextResponse,
} from 'next/server';

import {
  and,
  desc,
  eq,
  gt,
  isNull,
} from 'drizzle-orm';

import { db } from '@/db';

import {
  users,
} from '@/db/schema';

import {
  passwordResetTokens,
} from '@/db/passwordReset.schema';

import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  normalizeResetLocale,
  sendPasswordResetEmail,
} from '@/lib/auth/passwordReset';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

const GENERIC_MESSAGE =
  'Jika email terdaftar, instruksi reset kata sandi akan dikirimkan.';

const RESEND_COOLDOWN_MS =
  60 * 1000;

function normalizeEmail(
  value: unknown,
): string {
  return typeof value ===
    'string'
    ? value
        .trim()
        .toLowerCase()
    : '';
}

function isValidEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function genericSuccess() {
  return NextResponse.json({
    success: true,
    message:
      GENERIC_MESSAGE,
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    let body: {
      email?: unknown;
      locale?: unknown;
    };

    try {
      body =
        await request.json() as {
          email?: unknown;
          locale?: unknown;
        };
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            'Request body harus berupa JSON yang valid.',
          error: {
            code:
              'INVALID_JSON',
          },
        },
        {
          status: 400,
        },
      );
    }

    const email =
      normalizeEmail(
        body.email,
      );

    const locale =
      normalizeResetLocale(
        body.locale,
      );

    if (
      !email ||
      !isValidEmail(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Format email tidak valid.',
          error: {
            code:
              'INVALID_EMAIL',
          },
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Jangan bedakan response antara email ditemukan / tidak.
     * Ini mencegah account enumeration.
     */
    const [user] =
      await db
        .select({
          id:
            users.id,

          email:
            users.email,
        })
        .from(users)
        .where(
          and(
            eq(
              users.email,
              email,
            ),
            isNull(
              users.deletedAt,
            ),
          ),
        )
        .limit(1);

    if (
      !user
    ) {
      return genericSuccess();
    }

    const now =
      new Date();

    /*
     * Cooldown sederhana per akun.
     * Request berulang dalam 60 detik tetap mendapat
     * response sukses generik tetapi tidak mengirim email baru.
     */
    const [recentToken] =
      await db
        .select({
          createdAt:
            passwordResetTokens.createdAt,
        })
        .from(
          passwordResetTokens,
        )
        .where(
          and(
            eq(
              passwordResetTokens.userId,
              Number(user.id),
            ),
            isNull(
              passwordResetTokens.usedAt,
            ),
            gt(
              passwordResetTokens.expiresAt,
              now,
            ),
          ),
        )
        .orderBy(
          desc(
            passwordResetTokens.createdAt,
          ),
        )
        .limit(1);

    if (
      recentToken &&
      now.getTime() -
        recentToken.createdAt.getTime() <
        RESEND_COOLDOWN_MS
    ) {
      return genericSuccess();
    }

    const {
      rawToken,
      tokenHash,
      expiresAt,
    } =
      createPasswordResetToken();

    await db.transaction(
      async (tx) => {
        /*
         * Token lama untuk user yang sama langsung dimatikan.
         */
        await tx
          .update(
            passwordResetTokens,
          )
          .set({
            usedAt:
              now,
            updatedAt:
              now,
          })
          .where(
            and(
              eq(
                passwordResetTokens.userId,
                Number(
                  user.id,
                ),
              ),
              isNull(
                passwordResetTokens.usedAt,
              ),
            ),
          );

        await tx
          .insert(
            passwordResetTokens,
          )
          .values({
            userId:
              Number(user.id),

            tokenHash,

            expiresAt,

            usedAt:
              null,

            createdAt:
              now,

            updatedAt:
              now,
          });
      },
    );

    const resetUrl =
      buildPasswordResetUrl(
        request.url,
        rawToken,
      );

    try {
      await sendPasswordResetEmail({
        to:
          String(
            user.email,
          ),
        resetUrl,
        locale,
      });
    } catch (emailError) {
      /*
       * Matikan token jika pengiriman email gagal.
       * Response ke client tetap generik supaya keberadaan
       * email tidak bisa ditebak dari response.
       */
      await db
        .update(
          passwordResetTokens,
        )
        .set({
          usedAt:
            new Date(),
          updatedAt:
            new Date(),
        })
        .where(
          eq(
            passwordResetTokens.tokenHash,
            tokenHash,
          ),
        );

      console.error(
        '[PASSWORD_RESET_EMAIL_ERROR]',
        emailError,
      );
    }

    return genericSuccess();
  } catch (error) {
    console.error(
      '[FORGOT_PASSWORD_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Permintaan reset kata sandi tidak dapat diproses saat ini.',
        error: {
          code:
            'PASSWORD_RESET_REQUEST_FAILED',
        },
      },
      {
        status: 500,
      },
    );
  }
}
