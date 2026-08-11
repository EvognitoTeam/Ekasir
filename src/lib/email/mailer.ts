import nodemailer from 'nodemailer';

function getRequiredEnv(
  key: string,
): string {
  const value =
    process.env[key]?.trim();

  if (!value) {
    throw new Error(
      `Environment variable ${key} belum dikonfigurasi.`,
    );
  }

  return value;
}

export function createMailer() {
  const host =
    getRequiredEnv(
      'SMTP_HOST',
    );

  const port =
    Number(
      getRequiredEnv(
        'SMTP_PORT',
      ),
    );

  const secure =
    String(
      process.env.SMTP_SECURE ??
        'false',
    ).toLowerCase() ===
    'true';

  const user =
    getRequiredEnv(
      'SMTP_USER',
    );

  const password =
    getRequiredEnv(
      'SMTP_PASSWORD',
    );

  return nodemailer.createTransport({
    host,
    port,
    secure,

    auth: {
      user,
      pass:
        password,
    },

    /*
     * Aktifkan ini hanya jika server Anda memakai sertifikat
     * self-signed. Untuk production sebaiknya gunakan sertifikat valid.
     */
    tls: {
      rejectUnauthorized:
        process.env.SMTP_ALLOW_SELF_SIGNED !==
        'true',
    },

    connectionTimeout:
      15000,

    greetingTimeout:
      15000,

    socketTimeout:
      30000,
  });
}

export function getMailSender() {
  const fromName =
    process.env.SMTP_FROM_NAME
      ?.trim() ||
    'Evokasir';

  const fromEmail =
    process.env.SMTP_FROM_EMAIL
      ?.trim() ||
    getRequiredEnv(
      'SMTP_USER',
    );

  return {
    name:
      fromName,

    address:
      fromEmail,
  };
}