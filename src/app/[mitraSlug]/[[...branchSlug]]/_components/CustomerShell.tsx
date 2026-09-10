'use client';

import {
  useMemo,
  useState,
} from 'react';
import {
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  CircleDot,
} from 'lucide-react';

import SearchOverlay from '@/components/SearchOverlay';

import RoastGalleryView from '@/components/views/RoastGalleryView';

import {
  useMenuFilter,
} from '@/hooks/useMenuFilter';
import {
  useCartStore,
} from '@/store/cart.store';
import type {
  MenuItem,
} from '@/types/menu';

import type {
  CustomerBootstrapResult,
} from '../_hooks/useCustomerBootstrap';
import type {
  CustomerView,
} from '../_lib/route';

import BottomDock from './v2/BottomDock';
import CustomerBookingV3 from './v3/CustomerBookingV3';
import CustomerCheckoutV3 from './v3/CustomerCheckoutV3';
import CustomerCurrentOrderV3 from './v3/CustomerCurrentOrderV3';
import CustomerHelpV3 from './v3/CustomerHelpV3';
import CustomerOrderHistoryV3 from './v3/CustomerOrderHistoryV3';
import CustomerProfileV3 from './v3/CustomerProfileV3';
import CustomerCartSheet from './v2/CustomerCartSheet';
import CustomerProductDetail from './v2/CustomerProductDetail';
import CategoryOverview from './v2/CategoryOverview';
import CategoryTabs from './v2/CategoryTabs';
import CouponView from './v3/CustomerCouponV3';
import FloatingCartBar from './v2/FloatingCartBar';
import MenuList from './v2/MenuList';
import PromoRail from './v2/PromoRail';
import RecommendationRail from './v2/RecommendationRail';
import StoreFooter from './v2/StoreFooter';
import StoreHeader from './v2/StoreHeader';
import StoreHero from './v2/StoreHero';

type CustomerShellProps = {
  slug: string;
  currentView: CustomerView;
  customer: CustomerBootstrapResult;
  onViewChange: (view: CustomerView) => void;
};

const DOCK_VIEWS: readonly CustomerView[] = [
  'menu',
  'history',
  'help',
  'profile',
];

