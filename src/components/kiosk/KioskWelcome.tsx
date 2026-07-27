'use client';

import {
  useRef,
  useState,
} from 'react';

import {
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';

import {
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';

type Props = {
  storeName: string;
  tagline?: string;
  logoUrl?: string | null;
  onStart: () => void;
};

const SLIDER_PADDING = 8;
const THUMB_SIZE = 76;

export default function KioskWelcome({
  storeName,
  tagline =
    'Pesan dengan cepat, mudah, dan nyaman.',
  logoUrl,
  onStart,
}: Props) {
  const trackRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [maxDrag, setMaxDrag] =
    useState(0);

  const x =
    useMotionValue(0);

  const textOpacity =
    useTransform(
      x,
      [
        0,
        Math.max(
          maxDrag,
          1,
        ),
      ],
      [
        1,
        0.15,
      ],
    );

  const progressOpacity =
    useTransform(
      x,
      [
        0,
        Math.max(
          maxDrag,
          1,
        ),
      ],
      [
        0.12,
        1,
      ],
    );

  const updateMaxDrag =
    () => {
      const width =
        trackRef.current
          ?.getBoundingClientRect()
          .width ??
        0;

      setMaxDrag(
        Math.max(
          0,
          width -
            THUMB_SIZE -
            SLIDER_PADDING *
              2,
        ),
      );
    };

  const completeSlide =
    () => {
      if (
        x.get() >=
        maxDrag * 0.72
      ) {
        x.set(maxDrag);

        window.setTimeout(
          () => {
            onStart();
            x.set(0);
          },
          120,
        );

        return;
      }

      x.set(0);
    };

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-stone-950 px-5 py-6 text-white sm:px-8 sm:py-8 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.28),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_28%)]" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:h-16 sm:w-16 lg:h-20 lg:w-20 lg:rounded-3xl">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="h-full w-full object-contain p-1"
                onError={(
                  event,
                ) => {
                  event.currentTarget.src =
                    '/logo.png';
                }}
              />
            ) : (
              <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
            )}
          </div>

          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-300 sm:px-4 sm:text-[10px] lg:px-5 lg:py-3 lg:text-xs lg:tracking-[0.25em]">
            Self Order Kiosk
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8 sm:py-12 lg:py-16">
          <motion.p
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300 sm:text-sm sm:tracking-[0.35em]"
          >
            Selamat datang
          </motion.p>

          <motion.h1
            initial={{
              opacity: 0,
              y: 24,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.08,
            }}
            className="mt-4 max-w-5xl text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:mt-5 sm:text-5xl lg:mt-6 lg:text-7xl xl:text-8xl"
          >
            Pesan favoritmu di
            <span className="block text-amber-300">
              {storeName}
            </span>
          </motion.h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-300 sm:mt-6 sm:text-xl lg:mt-8 lg:text-2xl">
            {tagline}
          </p>
        </div>

        <div
          ref={trackRef}
          onPointerEnter={
            updateMaxDrag
          }
          onPointerDown={
            updateMaxDrag
          }
          className="relative min-h-[92px] overflow-hidden rounded-[1.75rem] bg-amber-300 p-2 shadow-2xl shadow-amber-500/20 sm:min-h-[96px] sm:rounded-[2rem]"
        >
          <motion.div
            aria-hidden="true"
            style={{
              opacity:
                progressOpacity,
            }}
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-300 via-yellow-200 to-white"
          />

          <motion.div
            style={{
              opacity:
                textOpacity,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center pl-20 pr-5 text-center text-base font-black text-stone-950 sm:pl-24 sm:text-xl lg:text-2xl"
          >
            Slide untuk mulai memesan
          </motion.div>

          <motion.button
            type="button"
            aria-label="Geser untuk mulai memesan"
            drag="x"
            dragConstraints={{
              left: 0,
              right:
                maxDrag,
            }}
            dragElastic={
              0.04
            }
            dragMomentum={
              false
            }
            style={{
              x,
            }}
            onDragStart={
              updateMaxDrag
            }
            onDragEnd={
              completeSlide
            }
            whileTap={{
              scale:
                0.97,
            }}
            className="relative z-10 flex h-[76px] w-[76px] touch-none items-center justify-center rounded-[1.4rem] bg-stone-950 text-white shadow-xl"
          >
            <ArrowRight className="h-8 w-8" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
