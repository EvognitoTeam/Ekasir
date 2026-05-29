"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// 🔴 1. Import SEMUA ikon dari lucide pakai alias Icons (Biar bisa dinamis)
import * as Icons from 'lucide-react';

type TabType = 'finance' | 'owner' | 'mitra' | 'bank' | 'wifi' | 'info';

export default function SystemConfig() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";
  
  const [activeTab, setActiveTab] = useState<TabType>('finance');

  const [formData, setFormData] = useState({
    cafeName: '',
    mitraAddress: '',
    mitraWelcome: '',
    bankName: '',
    bankNumber: '0',
    bankOwner: '',
    taxRate: '0',
    serviceRate: '0',
    isTaxIncluded: 0 as 0 | 1, 
    wifiSSID: '',
    wifiPassword: '',
    facilities: [] as Array<{ icon: string; name: string; description: string }>,
    faq: [] as Array<{ question: string; answer: string }>,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [ownerProfile, setOwnerProfile] = useState({
    name: '',
    email: '',
    role: '',
  });

  const bankOptions = [
    'BCA',
    'BRI',
    'BNI',
    'Mandiri',
    'BSI',
    'CIMB Niaga',
    'BTN',
    'Permata Bank',
    'Danamon',
    'OCBC NISP',
    'Maybank',
    'Panin Bank',
    'Bank Jago',
    'SeaBank',
    'Neo Bank',
    'Allo Bank',
    'Bank Mega',
  ];

  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const filteredBanks = bankOptions.filter((bank) =>
    bank.toLowerCase().includes(formData.bankName.toLowerCase())
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchSettings = async () => {
      try {
        // ================= SETTINGS =================
        const response = await fetch(`/api/settings?slug=${slug}`);
        const result = await response.json();

        // ================= PROFILE LOGIN =================
        const profileRes = await fetch(`/api/auth/me?slug=${slug}`);
        const profileResult = await profileRes.json();

        // console.log(result);

        if (profileResult.success && profileResult.user) {
          setOwnerProfile({
            name: profileResult.user.name || 'John Doe',
            email: profileResult.user.email || 'John Doe',
            role: profileResult.user.role || 'John Doe',
          });
        }

        if (result.success && result.data) {
          const rawFacilities = result.data.facility || result.data.facilities || [];

          const parsedFacilities = Array.isArray(rawFacilities)
            ? rawFacilities.map((f: any) =>
                typeof f === 'string'
                  ? { icon: 'Check', name: f, description: '' }
                  : f
              )
            : [];

          const rawFaq = result.data.faq || [];

          const parsedFaq = Array.isArray(rawFaq)
            ? rawFaq.map((f: any) =>
                typeof f === 'string'
                  ? { question: f, answer: '' }
                  : f
              )
            : [];

          const dbTaxIncluded =
            result.data.is_tax_included ??
            result.data.isTaxIncluded ??
            0;

          setFormData({
            cafeName: result.data.cafeName || '',
            mitraAddress: result.data.mitraAddress || '',
            mitraWelcome: result.data.mitraWelcome || '',

            bankName: result.data.bankName || '',
            bankNumber: result.data.bankNumber || '',
            bankOwner: result.data.bankOwner || '',

            taxRate: (result.data.taxRate || 0).toString(),
            serviceRate: (result.data.serviceRate || 0).toString(),

            isTaxIncluded:
              Number(dbTaxIncluded) === 1 ? 1 : 0,

            wifiSSID: result.data.wifiSSID || '',
            wifiPassword: result.data.wifiPassword || '',

            facilities: parsedFacilities,
            faq: parsedFaq,
          });
        }
      } catch (error) {
        console.error('Gagal mengambil pengaturan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [slug]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        taxRate: Number(formData.taxRate),
        serviceRate: Number(formData.serviceRate),
        is_tax_included: formData.isTaxIncluded,

        mitraAddress: formData.mitraAddress,
        mitraWelcome: formData.mitraWelcome,

        bankName: formData.bankName,
        bankNumber: formData.bankNumber,
        bankOwner: formData.bankOwner,

        wifiSSID: formData.wifiSSID,
        wifiPassword: formData.wifiPassword,

        facilities: formData.facilities,
        faq: formData.faq,
      }),
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);

        const channel = new BroadcastChannel('ekasir-order-sync');
        channel.postMessage({ type: 'STATUS_UPDATE', __secureToken: 'bsjk-secure-v1' });
        setTimeout(() => channel.close(), 100);
      }
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addFacility = () => setFormData(prev => ({ ...prev, facilities: [...prev.facilities, { icon: '', name: '', description: '' }] }));
  const updateFacility = (index: number, field: string, value: string) => {
    const newData = [...formData.facilities];
    newData[index] = { ...newData[index], [field]: value };
    setFormData(prev => ({ ...prev, facilities: newData }));
  };
  const removeFacility = (index: number) => setFormData(prev => ({ ...prev, facilities: prev.facilities.filter((_, i) => i !== index) }));

  const addFaq = () => setFormData(prev => ({ ...prev, faq: [...prev.faq, { question: '', answer: '' }] }));
  const updateFaq = (index: number, field: string, value: string) => {
    const newData = [...formData.faq];
    newData[index] = { ...newData[index], [field]: value };
    setFormData(prev => ({ ...prev, faq: newData }));
  };
  const removeFaq = (index: number) => setFormData(prev => ({ ...prev, faq: prev.faq.filter((_, i) => i !== index) }));


  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        {/* 🔴 2. Panggil ikon pakai Icons.[NamaIkon] */}
        <Icons.Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const basePrice = 100000;
  const parsedService = parseFloat(formData.serviceRate || '0');
  const parsedTax = parseFloat(formData.taxRate || '0');

  let subtotal = basePrice;
  let serviceAmount = 0;
  let taxAmount = 0;
  let totalEst = 0;

  if (formData.isTaxIncluded === 1) {
    totalEst = basePrice;
    const combinedRate = 1 + parsedService / 100 + parsedTax / 100 + (parsedService * parsedTax) / 10000;
    subtotal = totalEst / combinedRate;
    serviceAmount = (subtotal * parsedService) / 100;
    taxAmount = ((subtotal + serviceAmount) * parsedTax) / 100;
  } else {
    serviceAmount = (subtotal * parsedService) / 100;
    taxAmount = ((subtotal + serviceAmount) * parsedTax) / 100;
    totalEst = subtotal + serviceAmount + taxAmount;
  }

  return (
    <div className="p-6 space-y-6 pb-32">
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
        <Icons.Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Konfigurasi sistem ini akan diterapkan secara *real-time* ke sistem pelanggan. Pastikan data yang dimasukkan sudah benar.
        </p>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-stone-200 pb-2">
        <TabButton
          active={activeTab === 'finance'}
          onClick={() => setActiveTab('finance')}
          icon={<Icons.CreditCard className="w-4 h-4" />}
          label="Keuangan"
        />

        <TabButton
          active={activeTab === 'owner'}
          onClick={() => setActiveTab('owner')}
          icon={<Icons.User className="w-4 h-4" />}
          label="Profile"
        />

        <TabButton
          active={activeTab === 'mitra'}
          onClick={() => setActiveTab('mitra')}
          icon={<Icons.Building2 className="w-4 h-4" />}
          label="Mitra"
        />

        <TabButton
          active={activeTab === 'bank'}
          onClick={() => setActiveTab('bank')}
          icon={<Icons.Landmark className="w-4 h-4" />}
          label="Bank"
        />

        <TabButton
          active={activeTab === 'wifi'}
          onClick={() => setActiveTab('wifi')}
          icon={<Icons.Wifi className="w-4 h-4" />}
          label="WiFi"
        />

        <TabButton
          active={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          icon={<Icons.HelpCircle className="w-4 h-4" />}
          label="Fasilitas & FAQ"
        />
      </div>

      <div className="min-h-[300px]">
        
        {/* ================= TAB: KEUANGAN ================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Pajak (PPN %)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <Icons.Percent className="w-4 h-4" />
                  </div>
                  <input 
                    type="number" step="1"
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Service Charge (Fee Platform %) (Disabled)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <Icons.Utensils className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" disabled
                    className="w-full border border-gray-600 rounded-2xl bg-gray-200 py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                    value={formData.serviceRate}
                    onChange={(e) => setFormData({ ...formData, serviceRate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Mode Harga</label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isTaxIncluded: prev.isTaxIncluded === 1 ? 0 : 1 }))}
                className={`w-full rounded-2xl border p-4 flex items-center justify-between transition-all ${
                  formData.isTaxIncluded === 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-200'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-stone-800">
                    {formData.isTaxIncluded === 1 ? 'Harga Sudah Termasuk Pajak & Service' : 'Pajak & Service Ditambahkan di Akhir'}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {formData.isTaxIncluded === 1 ? 'Customer melihat harga final di menu (Inclusive)' : 'Dihitung saat checkout (Exclusive)'}
                  </p>
                </div>
                <div className={`w-12 h-7 rounded-full transition-all relative ${formData.isTaxIncluded === 1 ? 'bg-[#0E5C37]' : 'bg-stone-300'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.isTaxIncluded === 1 ? 'left-6' : 'left-1'}`} />
                </div>
              </button>
            </div>

            <div className="bg-stone-100/50 rounded-3xl p-6 border border-stone-200/50 border-dashed mt-8">
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-4 text-center">Live Preview Summary</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">{formData.isTaxIncluded === 1 ? 'Subtotal Sebelum Biaya' : 'Subtotal Menu'}</span>
                  <span className="font-bold">Rp {subtotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Service Charge ({formData.serviceRate}%)</span>
                  <span className="font-bold">Rp {serviceAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Pajak ({formData.taxRate}%){formData.isTaxIncluded === 1 && ' Included'}</span>
                  <span className="font-bold">Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="pt-3 border-t border-stone-200 flex justify-between">
                  <span className="text-sm font-bold">Total Pelanggan Bayar</span>
                  <span className="text-sm font-bold text-[#0E5C37]">Rp {totalEst.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: PROFILE OWNER ================= */}
        {activeTab === 'owner' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-stone-800">
                  Informasi Akun
                </h2>

                <p className="text-xs text-stone-500 mt-1">
                  Data akun owner yang sedang login.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                    Nama Owner
                  </label>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.User2 className="w-4 h-4" />
                    </div>

                    <input
                      type="text"
                      disabled
                      value={ownerProfile.name}
                      className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                    Role
                  </label>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.Shield className="w-4 h-4" />
                    </div>

                    <input
                      type="text"
                      disabled
                      value={ownerProfile.role}
                      className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm"
                    />
                  </div>
                </div>

              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                  Email Login
                </label>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.Mail className="w-4 h-4" />
                  </div>

                  <input
                    type="email"
                    disabled
                    value={ownerProfile.email}
                    className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-stone-800">
                  Ganti Password
                </h2>

                <p className="text-xs text-stone-500 mt-1">
                  Kosongkan jika tidak ingin mengganti password.
                </p>
              </div>

              <div className="space-y-4">

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                    Password Lama
                  </label>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.Lock className="w-4 h-4" />
                    </div>

                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                      Password Baru
                    </label>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Icons.KeyRound className="w-4 h-4" />
                      </div>

                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData(prev => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                      Konfirmasi Password
                    </label>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Icons.ShieldCheck className="w-4 h-4" />
                      </div>

                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData(prev => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]"
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        )}

        {/* ================= TAB: MITRA ================= */}
        {activeTab === 'mitra' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                  Nama Bisnis / Kafe
                </label>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.Coffee className="w-4 h-4" />
                  </div>

                  <input
                    type="text"
                    disabled
                    value={formData.cafeName}
                    className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                  Welcome Message
                </label>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.MessageSquare className="w-4 h-4" />
                  </div>

                  <input
                    type="text"
                    value={formData.mitraWelcome}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        mitraWelcome: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-stone-700 outline-none shadow-sm focus:border-[#0E5C37]"
                  />
                </div>
              </div>

            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                Address
              </label>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                  <Icons.MapPin className="w-4 h-4" />
                </div>

                <textarea
                  rows={3}
                  value={formData.mitraAddress}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      mitraAddress: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-stone-700 outline-none shadow-sm focus:border-[#0E5C37]"
                />
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB: BANK ================= */}
        {activeTab === 'bank' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                  Nama Bank
                </label>

                {/* 🔴 Wajib relative di sini sebagai jangkar utama Dropdown */}
                <div className="relative">

                  {/* ICON */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none z-10">
                    <Icons.Landmark className="w-4 h-4" />
                  </div>

                  {/* INPUT */}
                  <input
                    type="text"
                    placeholder="Pilih atau ketik nama bank..."
                    value={formData.bankName}
                    onFocus={() => setShowBankDropdown(true)}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        bankName: e.target.value,
                      }));
                      setShowBankDropdown(true);
                    }}
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium outline-none shadow-sm transition-all focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5"
                  />

                  {/* CHEVRON */}
                  <button
                    type="button"
                    onClick={() => setShowBankDropdown((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <Icons.ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showBankDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* DROPDOWN */}
                  {showBankDropdown && (
                    // 🔴 'absolute left-0 right-0 top-full' sekarang ngunci pas ke lebar div.relative parent-nya
                    <div className="absolute left-0 right-0 top-full mt-2 z-50">
                      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
                        <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                          {filteredBanks.length > 0 ? (
                            filteredBanks.map((bank) => (
                              <button
                                key={bank}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    bankName: bank,
                                  }));
                                  setShowBankDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0E5C37]/5 transition-all group"
                              >
                                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 group-hover:bg-[#0E5C37]/10 transition-all">
                                  <Icons.Building2 className="w-4 h-4 text-stone-500 group-hover:text-[#0E5C37]" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-stone-800 leading-none mb-1">
                                    {bank}
                                  </p>
                                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                                    Bank Transfer
                                  </p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center flex flex-col items-center justify-center">
                              <Icons.Building className="w-8 h-8 text-stone-200 mb-2" />
                              <p className="text-sm font-bold text-stone-700">
                                Gunakan &quot;{formData.bankName}&quot;
                              </p>
                              <p className="text-[11px] text-stone-400 mt-1 max-w-[200px] leading-relaxed">
                                Bank tidak ada di daftar. Nama ini tetap akan disimpan.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-stone-400 pl-1 mt-1">
                  Pilih bank dari daftar atau ketik manual jika tidak tersedia.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                  Nomor Rekening
                </label>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.CreditCard className="w-4 h-4" />
                  </div>

                  <input
                    type="text"
                    value={formData.bankNumber}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        bankNumber: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]"
                  />
                </div>
              </div>

            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                Nama Pemilik Rekening
              </label>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                  <Icons.UserCircle2 className="w-4 h-4" />
                </div>

                <input
                  type="text" 
                  value={formData.bankOwner}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      bankOwner: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37] uppercase"
                />
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB: WIFI ================= */}
        {activeTab === 'wifi' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama WiFi (SSID)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <Icons.Wifi className="w-4 h-4" />
                </div>
                <input 
                  type="text" placeholder="Contoh: Evokasir Free WiFi"
                  className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                  value={formData.wifiSSID}
                  onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Kata Sandi WiFi</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <Icons.Lock className="w-4 h-4" />
                </div>
                <input 
                  type="text" placeholder="Masukkan password WiFi..."
                  className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                  value={formData.wifiPassword}
                  onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: FASILITAS & FAQ ================= */}
        {activeTab === 'info' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 🔴 3. Note: Value di datalist HARUS huruf depannya kapital sesuai penamaan komponen Lucide */}
            <datalist id="icon-references">
              <option value="Wifi">WiFi / Internet</option>
              <option value="Wind">AC / Smoking Area</option>
              <option value="Droplet">Toilet Bersih</option>
              <option value="Plug">Colokan / Stopkontak</option>
              <option value="MapPin">Mushola / Lokasi</option>
              <option value="Coffee">Area Kopi / Bar</option>
              <option value="Music">Live Music / Speaker</option>
              <option value="Car">Area Parkir Kendaraan</option>
              <option value="Tv">Televisi / Nobar</option>
              <option value="Users">Meeting Room / VIP</option>
            </datalist>

            {/* BUILDER FASILITAS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <label className="text-[12px] font-bold uppercase tracking-widest text-stone-800">Daftar Fasilitas</label>
                <button type="button" onClick={addFacility} className="text-xs text-[#0E5C37] font-bold flex items-center gap-1 hover:bg-[#0E5C37]/10 px-3 py-1 rounded-full transition-all">
                  <Icons.Plus className="w-3 h-3" /> Tambah Fasilitas
                </button>
              </div>

              {formData.facilities.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4 italic">Belum ada fasilitas. Klik tambah untuk membuat.</p>
              )}

              <div className="space-y-3">
                {formData.facilities.map((fac, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 relative group transition-all hover:border-[#0E5C37]/30">
                    <button type="button" onClick={() => removeFacility(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200">
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold ml-1">Nama Fasilitas</label>
                        <input 
                          type="text" placeholder="Contoh: Mushola VIP" value={fac.name} 
                          onChange={(e) => updateFacility(idx, 'name', e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold ml-1">Nama Ikon (CapitalCase)</label>
                        <input 
                          type="text" 
                          list="icon-references"
                          placeholder="Pilih/ketik... (Cth: Wifi)" 
                          value={fac.icon} 
                          onChange={(e) => updateFacility(idx, 'icon', e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold ml-1">Deskripsi Singkat</label>
                      <input 
                        type="text" placeholder="Contoh: Terletak di lantai 2..." value={fac.description} 
                        onChange={(e) => updateFacility(idx, 'description', e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BUILDER FAQ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <label className="text-[12px] font-bold uppercase tracking-widest text-stone-800">Frequently Asked Questions (FAQ)</label>
                <button type="button" onClick={addFaq} className="text-xs text-[#0E5C37] font-bold flex items-center gap-1 hover:bg-[#0E5C37]/10 px-3 py-1 rounded-full transition-all">
                  <Icons.Plus className="w-3 h-3" /> Tambah FAQ
                </button>
              </div>

              {formData.faq.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4 italic">Belum ada FAQ. Klik tambah untuk membuat.</p>
              )}

              <div className="space-y-3">
                {formData.faq.map((item, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 relative group transition-all hover:border-[#0E5C37]/30">
                    <button type="button" onClick={() => removeFaq(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200">
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold ml-1">Pertanyaan (Question)</label>
                      <input 
                        type="text" placeholder="Contoh: Buka jam berapa aja kak?" value={item.question} 
                        onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold ml-1">Jawaban (Answer)</label>
                      <textarea 
                        rows={2} placeholder="Contoh: Kami buka dari jam 08.00 sampai 22.00..." value={item.answer} 
                        onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      <div className="pt-4 border-t border-stone-200 mt-8">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
            isSaved ? 'bg-green-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          {isSaving ? (
            <><Icons.Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : isSaved ? (
            <><Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Tersimpan!</>
          ) : (
            <><Icons.Save className="w-4 h-4" /> Simpan Semua Konfigurasi</>
          )}
        </button>
      </div>

    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap border-b-2 ${
        active 
        ? 'text-[#0E5C37] border-[#0E5C37] bg-emerald-50/50' 
        : 'text-stone-400 border-transparent hover:text-stone-700 hover:bg-stone-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}