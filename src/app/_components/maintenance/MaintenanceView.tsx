import Image from 'next/image';
import { Clock3, Mail, MessageCircle } from 'lucide-react';
import { KALOO_BRAND } from '@/config/brand';

const emailAddress = 'support@kaloopos.com';
const whatsappUrl = 'https://wa.me/6285176773826';

export default function MaintenanceView() {
  return (
    <main className="kaloo-v2 k-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f4] px-5 py-16 text-[#111111]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(17,17,17,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.035)_1px,transparent_1px)] [background-size:40px_40px]" />

      <section className="relative z-10 w-full max-w-3xl">
        <div className="rounded-[36px] border border-black/10 bg-white p-7 shadow-[0_35px_100px_rgba(0,0,0,0.08)] sm:p-10 md:p-14">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-black/10 bg-white">
              <Image
                src={KALOO_BRAND.logo}
                alt={`${KALOO_BRAND.name} Logo`}
                fill
                priority
                sizes="64px"
                className="object-contain p-1.5"
              />
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-[0.18em]">
                {KALOO_BRAND.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-black/40">
                {KALOO_BRAND.descriptor}
              </p>
            </div>
          </div>

          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f3f3ef] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/55">
            <Clock3 size={14} />
            Maintenance mode
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl md:text-6xl">
            Kami sedang menyiapkan KALOO agar lebih baik.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-black/52">
            Website KALOO POS sedang menjalani pemeliharaan sementara.
            Layanan akan tersedia kembali setelah proses pembaruan selesai.
          </p>

          <div className="mt-10 flex flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle size={17} />
              WhatsApp KALOO
            </a>

            <a
              href={`mailto:${emailAddress}`}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-6 text-sm font-extrabold transition-colors hover:border-black/35"
            >
              <Mail size={17} />
              {emailAddress}
            </a>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-black/30">
          {KALOO_BRAND.productName} · System Maintenance
        </p>
      </section>
    </main>
  );
}
