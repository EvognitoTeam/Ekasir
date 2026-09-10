'use client';

import {
  Check,
  Languages,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLanguageStore,
  type Locale,
} from '@/store/language.store';

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const locale =
    useLanguageStore((state) => state.locale);

  const setLocale =
    useLanguageStore((state) => state.setLocale);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const selectLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Language"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-2xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container)]/70 px-3 text-xs font-black text-[var(--color-on-surface)] backdrop-blur-xl transition-all hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] active:scale-95 sm:h-11 sm:px-4 sm:text-sm"
      >
        <Languages size={16} />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[200] w-48 overflow-hidden rounded-2xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface)] p-2 shadow-2xl">
          <LanguageOption
            active={locale === 'id'}
            flag="🇮🇩"
            label="Indonesia"
            onClick={() => selectLanguage('id')}
          />

          <LanguageOption
            active={locale === 'en'}
            flag="🇬🇧"
            label="English"
            onClick={() => selectLanguage('en')}
          />
        </div>
      )}
    </div>
  );
}

function LanguageOption({
  active,
  flag,
  label,
  onClick,
}: {
  active: boolean;
  flag: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
        active
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
          : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]'
      }`}
    >
      <span className="flex items-center gap-3">
        <span className="text-lg">{flag}</span>
        {label}
      </span>

      {active && (
        <Check
          size={16}
          strokeWidth={3}
        />
      )}
    </button>
  );
}
