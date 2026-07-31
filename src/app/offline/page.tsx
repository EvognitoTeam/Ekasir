export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Tidak Ada Koneksi
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Evokasir tidak dapat terhubung ke server. Periksa koneksi internet,
          lalu muat ulang halaman.
        </p>

        <a
          href="/"
          className="mt-5 inline-flex rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Coba Lagi
        </a>
      </section>
    </main>
  );
}
