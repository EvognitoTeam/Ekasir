import type {
  ReactNode,
} from 'react';

import type {
  Metadata,
} from 'next';

import CashierShell
  from './_components/CashierShell';

import {
  CashierProvider,
} from './_providers/CashierProvider';

import PwaRegister
  from '@/components/pwa/PwaRegister';

import PwaInstallButton
  from '@/components/pwa/PwaInstallButton';

export const metadata: Metadata = {
  manifest:
    '/manifest.webmanifest',
};

export default function CashierLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <PwaRegister />
      <PwaInstallButton />

      <CashierProvider>
        <CashierShell>
          {children}
        </CashierShell>
      </CashierProvider>
    </>
  );
}