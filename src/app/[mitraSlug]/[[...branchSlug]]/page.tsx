'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import CartSheet from '@/components/CartSheet';
import CheckoutView from '@/components/CheckoutView';
import OrderTrackingView from '@/components/OrderTrackingView';
import ProductDetailView from '@/components/ProductDetailView';
import FloatingCart from '@/components/cart/FloatingCart';
import BottomNav from '@/components/layout/BottomNav';
import CategoryBar from '@/components/layout/CategoryBar';
import CategoryList from '@/components/layout/CategoryList';
import FeaturedHero from '@/components/layout/FeaturedHero';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import SearchOverlay from '@/components/SearchOverlay';
import MenuGrid from '@/components/layout/MenuGrid';
import PromoBanner, { type CouponData } from '@/components/layout/PromoBanner';
import RecommendedHighlights from '@/components/layout/RecommendedHighlights';
import Sidebar from '@/components/layout/Sidebar';
import CouponView from '@/components/views/CouponView';
import OrderHistoryView from '@/components/views/OrderHistoryView';
import ProfileView from '@/components/views/ProfileView';
import RoastGalleryView from '@/components/views/RoastGalleryView';
import SupportView from '@/components/views/SupportView';
import ReservationView from '@/components/views/ReservationView';
import { useMenuFilter } from '@/hooks/useMenuFilter';
import { useCartStore } from '@/store/cart.store';
import { useMenuStore } from '@/store/menu.store';
import { useOrderStore } from '@/store/order.store';
import { useTableStore } from '@/store/table.store';
import type { MenuItem } from '@/types/menu';
import KioskApp from '@/components/kiosk/KioskApp';

type ViewState =
  | 'menu'
  | 'roasts'
  | 'history'
  | 'help'
  | 'profile'
  | 'checkout'
  | 'reservation'
  | 'tracking'
  | 'coupons';
  
const CUSTOMER_VIEWS: readonly ViewState[] = [
  'menu',
  'roasts',
  'history',
  'help',
  'profile',
  'checkout',
  'reservation',
  'tracking',
  'coupons',
];

function isCustomerView(value: string | undefined): value is ViewState {
  return Boolean(value && CUSTOMER_VIEWS.includes(value as ViewState));
}

type ResolvedAppRoute =
  | {
      mode: 'kiosk';
      branchSlug: string | null;
    }
  | {
      mode: 'customer';
      branchSlug: string | null;
      currentView: ViewState;
      hasExplicitView: boolean;
    };

function resolveAppRoute(
  segments: string[] | undefined,
): ResolvedAppRoute {
  const routeSegments = segments ?? [];

  if (routeSegments.length === 1 && routeSegments[0] === 'kiosk') {
    return {
      mode: 'kiosk',
      branchSlug: null,
    };
  }

  if (routeSegments.length === 2 && routeSegments[1] === 'kiosk') {
    return {
      mode: 'kiosk',
      branchSlug: routeSegments[0] || null,
    };
  }

  const customerRoute = resolveCustomerRoute(routeSegments);

  return {
    mode: 'customer',
    ...customerRoute,
  };
}

function resolveCustomerRoute(segments: string[] | undefined) {
  const routeSegments = segments ?? [];

  if (isCustomerView(routeSegments[0])) {
    return {
      branchSlug: null,
      currentView: routeSegments[0],
      hasExplicitView: true,
    };
  }

  const branchSlug = routeSegments[0] || null;
  const requestedView = routeSegments[1];

  return {
    branchSlug,
    currentView: isCustomerView(requestedView) ? requestedView : 'menu',
    hasExplicitView: Boolean(requestedView && isCustomerView(requestedView)),
  };
}

