'use client';

import { useCallback } from 'react';

import {
  translations,
  type TranslationKey,
} from '@/i18n/translations';

import {
  useLanguageStore,
} from '@/store/language.store';

type TranslationParams =
  Record<string, string | number>;

export function useTranslation() {
  const locale =
    useLanguageStore((state) => state.locale);

  const t = useCallback(
    (
      key: TranslationKey,
      params?: TranslationParams,
    ): string => {
      let value: string =
        translations[locale]?.[key] ??
        translations.id[key] ??
        key;

      if (params) {
        for (
          const [name, replacement]
          of Object.entries(params)
        ) {
          value = value
            .split(`{{${name}}}`)
            .join(String(replacement));
        }
      }

      return value;
    },
    [locale],
  );

  return {
    locale,
    t,
  };
}
