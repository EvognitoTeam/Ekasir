import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Serif } from "next/font/google";
import "./globals.css";
import PwaRegister
  from '@/components/pwa/PwaRegister';

// 1. Konfigurasi Google Fonts
const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-body", 
});

const notoSerif = Noto_Serif({ 
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display", 
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// 2. Metadata Default (Untuk Landing Page KALOO POS)
export const metadata:
  Metadata = {
  title:
    'KALOO POS - The Original POS & Digital Menu',

  description:
    'Sistem kasir dan menu digital modern untuk bisnis F&B Anda.',

  manifest:
    '/manifest.webmanifest',

  applicationName:
    'KALOO POS',

  appleWebApp: {
    capable:
      true,

    title:
      'KALOO POS',

    statusBarStyle:
      'default',
  },

  openGraph: {
    title:
      'KALOO POS - The Original POS & Digital Menu',

    description:
      'Sistem kasir dan menu digital modern untuk bisnis F&B Anda.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Semua halaman akan menggunakan font ini */}
      <body className={`${manrope.variable} ${notoSerif.variable} antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}