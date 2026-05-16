"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Save, RefreshCcw, Info, Percent, Utensils, Coffee, Loader2, CheckCircle2 } from 'lucide-react';

export default function SystemConfig() {
  const params = useParams();
  const slug = params.mitraSlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cafeName: '',
    taxRate: '',
    serviceRate: '', // Renamed from serviceChargeRate for consistency
  });

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      setError("Mitra slug not found in URL.");
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/settings?slug=${slug}`);
        const data = await res.json();
        if (data.success) {
          setFormData({
            cafeName: data.data.cafeName || '',
            taxRate: (data.data.taxRate * 100).toString(),
            serviceRate: (data.data.serviceRate * 100).toString(),
          });
        } else {
          setError(data.message || "Failed to fetch settings.");
        }
      } catch (err) {
        setError("Network error while fetching settings.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [slug]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        slug: slug,
        taxRate: parseFloat(formData.taxRate) / 100,
        serviceRate: parseFloat(formData.serviceRate) / 100,
        cafeName: formData.cafeName,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to save settings');

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);

    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Konfigurasi sistem ini akan mempengaruhi perhitungan harga di sisi pelanggan secara real-time. Perubahan pajak dan biaya layanan akan langsung diterapkan pada keranjang belanja aktif.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Cafe Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 pl-1">Nama Bisnis / Kafe</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
              <Coffee className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] outline-none transition-all"
              value={formData.cafeName}
              onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
            />
          </div>
        </div>

        {/* Rates Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 pl-1">Pajak (PPN %)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                <Percent className="w-4 h-4" /> 
              </div>
              <input 
                type="number" 
                step="0.1"
                className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 pl-1">Biaya Layanan (%)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                <Utensils className="w-4 h-4" />
              </div>
              <input 
                type="number" 
                step="0.1"
                className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                value={formData.serviceRate}
                onChange={(e) => setFormData({ ...formData, serviceRate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-label text-xs uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
            isSaved ? 'bg-green-500 text-white' : isSaving ? 'bg-stone-400' : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Tersimpan!
            </>
          ) : isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-4 h-4" /> Simpan Konfigurasi</>
          )}
        </button>
      </div>

      {/* Preview Card */}
      <div className="bg-stone-100/50 rounded-3xl p-6 border border-stone-200/50 border-dashed">
        <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-4 text-center">Live Preview Summary</p>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Subtotal</span>
            <span className="font-bold">Rp 100.000</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Biaya Layanan ({formData.serviceRate}%)</span>
            <span className="font-bold">Rp {((100000 * parseFloat(formData.serviceRate || '0')) / 100).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Pajak ({formData.taxRate}%)</span>
            <span className="font-bold">Rp {((100000 * (1 + parseFloat(formData.serviceRate || '0') / 100) * parseFloat(formData.taxRate || '0')) / 100).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-between">
            <span className="text-sm font-bold">Total Est.</span>
            <span className="text-sm font-bold text-[var(--color-primary)]">
              Rp {(100000 * (1 + parseFloat(formData.serviceRate || '0') / 100) * (1 + parseFloat(formData.taxRate || '0') / 100)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
