import { Coffee, Settings } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[var(--color-surface)]">
      {/* Background Ornaments - Soft Glows */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[var(--color-primary)] opacity-5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-[var(--color-tertiary)] opacity-5 rounded-full blur-3xl"></div>

      {/* Main Card */}
      <div className="max-w-md w-full text-center space-y-8 p-10 glass rounded-3xl ghost-border ambient-shadow relative z-10">
        
        {/* Icon Animation */}
        <div className="flex justify-center relative">
          <div className="p-5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-primary)] relative z-10">
            <Coffee size={48} strokeWidth={1.5} />
          </div>
          {/* Rotating Settings Gear */}
          <div className="absolute top-0 right-1/3 animate-[spin_4s_linear_infinite] text-[var(--color-on-surface-variant)] opacity-50">
            <Settings size={24} />
          </div>
        </div>
        
        {/* Typographic Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-headline text-[var(--color-primary)] tracking-tight">
            Evokasir
          </h1>
          
          <div className="w-12 h-1 bg-[var(--color-primary)] mx-auto opacity-20 rounded-full"></div>
          
          <p className="text-[var(--color-on-surface-variant)] text-lg leading-relaxed">
            Mesin sedang dipanaskan. Kami sedang menyempurnakan sistem agar manajemen pesanan di kedai Anda menjadi jauh lebih mulus dan praktis.
          </p>
        </div>

        {/* Badge Component */}
        <div className="pt-6 flex justify-center">
          <span className="stamped-badge inline-flex items-center gap-2 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
            Coming Soon
          </span>
        </div>
        
      </div>
    </div>
  );
}