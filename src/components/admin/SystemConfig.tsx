"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import * as Icons from 'lucide-react';
import Swal from 'sweetalert2';

type TabType = 'payout' | 'finance' | 'owner' | 'mitra' | 'bank' | 'wifi' | 'info' | 'history';

export default function SystemConfig() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";
  
  const [activeTab, setActiveTab] = useState<TabType>('payout');

  const [formData, setFormData] = useState({
    cafeName: '',
    mitraAddress: '',
    mitraWelcome: '',
    bankName: '',
    bankNumber: '0',
    bankOwner: '',
    taxRate: '0',
    serviceRate: '0',
    platformFeeRate: '0', // 🔴 TAMBAHAN: State untuk persentase fee platform (payout)
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
    'BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'CIMB Niaga', 'BTN', 
    'Permata Bank', 'Danamon', 'OCBC NISP', 'Maybank', 'Panin Bank', 
    'Bank Jago', 'SeaBank', 'Neo Bank', 'Allo Bank', 'Bank Mega',
  ];

  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const filteredBanks = bankOptions.filter((bank) =>
    bank.toLowerCase().includes(formData.bankName.toLowerCase())
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // STATE UNTUK DATA PAYOUT
  const [payoutData, setPayoutData] = useState<any>(null);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!payoutData?.canWithdraw) return;

    const confirm = await Swal.fire({
        title: 'Konfirmasi Penarikan',
        text: `Tarik dana sebesar Rp ${payoutData.totalEligibleQris.toLocaleString('id-ID')} ke rekening?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0E5C37',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'Ya, Tarik Sekarang',
        cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
        setIsWithdrawing(true);
        try {
          const res = await fetch('/api/pos/payout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug: slug })
          });
          const data = await res.json();

          if (data.success) {
              Swal.fire('Berhasil!', data.message, 'success');
              setActiveTab('finance'); 
              setTimeout(() => setActiveTab('payout'), 100);
          } else {
              Swal.fire('Gagal', data.message, 'error');
          }
        } catch (err) {
          Swal.fire('Error', 'Gagal menghubungi server.', 'error');
        } finally {
          setIsWithdrawing(false);
        }
    }
  };

  // FETCH DATA PENGATURAN UMUM
  useEffect(() => {
    if (!slug) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/settings?slug=${slug}`);
        const result = await response.json();

        const profileRes = await fetch(`/api/auth/me?slug=${slug}`);
        const profileResult = await profileRes.json();

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
            ? rawFacilities.map((f: any) => typeof f === 'string' ? { icon: 'Check', name: f, description: '' } : f)
            : [];

          const rawFaq = result.data.faq || [];
          const parsedFaq = Array.isArray(rawFaq)
            ? rawFaq.map((f: any) => typeof f === 'string' ? { question: f, answer: '' } : f)
            : [];

          const dbTaxIncluded = result.data.is_tax_included ?? result.data.isTaxIncluded ?? 0;

          setFormData({
            cafeName: result.data.cafeName || '',
            mitraAddress: result.data.mitraAddress || '',
            mitraWelcome: result.data.mitraWelcome || '',
            bankName: result.data.bankName || '',
            bankNumber: result.data.bankNumber || '',
            bankOwner: result.data.bankOwner || '',
            taxRate: (result.data.taxRate || 0).toString(),
            serviceRate: (result.data.serviceRate || 0).toString(),
            // 🔴 Tangkap cashout dari API sebagai platformFeeRate
            platformFeeRate: (result.data.cashout || result.data.platformFeeRate || 0).toString(), 
            isTaxIncluded: Number(dbTaxIncluded) === 1 ? 1 : 0,
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

  // FETCH DATA PAYOUT
  useEffect(() => {
    if (activeTab === 'payout' && slug) {
      const fetchPayout = async () => {
        setIsLoadingPayout(true);
        try {
          const res = await fetch(`/api/pos/payout?slug=${slug}`);
          const json = await res.json();
          if (json.success) {
            setPayoutData(json.data);
          }
        } catch (error) {
          console.error("Gagal mengambil data payout", error);
        } finally {
          setIsLoadingPayout(false);
        }
      };
      fetchPayout();
    }
  }, [activeTab, slug]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings?slug=${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRate: Number(formData.taxRate),
          serviceRate: Number(formData.serviceRate),
          platformFeeRate: Number(formData.platformFeeRate), // 🔴 Kirim platformFeeRate (cashout) ke API
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
        <Icons.Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // 🔴 LOGIKA PERHITUNGAN PREVIEW SIMULASI (100 Ribu Rupiah)
  const basePrice = 100000;
  const parsedService = Number(formData.serviceRate || 0);
  const parsedTax = Number(formData.taxRate || 0);
  const parsedPlatformFee = Number(formData.platformFeeRate || 0); // 🔴

  let subtotal = 0;
  let serviceAmount = 0;
  let taxAmount = 0;
  let totalEst = 0;

  if (formData.isTaxIncluded === 1) {
    totalEst = basePrice;
    const divisor = 1 + parsedService / 100 + parsedTax / 100 + (parsedService * parsedTax) / 10000;
    subtotal = totalEst / divisor;
    serviceAmount = subtotal * parsedService / 100;
    taxAmount = (subtotal + serviceAmount) * parsedTax / 100;
  } else {
    subtotal = basePrice;
    serviceAmount = subtotal * parsedService / 100;
    taxAmount = (subtotal + serviceAmount) * parsedTax / 100;
    totalEst = subtotal + serviceAmount + taxAmount;
  }

  // 🔴 Hitung Potongan Platform Fee dengan Math.floor (Sama seperti API)
  const platformFeeCut = Math.floor(totalEst * (parsedPlatformFee / 100));
  const netMitra = totalEst - platformFeeCut;

  const renderBreakdownCard = (title: string, data: any) => {
    if (!data) return null;
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-stone-800 border-b border-stone-100 pb-2">{title}</h3>
        
        <div className="flex justify-between items-end">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pendapatan Bersih (Net)</p>
          <p className="text-lg font-black text-[#0E5C37]">Rp {data.net.toLocaleString('id-ID')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-stone-50 p-3 rounded-2xl">
            <p className="text-[9px] font-bold uppercase text-stone-400">Tunai (Cash)</p>
            <p className="text-sm font-bold text-stone-800">Rp {data.cash.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl">
            <p className="text-[9px] font-bold uppercase text-blue-500">QRIS (Digital)</p>
            <p className="text-sm font-bold text-blue-700">Rp {data.qris.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-stone-400 font-medium">Gross Sales</span>
            <span className="font-bold text-stone-700">Rp {data.gross.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-stone-400 font-medium">Pajak (Tax)</span>
            <span className="font-bold text-stone-700">Rp {data.tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-stone-400 font-medium">
              Service Charge Resto
            </span>

            <span className="font-bold text-stone-700">
              Rp {Number(
                data.service ?? 0,
              ).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-stone-400 font-medium">
              Fee Platform
            </span>

            <span className="font-bold text-red-500">
              - Rp {Number(
                data.platformFee ?? 0,
              ).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 pb-32">
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3">
        <Icons.Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Konfigurasi sistem ini akan diterapkan secara *real-time* ke sistem pelanggan. Pastikan data yang dimasukkan sudah benar.
        </p>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-stone-200 pb-2">
        <TabButton active={activeTab === 'payout'} onClick={() => setActiveTab('payout')} icon={<Icons.Wallet className="w-4 h-4" />} label="Pencairan" />
        <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<Icons.CreditCard className="w-4 h-4" />} label="Pajak & Biaya" />
        <TabButton active={activeTab === 'owner'} onClick={() => setActiveTab('owner')} icon={<Icons.User className="w-4 h-4" />} label="Profile" />
        <TabButton active={activeTab === 'mitra'} onClick={() => setActiveTab('mitra')} icon={<Icons.Building2 className="w-4 h-4" />} label="Mitra" />
        <TabButton active={activeTab === 'bank'} onClick={() => setActiveTab('bank')} icon={<Icons.Landmark className="w-4 h-4" />} label="Bank" />
        <TabButton active={activeTab === 'wifi'} onClick={() => setActiveTab('wifi')} icon={<Icons.Wifi className="w-4 h-4" />} label="WiFi" />
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Icons.HelpCircle className="w-4 h-4" />} label="Fasilitas & FAQ" />
      </div>

      <div className="min-h-[300px]">

        {/* ================= TAB: PENCAIRAN (PAYOUT) ================= */}
        {activeTab === 'payout' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isLoadingPayout || !payoutData ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400">
                <Icons.Loader2 className="w-8 h-8 animate-spin mb-3 text-[#0E5C37]" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Memuat Data Keuangan...</p>
              </div>
            ) : (
              <>
                {/* Header Payout (Highlight) */}
                <div className="bg-gradient-to-br from-[#0E5C37] to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-200 mb-2">Dana QRIS Siap Cair</p>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                      Rp {payoutData.totalEligibleQris.toLocaleString('id-ID')}
                    </h2>
                    
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold mb-1">Pajak (Diserahkan ke Mitra)</p>
                          <p className="text-sm font-bold text-white">+ Rp {payoutData.totalTax.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-white/20" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold mb-1">Fee Platform (Potongan Service)</p>
                          <p className="text-sm font-bold text-red-300">- Rp {Number(payoutData.totalPlatformFee ?? 0,).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    <button 
                      onClick={handleWithdraw}
                      disabled={!payoutData.canWithdraw || isWithdrawing}
                      className="w-full sm:w-auto bg-white text-[#0E5C37] disabled:bg-stone-300 disabled:text-stone-500 px-8 py-3.5 rounded-xl font-black text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isWithdrawing ? (
                        <><Icons.Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                      ) : (
                        <><Icons.Wallet className="w-4 h-4" /> Tarik Dana QRIS ke Rekening</>
                      )}
                    </button>

                    <p className="text-[11px] text-emerald-100 font-medium mt-3 flex items-center gap-1.5">
                      <Icons.Info className="w-3.5 h-3.5" /> {payoutData.withdrawalMessage}
                    </p>
                  </div>
                </div>

                {/* Indikator Dana Laci & Tertunda */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                          <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">Uang Tunai Laci</p>
                          <p className="text-xl font-black text-amber-700">Rp {payoutData.totalCash.toLocaleString('id-ID')}</p>
                          <p className="text-xs text-amber-600/80 font-medium mt-1">Sudah diterima di Kasir</p>
                      </div>
                      <Icons.Banknote className="w-8 h-8 text-amber-200" />
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                          <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">QRIS Tertahan</p>
                          <p className="text-xl font-black text-stone-800">Rp {payoutData.totalLockedQris.toLocaleString('id-ID')}</p>
                          <p className="text-xs text-stone-500 font-medium mt-1">Transaksi setelah Tgl 20</p>
                      </div>
                      <Icons.Lock className="w-8 h-8 text-stone-300" />
                    </div>
                </div>

                {/* Ringkasan Berjalan */}
                <div className="pt-6 pb-2">
                  <h2 className="text-lg font-black text-stone-800">Ringkasan Unpaid Berjalan</h2>
                  <p className="text-xs text-stone-500 font-medium">Net income yang menjadi hak mitra setelah dikurangi fee platform.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {renderBreakdownCard("Hari Ini", payoutData.breakdown?.today)}
                  {renderBreakdownCard("Minggu Ini", payoutData.breakdown?.week)}
                  {renderBreakdownCard("Bulan Ini", payoutData.breakdown?.month)}
                  {renderBreakdownCard("Tahun Ini", payoutData.breakdown?.year)}
                </div>

                {/* Riwayat Bulanan */}
                <div className="pt-8 pb-2 border-t border-stone-200 mt-8">
                  <h2 className="text-lg font-black text-stone-800">Riwayat Unpaid (Detail Bulanan)</h2>
                  <p className="text-xs text-stone-500 font-medium">Rekapitulasi rinci per bulan (Bulan Ini & Bulan Lalu).</p>
                </div>

                <div className="space-y-6">
                  {!payoutData.history?.length && <p className="text-sm text-stone-400 text-center py-6 border border-dashed rounded-2xl">Belum ada riwayat pesanan.</p>}
                  {payoutData.history?.map((yearly: any) => (
                    <div key={yearly.year} className="space-y-3">
                      <h3 className="text-sm font-bold text-stone-400 bg-stone-100 px-4 py-1.5 w-fit rounded-lg">Tahun {yearly.year}</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {yearly.months.map((monthly: any, mIdx: number) => (
                          <div key={mIdx} className="bg-white border border-stone-200 rounded-3xl p-5 space-y-4 shadow-sm hover:border-[#0E5C37]/30 transition-all">
                            <h4 className="text-sm font-black text-stone-800 border-b border-stone-100 pb-2">{monthly.monthName}</h4>
                            
                            <div className="flex justify-between items-end">
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pendapatan Bersih Mitra</p>
                              <p className="text-xl font-black text-[#0E5C37]">Rp {monthly.net.toLocaleString('id-ID')}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                                <div className="flex items-center gap-1.5 mb-1 text-stone-500">
                                  <Icons.Banknote className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Tunai</span>
                                </div>
                                <p className="text-sm font-bold text-stone-800">Rp {monthly.cash.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-1.5 mb-1 text-blue-600">
                                  <Icons.QrCode className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">QRIS</span>
                                </div>
                                <p className="text-sm font-bold text-blue-700">Rp {monthly.qris.toLocaleString('id-ID')}</p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-stone-100 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-500">Gross (Dibayar Pelanggan)</span>
                                <span className="font-bold text-stone-700">Rp {monthly.gross.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-500">Pajak / Tax</span>
                                <span className="font-bold text-stone-700">Rp {monthly.tax.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-500">Service Fee (Platform)</span>
                                <span className="font-bold text-red-500">- Rp {Number(monthly.platformFee ?? 0,).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Riwayat Penarikan Dana */}
                <div className="pt-8 pb-2 border-t border-stone-200 mt-8">
                  <h2 className="text-lg font-black text-stone-800 mb-4">Riwayat Penarikan Dana</h2>
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    {payoutData.withdrawals?.length > 0 ? (
                      payoutData.withdrawals.map((w: any) => (
                        <div key={w.id} className="p-4 border-b border-stone-100 last:border-b-0 flex justify-between items-center hover:bg-stone-50">
                          <div>
                            <p className="text-sm font-bold">Rp {Number(w.amount).toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-stone-400">{new Date(w.createdAt).toLocaleString('id-ID')}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {w.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-xs text-stone-400 text-center">Belum ada riwayat penarikan dana.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB: HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-lg font-black text-stone-800">Riwayat Penjualan Seluruh Waktu</h2>
              <p className="text-xs text-stone-500 mt-1">Rekap seluruh transaksi yang pernah terjadi sejak toko aktif.</p>
            </div>

            {!payoutData?.allHistory || Object.keys(payoutData.allHistory).length === 0 ? (
              <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-10 text-center">
                <Icons.FileText className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                <p className="text-sm text-stone-500">Belum ada riwayat penjualan.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {payoutData.allHistory?.map((yearly: any) => (
                  <div key={yearly.year}>
                    <div className="flex items-center gap-2 mb-4">
                      <Icons.CalendarRange className="w-5 h-5 text-[#0E5C37]" />
                      <h3 className="text-lg font-black text-stone-800">Tahun {yearly.year}</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {yearly.months?.map((mData: any) => (
                        <div key={`${yearly.year}-${mData.monthIndex}`} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm hover:border-[#0E5C37]/20 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Bulan</p>
                              <h4 className="text-lg font-black text-stone-800">{mData.monthName}</h4>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#0E5C37]/10 flex items-center justify-center">
                              <Icons.ReceiptText className="w-5 h-5 text-[#0E5C37]" />
                            </div>
                          </div>

                          <div className="flex justify-between items-end mb-5">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Pendapatan Bersih Mitra</p>
                              <p className="text-2xl font-black text-[#0E5C37]">Rp {Number(mData.net || 0).toLocaleString('id-ID')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Icons.Banknote className="w-4 h-4 text-amber-600" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-amber-600">Tunai</span>
                              </div>
                              <p className="font-bold text-amber-700">Rp {Number(mData.cash || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Icons.QrCode className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600">QRIS</span>
                              </div>
                              <p className="font-bold text-blue-700">Rp {Number(mData.qris || 0).toLocaleString('id-ID')}</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-stone-100 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Gross Sales</span>
                              <span className="font-bold text-stone-700">Rp {Number(mData.gross || 0).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Pajak Customer</span>
                              <span className="font-bold text-stone-700">Rp {Number(mData.tax || 0).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Fee Platform</span>
                              <span className="font-bold text-red-500">- Rp {Number(mData.platformFee ?? 0,).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Jumlah Order</span>
                              <span className="font-bold text-stone-700">{Number(mData.totalOrders || mData.ordersCount || 0).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🔴 ================= TAB: PAJAK & BIAYA (FINANCE) ================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Pajak PPN/PB1 (%)</label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Service Charge Resto (%)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <Icons.Utensils className="w-4 h-4" />
                  </div>
                  <input 
                    type="number" step="1"
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm"
                    value={formData.serviceRate}
                    onChange={(e) => setFormData({ ...formData, serviceRate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1 text-red-500">Fee Platform / Payout (%)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400">
                    <Icons.Wallet className="w-4 h-4" />
                  </div>
                  {/* 🔴 Pastikan jika ini Evognito yang login baru bisa edit, jika mitra biasa mungkin harus di-disabled */}
                  <input 
                    type="number" disabled
                    className="w-full border border-red-200 rounded-2xl bg-red-50 py-4 pl-12 pr-4 text-sm font-bold text-red-700 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all shadow-sm"
                    value={formData.platformFeeRate}
                    onChange={(e) => setFormData({ ...formData, platformFeeRate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Mode Harga (Tax Inclusion)</label>
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

            <div className="bg-stone-100/50 rounded-3xl p-6 border border-stone-200/50 border-dashed mt-8 shadow-inner">
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-5 text-center bg-white px-3 py-1 rounded-full w-fit mx-auto border border-stone-200">
                Live Preview Simulasi (Rp 100.000)
              </p>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">{formData.isTaxIncluded === 1 ? 'Subtotal Sebelum Biaya' : 'Harga Menu Dasar'}</span>
                  <span className="font-bold text-stone-700">Rp {subtotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Service Charge Resto ({formData.serviceRate}%)</span>
                  <span className="font-bold text-stone-700">Rp {serviceAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Pajak ({formData.taxRate}%){formData.isTaxIncluded === 1 && ' Included'}</span>
                  <span className="font-bold text-stone-700">Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                
                <div className="pt-4 border-t border-stone-200 flex justify-between">
                  <span className="text-sm font-bold text-stone-900">Total Pelanggan Bayar (Gross)</span>
                  <span className="text-sm font-black text-stone-900">Rp {totalEst.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                
                <div className="flex justify-between mt-1 pt-3 border-t border-stone-200/50 border-dashed">
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <Icons.ArrowDownRight className="w-3.5 h-3.5" />
                    Potongan Platform Payout ({formData.platformFeeRate}%)
                  </span>
                  <span className="text-xs font-bold text-red-500">- Rp {platformFeeCut.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
                
                <div className="pt-3 border-t border-stone-200 flex justify-between items-center bg-[#0E5C37]/5 -mx-4 px-4 py-3 rounded-xl mt-2">
                  <span className="text-sm font-black text-[#0E5C37]">Net Diterima Mitra</span>
                  <span className="text-lg font-black text-[#0E5C37]">Rp {netMitra.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
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
                <h2 className="text-sm font-bold text-stone-800">Informasi Akun</h2>
                <p className="text-xs text-stone-500 mt-1">Data akun owner yang sedang login.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama Owner</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.User2 className="w-4 h-4" />
                    </div>
                    <input type="text" disabled value={ownerProfile.name} className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Role</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.Shield className="w-4 h-4" />
                    </div>
                    <input type="text" disabled value={ownerProfile.role} className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Email Login</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.Mail className="w-4 h-4" />
                  </div>
                  <input type="email" disabled value={ownerProfile.email} className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm" />
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-stone-800">Ganti Password</h2>
                <p className="text-xs text-stone-500 mt-1">Kosongkan jika tidak ingin mengganti password.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Password Lama</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                      <Icons.Lock className="w-4 h-4" />
                    </div>
                    <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Password Baru</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Icons.KeyRound className="w-4 h-4" />
                      </div>
                      <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Konfirmasi Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Icons.ShieldCheck className="w-4 h-4" />
                      </div>
                      <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]" />
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama Bisnis / Kafe</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.Coffee className="w-4 h-4" />
                  </div>
                  <input type="text" disabled value={formData.cafeName} className="w-full bg-stone-100 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-stone-500 outline-none cursor-not-allowed shadow-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Welcome Message</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.MessageSquare className="w-4 h-4" />
                  </div>
                  <input type="text" value={formData.mitraWelcome} onChange={(e) => setFormData(prev => ({ ...prev, mitraWelcome: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-stone-700 outline-none shadow-sm focus:border-[#0E5C37]" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Address</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                  <Icons.MapPin className="w-4 h-4" />
                </div>
                <textarea rows={3} value={formData.mitraAddress} onChange={(e) => setFormData(prev => ({ ...prev, mitraAddress: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-stone-700 outline-none shadow-sm focus:border-[#0E5C37]" />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: BANK ================= */}
        {activeTab === 'bank' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama Bank</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none z-10">
                    <Icons.Landmark className="w-4 h-4" />
                  </div>
                  <input type="text" placeholder="Pilih atau ketik nama bank..." value={formData.bankName} onFocus={() => setShowBankDropdown(true)} onChange={(e) => { setFormData((prev) => ({ ...prev, bankName: e.target.value })); setShowBankDropdown(true); }} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium outline-none shadow-sm transition-all focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5" />
                  <button type="button" onClick={() => setShowBankDropdown((prev) => !prev)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                    <Icons.ChevronDown className={`w-4 h-4 transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showBankDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50">
                      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
                        <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                          {filteredBanks.length > 0 ? (
                            filteredBanks.map((bank) => (
                              <button key={bank} type="button" onClick={() => { setFormData((prev) => ({ ...prev, bankName: bank })); setShowBankDropdown(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0E5C37]/5 transition-all group">
                                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 group-hover:bg-[#0E5C37]/10 transition-all">
                                  <Icons.Building2 className="w-4 h-4 text-stone-500 group-hover:text-[#0E5C37]" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-stone-800 leading-none mb-1">{bank}</p>
                                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Bank Transfer</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center flex flex-col items-center justify-center">
                              <Icons.Building className="w-8 h-8 text-stone-200 mb-2" />
                              <p className="text-sm font-bold text-stone-700">Gunakan &quot;{formData.bankName}&quot;</p>
                              <p className="text-[11px] text-stone-400 mt-1 max-w-[200px] leading-relaxed">Bank tidak ada di daftar. Nama ini tetap akan disimpan.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-stone-400 pl-1 mt-1">Pilih bank dari daftar atau ketik manual jika tidak tersedia.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nomor Rekening</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                    <Icons.CreditCard className="w-4 h-4" />
                  </div>
                  <input type="text" value={formData.bankNumber} onChange={(e) => setFormData(prev => ({ ...prev, bankNumber: e.target.value }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37]" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Nama Pemilik Rekening</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                  <Icons.UserCircle2 className="w-4 h-4" />
                </div>
                <input type="text" value={formData.bankOwner} onChange={(e) => setFormData(prev => ({ ...prev, bankOwner: e.target.value.toUpperCase() }))} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[#0E5C37] uppercase" />
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
                <input type="text" placeholder="Contoh: Evokasir Free WiFi" value={formData.wifiSSID} onChange={(e) => setFormData({ ...formData, wifiSSID: e.target.value })} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Kata Sandi WiFi</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <Icons.Lock className="w-4 h-4" />
                </div>
                <input type="text" placeholder="Masukkan password WiFi..." value={formData.wifiPassword} onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })} className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-[#0E5C37] focus:ring-4 focus:ring-[#0E5C37]/5 outline-none transition-all shadow-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: FASILITAS & FAQ ================= */}
        {activeTab === 'info' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <input type="text" placeholder="Contoh: Mushola VIP" value={fac.name} onChange={(e) => updateFacility(idx, 'name', e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold ml-1">Nama Ikon (CapitalCase)</label>
                        <input type="text" list="icon-references" placeholder="Pilih/ketik... (Cth: Wifi)" value={fac.icon} onChange={(e) => updateFacility(idx, 'icon', e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold ml-1">Deskripsi Singkat</label>
                      <input type="text" placeholder="Contoh: Terletak di lantai 2..." value={fac.description} onChange={(e) => updateFacility(idx, 'description', e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm" />
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
                      <input type="text" placeholder="Contoh: Buka jam berapa aja kak?" value={item.question} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm font-medium" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold ml-1">Jawaban (Answer)</label>
                      <textarea rows={2} placeholder="Contoh: Kami buka dari jam 08.00 sampai 22.00..." value={item.answer} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm focus:border-[#0E5C37] outline-none shadow-sm" />
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
          disabled={isSaving || activeTab === 'payout' || activeTab === 'history'}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-bold transition-all active:scale-[0.98] ${
            isSaved ? 'bg-green-500 text-white' : 'bg-[#0E5C37] text-white hover:bg-emerald-800'
          } ${activeTab === 'payout' || activeTab === 'history' ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
        >
          {isSaving ? (
            <><Icons.Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : isSaved ? (
            <><Icons.CheckCircle className="w-4 h-4" /> Tersimpan!</>
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