import crypto from 'crypto';

/**
 * Formula HARUS sama dengan firmware lama:
 *
 * SHA256(
 *   UPPERCASE_MAC_WITH_COLONS + MASTER_KEY
 * )
 *
 * Contoh hexId:
 * A4:CF:12:34:56:78
 */
export function generateIoTDeviceSecret(
  hexId: string,
): string {
  const masterKey =
    process.env
      .IOT_MASTER_KEY;

  if (!masterKey) {
    throw new Error(
      'IOT_MASTER_KEY belum dikonfigurasi.',
    );
  }

  const normalizedHex =
    normalizeIoTHexId(
      hexId,
    );

  if (!normalizedHex) {
    throw new Error(
      'HEX ID / MAC ESP32 tidak valid.',
    );
  }

  return crypto
    .createHash(
      'sha256',
    )
    .update(
      normalizedHex +
      masterKey,
    )
    .digest(
      'hex',
    );
}

export function normalizeIoTHexId(
  value: string,
): string {
  const raw =
    String(
      value ??
      '',
    )
      .trim()
      .toUpperCase()
      .replace(
        /[^0-9A-F]/g,
        '',
      );

  if (
    raw.length !==
    12
  ) {
    return '';
  }

  return raw
    .match(
      /.{2}/g,
    )!
    .join(':');
}

export function toIoTApHex(
  value: string,
): string {
  return normalizeIoTHexId(
    value,
  ).replace(
    /:/g,
    '',
  );
}
