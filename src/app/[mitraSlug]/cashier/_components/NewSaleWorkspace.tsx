'use client';

import { useRouter } from 'next/navigation';
import CashierPOS from '@/components/cashier/CashierPOS';
import { useCashier } from '../_providers/CashierProvider';

export default function NewSaleWorkspace() {
  const router = useRouter();
  const { slug, handlePOSSubmit } = useCashier();

  return (
    <div className="h-full w-full bg-white">
      <CashierPOS
        onClose={() => router.push(`/${slug}/cashier/new-order`)}
        onSubmitOrder={async (order) => {
          await handlePOSSubmit(order);
          router.push(`/${slug}/cashier/new-order`);
        }}
      />
    </div>
  );
}
