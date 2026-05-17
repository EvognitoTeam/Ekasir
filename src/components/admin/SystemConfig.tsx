import { useState } from 'react';
import { useOrderStore } from '../../store/order.store';
import { Save, RefreshCcw, Info, Percent, Utensils, Coffee } from 'lucide-react';

export default function SystemConfig() {
  const { settings, updateSettings } = useOrderStore();
  const [formData, setFormData] = useState({
    cafeName: settings.cafeName,
    taxRate: (settings.taxRate * 100).toString(),
    serviceChargeRate: (settings.serviceChargeRate * 100).toString(),
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSettings({
      cafeName: formData.cafeName,
      taxRate: parseFloat(formData.taxRate) / 100,
      serviceChargeRate: parseFloat(formData.serviceChargeRate) / 100,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);

    // Broadcast update to all tabs
    const channel = new BroadcastChannel('bersejuk-order-sync');
    channel.postMessage({ type: 'STATUS_UPDATE', __secureToken: 'bsjk-secure-v1' });
    setTimeout(() => channel.close(), 100);
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Konfigurasi sistem ini akan mempengaruhi perhitungan harga di sisi pelanggan secara real-time. Perubahan pajak dan biaya layanan akan langsung diterapkan pada keranjang belanja aktif.
        </p>
      </div>

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
              className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 outline-none transition-all shadow-sm"
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
                 className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 outline-none transition-all shadow-sm"
                 value={formData.taxRate}
                 onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
               />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-label uppercase tracking-widest text-stone-400 pl-1">Service Charge (%)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                <Utensils className="w-4 h-4" />
              </div>
               <input 
                 type="number" 
                 step="0.1"
                 className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 outline-none transition-all shadow-sm"
                 value={formData.serviceChargeRate}
                 onChange={(e) => setFormData({ ...formData, serviceChargeRate: e.target.value })}
               />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-label text-xs uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
            isSaved ? 'bg-green-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {isSaved ? (
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
        <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-4 text-center">Live Preview Summary</p>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Subtotal</span>
            <span className="font-bold">Rp 100.000</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Service Charge ({formData.serviceChargeRate}%)</span>
            <span className="font-bold">Rp {((100000 * parseFloat(formData.serviceChargeRate || '0')) / 100).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Pajak ({formData.taxRate}%)</span>
            <span className="font-bold">Rp {((100000 * (1 + parseFloat(formData.serviceChargeRate || '0') / 100) * parseFloat(formData.taxRate || '0')) / 100).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-between">
            <span className="text-sm font-bold">Total Est.</span>
            <span className="text-sm font-bold text-[var(--color-primary)]">
              Rp {(100000 * (1 + parseFloat(formData.serviceChargeRate || '0') / 100) * (1 + parseFloat(formData.taxRate || '0') / 100)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
