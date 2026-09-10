import { APP_VERSION } from "@/lib/appVersion";

export const KALOO_BRAND = {
  name: "KALOO",
  productName: "KALOO POS",
  descriptor: "Restaurant Operating System",
  logo: `/logo.png?v=${APP_VERSION}`,

  colors: {
    background: "#f7f7f5",
    surface: "#ffffff",
    text: "#111111",
    muted: "#6b6b66",
    primary: "#111111",
  },
} as const;