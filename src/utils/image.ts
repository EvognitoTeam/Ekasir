import type { SyntheticEvent } from 'react';

const FALLBACK_MENU_IMAGE =
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80';

export function normalizeImageSrc(source?: string | null): string {
  const value = source?.trim();

  if (!value) return FALLBACK_MENU_IMAGE;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('/')
  ) {
    return value;
  }

  return `/${value.replace(/^\/+/, '')}`;
}

export function applyFallbackImage(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  const image = event.currentTarget;

  if (image.src !== FALLBACK_MENU_IMAGE) {
    image.src = FALLBACK_MENU_IMAGE;
  }
}