export default function CustomerShell({
  currentView,
  customer,
  onViewChange,
}: CustomerShellProps) {
  const addItem = useCartStore(
    (state) => state.addItem,
  );

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<MenuItem | null>(null);

  const [
    isDetailOpen,
    setIsDetailOpen,
  ] = useState(false);

  const [
    isCartOpen,
    setIsCartOpen,
  ] = useState(false);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const {
    selectedCategoryId,
    setSelectedCategoryId,
    filteredItems,
  } = useMenuFilter();

  const searchResults = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    if (!query) return [];

    return customer.items.filter(
      (item) =>
        [
          item.name,
          htmlToPlainText(
            item.description,
          ),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query),
          ),
    );
  }, [customer.items, searchQuery]);

  const showDock =
    DOCK_VIEWS.includes(currentView);

  const isMenu =
    currentView === 'menu';

  function changeView(
    view: CustomerView,
  ) {
    if (view === 'menu') {
      setSelectedCategoryId(null);
    }

    onViewChange(view);
  }

  function handleOpenDetail(
    product: MenuItem,
  ) {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  }

  function handleAddToCart(
    storeSlug: string,
    item: MenuItem,
    selections: unknown,
    quantity: number,
    options?: unknown,
    skuCode?: string,
  ) {
    addItem(
      storeSlug,
      item,
      selections,
      quantity,
      options,
      skuCode,
    );

    setIsDetailOpen(false);
  }

  return (
    <div className="flex min-h-dvh w-full justify-center bg-stone-200 font-sans text-neutral-950 sm:px-4 lg:items-center lg:px-6 lg:py-5">
      {/*
        MOBILE FIRST:
        - < 640px  : full viewport width
        - >= 640px : centered 480px ordering canvas
        - desktop  : tetap mobile-oriented, tidak menempel kiri
      */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-stone-50 sm:h-[calc(100dvh-2rem)] sm:max-w-[480px] sm:rounded-[28px] sm:border sm:border-black/10 sm:shadow-2xl lg:h-[calc(100dvh-2.5rem)]">
        {isMenu && (
          <StoreHeader
            mitraName={customer.mitraName}
            branchName={customer.branchName}
            onSearch={() =>
              setIsSearchOpen(true)
            }
          />
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isMenu && (
            <main className="h-full overflow-y-auto overscroll-contain pb-40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {customer.hasActiveOrder && (
                <div className="px-4 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      changeView('tracking')
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-stone-200/80 px-3.5 py-3 text-left active:scale-[0.99]"
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white">
                      <CircleDot className="h-4 w-4" />
                      <span className="absolute inset-0 animate-ping rounded-full border border-black/25" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.15em] text-black/40">
                        Pesanan aktif
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-black">
                        #{customer.activeOrderCode}
                      </span>
                    </span>

                    <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.12em]">
                      Track
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              )}

              {selectedCategoryId === null ? (
                <>
                  {customer.featuredItem && (
                    <StoreHero
                      item={customer.featuredItem}
                      welcome={customer.mitraWelcome}
                      onExplore={handleOpenDetail}
                    />
                  )}

                  <PromoRail
                    promos={customer.promos}
                    onNavigate={() =>
                      changeView('coupons')
                    }
                  />

                  <RecommendationRail
                    items={customer.items}
                    onSelectItem={
                      handleOpenDetail
                    }
                  />

                  <CategoryOverview
                    categories={
                      customer.categories
                    }
                    items={customer.items}
                    onSelectCategory={
                      setSelectedCategoryId
                    }
                  />

                  <StoreFooter
                    mitraName={
                      customer.mitraName
                    }
                    address={
                      customer.mitraAddress
                    }
                  />
                </>
              ) : (
                <>
                  <CategoryTabs
                    categories={
                      customer.categories
                    }
                    items={customer.items}
                    selectedCategoryId={
                      selectedCategoryId
                    }
                    onSelectCategory={
                      setSelectedCategoryId
                    }
                  />

                  <MenuList
                    items={filteredItems}
                    categories={
                      customer.categories
                    }
                    selectedCategoryId={
                      selectedCategoryId
                    }
                    onSelectItem={
                      handleOpenDetail
                    }
                  />
                </>
              )}
            </main>
          )}

          {currentView === 'roasts' && (
            <div className="h-full overflow-y-auto bg-stone-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <RoastGalleryView
                items={customer.items}
                onSelectItem={handleOpenDetail}
              />
            </div>
          )}

          {currentView === 'history' && (
            <div className="h-full overflow-y-auto bg-stone-50 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CustomerOrderHistoryV3
                onBackToMenu={() =>
                  changeView('menu')
                }
                onTrackOrder={() =>
                  changeView('tracking')
                }
              />
            </div>
          )}

          {currentView === 'help' && (
            <div className="h-full overflow-y-auto bg-stone-50 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CustomerHelpV3 />
            </div>
          )}

          {currentView === 'profile' && (
            <div className="h-full overflow-y-auto bg-stone-50 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CustomerProfileV3
                onViewHistory={() =>
                  changeView('history')
                }
                onViewCoupons={() =>
                  changeView('coupons')
                }
              />
            </div>
          )}

          {currentView === 'coupons' && (
            <div className="h-full overflow-y-auto bg-stone-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CouponView
                onBack={() =>
                  changeView('profile')
                }
              />
            </div>
          )}

          {currentView ===
            'reservation' && (
            <div className="h-full min-h-0 bg-stone-50">
              <CustomerBookingV3
                onBack={() =>
                  changeView('menu')
                }
                cafeName={
                  customer.mitraName
                }
              />
            </div>
          )}

          {currentView === 'checkout' && (
            <div className="h-full overflow-y-auto bg-stone-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CustomerCheckoutV3
                onBack={() =>
                  changeView('menu')
                }
                onSuccess={() =>
                  changeView('tracking')
                }
              />
            </div>
          )}

          {currentView === 'tracking' && (
            <div className="h-full overflow-y-auto bg-stone-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CustomerCurrentOrderV3
                onBackToMenu={() =>
                  changeView('menu')
                }
                onViewRoasts={() =>
                  changeView('roasts')
                }
              />
            </div>
          )}

          {showDock && (
            <BottomDock
              activeView={currentView}
              onViewChange={changeView}
            />
          )}

          {isMenu && (
            <FloatingCartBar
              showBottomDock={showDock}
              onOpenCart={() =>
                setIsCartOpen(true)
              }
              onCheckout={() =>
                changeView('checkout')
              }
            />
          )}

          <CustomerCartSheet
            isOpen={isCartOpen}
            onClose={() =>
              setIsCartOpen(false)
            }
            onCheckout={() => {
              setIsCartOpen(false);
              changeView('checkout');
            }}
          />

          <SearchOverlay
            isOpen={isSearchOpen}
            onClose={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            setSearchQuery={
              setSearchQuery
            }
            results={searchResults}
            onSelectResult={(
              product,
            ) => {
              setIsSearchOpen(false);
              setSearchQuery('');
              handleOpenDetail(product);
            }}
          />

          <AnimatePresence>
            {isDetailOpen &&
              selectedProduct && (
                <CustomerProductDetail
                  key={selectedProduct.id}
                  item={selectedProduct}
                  onClose={() =>
                    setIsDetailOpen(false)
                  }
                  onAddToCart={
                    handleAddToCart
                  }
                />
              )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function htmlToPlainText(
  html:
    string |
    null |
    undefined,
) {
  if (!html) {
    return "";
  }

  return String(html)
    .replace(
      /<[^>]*>/g,
      " ",
    )
    .replace(
      /&nbsp;/gi,
      " ",
    )
    .replace(
      /&amp;/gi,
      "&",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}