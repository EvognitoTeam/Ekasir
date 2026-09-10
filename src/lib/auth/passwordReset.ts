import {
  createHash,
  randomBytes,
} from 'node:crypto';

import {
  getPasswordResetEmailTemplate,
  type EmailLocale,
} from '@/lib/email/templates/passwordResetEmail';

const RESET_TOKEN_TTL_MS =
  30 * 60 * 1000;

export type ResetEmailLocale =
  | 'id'
  | 'en';

export function normalizeResetLocale(
  value: unknown,
): EmailLocale {
  return value === 'en'
    ? 'en'
    : 'id';
}

export function createPasswordResetToken() {
  const rawToken =
    randomBytes(32)
      .toString('hex');

  return {
    rawToken,

    tokenHash:
      hashPasswordResetToken(
        rawToken,
      ),

    expiresAt:
      new Date(
        Date.now() +
          RESET_TOKEN_TTL_MS,
      ),
  };
}

export function hashPasswordResetToken(
  rawToken: string,
): string {
  return createHash('sha256')
    .update(
      rawToken,
      'utf8',
    )
    .digest('hex');
}

export function buildPasswordResetUrl(
  requestUrl: string,
  rawToken: string,
): string {
  const configuredBaseUrl =
    (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      ''
    )
      .trim()
      .replace(/\/+$/, '');

  const requestOrigin =
    new URL(
      requestUrl,
    ).origin;

  const baseUrl =
    configuredBaseUrl ||
    requestOrigin;

  const resetUrl =
    new URL(
      '/reset-password',
      baseUrl,
    );

  resetUrl.searchParams.set(
    'token',
    rawToken,
  );

  return resetUrl.toString();
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}


export async function sendPasswordResetEmail({
  to,
  resetUrl,
  locale,
}: {
  to: string;
  resetUrl: string;
  locale: EmailLocale;
}): Promise<void> {
  const apiKey =
    process.env.RESEND_API_KEY
      ?.trim();

  const from =
    process.env.RESET_EMAIL_FROM
      ?.trim();

  if (
    !apiKey ||
    !from
  ) {
    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      console.info(
        '[PASSWORD_RESET_DEV_LINK]',
        {
          to,
          locale,
          resetUrl,
        },
      );

      return;
    }

    throw new Error(
      'RESEND_API_KEY atau RESET_EMAIL_FROM belum dikonfigurasi.',
    );
  }

  const template =
    getPasswordResetEmailTemplate({
      resetUrl,
      locale,
    });

  const response =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            from,

            to: [
              to,
            ],

            subject:
              template.subject,

            text:
              template.text,

            html:
              template.html,

            tags: [
              {
                name:
                  'category',

                value:
                  'password_reset',
              },

              {
                name:
                  'language',

                value:
                  locale,
              },
            ],
          }),
      },
    );

  if (
    !response.ok
  ) {
    const error =
      await response.text();

    throw new Error(
      `Resend gagal mengirim email (${response.status}): ${error.slice(
        0,
        300,
      )}`,
    );
  }
}