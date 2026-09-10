export const KALOO_FEATURES = {
  pos: true,
  kitchen: true,
  reservation: true,
  loyalty: true,
  attendance: true,
  pager: true,
  parking: false,
  erp: true,
} as const;

export type KalooFeatureKey = keyof typeof KALOO_FEATURES;

export function isFeatureEnabled(feature: KalooFeatureKey): boolean {
  return KALOO_FEATURES[feature];
}
