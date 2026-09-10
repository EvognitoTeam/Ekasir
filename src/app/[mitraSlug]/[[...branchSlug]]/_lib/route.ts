export type CustomerView =
  | 'menu'
  | 'roasts'
  | 'history'
  | 'help'
  | 'profile'
  | 'checkout'
  | 'reservation'
  | 'tracking'
  | 'coupons';

export const CUSTOMER_VIEWS: readonly CustomerView[] = [
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

export type ResolvedAppRoute =
  | {
      mode: 'kiosk';
      branchSlug: string | null;
    }
  | {
      mode: 'customer';
      branchSlug: string | null;
      currentView: CustomerView;
      hasExplicitView: boolean;
    };

export function isCustomerView(
  value: string | undefined,
): value is CustomerView {
  return Boolean(
    value &&
      CUSTOMER_VIEWS.includes(
        value as CustomerView,
      ),
  );
}

export function resolveAppRoute(
  segments: string[] | undefined,
): ResolvedAppRoute {
  const routeSegments = segments ?? [];

  if (
    routeSegments.length === 1 &&
    routeSegments[0] === 'kiosk'
  ) {
    return {
      mode: 'kiosk',
      branchSlug: null,
    };
  }

  if (
    routeSegments.length === 2 &&
    routeSegments[1] === 'kiosk'
  ) {
    return {
      mode: 'kiosk',
      branchSlug:
        routeSegments[0] || null,
    };
  }

  const customerRoute =
    resolveCustomerRoute(routeSegments);

  return {
    mode: 'customer',
    ...customerRoute,
  };
}

export function resolveCustomerRoute(
  segments: string[] | undefined,
) {
  const routeSegments = segments ?? [];

  if (
    isCustomerView(
      routeSegments[0],
    )
  ) {
    return {
      branchSlug: null,
      currentView:
        routeSegments[0],
      hasExplicitView: true,
    };
  }

  const branchSlug =
    routeSegments[0] || null;
  const requestedView =
    routeSegments[1];

  return {
    branchSlug,
    currentView:
      isCustomerView(requestedView)
        ? requestedView
        : 'menu',
    hasExplicitView: Boolean(
      requestedView &&
        isCustomerView(
          requestedView,
        ),
    ),
  };
}
