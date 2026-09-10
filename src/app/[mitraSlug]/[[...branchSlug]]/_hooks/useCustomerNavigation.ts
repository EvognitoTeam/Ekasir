'use client';

import {
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  resolveAppRoute,
  type CustomerView,
} from '../_lib/route';

export function useCustomerNavigation() {
  const params =
    useParams<{
      mitraSlug: string;
      branchSlug?: string[];
    }>();

  const router = useRouter();
  const searchParams =
    useSearchParams();

  const slug =
    params.mitraSlug;

  const resolvedRoute =
    resolveAppRoute(
      params.branchSlug,
    );

  const isKiosk =
    resolvedRoute.mode ===
    'kiosk';

  const branchSlug =
    resolvedRoute.branchSlug;

  const currentView:
    CustomerView =
    resolvedRoute.mode ===
    'customer'
      ? resolvedRoute.currentView
      : 'menu';

  const hasExplicitView =
    resolvedRoute.mode ===
    'customer'
      ? resolvedRoute.hasExplicitView
      : false;

  const customerBasePath =
    branchSlug
      ? `/${slug}/${branchSlug}`
      : `/${slug}`;

  const preservedQueryString =
    useMemo(() => {
      const query =
        new URLSearchParams(
          searchParams.toString(),
        );

      /*
       * Legacy compatibility:
       * view sekarang berasal dari path,
       * jadi query ?view=... tidak
       * diteruskan lagi.
       */
      query.delete('view');

      return query.toString();
    }, [searchParams]);

  const buildCustomerUrl =
    useCallback(
      (
        view:
          CustomerView,
      ) =>
        `${customerBasePath}/${view}${
          preservedQueryString
            ? `?${preservedQueryString}`
            : ''
        }`,
      [
        customerBasePath,
        preservedQueryString,
      ],
    );

  const changeView =
    useCallback(
      (
        view:
          CustomerView,
      ) => {
        router.push(
          buildCustomerUrl(
            view,
          ),
        );
      },
      [
        buildCustomerUrl,
        router,
      ],
    );

  const goHome =
    useCallback(() => {
      router.push('/');
    }, [router]);

  /*
   * Canonical URL:
   * /mitra atau /mitra/branch
   * otomatis diarahkan ke /menu.
   */
  useEffect(() => {
    if (
      !slug ||
      isKiosk ||
      hasExplicitView
    ) {
      return;
    }

    router.replace(
      buildCustomerUrl(
        'menu',
      ),
    );
  }, [
    buildCustomerUrl,
    hasExplicitView,
    isKiosk,
    router,
    slug,
  ]);

  return {
    slug,
    branchSlug,
    isKiosk,
    currentView,
    searchParams,
    buildCustomerUrl,
    changeView,
    goHome,
  };
}

export type CustomerNavigationResult =
  ReturnType<
    typeof useCustomerNavigation
  >;
