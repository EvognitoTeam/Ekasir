"use client"; // INI WAJIB DITAMBAHKAN!

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTableStore } from '@/store/table.store';
import { useMenuStore } from '@/store/menu.store';
import { useCartStore } from '@/store/cart.store';
import { AnimatePresence } from 'framer-motion';

import CartSheet from '@/components/CartSheet';
import SearchOverlay from '@/components/SearchOverlay';
import ProductDetailView from '@/components/ProductDetailView';
import CheckoutView from '@/components/CheckoutView';
import OrderTrackingView from '@/components/OrderTrackingView';

import Header from '@/components/layout/Header';
import CategoryBar from '@/components/layout/CategoryBar';
import MenuGrid from '@/components/layout/MenuGrid';
import Footer from '@/components/layout/Footer';
import FloatingCart from '@/components/cart/FloatingCart';
import BottomNav from '@/components/layout/BottomNav';
import RoastGalleryView from '@/components/views/RoastGalleryView';
import OrderHistoryView from '@/components/views/OrderHistoryView';
import SupportView from '@/components/views/SupportView';
import ProfileView from '@/components/views/ProfileView';
import CouponView from '@/components/views/CouponView';

import { MenuItem } from '@/types/menu';
import { useMenuFilter } from '@/hooks/useMenuFilter';

import { Store, ChevronLeft } from 'lucide-react';
import AdminDashboardView from '@/components/views/AdminDashboardView';

type ViewState = 'menu' | 'roasts' | 'history' | 'help' | 'profile' | 'checkout' | 'tracking' | 'coupons' | 'dashboard';

