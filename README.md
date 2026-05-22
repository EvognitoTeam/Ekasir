# 🛒 ekasir - Multi-Tenant SaaS Point of Sales (POS)

ekasir adalah platform Point of Sales (POS) berbasis **Software as a Service (SaaS)** dengan arsitektur **Multi-Tenant**. Sistem ini dirancang secara khusus untuk memfasilitasi bisnis F&B dan Retail agar dapat mengelola operasional kasir, inventaris, dan master data dari banyak cabang/mitra secara terpusat, aman, dan terisolasi.

---

## ✨ Fitur Utama

### 🔐 1. Keamanan & Tenant Isolation

- **Edge Middleware Protection:** Sistem secara otomatis mendeteksi dan memblokir akses silang antar mitra (_Cross-Tenant Isolation_). Akun Mitra A tidak akan pernah bisa mengakses _dashboard_ Mitra B.
- **Role-Based Access Control (RBAC):** Autentikasi berbasis JWT (`jose`) dengan pemisahan hak akses ketat (contoh: `Owner` dan `Cashier`).
- **Atomic Database Transactions:** Seluruh proses krusial (seperti _input_ produk beserta resepnya) dibungkus dalam _transaction_ untuk mencegah _corrupt data_ atau _timeout_ saat server sibuk.

### 📦 2. Master Data Management (MDM)

- Manajemen Kategori & Sub-Kategori Produk.
- Manajemen Produk/Menu dengan integrasi gambar (penyimpanan sistem file lokal).
- Sistem **Add-ons** dinamis (Grup Addon & Item Addon) dengan aturan _Required_ dan _Max Selected_.

### 📊 3. Inventaris & Bill of Materials (BoM)

- **Manajemen Bahan Baku (Materials):** Melacak stok bahan mentah dengan berbagai unit presisi (KG, G, L, mL, Pcs, Pack, Box).
- **Sistem Resep (Bill of Materials):** Setiap menu dapat dihubungkan dengan bahan baku. Stok bahan baku akan terpotong secara otomatis berdasarkan resep saat transaksi terjadi.
- **Low Stock Alerts:** Peringatan otomatis ketika stok bahan baku menyentuh _threshold_ batas minimum.

---

## 🛠️ Tech Stack & Infrastruktur

**Aplikasi (Frontend & Backend):**

- **Framework:** Next.js 15 (App Router)
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **Autentikasi:** Custom JWT (JSON Web Tokens) menggunakan `jose` (Edge-Compatible)
- **Database:** MySQL
- **ORM:** Drizzle ORM

**Deployment & Infrastruktur (Target):**

- **Virtualization:** Proxmox VE
- **OS Server:** Ubuntu Server
- **Web Server & Control Panel:** aaPanel / Nginx
- **Security & DNS:** Cloudflare

---

## 🛠️ Lisensi & Hak Cipta

Proyek ini adalah sistem closed-source komersial yang dikembangkan untuk operasi bisnis SaaS.
Hak Cipta © 2026 Evognito Team. All Rights Reserved.
