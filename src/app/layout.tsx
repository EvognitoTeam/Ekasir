import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Serif } from "next/font/google";
import "./globals.css";

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

// 2. Metadata Default (Untuk Landing Page Ekasir)
export const metadata: Metadata = {
  title: "Ekasir - The Original POS & Digital Menu",
  description: "Sistem kasir dan menu digital modern untuk bisnis F&B Anda.",
  openGraph: {
    title: "Ekasir - The Original POS & Digital Menu",
    description: "Sistem kasir dan menu digital modern untuk bisnis F&B Anda.",
  }
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
        {children}
      </body>
    </html>
  );
}