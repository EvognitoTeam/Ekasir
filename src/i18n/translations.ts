import type { Locale } from '@/store/language.store';

const id = {
  // Common
  'common.close': 'Tutup',

  // Navigation
  'landing.login': 'Masuk',
  'landing.register': 'Daftar Mitra',

  // Hero
  'landing.hero.badge': 'POS Digital Generasi Baru',
  'landing.hero.titleBefore': 'Sistem Kasir Modern untuk',
  'landing.hero.titleHighlight': 'Cafe, Resto,',
  'landing.hero.titleAfter': 'dan Bisnis F&B.',
  'landing.hero.description':
    'Kelola transaksi, menu digital QR, laporan penjualan, pembayaran cashless, hingga monitoring outlet dalam satu platform yang cepat, elegan, dan real-time.',
  'landing.demo': 'Jadwalkan Demo',
  'landing.learnFeatures': 'Pelajari Fitur',

  // Stats
  'landing.stats.monitoring': 'Monitoring',
  'landing.stats.syncOrder': 'Sinkronisasi Pesanan',
  'landing.stats.modernSystem': 'Sistem Modern',

  // Features
  'landing.features.label': 'Fitur Unggulan',
  'landing.features.title': 'Semua yang Dibutuhkan Bisnis F&B Modern',
  'landing.features.description':
    'Dibangun khusus untuk cafe, coffee shop, restoran, dan UMKM modern yang membutuhkan sistem cepat, stabil, dan elegan.',

  'landing.features.digitalMenu.title': 'Menu Digital Interaktif',
  'landing.features.digitalMenu.desc':
    'Pelanggan scan QR dan langsung memesan dari meja tanpa perlu memanggil waiter.',

  'landing.features.sales.title': 'Laporan Penjualan Real-Time',
  'landing.features.sales.desc':
    'Pantau omzet, transaksi, dan performa bisnis secara live kapan saja.',

  'landing.features.pos.title': 'POS Modern',
  'landing.features.pos.desc':
    'Kasir cepat dengan dukungan diskon, pajak, dan kitchen order.',

  'landing.features.notification.title': 'Notifikasi Pesanan',
  'landing.features.notification.desc':
    'Pesanan baru langsung masuk ke dapur dan kasir secara real-time.',

  'landing.features.security.title': 'Keamanan Multi-Tenant',
  'landing.features.security.desc':
    'Data setiap mitra terisolasi dan aman dengan sistem autentikasi modern.',

  'landing.features.analytics.title': 'Analitik Bisnis',
  'landing.features.analytics.desc':
    'Lihat menu terlaris, jam ramai, hingga performa operasional bisnis.',

  'landing.features.customer.title': 'Manajemen Pelanggan',
  'landing.features.customer.desc':
    'Simpan data pelanggan, loyalty point, dan histori transaksi otomatis.',

  'landing.features.wifi.title': 'WiFi & Informasi Outlet',
  'landing.features.wifi.desc':
    'Tampilkan password WiFi, fasilitas, dan FAQ langsung di menu digital.',

  // Payment
  'landing.payment.label': 'Pembayaran',
  'landing.payment.title': 'Mendukung Berbagai Metode Pembayaran Modern',
  'landing.payment.description':
    'Permudah pelanggan dengan sistem pembayaran fleksibel, mulai dari tunai hingga cashless.',

  // Pricing
  'landing.pricing.label': 'Harga KALOO POS',
  'landing.pricing.title': 'Mulai Gratis dengan Fee Platform Flat 1,4%',
  'landing.pricing.description':
    'Tidak ada biaya langganan software bulanan. Setiap transaksi berhasil yang diproses atau dicatat melalui KALOO POS dikenakan fee platform tetap sebesar 1,4%, tanpa membedakan metode pembayaran.',
  'landing.pricing.noSubscription': 'Tanpa Biaya Langganan',
  'landing.pricing.freeTitle': 'KALOO POS Gratis',
  'landing.pricing.freeDescription':
    'Gunakan seluruh fitur utama KALOO POS untuk mengelola transaksi, pesanan, pelanggan, dan operasional bisnis F&B.',
  'landing.pricing.free': 'Gratis',
  'landing.pricing.noMonthlyFee': 'Tidak ada biaya software bulanan',
  'landing.pricing.included': 'Sudah termasuk:',

  'landing.pricing.feature.pos': 'POS modern',
  'landing.pricing.feature.digitalMenu': 'Menu digital QR',
  'landing.pricing.feature.tableOrder': 'Pemesanan langsung dari meja',
  'landing.pricing.feature.kitchen': 'Kitchen order',
  'landing.pricing.feature.notification': 'Notifikasi pesanan real-time',
  'landing.pricing.feature.discount': 'Diskon dan pajak',
  'landing.pricing.feature.sales': 'Laporan penjualan real-time',
  'landing.pricing.feature.customer': 'Manajemen pelanggan',
  'landing.pricing.feature.points': 'Loyalty point',
  'landing.pricing.feature.analytics': 'Analitik bisnis',
  'landing.pricing.feature.printer': 'Dukungan printer Bluetooth',
  'landing.pricing.feature.monitoring': 'Monitoring outlet',

  // Platform fee
  'landing.platform.label': 'Fee Platform Flat',
  'landing.platform.title': 'Satu Tarif untuk Seluruh Transaksi KALOO POS',
  'landing.platform.description':
    'Seluruh transaksi berhasil yang diproses atau dicatat melalui KALOO POS dikenakan fee platform sebesar 1,4%, baik pembayaran dilakukan menggunakan tunai, QRIS, e-wallet, transfer, maupun metode pembayaran lainnya.',
  'landing.platform.rate': 'Tarif Platform',
  'landing.platform.rateDescription':
    'Berlaku sama untuk seluruh nominal dan metode pembayaran.',
  'landing.platform.perTransaction': 'Per transaksi berhasil',
  'landing.platform.note':
    'Fee platform dihitung dari nilai transaksi berhasil yang tercatat melalui KALOO POS. Biaya MDR, settlement, atau biaya penyedia pembayaran sudah termasuk di dalamnya.',
  'landing.platform.transactionValue': 'Nilai Transaksi',
  'landing.platform.fee': 'Fee Platform 1,4%',
  'landing.platform.afterFee': 'Nilai Setelah Fee',

  // Contact
  'landing.contact.label': 'Kontak',
  'landing.contact.title': 'Siap Mengembangkan Bisnis Anda?',
  'landing.contact.description':
    'Konsultasikan kebutuhan sistem kasir, QR menu, dan digitalisasi bisnis F&B Anda bersama tim KALOO POS.',
  'landing.contact.location': 'Lokasi',

  // Footer
  'landing.footer.version': 'Versi Aplikasi',

  // Demo modal
  'landing.demo.general': 'Konsultasi Umum',
  'landing.demo.freePlan':
    'KALOO POS Gratis dengan Fee Platform Flat 1,4%',
  'landing.demo.title': 'Hubungi Tim KALOO POS',
  'landing.demo.description':
    'Pilih metode komunikasi yang paling nyaman. Tim KALOO POS akan membantu menjadwalkan demo dan menjelaskan paket yang sesuai.',
  'landing.demo.interestedPlan': 'Paket yang diminati',
  'landing.demo.footer':
    'WhatsApp akan membuka percakapan baru, sedangkan email akan membuka aplikasi email pada perangkat Anda.',
  'landing.demo.whatsapp':
    'Halo tim KALOO POS,\n\nSaya tertarik untuk menjadwalkan demo KALOO POS.\n\nProduk yang diminati: {{plan}}\n\nMohon informasikan jadwal demo, mekanisme fee platform flat 1,4% untuk seluruh transaksi, dan detail layanan KALOO POS.\n\nTerima kasih.',
  'landing.demo.emailSubject':
    'Permintaan Demo KALOO POS - {{plan}}',
} as const;

