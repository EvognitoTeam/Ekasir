import {
  NextResponse,
} from 'next/server';

import {
  and,
  eq,
  gt,
  isNull,
} from 'drizzle-orm';

import {
  hash as hashPassword,
} from 'bcryptjs';

import { db }
  from '@/db';

import {
  users,
} from '@/db/schema';

import {
  passwordResetTokens,
} from '@/db/passwordReset.schema';

import {
  hashPasswordResetToken,
} from '@/lib/auth/passwordReset';

export const dynamic =
  'force-dynamic';

export const runtime =
  'nodejs';

const MIN_PASSWORD_LENGTH =
  6;

const MAX_PASSWORD_LENGTH =
  128;

function normalizeToken(
  value: unknown,
): string {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function tokenLooksValid(
  token: string,
): boolean {
  return /^[a-f0-9]{64}$/i.test(
    token,
  );
}

function invalidTokenResponse() {
  return NextResponse.json(
    {
      success: false,
      valid: false,
      message:
        'Tautan reset tidak valid atau sudah kedaluwarsa.',
      error: {
        code:
          'INVALID_OR_EXPIRED_TOKEN',
      },
    },
    {
      status: 400,
    },
  );
}

/*
 * Dipakai halaman /reset-password untuk mengecek
 * token sebelum menampilkan form password.
 */
export async function GET(
  request: Request,
): Promise<Response> {
  try {
    const { searchParams } =
      new URL(
        request.url,
      );

    const rawToken =
      normalizeToken(
        searchParams.get(
          'token',
        ),
      );

    if (
      !tokenLooksValid(
        rawToken,
      )
    ) {
      return invalidTokenResponse();
    }

    const tokenHash =
      hashPasswordResetToken(
        rawToken,
      );

    const now =
      new Date();

    const [tokenRow] =
      await db
        .select({
          id:
            passwordResetTokens.id,

          userId:
            passwordResetTokens.userId,
        })
        .from(
          passwordResetTokens,
        )
        .where(
          and(
            eq(
              passwordResetTokens.tokenHash,
              tokenHash,
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
        .limit(1);

    if (
      !tokenRow
    ) {
      return invalidTokenResponse();
    }

    const [user] =
      await db
        .select({
          id:
            users.id,
        })
        .from(users)
        .where(
          and(
            eq(
              users.id,
              Number(
                tokenRow.userId,
              ),
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
      return invalidTokenResponse();
    }

    return NextResponse.json({
      success: true,
      valid: true,
    });
  } catch (error) {
    console.error(
      '[RESET_PASSWORD_VALIDATE_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        valid: false,
        message:
          'Token reset tidak dapat diverifikasi saat ini.',
        error: {
          code:
            'TOKEN_VALIDATION_FAILED',
        },
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    let body: {
      token?: unknown;
      password?: unknown;
    };

    try {
      body =
        await request.json() as {
          token?: unknown;
          password?: unknown;
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

    const rawToken =
      normalizeToken(
        body.token,
      );

    const password =
      typeof body.password ===
        'string'
        ? body.password
        : '';

    if (
      !tokenLooksValid(
        rawToken,
      )
    ) {
      return invalidTokenResponse();
    }

    if (
      password.length <
        MIN_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`,
          error: {
            code:
              'PASSWORD_TOO_SHORT',
          },
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length >
        MAX_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Kata sandi maksimal ${MAX_PASSWORD_LENGTH} karakter.`,
          error: {
            code:
              'PASSWORD_TOO_LONG',
          },
        },
        {
          status: 400,
        },
      );
    }

    const tokenHash =
      hashPasswordResetToken(
        rawToken,
      );

    /*
     * Cost 12 memberi margin keamanan yang baik untuk password.
     * Hash bcryptjs kompatibel dengan format bcrypt.
     */
    const hashedPassword =
      await hashPassword(
        password,
        12,
      );

    const now =
      new Date();

    await db.transaction(
      async (tx) => {
        const [tokenRow] =
          await tx
            .select({
              id:
                passwordResetTokens.id,

              userId:
                passwordResetTokens.userId,
            })
            .from(
              passwordResetTokens,
            )
            .where(
              and(
                eq(
                  passwordResetTokens.tokenHash,
                  tokenHash,
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
            .limit(1);

        if (
          !tokenRow
        ) {
          throw new Error(
            'RESET_TOKEN_INVALID',
          );
        }

        /*
         * Compare-and-set: hanya satu request yang boleh
         * mengonsumsi token yang sama.
         */
        const tokenUpdateResult =
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
                  passwordResetTokens.id,
                  tokenRow.id,
                ),
                isNull(
                  passwordResetTokens.usedAt,
                ),
                gt(
                  passwordResetTokens.expiresAt,
                  now,
                ),
              ),
            );

        const tokenHeader =
          tokenUpdateResult[0] as {
            affectedRows?: number;
          };

        if (
          Number(
            tokenHeader
              ?.affectedRows ??
              0,
          ) !== 1
        ) {
          throw new Error(
            'RESET_TOKEN_INVALID',
          );
        }

        /*
         * IMPORTANT:
         * code ini mengasumsikan field password Drizzle KALOO adalah
         * users.password, sesuai flow login/register berbasis email+password.
         */
        const userUpdateResult =
          await tx
            .update(users)
            .set({
              password:
                hashedPassword,

              /*
               * Paksa login operasional lama dianggap tidak aktif.
               * requirePosAuth KALOO dapat menolak sesi lama ketika
               * status user diverifikasi kembali.
               */
              is_login:
                false,

              login_at:
                null,
            })
            .where(
              and(
                eq(
                  users.id,
                  Number(
                    tokenRow.userId,
                  ),
                ),
                isNull(
                  users.deletedAt,
                ),
              ),
            );

        const userHeader =
          userUpdateResult[0] as {
            affectedRows?: number;
          };

        if (
          Number(
            userHeader
              ?.affectedRows ??
              0,
          ) !== 1
        ) {
          throw new Error(
            'RESET_USER_NOT_FOUND',
          );
        }

        /*
         * Setelah password berubah, matikan seluruh token
         * reset lain milik akun ini.
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
                  tokenRow.userId,
                ),
              ),
              isNull(
                passwordResetTokens.usedAt,
              ),
            ),
          );
      },
    );

    const response =
      NextResponse.json({
        success: true,
        message:
          'Kata sandi berhasil diperbarui.',
      });

    /*
     * Jika browser yang melakukan reset masih mempunyai
     * cookie POS lama, hapus juga di browser tersebut.
     */
    response.cookies.set(
      'ekasir_session',
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite:
          'lax',
        path:
          '/',
        maxAge:
          0,
      },
    );

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message ===
          'RESET_TOKEN_INVALID' ||
        error.message ===
          'RESET_USER_NOT_FOUND'
      )
    ) {
      return invalidTokenResponse();
    }

    console.error(
      '[RESET_PASSWORD_ERROR]',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Kata sandi tidak dapat diperbarui saat ini.',
        error: {
          code:
            'PASSWORD_RESET_FAILED',
        },
      },
      {
        status: 500,
      },
    );
  }
}
