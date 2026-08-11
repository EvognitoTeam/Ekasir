import {  MapPin, Phone, Clock } from 'lucide-react';

interface FooterProps {
  mitraName?: string;
  mitraAddress?: string;
  mitraPhone?: string;
  mitraWelcome?: string;
}

export default function Footer({ 
  mitraName = "KALOO POS.", 
  mitraAddress = "Alamat belum diatur",
  mitraPhone = "Belum ada kontak",
  mitraWelcome = ""
}: FooterProps) {
  return (
    <footer className="mt-10 bg-[var(--color-surface-container-low)] pt-6 pb-12 relative">
      <div className="px-6">
        <div className="flex flex-col gap-12">
          {/* Brand Column */}
          <div className="space-y-8">
            <div className="flex flex-col">
              <span className="text-4xl font-serif italic text-[var(--color-primary)] leading-none tracking-tight">
                {mitraName}
              </span>
              <span className="text-[10px] font-label text-[var(--color-on-surface-variant)] opacity-60 mt-3 tracking-[0.2em]">Digital Menu</span>
            </div>
            <p className="text-sm font-body font-light italic opacity-60 leading-relaxed max-w-[280px]">
              {mitraWelcome}
            </p>
            {/* <div className="flex gap-6 pt-2">
              <Instagram className="w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
              <Facebook className="w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
            </div> */}
          </div>

          {/* Timing Column */}
          {/* <div className="space-y-10">
            <h4 className="text-[10px] font-label font-bold uppercase tracking-[0.3em] opacity-30 text-[var(--color-primary)]">The Atelier Hours</h4>
            <div className="space-y-5">
              {[
                { day: 'Monday — Friday', hours: '08:00 AM — 10:00 PM' },
                { day: 'Saturday — Sunday', hours: '08:00 AM — 11:00 PM' },
              ].map(item => (
                <div key={item.day} className="flex justify-between items-center text-sm pb-3">
                   <span className="font-body opacity-50">{item.day}</span>
                   <span className="font-bold tracking-tight">{item.hours}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--color-primary)] bg-[var(--color-primary)]/5 p-4 rounded-xl w-fit">
               <Phone className="w-4 h-4" />
               <span className="font-bold tracking-tight">{mitraPhone}</span>
            </div>
          </div> */}

          {/* Foundation Column */}
          <div className="space-y-10">
             <h4 className="text-[10px] font-label font-bold uppercase tracking-[0.3em] opacity-30 text-[var(--color-primary)]">Our Location</h4>
             <div className="flex gap-4 items-start">
                <MapPin className="w-5 h-5 text-[var(--color-primary)] opacity-40 flex-shrink-0 mt-1" />
                <p className="text-sm font-body font-light opacity-60 leading-relaxed">
                  {mitraAddress}
                </p>
             </div>
             {/* <div className="bg-[var(--color-surface-container-high)] p-8 rounded-2xl ambient-shadow">
                <div className="flex items-center gap-3 mb-3">
                   <Clock className="w-4 h-4 text-[var(--color-tertiary)]" />
                   <span className="text-[10px] font-label font-bold text-[var(--color-tertiary)] uppercase tracking-[0.2em]">Live Availability</span>
                </div>
                <p className="text-xs font-body opacity-70 leading-relaxed">
                  Estimated wait time for table service is currently <span className="font-bold text-[var(--color-on-surface)]">12 minutes.</span>
                </p>
             </div> */}
          </div>
        </div>
        
        <div className="mt-8 pt-4 flex flex-col items-start gap-4 opacity-40">
           <p className="text-[9px] font-label font-bold uppercase tracking-[0.4em]">© 2026 {mitraName}</p>
           <p className="text-[9px] font-label font-bold uppercase tracking-[0.4em]">Powered by <a href="https://evognito.my.id" target="_blank">Evognito Team</a></p>
        </div>
      </div>
    </footer>
  );
}