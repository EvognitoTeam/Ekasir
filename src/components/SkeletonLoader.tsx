
export default function SkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white rounded-[2rem] p-4 ambient-shadow animate-pulse">
          {/* Image Placeholder */}
          <div className="aspect-square bg-[var(--color-surface-container-low)] rounded-[1.5rem] mb-6" />
          
          <div className="px-1 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-5 w-3/4 bg-[var(--color-surface-container-high)] rounded-lg" />
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)]" />
            </div>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className="w-3 h-3 rounded-full bg-[var(--color-surface-container-low)]" />
              ))}
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-[var(--color-surface-container-low)] rounded-md" />
              <div className="h-3 w-2/3 bg-[var(--color-surface-container-low)] rounded-md" />
            </div>

            <div className="h-6 w-16 bg-[var(--color-surface-container-high)] rounded-md mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
