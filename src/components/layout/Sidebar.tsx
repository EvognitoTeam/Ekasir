'use client';

import { motion } from 'framer-motion';
import {
  BookOpen,
  Circle,
  ClipboardList,
  HelpCircle,
  History,
  Radio,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useParams } from 'next/navigation';

import { useCartStore } from '@/store/cart.store';
import { useTableStore } from '@/store/table.store';

interface Props {
  onViewChange: (view: 'menu' | 'tracking' | 'history' | 'profile' | 'help') => void;
  activeView: string;
  onOpenCart: () => void;
  mitraName?: string;
  branchName?: string | null;
  hasActiveOrder?: boolean;
}

export default function Sidebar({
  onViewChange,
  activeView,
  onOpenCart,
  mitraName = 'Kedai',
  branchName,
  hasActiveOrder = false,
}: Props) {
  const params = useParams();
  const slug = typeof params.mitraSlug === 'string' ? params.mitraSlug : '';
  const tableName = useTableStore((state) => state.tableName);
  const cartItems = useCartStore((state) => state.cartsBySlug[slug] || []);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    { id: 'menu' as const, label: 'Menu', icon: BookOpen, visible: true },
    {
      id: 'tracking' as const,
      label: 'Pesanan aktif',
      icon: ClipboardList,
      visible: hasActiveOrder,
    },
    { id: 'history' as const, label: 'Riwayat', icon: History, visible: true },
    { id: 'help' as const, label: 'Bantuan', icon: HelpCircle, visible: true },
    { id: 'profile' as const, label: 'Profil', icon: User, visible: true },
  ].filter((item) => item.visible);

  const isTableNotFound =
  tableName?.trim().toLowerCase() ===
  'table not found';

  return (
    <aside className="hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-stone-100 bg-[var(--color-surface)] px-4 py-8 md:flex xl:w-72">
      <div className="mb-8 px-3">
        <div className="mb-2 flex items-center gap-2">
          <Circle className="h-2.5 w-2.5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
          <span className="truncate text-[8px] font-label uppercase tracking-[0.3em] text-stone-500">
            {branchName || 'Digital storefront'}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-stone-900">
          {mitraName}
        </h1>
      </div>

      {tableName && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="relative shrink-0">
            <Radio className="h-3 w-3 text-[var(--color-primary)]" />
            <motion.div
              animate={{ scale: [1, 2.5, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-[var(--color-primary)]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-label uppercase tracking-widest text-stone-400">
              Meja aktif
            </p>
            <p
              className={`truncate text-sm font-semibold ${
                isTableNotFound
                  ? 'text-red-600'
                  : 'text-stone-700'
              }`}
            >
              {tableName}
            </p>
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
      {navItems.map(({ id, label, icon: Icon }) => {
        const active =
          activeView === id ||
          (id === 'menu' && activeView === 'roasts');

        return (
          <button
            type="button"
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex w-full items-center justify-start gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
              active
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              strokeWidth={active ? 2.5 : 2}
            />

            <span className="flex-1 text-left text-[10px] font-label uppercase tracking-widest">
              {label}
            </span>

            {id === 'tracking' && (
              <span className="ml-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-300" />
            )}
          </button>
        );
      })}
    </nav>

      <button
        type="button"
        onClick={onOpenCart}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3.5 text-white shadow-lg active:scale-[0.98]"
      >
        <ShoppingBag className="h-4 w-4" />
        <span className="text-[10px] font-label uppercase tracking-widest">Keranjang</span>
        <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-2 text-[10px] font-bold">
          {cartCount}
        </span>
      </button>
    </aside>
  );
}
