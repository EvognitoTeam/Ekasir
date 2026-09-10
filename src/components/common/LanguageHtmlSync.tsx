'use client';

import { useEffect } from 'react';

import {
  useLanguageStore,
} from '@/store/language.store';

export default function LanguageHtmlSync() {
  const locale =
    useLanguageStore(
      (state) => state.locale,
    );

  useEffect(() => {
    void useLanguageStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
