export type EmailLocale =
  | 'id'
  | 'en';

type PasswordResetEmailParams = {
  resetUrl: string;
  locale?: EmailLocale;
};

type PasswordResetEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function getPasswordResetEmailTemplate({
  resetUrl,
  locale = 'id',
}: PasswordResetEmailParams): PasswordResetEmailTemplate {
  const safeResetUrl =
    escapeHtml(resetUrl);

  if (locale === 'en') {
    return {
      subject:
        'Reset your KALOO POS password',

      text: `
Reset your KALOO POS password

We received a request to reset the password for your KALOO POS account.

Create a new password using the link below:

${resetUrl}

This reset link is valid for 30 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email.

KALOO POS
Modern Point of Sale
      `.trim(),

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Reset your KALOO POS password
  </title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f2;
    font-family:Arial, Helvetica, sans-serif;
    color:#111111;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width:100%;
      background:#f5f5f2;
      padding:40px 16px;
    "
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:28px;
            overflow:hidden;
            border:1px solid #e8e8e3;
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              style="
                padding:32px 36px 26px;
                border-bottom:1px solid #eeeeea;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
              >
                <tr>
                  <td>
                    <div
                      style="
                        font-size:22px;
                        line-height:1;
                        font-weight:800;
                        letter-spacing:0.16em;
                        color:#111111;
                      "
                    >
                      KALOO
                    </div>

                    <div
                      style="
                        margin-top:8px;
                        font-size:9px;
                        line-height:1;
                        font-weight:700;
                        letter-spacing:0.24em;
                        text-transform:uppercase;
                        color:#999999;
                      "
                    >
                      Modern Point of Sale
                    </div>
                  </td>

                  <td
                    align="right"
                    valign="top"
                  >
                    <span
                      style="
                        display:inline-block;
                        padding:8px 12px;
                        border-radius:999px;
                        background:#f3f3ef;
                        font-size:9px;
                        font-weight:700;
                        letter-spacing:0.12em;
                        text-transform:uppercase;
                        color:#777777;
                      "
                    >
                      Account Security
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td
              style="
                padding:42px 36px 38px;
              "
            >
              <div
                style="
                  font-size:11px;
                  line-height:1.4;
                  font-weight:700;
                  letter-spacing:0.16em;
                  text-transform:uppercase;
                  color:#999999;
                  margin-bottom:14px;
                "
              >
                Password Recovery
              </div>

              <h1
                style="
                  margin:0;
                  padding:0;
                  font-size:32px;
                  line-height:1.12;
                  letter-spacing:-0.03em;
                  font-weight:700;
                  color:#111111;
                "
              >
                Create a new password.
              </h1>

              <p
                style="
                  margin:20px 0 0;
                  padding:0;
                  font-size:15px;
                  line-height:1.8;
                  color:#666666;
                "
              >
                We received a request to reset the password
                for your KALOO POS account.
              </p>

              <p
                style="
                  margin:8px 0 0;
                  padding:0;
                  font-size:15px;
                  line-height:1.8;
                  color:#666666;
                "
              >
                Click the button below to create a new password.
              </p>

              <!-- BUTTON -->
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  margin-top:30px;
                "
              >
                <tr>
                  <td
                    bgcolor="#111111"
                    style="
                      border-radius:999px;
                    "
                  >
                    <a
                      href="${safeResetUrl}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:16px 28px;
                        font-size:14px;
                        line-height:1;
                        font-weight:700;
                        color:#ffffff;
                        text-decoration:none;
                      "
                    >
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SECURITY NOTE -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  margin-top:32px;
                  background:#f7f7f4;
                  border-radius:18px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:18px 20px;
                      font-size:12px;
                      line-height:1.7;
                      color:#777777;
                    "
                  >
                    <strong
                      style="
                        color:#333333;
                      "
                    >
                      Security notice
                    </strong>

                    <br />

                    This link expires in
                    <strong>30 minutes</strong>
                    and can only be used
                    <strong>once</strong>.
                  </td>
                </tr>
              </table>

              <!-- FALLBACK URL -->
              <p
                style="
                  margin:28px 0 0;
                  padding:0;
                  font-size:11px;
                  line-height:1.7;
                  color:#999999;
                "
              >
                If the button above does not work,
                copy and paste this URL into your browser:
              </p>

              <p
                style="
                  margin:8px 0 0;
                  padding:0;
                  font-size:11px;
                  line-height:1.7;
                  color:#555555;
                  word-break:break-all;
                "
              >
                ${safeResetUrl}
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="
                padding:26px 36px 30px;
                border-top:1px solid #eeeeea;
              "
            >
              <p
                style="
                  margin:0;
                  padding:0;
                  font-size:12px;
                  line-height:1.7;
                  color:#999999;
                "
              >
                If you did not request a password reset,
                no action is required. You can safely
                ignore this email.
              </p>

              <p
                style="
                  margin:22px 0 0;
                  padding:0;
                  font-size:10px;
                  line-height:1.5;
                  font-weight:700;
                  letter-spacing:0.12em;
                  text-transform:uppercase;
                  color:#bbbbbb;
                "
              >
                © ${new Date().getFullYear()} KALOO POS
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    };
  }

  // =========================================================
  // INDONESIA
  // =========================================================

  return {
    subject:
      'Reset kata sandi KALOO POS Anda',

    text: `
Reset kata sandi KALOO POS

Kami menerima permintaan untuk mereset kata sandi akun KALOO POS Anda.

Buat kata sandi baru melalui tautan berikut:

${resetUrl}

Tautan reset ini berlaku selama 30 menit dan hanya dapat digunakan satu kali.

Jika Anda tidak meminta reset kata sandi, Anda dapat mengabaikan email ini.

KALOO POS
Modern Point of Sale
    `.trim(),

    html: `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Reset kata sandi KALOO POS
  </title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f2;
    font-family:Arial, Helvetica, sans-serif;
    color:#111111;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width:100%;
      background:#f5f5f2;
      padding:40px 16px;
    "
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:28px;
            overflow:hidden;
            border:1px solid #e8e8e3;
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              style="
                padding:32px 36px 26px;
                border-bottom:1px solid #eeeeea;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
              >
                <tr>
                  <td>
                    <div
                      style="
                        font-size:22px;
                        line-height:1;
                        font-weight:800;
                        letter-spacing:0.16em;
                        color:#111111;
                      "
                    >
                      KALOO
                    </div>

                    <div
                      style="
                        margin-top:8px;
                        font-size:9px;
                        line-height:1;
                        font-weight:700;
                        letter-spacing:0.24em;
                        text-transform:uppercase;
                        color:#999999;
                      "
                    >
                      Modern Point of Sale
                    </div>
                  </td>

                  <td
                    align="right"
                    valign="top"
                  >
                    <span
                      style="
                        display:inline-block;
                        padding:8px 12px;
                        border-radius:999px;
                        background:#f3f3ef;
                        font-size:9px;
                        font-weight:700;
                        letter-spacing:0.12em;
                        text-transform:uppercase;
                        color:#777777;
                      "
                    >
                      Keamanan Akun
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td
              style="
                padding:42px 36px 38px;
              "
            >
              <div
                style="
                  font-size:11px;
                  line-height:1.4;
                  font-weight:700;
                  letter-spacing:0.16em;
                  text-transform:uppercase;
                  color:#999999;
                  margin-bottom:14px;
                "
              >
                Pemulihan Kata Sandi
              </div>

              <h1
                style="
                  margin:0;
                  padding:0;
                  font-size:32px;
                  line-height:1.12;
                  letter-spacing:-0.03em;
                  font-weight:700;
                  color:#111111;
                "
              >
                Buat kata sandi baru.
              </h1>

              <p
                style="
                  margin:20px 0 0;
                  padding:0;
                  font-size:15px;
                  line-height:1.8;
                  color:#666666;
                "
              >
                Kami menerima permintaan untuk mereset
                kata sandi akun KALOO POS Anda.
              </p>

              <p
                style="
                  margin:8px 0 0;
                  padding:0;
                  font-size:15px;
                  line-height:1.8;
                  color:#666666;
                "
              >
                Klik tombol di bawah untuk membuat
                kata sandi baru.
              </p>

              <!-- BUTTON -->
              <table
                role="presentation"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  margin-top:30px;
                "
              >
                <tr>
                  <td
                    bgcolor="#111111"
                    style="
                      border-radius:999px;
                    "
                  >
                    <a
                      href="${safeResetUrl}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:16px 28px;
                        font-size:14px;
                        line-height:1;
                        font-weight:700;
                        color:#ffffff;
                        text-decoration:none;
                      "
                    >
                      Reset Kata Sandi
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SECURITY NOTE -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  margin-top:32px;
                  background:#f7f7f4;
                  border-radius:18px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:18px 20px;
                      font-size:12px;
                      line-height:1.7;
                      color:#777777;
                    "
                  >
                    <strong
                      style="
                        color:#333333;
                      "
                    >
                      Informasi keamanan
                    </strong>

                    <br />

                    Tautan ini berlaku selama
                    <strong>30 menit</strong>
                    dan hanya dapat digunakan
                    <strong>satu kali</strong>.
                  </td>
                </tr>
              </table>

              <!-- FALLBACK URL -->
              <p
                style="
                  margin:28px 0 0;
                  padding:0;
                  font-size:11px;
                  line-height:1.7;
                  color:#999999;
                "
              >
                Jika tombol di atas tidak berfungsi,
                salin dan buka tautan berikut pada browser:
              </p>

              <p
                style="
                  margin:8px 0 0;
                  padding:0;
                  font-size:11px;
                  line-height:1.7;
                  color:#555555;
                  word-break:break-all;
                "
              >
                ${safeResetUrl}
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="
                padding:26px 36px 30px;
                border-top:1px solid #eeeeea;
              "
            >
              <p
                style="
                  margin:0;
                  padding:0;
                  font-size:12px;
                  line-height:1.7;
                  color:#999999;
                "
              >
                Jika Anda tidak pernah meminta reset
                kata sandi, tidak ada tindakan yang perlu
                dilakukan. Anda dapat mengabaikan email ini.
              </p>

              <p
                style="
                  margin:22px 0 0;
                  padding:0;
                  font-size:10px;
                  line-height:1.5;
                  font-weight:700;
                  letter-spacing:0.12em;
                  text-transform:uppercase;
                  color:#bbbbbb;
                "
              >
                © ${new Date().getFullYear()} KALOO POS
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}