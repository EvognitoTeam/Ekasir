'use client';

import { useMemo, useState } from 'react';
import { Coffee, Package, Search } from 'lucide-react';

import { useMenuStore } from '@/store/menu.store';
import { formatPrice } from '@/utils/formatters';
import { Toast } from '@/utils/toast';
import { useCashier } from '../_providers/CashierProvider';

export default function StockManager() {
  const { slug, refreshMenu } = useCashier();
  const { items, categories, setMenu } = useMenuStore();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchSearch = String(item.name)
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchCategory = category
          ? String(item.categoryId) === category
          : true;

        return matchSearch && matchCategory;
      }),
    [category, items, search],
  );

  const updateStock = async (
    itemId: number | string,
    available: boolean,
    stock: number | null,
    field: 'status' | 'stock',
  ) => {
    const optimistic = items.map((item) =>
      String(item.id) === String(itemId)
        ? {
            ...item,
            isAvailable: available,
            status: available ? 1 : 0,
            stock: stock as any,
          }
        : item,
    );

    setMenu(optimistic as any[], categories);

    try {
      let response: Response;

      if (field === 'status') {
        response = await fetch(`/api/menu?slug=${encodeURIComponent(slug)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: Number(itemId),
            isAvailable: available,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('entity', 'menu');
        formData.append('id', String(itemId));
        formData.append('stock', stock !== null ? String(stock) : '');

        response = await fetch(`/api/menu?slug=${encodeURIComponent(slug)}`, {
          method: 'PUT',
          body: formData,
        });
      }

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Gagal menyimpan perubahan');
      }

      Toast.fire({
        icon: 'success',
        title: field === 'stock' ? 'Stok diperbarui' : 'Status diperbarui',
        topLayer: true,
      });
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title:
          error instanceof Error
            ? error.message
            : 'Gagal memperbarui menu',
        topLayer: true,
      });

      await refreshMenu();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f5f5f1]">
      <header className="shrink-0 border-b border-black/[0.07] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-black/25">
              Menu operation
            </p>
            <h1 className="mt-2 text-[36px] font-black tracking-[-.055em]">
              Stok & Ketersediaan
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-black/40">
              Ubah jumlah stok dan kontrol apakah produk bisa dijual dari kasir.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari menu..."
              className="h-11 w-full rounded-xl border border-black/[0.07] bg-[#f5f5f1] pl-10 pr-3 text-[13px] font-bold outline-none focus:border-black/20 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`h-10 shrink-0 rounded-xl px-4 text-[10px] font-black uppercase tracking-[.07em] ${
              category === ''
                ? 'bg-black text-white'
                : 'border border-black/[0.07] bg-white text-black/40'
            }`}
          >
            Semua
          </button>

          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(String(item.id))}
              className={`h-10 shrink-0 rounded-xl px-4 text-[10px] font-black uppercase tracking-[.07em] ${
                category === String(item.id)
                  ? 'bg-black text-white'
                  : 'border border-black/[0.07] bg-white text-black/40'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-dashed border-black/15 bg-white">
              <Search className="h-6 w-6 text-black/20" />
            </div>
            <p className="mt-4 text-base font-black">Menu tidak ditemukan</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_156px] border-b border-black/[0.06] bg-[#11110f] px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white/55 md:grid">
              <span>Produk</span>
              <span>Harga</span>
              <span>Stok</span>
              <span>Status jual</span>
            </div>

            {filtered.map((item) => {
              const available =
                item.isAvailable !== undefined && item.isAvailable !== null
                  ? Boolean(item.isAvailable)
                  : Number(item.status ?? 1) === 1;

              const stockValue = item.stock ?? null;

              const image = item.image
                ? String(item.image).startsWith('http')
                  ? String(item.image)
                  : `/${String(item.image).replace(/^\/+/, '')}`
                : null;

              return (
                <div
                  key={item.id}
                  className="grid gap-5 border-b border-black/[0.055] p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_140px_156px] md:items-center md:px-6 md:py-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0f0eb]">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Coffee className="h-5 w-5 text-black/20" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-black">{item.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            available ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-[.08em] text-black/35">
                          {available ? 'Dapat dijual' : 'Tidak dijual'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="md:hidden text-[10px] font-black uppercase tracking-[.09em] text-black/25">
                      Harga
                    </p>
                    <p className="mt-1 font-mono text-[12px] font-black md:mt-0">
                      {formatPrice(
                        Number(
                          (item as any).basePrice ??
                            (item as any).price ??
                            0,
                        ),
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 md:hidden text-[10px] font-black uppercase tracking-[.09em] text-black/25">
                      Stok
                    </p>
                    <div className="relative w-[104px]">
                      <Package className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/20" />
                      <input
                        type="number"
                        min="0"
                        defaultValue={stockValue ?? ''}
                        placeholder="∞"
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          const next =
                            value === ''
                              ? null
                              : Math.max(0, Number(value));

                          if (next !== stockValue) {
                            void updateStock(
                              item.id,
                              available,
                              next,
                              'stock',
                            );
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                        className="h-10 w-full rounded-xl border border-black/[0.07] bg-[#f4f4f0] pl-7 pr-2 text-center font-mono text-[12px] font-black outline-none focus:border-black/20 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 md:hidden text-[10px] font-black uppercase tracking-[.09em] text-black/25">
                      Status jual
                    </p>

                    <button
                      type="button"
                      aria-pressed={available}
                      onClick={() =>
                        void updateStock(
                          item.id,
                          !available,
                          stockValue,
                          'status',
                        )
                      }
                      className={`inline-flex h-10 w-[136px] items-center justify-between rounded-xl border px-3 transition ${
                        available
                          ? 'border-black bg-black text-white'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-[.06em]">
                        {available ? 'Tersedia' : 'Habis'}
                      </span>

                      <span
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                          available
                            ? 'bg-white/25'
                            : 'bg-red-200'
                        }`}
                      >
                        <span
                          className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            available
                              ? 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
