import type { Metadata, Viewport } from "next";
import Script from 'next/script';
import { Manrope, Noto_Serif } from "next/font/google";
import "./globals.css";
import PwaRegister from '@/components/pwa/PwaRegister';

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
export const metadata: Metadata = {
  title: 'KALOO POS - The Original POS & Digital Menu',
  description: 'Sistem kasir dan menu digital modern untuk bisnis F&B Anda.',
  manifest: '/manifest.webmanifest',
  applicationName: 'KALOO POS',
  appleWebApp: {
    capable: true,
    title: 'KALOO POS',
    statusBarStyle: 'default',
  },
  
  // ======== TAMBAHAN LOGO METADATA ========
  
  // A. Logo untuk Tab Browser & Shortcut HP
  icons: {
    icon: '/logo.png', 
    shortcut: '/logo.png',
    apple: '/logo.png',
  },

  // B. Logo untuk Share link (WhatsApp, Facebook, dsb)
  openGraph: {
    title: 'KALOO POS - The Original POS & Digital Menu',
    description: 'Sistem kasir dan menu digital modern untuk bisnis F&B Anda.',
    type: 'website',
    images: [
      {
        url: '/logo.png', 
        width: 1200,
        height: 630,
        alt: 'KALOO POS Logo',
      },
    ],
  },

  // C. Logo untuk Share link di Twitter/X
  twitter: {
    card: 'summary_large_image',
    title: 'KALOO POS - The Original POS & Digital Menu',
    description: 'Sistem kasir dan menu digital modern untuk bisnis F&B Anda.',
    images: ['/logo.png'],
  },
  
  // ========================================
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script 
          src="https://www.googletagmanager.com/gtag/js?id=G-TPMGLJYS29" 
          strategy="afterInteractive" 
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-TPMGLJYS29');
          `}
        </Script>
      </head>
      
      {/* Semua halaman akan menggunakan font ini */}
      <body className={`${manrope.variable} ${notoSerif.variable} antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}