export type TranslationKey = keyof typeof id;

const en: Record<TranslationKey, string> = {
  'common.close': 'Close',

  'landing.login': 'Sign In',
  'landing.register': 'Register Partner',

  'landing.hero.badge': 'Next Generation Digital POS',
  'landing.hero.titleBefore': 'Modern POS System for',
  'landing.hero.titleHighlight': 'Cafes, Restaurants,',
  'landing.hero.titleAfter': 'and F&B Businesses.',
  'landing.hero.description':
    'Manage transactions, QR digital menus, sales reports, cashless payments, and outlet monitoring in one fast, elegant, real-time platform.',
  'landing.demo': 'Schedule a Demo',
  'landing.learnFeatures': 'Explore Features',

  'landing.stats.monitoring': 'Monitoring',
  'landing.stats.syncOrder': 'Order Sync',
  'landing.stats.modernSystem': 'Modern System',

  'landing.features.label': 'Key Features',
  'landing.features.title': 'Everything a Modern F&B Business Needs',
  'landing.features.description':
    'Built specifically for cafes, coffee shops, restaurants, and modern businesses that need a fast, stable, and elegant system.',

  'landing.features.digitalMenu.title': 'Interactive Digital Menu',
  'landing.features.digitalMenu.desc':
    'Customers scan a QR code and order directly from their table without calling a waiter.',

  'landing.features.sales.title': 'Real-Time Sales Reports',
  'landing.features.sales.desc':
    'Monitor revenue, transactions, and business performance live at any time.',

  'landing.features.pos.title': 'Modern POS',
  'landing.features.pos.desc':
    'Fast cashier workflow with discounts, taxes, and kitchen order support.',

  'landing.features.notification.title': 'Order Notifications',
  'landing.features.notification.desc':
    'New orders are delivered to the kitchen and cashier instantly in real time.',

  'landing.features.security.title': 'Multi-Tenant Security',
  'landing.features.security.desc':
    'Each partner’s data remains isolated and secure with modern authentication.',

  'landing.features.analytics.title': 'Business Analytics',
  'landing.features.analytics.desc':
    'See best-selling items, peak hours, and operational business performance.',

  'landing.features.customer.title': 'Customer Management',
  'landing.features.customer.desc':
    'Store customer data, loyalty points, and transaction history automatically.',

  'landing.features.wifi.title': 'WiFi & Outlet Information',
  'landing.features.wifi.desc':
    'Display WiFi credentials, facilities, and FAQs directly in the digital menu.',

  'landing.payment.label': 'Payments',
  'landing.payment.title': 'Supports Modern Payment Methods',
  'landing.payment.description':
    'Give customers flexible payment options ranging from cash to cashless payments.',

  'landing.pricing.label': 'KALOO POS Pricing',
  'landing.pricing.title': 'Start Free with a Flat 1.4% Platform Fee',
  'landing.pricing.description':
    'There is no monthly software subscription. Every successful transaction processed or recorded through KALOO POS is subject to a flat 1.4% platform fee regardless of payment method.',
  'landing.pricing.noSubscription': 'No Subscription Fee',
  'landing.pricing.freeTitle': 'Free KALOO POS',
  'landing.pricing.freeDescription':
    'Use all essential KALOO POS features to manage transactions, orders, customers, and F&B operations.',
  'landing.pricing.free': 'Free',
  'landing.pricing.noMonthlyFee': 'No monthly software fee',
  'landing.pricing.included': 'Included:',

  'landing.pricing.feature.pos': 'Modern POS',
  'landing.pricing.feature.digitalMenu': 'QR digital menu',
  'landing.pricing.feature.tableOrder': 'Direct table ordering',
  'landing.pricing.feature.kitchen': 'Kitchen orders',
  'landing.pricing.feature.notification': 'Real-time order notifications',
  'landing.pricing.feature.discount': 'Discounts and taxes',
  'landing.pricing.feature.sales': 'Real-time sales reports',
  'landing.pricing.feature.customer': 'Customer management',
  'landing.pricing.feature.points': 'Loyalty points',
  'landing.pricing.feature.analytics': 'Business analytics',
  'landing.pricing.feature.printer': 'Bluetooth printer support',
  'landing.pricing.feature.monitoring': 'Outlet monitoring',

  'landing.platform.label': 'Flat Platform Fee',
  'landing.platform.title': 'One Simple Rate for Every KALOO POS Transaction',
  'landing.platform.description':
    'Every successful transaction processed or recorded through KALOO POS is subject to a 1.4% platform fee, whether the payment is made using cash, QRIS, e-wallet, bank transfer, or another payment method.',
  'landing.platform.rate': 'Platform Rate',
  'landing.platform.rateDescription':
    'The same rate applies to every transaction amount and payment method.',
  'landing.platform.perTransaction': 'Per successful transaction',
  'landing.platform.note':
    'The platform fee is calculated from the value of successful transactions recorded through KALOO POS. MDR, settlement, or payment provider fees are included.',
  'landing.platform.transactionValue': 'Transaction Value',
  'landing.platform.fee': '1.4% Platform Fee',
  'landing.platform.afterFee': 'Value After Fee',

  'landing.contact.label': 'Contact',
  'landing.contact.title': 'Ready to Grow Your Business?',
  'landing.contact.description':
    'Talk with the KALOO POS team about your POS system, QR menu, and F&B digitalization needs.',
  'landing.contact.location': 'Location',

  'landing.footer.version': 'App Version',

  'landing.demo.general': 'General Consultation',
  'landing.demo.freePlan':
    'Free KALOO POS with Flat 1.4% Platform Fee',
  'landing.demo.title': 'Contact the KALOO POS Team',
  'landing.demo.description':
    'Choose your preferred communication method. The KALOO POS team will help schedule your demo and explain the right solution for your business.',
  'landing.demo.interestedPlan': 'Interested plan',
  'landing.demo.footer':
    'WhatsApp will open a new conversation, while email will open your device’s email application.',
  'landing.demo.whatsapp':
    'Hello KALOO POS team,\n\nI am interested in scheduling a KALOO POS demo.\n\nProduct of interest: {{plan}}\n\nPlease provide information about demo availability, the flat 1.4% platform fee for all transactions, and details about KALOO POS services.\n\nThank you.',
  'landing.demo.emailSubject':
    'KALOO POS Demo Request - {{plan}}',
};

export const translations: Record<
  Locale,
  Record<TranslationKey, string>
> = {
  id,
  en,
};
