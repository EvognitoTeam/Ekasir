"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface Props {
  cashoutId: number;
  currentStatus: string;
}

export default function CashoutActionButtons({ cashoutId, currentStatus }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: 'approved' | 'rejected') => {
    const actionText = action === 'approved' ? 'menyetujui' : 'menolak';
    
    const confirm = await Swal.fire({
      title: 'Konfirmasi',
      text: `Apakah Anda yakin ingin ${actionText} pencairan #${cashoutId}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'approved' ? '#0E5C37' : '#EF4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: `Ya, ${actionText}`,
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin/cashout-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cashoutId, action })
      });
      
      const data = await res.json();
      if (data.success) {
        Swal.fire('Berhasil', `Pencairan berhasil di-${actionText}`, 'success');
        router.refresh(); // Segarkan data Server Component otomatis
      } else {
        Swal.fire('Gagal', data.message || 'Terjadi kesalahan sistem', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal terhubung ke server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Jika sudah bukan pending, jangan tampilkan tombol aksi
  if (currentStatus !== 'pending') {
    return <span className="text-xs text-stone-400 font-medium">Selesai</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => handleAction('rejected')}
        disabled={isLoading}
        className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
        title="Tolak & Kembalikan Saldo"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
      </button>
      
      <button
        onClick={() => handleAction('approved')}
        disabled={isLoading}
        className="px-4 py-2 rounded-xl bg-[#0E5C37] text-white hover:bg-emerald-800 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Setujui
      </button>
    </div>
  );
}