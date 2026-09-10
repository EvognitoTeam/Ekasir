/* eslint-disable @next/next/no-img-element */

import {
  Plus,
} from 'lucide-react';

import type {
  MenuItem,
} from '@/types/menu';
import {
  applyFallbackImage,
  normalizeImageSrc,
} from '@/utils/image';

type Props = {
  item: MenuItem;
  onClick: (
    item:
      MenuItem,
  ) => void;
};

function enabled(
  value:
    unknown,
) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  );
}

function sanitizeHtml(
  value?:
    string | null,
) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    )
    .replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      '',
    )
    .replace(
      /\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      '',
    )
    .replace(
      /javascript\s*:/gi,
      '',
    );
}

export default function MenuItemCard({
  item,
  onClick,
}: Props) {
  const stock =
    item.stock ===
      null ||
    item.stock ===
      undefined
      ? null
      : Number(
          item.stock,
        );

  const available =
    enabled(
      item.status,
    ) ||
    Boolean(
      item.isAvailable,
    );

  const soldOut =
    !available ||
    (stock !== null &&
      stock <= 0);

  const description =
    sanitizeHtml(
      item.description,
    );

  const price =
    Number(
      item.basePrice || 0,
    );

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => {
        if (!soldOut) {
          onClick(item);
        }
      }}
      className="grid w-full grid-cols-[88px_1fr_40px] items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-2.5 text-left shadow-sm active:scale-[0.99] disabled:opacity-45"
    >
      <div className="h-[88px] w-[88px] overflow-hidden rounded-xl bg-stone-100">
        <img
          src={normalizeImageSrc(
            item.image,
          )}
          alt={item.name}
          onError={
            applyFallbackImage
          }
          className={`h-full w-full object-cover ${
            soldOut
              ? 'grayscale'
              : ''
          }`}
        />
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.02em]">
          {item.name}
        </h3>

        {description && (
          <div
            className={[
              "mt-1.5 line-clamp-2 text-[10px] leading-4 text-black/40",
              "[&_p]:m-0",
              "[&_strong]:font-bold",
              "[&_b]:font-bold",
              "[&_em]:italic",
              "[&_i]:italic",
              "[&_ul]:ml-3",
              "[&_ol]:ml-3",
              "[&_ul]:list-disc",
              "[&_ol]:list-decimal",
              "[&_a]:underline",
            ].join(" ")}
            dangerouslySetInnerHTML={{
              __html:
                description,
            }}
          />
        )}

        <p className="mt-2 text-xs font-extrabold">
          Rp
          {price.toLocaleString(
            'id-ID',
          )}
        </p>
      </div>

      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
        <Plus className="h-4 w-4" />
      </span>
    </button>
  );
}
