'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'id' | 'en';

type LanguageState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: 'id',

      setLocale: (locale) => {
        set({ locale });

        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
        }
      },
    }),
    {
      name: 'kaloo_language',

      // Prevent server/client hydration differences.
      // LanguageHtmlSync will rehydrate the saved locale after mount.
      skipHydration: true,
    },
  ),
);
