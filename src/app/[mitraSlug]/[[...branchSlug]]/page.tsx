'use client';

import KioskApp from '@/components/kiosk/KioskApp';

import CustomerError from './_components/CustomerError';
import CustomerLoading from './_components/CustomerLoading';
import CustomerShell from './_components/CustomerShell';
import {
  useCustomerBootstrap,
} from './_hooks/useCustomerBootstrap';
import {
  useCustomerNavigation,
} from './_hooks/useCustomerNavigation';

export default function CustomerPage() {
  const navigation =
    useCustomerNavigation();

  const customer =
    useCustomerBootstrap({
      slug:
        navigation.slug,
      branchSlug:
        navigation.branchSlug,
      isKiosk:
        navigation.isKiosk,
      searchParams:
        navigation.searchParams,
    });

  if (
    navigation.isKiosk
  ) {
    return (
      <KioskApp
        mitraSlug={
          navigation.slug
        }
        branchSlug={
          navigation.branchSlug ??
          undefined
        }
      />
    );
  }

  if (customer.error) {
    return (
      <CustomerError
        message={
          customer.error
        }
        onBack={
          navigation.goHome
        }
      />
    );
  }

  if (
    customer.isLoading
  ) {
    return (
      <CustomerLoading />
    );
  }

  return (
    <CustomerShell
      slug={
        navigation.slug
      }
      currentView={
        navigation.currentView
      }
      customer={
        customer
      }
      onViewChange={
        navigation.changeView
      }
    />
  );
}
