export type PointSettings = {
  enabled: boolean;
  earnRate: number;
  redeemRate: number;
  minimumRedeem: number;
  maximumRedeem: number | null;
  maxDiscountPercent: number;
  requirePaidOrder: boolean;
  includeTaxService: boolean;
};

export function calculateEarnedPoints(input: {
  totalAfterDiscount: number;
  tax: number;
  service: number;
  settings: PointSettings;
}) {
  if (!input.settings.enabled) return 0;
  const eligible = input.totalAfterDiscount + (input.settings.includeTaxService ? input.tax + input.service : 0);
  return Math.max(0, Math.floor(eligible / Math.max(1, input.settings.earnRate)));
}

export function calculatePointRedemption(input: {
  requestedPoints: number;
  availablePoints: number;
  orderGrandTotal: number;
  settings: PointSettings;
}) {
  if (!input.settings.enabled) throw new Error('Sistem loyalty points tidak aktif.');
  if (input.requestedPoints < input.settings.minimumRedeem) throw new Error(`Minimal penukaran ${input.settings.minimumRedeem} poin.`);
  const maxSetting = input.settings.maximumRedeem ?? Number.MAX_SAFE_INTEGER;
  const maxDiscount = Math.floor(input.orderGrandTotal * input.settings.maxDiscountPercent / 100);
  const maxByOrder = input.settings.redeemRate <= 0 ? 0 : Math.floor(maxDiscount / input.settings.redeemRate);
  const redeemedPoints = Math.min(input.requestedPoints, input.availablePoints, maxSetting, maxByOrder);
  if (redeemedPoints <= 0) throw new Error('Poin tidak dapat digunakan untuk transaksi ini.');
  return { redeemedPoints, discountValue: redeemedPoints * input.settings.redeemRate };
}
