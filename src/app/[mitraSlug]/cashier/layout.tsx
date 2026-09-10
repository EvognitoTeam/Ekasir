import type { ReactNode } from 'react';

import CashierShell from './_components/CashierShell';
import { CashierProvider } from './_providers/CashierProvider';

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <CashierProvider>
      <CashierShell>{children}</CashierShell>
    </CashierProvider>
  );
}
