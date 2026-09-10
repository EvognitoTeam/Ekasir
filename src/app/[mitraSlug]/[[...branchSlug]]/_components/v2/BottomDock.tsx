'use client';

import {
  CalendarDays,
  CircleHelp,
  History,
  LayoutGrid,
  UserRound,
} from 'lucide-react';
import type {
  LucideIcon,
} from 'lucide-react';

import type {
  CustomerView,
} from '../../_lib/route';

type Props = {
  activeView:
    CustomerView;
  onViewChange: (
    view:
      CustomerView,
  ) => void;
};

const ITEMS: Array<{
  id: CustomerView;
  label: string;
  icon: LucideIcon;
}> = [
  {
    id: 'menu',
    label: 'Menu',
    icon: LayoutGrid,
  },
  {
    id: 'reservation',
    label: 'Booking',
    icon: CalendarDays,
  },
  {
    id: 'history',
    label: 'Orders',
    icon: History,
  },
  {
    id: 'help',
    label: 'Help',
    icon: CircleHelp,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound,
  },
];

export default function BottomDock({
  activeView,
  onViewChange,
}: Props) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 px-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
      <div className="grid h-16 grid-cols-5 items-center rounded-3xl bg-black px-1 shadow-2xl">
        {ITEMS.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              activeView ===
              item.id;

            return (
              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  onViewChange(
                    item.id,
                  )
                }
                className="flex h-full flex-col items-center justify-center gap-1"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    active
                      ? 'bg-white text-black'
                      : 'text-white/45'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span
                  className={`text-[7px] font-extrabold uppercase tracking-[0.08em] ${
                    active
                      ? 'text-white'
                      : 'text-white/30'
                  }`}
                >
                  {
                    item.label
                  }
                </span>
              </button>
            );
          },
        )}
      </div>
    </nav>
  );
}
