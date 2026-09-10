'use client';

import {
  ChevronLeft,
  Store,
} from 'lucide-react';

type CustomerErrorProps = {
  message: string;
  onBack: () => void;
};

export default function CustomerError({
  message,
  onBack,
}: CustomerErrorProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center space-y-6 bg-[var(--color-surface)] p-6 text-center">
      <div className="rounded-full bg-rose-50 p-6 text-rose-600">
        <Store size={48} />
      </div>

      <div>
        <h1 className="mb-2 font-display text-3xl font-bold text-[var(--color-on-surface)]">
          Toko tidak dapat dibuka
        </h1>

        <p className="max-w-sm text-sm text-[var(--color-on-surface-variant)]">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white"
      >
        <ChevronLeft size={18} />
        Kembali
      </button>
    </div>
  );
}
