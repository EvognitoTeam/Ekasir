export default function CustomerLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-surface)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-stone-200 border-t-[var(--color-primary)]" />
        <p className="font-display text-sm text-[var(--color-primary)]">
          Menyiapkan menu...
        </p>
      </div>
    </div>
  );
}
