# Migrasi Customer UI — Template website-cashier ke EKASIR MySQL

## Cakupan fase ini

- Mempertahankan Next.js App Router dan API MySQL/Drizzle milik EKASIR.
- Memperbarui shell customer menjadi layout responsif dengan sidebar desktop dan container mobile 480px.
- Beranda customer memakai featured hero, promo dari database, rekomendasi produk, dan daftar kategori visual.
- Detail kategori tetap memakai data kategori dan produk dari `/api/products`.
- Search overlay mencari di seluruh menu, tidak lagi terkunci pada kategori yang sedang aktif.
- Cart, checkout, order tracking, order history, profile, coupon, dan support lama tetap dipakai.
- Path gambar dinormalisasi untuk URL absolut, blob, `/path`, dan `uploads/menu/...`.
- `branchSlug` optional catch-all Next.js dibaca dengan benar sebagai array.
- Sidebar membaca `mitraSlug` yang benar dan memakai nama meja dari Zustand/MySQL.

## File utama yang diubah

- `src/app/[mitraSlug]/[[...branchSlug]]/page.tsx`
- `src/hooks/useMenuFilter.ts`
- `src/utils/image.ts`
- `src/components/SearchOverlay.tsx`
- `src/components/ProductDetailView.tsx`
- `src/components/CheckoutView.tsx`
- `src/components/cart/FloatingCart.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/CategoryList.tsx`
- `src/components/layout/FeaturedHero.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/ProductCard.tsx`
- `src/components/layout/RecommendedHighlights.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/views/RoastGalleryView.tsx`

## Validasi

- `npx tsc --noEmit`: lulus.
- ESLint untuk file shell dan komponen baru: lulus.
- `next build` mencapai tahap kompilasi, lalu berhenti karena lingkungan pengujian offline tidak dapat mengambil Manrope dan Noto Serif dari Google Fonts melalui `next/font/google`.

## Belum dikerjakan pada fase ini

- API panggil pelayan, karena proyek EKASIR saat ini belum memiliki endpoint/tabel waiter call.
- Edit item cart dan add-similar seperti template terbaru.
- Pemecahan semua view customer menjadi route Next.js terpisah.
- Sinkronisasi tema/branding per mitra dari tabel settings.

## Customer URL routing

Customer views now use path-based URLs instead of internal `currentView` state or `?view=`:

- `/{mitraSlug}/menu`
- `/{mitraSlug}/checkout`
- `/{mitraSlug}/tracking`
- `/{mitraSlug}/history`
- `/{mitraSlug}/help`
- `/{mitraSlug}/profile`
- `/{mitraSlug}/coupons`
- `/{mitraSlug}/roasts`

Branch-aware equivalents:

- `/{mitraSlug}/{branchSlug}/menu`
- `/{mitraSlug}/{branchSlug}/checkout`
- `/{mitraSlug}/{branchSlug}/tracking`
- and the same pattern for other customer views.

Legacy customer URLs `/{mitraSlug}` and `/{mitraSlug}/{branchSlug}` redirect to their corresponding `/menu` URL. Existing query parameters such as `tableCode` are preserved during customer navigation.