export default function Home() { 
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.mitraSlug as string;

  const { setMenu, items, categories, isLoading } = useMenuStore();
  const { addItem } = useCartStore();
  const { setTable } = useTableStore(); 
  
  const [error, setError] = useState<string | null>(null);
  const [mitraName, setMitraName] = useState("Memuat...");
  const [mitraAddress, setMitraAddress] = useState("Memuat alamat...");
  const [mitraWelcome, setMitraWelcome] = useState("Memuat Welcome...");
  
  // App Navigation
  const [currentView, setCurrentView] = useState<ViewState>('menu');

  // Filtering & Search Hook
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedCategoryId, 
    setSelectedCategoryId, 
    filteredItems 
  } = useMenuFilter();

  // Modals/Sheets
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    // 1. TANGKAP DAN SIMPAN TABLE CODE DARI URL
    const tableCode = searchParams.get('tableCode');

    // 2. FETCH MITRA DATA
    const fetchMitraData = async () => {
      if (!slug) return;
      
      try {
        const apiUrl = tableCode 
          ? `/api/products?slug=${slug}&tableCode=${tableCode}`
          : `/api/products?slug=${slug}`;

        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
          setMenu(data.data, data.categoriesData); 
          setMitraName(data.mitraName);
          setMitraAddress(data.mitraAddress);
          setMitraWelcome(data.mitraWelcome);

          // 3. JIKA API MENGEMBALIKAN NAMA MEJA, SIMPAN KE SESSION
          if (tableCode && data.tableName) {
            setTable(tableCode, data.tableName);
          } else if (tableCode && !data.tableName) {
            console.warn("Kode meja tidak valid atau tidak ditemukan di database.");
          }

        } else {
          setError(data.message || "Toko tidak ditemukan");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Gagal terhubung ke server");
      }
    };

    fetchMitraData();
  }, [slug, setMenu, searchParams, setTable]); 

  const handleOpenDetail = (product: MenuItem) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleAddToCart = (
    slug: string,
    item: MenuItem, 
    selections: any, 
    quantity: number, 
    options?: any, 
    sku_code?: string
  ) => {
    addItem(slug, item, selections, quantity, options, sku_code);
    setIsDetailOpen(false);
  };

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--color-surface)] p-4 text-center space-y-6">
        <div className="p-6 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)]">
          <Store size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-headline font-bold mb-2 text-[var(--color-on-surface)]">Waduh!</h1>
          <p className="text-[var(--color-on-surface-variant)]">{error}</p>
        </div>
        <button onClick={() => router.push('/')} className="px-6 py-3 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] font-label font-bold flex items-center gap-2">
          <ChevronLeft size={20} /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-[var(--font-display)] text-[var(--color-primary)]">Preparing the menu...</p>
        </div>
      </div>
    );
  }

  const isMainShellView = ['menu', 'roasts', 'history', 'help', 'profile', 'coupons'].includes(currentView);

  return (
    <div className="min-h-[100dvh] bg-[var(--color-surface)] flex justify-center font-body">
      <div className="w-full max-w-[480px] h-[100dvh] bg-[var(--color-surface)] relative overflow-hidden flex flex-col">
          {isMainShellView && (
            <div className="flex-1 overflow-hidden">
              <main className="pb-[120px] overflow-y-auto h-full custom-scrollbar relative bg-[var(--color-surface)]">
                <Header 
                  onOpenSearch={() => setIsSearchOpen(true)} 
                  mitraName={mitraName} 
                />
                
                {currentView === 'menu' && (
                  <>
                    <CategoryBar 
                      categories={categories}
                      selectedCategoryId={selectedCategoryId}
                      onSelectCategory={setSelectedCategoryId}
                    />
                    <MenuGrid 
                      items={filteredItems}
                      categories={categories}
                      selectedCategoryId={selectedCategoryId}
                      isLoading={isLoading}
                      onSelectItem={handleOpenDetail}
                      onSelectCategory={setSelectedCategoryId}
                    />
                  </>
                )}

                {currentView === 'roasts' && (
                  <RoastGalleryView items={items} onSelectItem={handleOpenDetail} />
                )}

                {currentView === 'history' && (
                  <OrderHistoryView 
                    onBackToMenu={() => setCurrentView('menu')} 
                    onTrackOrder={() => setCurrentView('tracking')} 
                  />
                )}

                {currentView === 'help' && <SupportView />}

                {currentView === 'profile' && (
                  <ProfileView
                    onViewHistory={() => setCurrentView('history')}
                    onViewCoupons={() => setCurrentView('coupons')}
                  />
                )}

                {currentView === 'coupons' && (
                  <div className="h-full overflow-y-auto">
                    <CouponView onBack={() => setCurrentView('profile')} />
                  </div>
                )}
                
                {currentView === 'dashboard' && (
                  <div className="h-full overflow-y-auto">
                    <AdminDashboardView onBack={() => setCurrentView('dashboard')} />
                  </div>
                )}

                {/* 🔴 Bagian mitraWelcome sudah dihapus dari sini */}
                <Footer 
                  mitraName={mitraName} 
                  mitraAddress={mitraAddress} 
                />
              </main>
            </div>
          )}

          {currentView === 'checkout' && (
            <div className="h-full overflow-y-auto">
              <CheckoutView 
                onBack={() => setCurrentView('menu')} 
                onSuccess={() => setCurrentView('tracking')} 
              />
            </div>
          )}

          {currentView === 'tracking' && (
            <div className="h-full overflow-y-auto">
              <OrderTrackingView 
                onBackToMenu={() => setCurrentView('menu')} 
                onViewRoasts={() => setCurrentView('roasts')}
              />
            </div>
          )}

          {isMainShellView && (
            <BottomNav 
              activeView={currentView}
              onViewChange={(view) => setCurrentView(view)}
            />
          )}

          {currentView !== 'checkout' && currentView !== 'tracking' && (
            <FloatingCart 
              onOpenCart={() => setIsCartOpen(true)} 
              onCheckout={() => setCurrentView('checkout')}
            />
          )}

        <SearchOverlay 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          results={filteredItems}
          onSelectResult={(item) => {
            setIsSearchOpen(false);
            handleOpenDetail(item);
          }}
        />

        <CartSheet 
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={() => {
            setIsCartOpen(false);
            setCurrentView('checkout');
          }}
        />

        <AnimatePresence>
          {isDetailOpen && selectedProduct && (
            <ProductDetailView 
              key={selectedProduct.id}
              item={selectedProduct}
              onClose={() => setIsDetailOpen(false)}
              onAddToCart={handleAddToCart}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}