"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // 🔴 Ambil slug otomatis dari URL router
import { Save, RefreshCcw, Info, Percent, Utensils, Coffee, Loader2 } from 'lucide-react';

export default function SystemConfig() {
  const params = useParams();
  const slug = params.slug as string; // Otomatis dapet string slug-nya, misal: 'demo_kasir'

  const [formData, setFormData] = useState({
    cafeName: '',
    taxRate: '0',
    serviceRate: '0',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 1. Ambil data dari API bawa parameter slug
  useEffect(() => {
    if (!slug) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/settings?slug=${slug}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setFormData({
            cafeName: result.data.cafeName || '',
            taxRate: result.data.taxRate.toString(),
            serviceRate: result.data.serviceRate.toString(), // Sesuai return API lu (serviceRate)
          });
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [slug]);

  // 2. Simpan data kirim balik parameter slug ke API
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRate: Number(formData.taxRate),
          serviceRate: Number(formData.serviceRate),
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);

        // Broadcast update to all tabs
        const channel = new BroadcastChannel('bersejuk-order-sync');
        channel.postMessage({ type: 'STATUS_UPDATE', __secureToken: 'bsjk-secure-v1' });
        setTimeout(() => channel.close(), 100);
      }
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // Kalkulasi Live Preview Summary
  const basePrice = 100000;
  const parsedService = parseFloat(formData.serviceRate || '0');
  const parsedTax = parseFloat(formData.taxRate || '0');

  const serviceAmount = (basePrice * parsedService) / 100;
  const taxAmount = ((basePrice + serviceAmount) * parsedTax) / 100; 
  const totalEst = basePrice + serviceAmount + taxAmount;

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Konfigurasi sistem ini akan mempengaruhi perhitungan harga di sisi pelanggan secara real-time. Perubahan pajak dan biaya layanan akan langsung diterapkan pada keranjang belanja aktif.
        </p>
      </div>

      <div className="space-y-6">
        {/* Cafe Name (Readonly / Disabled karena ditarik dari nama Mitra asli di DB) */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama Bisnis / Kafe</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
              <Coffee className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              disabled
              className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm"
              value={formData.cafeName}
            />
          </div>
        </div>

        {/* Rates Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Pajak (PPN %)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                <Percent className="w-4 h-4" />
              </div>
               <input 
                 type="number" 
                 step="1"
                 className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                 value={formData.taxRate}
                 onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
               />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Service Charge (%)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                <Utensils className="w-4 h-4" />
              </div>
               <input disabled
                 type="number" 
                 step="1"
                 className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                 value={formData.serviceRate}
               />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
            isSaved ? 'bg-green-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : isSaved ? (
            <>
              <RefreshCcw className="w-4 h-4 animate-spin" />
              Tersimpan!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Konfigurasi
            </>
          )}
        </button>
      </div>

      {/* Preview Card */}
      <div className="bg-stone-100/50 rounded-3xl p-6 border border-stone-200/50 border-dashed">
        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-4 text-center">Live Preview Summary</p>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Subtotal</span>
            <span className="font-bold">Rp {basePrice.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Service Charge ({formData.serviceRate}%)</span>
            <span className="font-bold">Rp {serviceAmount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Pajak ({formData.taxRate}%)</span>
            <span className="font-bold">Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-between">
            <span className="text-sm font-bold">Total Est.</span>
            <span className="text-sm font-bold text-[#0E5C37]">
              Rp {totalEst.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}