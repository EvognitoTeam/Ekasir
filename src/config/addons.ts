export const KALOO_ADDONS = {
  enabled: false,

  attendance: {
    enabled: true,
    code: "attendance",
    name: "KALOO Attendance",
    description: "Employee attendance, shift, and workforce management.",
  },

  pager: {
    enabled: true,
    code: "pager",
    name: "KALOO Pager",
    description: "Smart table pager integrated directly with KALOO POS.",
  },

  parking: {
    enabled: false,
    code: "parking",
    name: "KALOO Parking",
    description: "Integrated parking access and payment automation.",
  },
} as const;

export type KalooAddonKey = Exclude<keyof typeof KALOO_ADDONS, "enabled">;

export function isAddonEnabled(addon: KalooAddonKey): boolean {
  return KALOO_ADDONS.enabled && KALOO_ADDONS[addon].enabled;
}
