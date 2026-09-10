'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  ReadonlyURLSearchParams,
} from 'next/navigation';

import type {
  CouponData,
} from '@/components/layout/PromoBanner';
import {
  useCartStore,
} from '@/store/cart.store';
import {
  useMenuStore,
} from '@/store/menu.store';
import {
  useOrderStore,
} from '@/store/order.store';
import {
  useTableStore,
} from '@/store/table.store';

type UseCustomerBootstrapParams = {
  slug: string;
  branchSlug: string | null;
  isKiosk: boolean;
  searchParams:
    ReadonlyURLSearchParams;
};

export function useCustomerBootstrap({
  slug,
  branchSlug,
  isKiosk,
  searchParams,
}: UseCustomerBootstrapParams) {
  const {
    setMenu,
    setLoading,
    items,
    categories,
    isLoading,
  } = useMenuStore();

  const cartsBySlug =
    useCartStore(
      (state) =>
        state.cartsBySlug,
    );

  const autoApplyBestCoupon =
    useCartStore(
      (state) =>
        state.autoApplyBestCoupon,
    );

  const setTable =
    useTableStore(
      (state) =>
        state.setTable,
    );

  const currentOrder =
    useOrderStore(
      (state) =>
        state.currentOrder,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    mitraName,
    setMitraName,
  ] =
    useState(
      'Memuat...',
    );

  const [
    mitraAddress,
    setMitraAddress,
  ] =
    useState(
      'Alamat belum diatur',
    );

  const [
    mitraWelcome,
    setMitraWelcome,
  ] =
    useState('');

  const [
    branchName,
    setBranchName,
  ] =
    useState<
      string | null
    >(null);

  const [
    promos,
    setPromos,
  ] =
    useState<
      CouponData[]
    >([]);

  const currentCart =
    typeof slug ===
    'string'
      ? cartsBySlug[
          slug
        ] || []
      : [];

  const hasActiveOrder =
    Boolean(
      currentOrder &&
        currentOrder.status !==
          'completed' &&
        currentOrder.status !==
          'cancelled',
    );

  const activeOrderCode =
    currentOrder
      ? (
          currentOrder.orderCode ||
          currentOrder.id
            ?.toString()
            .slice(-6) ||
          'MEMUAT...'
        )
      : 'MEMUAT...';

  const featuredItem =
    useMemo(
      () =>
        items.find(
          (item) =>
            item.isAvailable &&
            item.image,
        ) ||
        items.find(
          (item) =>
            item.isAvailable,
        ) ||
        items[0],
      [items],
    );

  /*
   * Bootstrap data customer:
   * - products
   * - categories
   * - mitra/branch identity
   * - table context
   * - coupons
   *
   * API dan response shape tetap sama
   * seperti page lama.
   */
  useEffect(() => {
    if (
      !slug ||
      isKiosk
    ) {
      return;
    }

    const controller =
      new AbortController();

    const tableCode =
      searchParams.get(
        'tableCode',
      );

    if (!tableCode) {
      setTable('', '');
    }

    async function loadCustomerData() {
      setLoading(true);
      setError(null);

      try {
        const productQuery =
          new URLSearchParams({
            slug,
          });

        const couponQuery =
          new URLSearchParams({
            slug,
          });

        if (branchSlug) {
          productQuery.set(
            'branch_slug',
            branchSlug,
          );

          couponQuery.set(
            'branch_slug',
            branchSlug,
          );
        }

        if (tableCode) {
          productQuery.set(
            'tableCode',
            tableCode,
          );
        }

        const [
          productResponse,
          couponResponse,
        ] =
          await Promise.all([
            fetch(
              `/api/products?${productQuery.toString()}`,
              {
                signal:
                  controller.signal,
              },
            ),
            fetch(
              `/api/coupons?${couponQuery.toString()}`,
              {
                signal:
                  controller.signal,
              },
            ),
          ]);

        const productResult =
          await productResponse.json();

        if (
          !productResponse.ok ||
          !productResult.success
        ) {
          throw new Error(
            productResult.message ||
              'Toko atau cabang tidak ditemukan',
          );
        }

        setMenu(
          productResult.data,
          productResult.categoriesData,
        );

        setMitraName(
          productResult.mitraName ||
            'KALOO POS',
        );

        setMitraAddress(
          productResult.mitraAddress ||
            'Alamat belum diatur',
        );

        setMitraWelcome(
          productResult.mitraWelcome ||
            '',
        );

        setBranchName(
          productResult.branchName ||
            null,
        );

        if (
          tableCode &&
          productResult.tableName
        ) {
          setTable(
            tableCode,
            productResult.tableName,
          );
        } else if (
          !tableCode
        ) {
          setTable('', '');
        }

        if (
          couponResponse.ok
        ) {
          const couponResult =
            await couponResponse.json();

          if (
            couponResult.success
          ) {
            setPromos(
              couponResult.data.filter(
                (
                  coupon:
                    CouponData,
                ) =>
                  coupon.max_use ===
                    0 ||
                  coupon.already_used <
                    coupon.max_use,
              ),
            );
          }
        }
      } catch (
        loadError
      ) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            'AbortError'
        ) {
          return;
        }

        console.error(
          'Gagal memuat halaman customer:',
          loadError,
        );

        setLoading(false);

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : 'Gagal terhubung ke server',
        );
      }
    }

    void loadCustomerData();

    return () => {
      controller.abort();
    };
  }, [
    branchSlug,
    isKiosk,
    searchParams,
    setLoading,
    setMenu,
    setTable,
    slug,
  ]);

  /*
   * Pertahankan behavior lama:
   * coupon terbaik dihitung ulang
   * ketika cart/menu/promo berubah.
   */
  useEffect(() => {
    if (
      slug &&
      items.length > 0 &&
      promos.length > 0
    ) {
      autoApplyBestCoupon(
        slug,
        items,
        promos,
      );
    }
  }, [
    autoApplyBestCoupon,
    currentCart,
    items,
    promos,
    slug,
  ]);

  return {
    error,
    isLoading,

    items,
    categories,
    promos,
    featuredItem,

    mitraName,
    mitraAddress,
    mitraWelcome,
    branchName,

    hasActiveOrder,
    activeOrderCode,
  };
}

export type CustomerBootstrapResult =
  ReturnType<
    typeof useCustomerBootstrap
  >;