export default function CustomerPage() {
  const params = useParams<{ mitraSlug: string; branchSlug?: string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.mitraSlug;

  const resolvedRoute = resolveAppRoute(params.branchSlug);

  const isKiosk = resolvedRoute.mode === 'kiosk';
  const branchSlug = resolvedRoute.branchSlug;

  const currentView: ViewState =
    resolvedRoute.mode === 'customer' ? resolvedRoute.currentView : 'menu';

  const hasExplicitView =
    resolvedRoute.mode === 'customer' ? resolvedRoute.hasExplicitView : false;

  const { setMenu, setLoading, items, categories, isLoading } = useMenuStore();
  
  // 🟢 TARIK STATE KERANJANG DAN FUNGSI AUTO-APPLY
  const addItem = useCartStore((state) => state.addItem);
  const cartsBySlug = useCartStore((state) => state.cartsBySlug);
  const autoApplyBestCoupon = useCartStore((state) => state.autoApplyBestCoupon);
  const currentCart = typeof slug === 'string' ? cartsBySlug[slug] || [] : [];
  
  const setTable = useTableStore((state) => state.setTable);
  const currentOrder = useOrderStore((state) => state.currentOrder);

  const [error, setError] = useState<string | null>(null);
  const [mitraName, setMitraName] = useState('Memuat...');
  const [mitraAddress, setMitraAddress] = useState('Alamat belum diatur');
  const [mitraWelcome, setMitraWelcome] = useState('');
  const [branchName, setBranchName] = useState<string | null>(null);
  const [promos, setPromos] = useState<CouponData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    selectedCategoryId,
    setSelectedCategoryId,
    filteredItems,
  } = useMenuFilter();

  const hasActiveOrder = Boolean(
    currentOrder &&
      currentOrder.status !== 'completed' &&
      currentOrder.status !== 'cancelled',
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return items.filter((item) =>
      [item.name, item.description].filter(Boolean).some((value) =>
        String(value).toLowerCase().includes(query),
      ),
    );
  }, [items, searchQuery]);

  const featuredItem = useMemo(
    () =>
      items.find((item) => item.isAvailable && item.image) ||
      items.find((item) => item.isAvailable) ||
      items[0],
    [items],
  );

  const customerBasePath = branchSlug ? `/${slug}/${branchSlug}` : `/${slug}`;

  const preservedQueryString = useMemo(() => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete('view');
    return query.toString();
  }, [searchParams]);

  const buildCustomerUrl = useCallback(
    (view: ViewState) =>
      `${customerBasePath}/${view}${
        preservedQueryString ? `?${preservedQueryString}` : ''
      }`,
    [customerBasePath, preservedQueryString],
  );

  useEffect(() => {
    if (!slug || isKiosk || hasExplicitView) return;
    router.replace(buildCustomerUrl('menu'));
  }, [buildCustomerUrl, hasExplicitView, isKiosk, router, slug]);

  // Fetch initial data
  useEffect(() => {
    if (!slug || isKiosk) return;

    const controller = new AbortController();
    const tableCode = searchParams.get('tableCode');

    async function loadCustomerData() {
      setLoading(true);
      setError(null);

      try {
        const productQuery = new URLSearchParams({ slug });
        const couponQuery = new URLSearchParams({ slug });

        if (branchSlug) {
          productQuery.set('branch_slug', branchSlug);
          couponQuery.set('branch_slug', branchSlug);
        }

        if (tableCode) productQuery.set('tableCode', tableCode);

        const [productResponse, couponResponse] = await Promise.all([
          fetch(`/api/products?${productQuery.toString()}`, { signal: controller.signal }),
          fetch(`/api/coupons?${couponQuery.toString()}`, { signal: controller.signal }),
        ]);

        const productResult = await productResponse.json();

        if (!productResponse.ok || !productResult.success) {
          throw new Error(productResult.message || 'Toko atau cabang tidak ditemukan');
        }

        setMenu(productResult.data, productResult.categoriesData);
        setMitraName(productResult.mitraName || 'KALOO POS');
        setMitraAddress(productResult.mitraAddress || 'Alamat belum diatur');
        setMitraWelcome(productResult.mitraWelcome || '');
        setBranchName(productResult.branchName || null);

        if (tableCode && productResult.tableName) {
          setTable(tableCode, productResult.tableName);
        }

        if (couponResponse.ok) {
          const couponResult = await couponResponse.json();
          if (couponResult.success) {
            setPromos(
              couponResult.data.filter(
                (coupon: CouponData) =>
                  coupon.max_use === 0 || coupon.already_used < coupon.max_use,
              ),
            );
          }
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        console.error('Gagal memuat halaman customer:', loadError);
        setLoading(false);
        setError(loadError instanceof Error ? loadError.message : 'Gagal terhubung ke server');
      }
    }

    void loadCustomerData();
    return () => controller.abort();
  }, [branchSlug, isKiosk, searchParams, setLoading, setMenu, setTable, slug]);

  // 🟢 EFFECT UNTUK MENTRIGGER AUTO-APPLY KUPON
  useEffect(() => {
    // Jalankan auto-apply setiap kali keranjang (currentCart) atau daftar promo berubah
    if (slug && items.length > 0 && promos.length > 0) {
      // @ts-ignore - mengabaikan validasi tipe sementara jika ada perbedaan strict type pada CouponData
      autoApplyBestCoupon(slug as string, items, promos);
    }
  }, [currentCart, promos, items, slug, autoApplyBestCoupon]);

  const handleOpenDetail = (product: MenuItem) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleAddToCart = (
    storeSlug: string,
    item: MenuItem,
    selections: unknown,
    quantity: number,
    options?: unknown,
    skuCode?: string,
  ) => {
    addItem(storeSlug, item, selections, quantity, options, skuCode);
    setIsDetailOpen(false);
  };

  const changeView = (view: ViewState) => {
    if (view === 'menu') {
      setSelectedCategoryId(null);
    }
    router.push(buildCustomerUrl(view));
  };

  if (isKiosk) {
    return <KioskApp mitraSlug={slug} branchSlug={branchSlug ?? undefined} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center space-y-6 bg-[var(--color-surface)] p-6 text-center">
        <div className="rounded-full bg-rose-50 p-6 text-rose-600">
          <Store size={48} />
        </div>
        <div>
          <h1 className="mb-2 font-display text-3xl font-bold text-[var(--color-on-surface)]">
            Toko tidak dapat dibuka
          </h1>
          <p className="max-w-sm text-sm text-[var(--color-on-surface-variant)]">{error}</p>
        </div>
        <button type="button" onClick={() => router.push('/')} className="flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white">
          <ChevronLeft size={18} /> Kembali
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-stone-200 border-t-[var(--color-primary)]" />
          <p className="font-display text-sm text-[var(--color-primary)]">Menyiapkan menu...</p>
        </div>
      </div>
    );
  }

  const isMainShellView = ['menu', 'roasts', 'history', 'help', 'profile', 'coupons'].includes(currentView);
  const isCategoryDetail = currentView === 'menu' && selectedCategoryId !== null;
  const showBottomNav = isMainShellView && currentView !== 'coupons';

  return (
    <div className="flex min-h-[100dvh] bg-stone-200/60 font-body">
      {isMainShellView && (
        <Sidebar
          activeView={currentView}
          onViewChange={changeView}
          onOpenCart={() => setIsCartOpen(true)}
          mitraName={mitraName}
          branchName={branchName}
          hasActiveOrder={hasActiveOrder}
        />
      )}

      <div className="flex flex-1 justify-center overflow-hidden">
        <div className="relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[var(--color-surface)] shadow-2xl">
          {isMainShellView && (
            <div className="flex-1 overflow-hidden">
              <main
                className={`relative h-full overscroll-contain no-scrollbar ${
                  isCategoryDetail ? 'bg-[#F4F4F5]' : 'bg-[var(--color-surface)]'
                } ${
                  showBottomNav ? 'overflow-y-auto pb-20 md:pb-0' : 'overflow-y-auto pb-0'
                }`}
              >
                {currentView !== 'coupons' && (
                  <Header mitraName={mitraName} branchName={branchName} onSearch={() => setIsSearchOpen(true)} />
                )}

                {currentView === 'menu' && (
                  <>
                    {hasActiveOrder && !isCategoryDetail && (
                      <div className="px-4 pt-4 sm:px-6">
                        <button
                          type="button"
                          onClick={() => changeView('tracking')}
                          className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[var(--color-primary)] shadow-sm active:scale-[0.985]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
                            <div className="text-left">
                              <p className="text-[8px] font-label uppercase tracking-widest text-emerald-700/60">
                                Pesanan sedang diproses
                              </p>
                              <p className="text-xs font-bold">
                                #{
                                  (currentOrder as { order_code?: string })?.order_code ||
                                  currentOrder?.id?.toString().slice(-6)
                                }
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {!isCategoryDetail ? (
                      <>
                        {featuredItem && <FeaturedHero item={featuredItem} onExplore={handleOpenDetail} />}
                        <PromoBanner activePromos={promos} onNavigate={() => changeView('coupons')} />
                        <RecommendedHighlights items={items} onSelectItem={handleOpenDetail} />
                        <CategoryList categories={categories} allItems={items} onSelectCategory={setSelectedCategoryId} />
                        <Footer mitraName={mitraName} mitraAddress={mitraAddress} mitraWelcome={mitraWelcome} />
                      </>
                    ) : (
                      <>
                        <CategoryBar categories={categories} items={items} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
                        <MenuGrid items={filteredItems} categories={categories} selectedCategoryId={selectedCategoryId} isLoading={false} onSelectItem={handleOpenDetail} onSelectCategory={setSelectedCategoryId} />
                      </>
                    )}
                  </>
                )}

                {currentView === 'roasts' && <RoastGalleryView items={items} onSelectItem={handleOpenDetail} />}
                {currentView === 'history' && <OrderHistoryView onBackToMenu={() => changeView('menu')} onTrackOrder={() => changeView('tracking')} />}
                {currentView === 'help' && <SupportView />}
                {currentView === 'profile' && <ProfileView onViewHistory={() => changeView('history')} onViewCoupons={() => changeView('coupons')} />}
                {currentView === 'coupons' && <CouponView onBack={() => changeView('profile')} />}
              </main>
            </div>
          )}

          {currentView === 'reservation' && (
            <div className="h-full overflow-y-auto no-scrollbar bg-stone-50">
              <ReservationView onBack={() => changeView('menu')} cafeName={mitraName} />
            </div>
          )}

          {currentView === 'checkout' && (
            <div className="h-full overflow-y-auto no-scrollbar">
              <CheckoutView onBack={() => changeView('menu')} onSuccess={() => changeView('tracking')} />
            </div>
          )}

          {currentView === 'tracking' && (
            <div className="h-full overflow-y-auto no-scrollbar">
              <OrderTrackingView onBackToMenu={() => changeView('menu')} onViewRoasts={() => changeView('roasts')} />
            </div>
          )}

          {showBottomNav && <BottomNav activeView={currentView} onViewChange={changeView} />}

          {isMainShellView && (
            <FloatingCart showBottomNav={showBottomNav} onOpenCart={() => setIsCartOpen(true)} onCheckout={() => changeView('checkout')} />
          )}

          <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={() => { setIsCartOpen(false); changeView('checkout'); }} />

          <SearchOverlay isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); setSearchQuery(''); }} searchQuery={searchQuery} setSearchQuery={setSearchQuery} results={searchResults} onSelectResult={(product) => { setIsSearchOpen(false); setSearchQuery(''); handleOpenDetail(product); }} />

          <AnimatePresence>
            {isDetailOpen && selectedProduct && (
              <ProductDetailView key={selectedProduct.id} item={selectedProduct} onClose={() => setIsDetailOpen(false)} onAddToCart={handleAddToCart} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}