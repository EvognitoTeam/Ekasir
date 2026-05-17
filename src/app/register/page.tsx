"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, MapPin, Quote, User, Mail, Lock, 
  Eye, EyeOff, ShieldCheck, FileText, ChevronRight, 
  ChevronLeft, CheckCircle2, Loader2, X, ScrollText
} from 'lucide-react';
import Link from 'next/link';

// 🔴 IMPORT DATA LEGAL DI SINI
import { TERMS_CONTENT, PRIVACY_CONTENT } from '@/constants/legal';

export default function RegisterView() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const [formData, setFormData] = useState({
    businessName: '',
    tagline: '',
    address: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreePrivacy: false,
  });

  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 5) {
      setHasScrolledToBottom(true);
      if (activeModal === 'terms') {
        setFormData(prev => ({ ...prev, agreeTerms: true }));
      } else if (activeModal === 'privacy') {
        setFormData(prev => ({ ...prev, agreePrivacy: true }));
      }
    }
  };

  const openModal = (type: 'terms' | 'privacy') => {
    setActiveModal(type);
    setHasScrolledToBottom(false);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.businessName || !formData.address) {
        setError('Nama Bisnis dan Alamat wajib diisi.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.ownerName || !formData.email || !formData.password) {
        setError('Semua kolom data pemilik wajib diisi.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok.');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Kata sandi minimal 6 karakter.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.agreeTerms || !formData.agreePrivacy) {
        setError('Anda wajib membaca dan menyetujui Syarat & Ketentuan serta Kebijakan Privasi dengan mengkliknya.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(prev => prev + 1); };
  const prevStep = () => { setStep(prev => prev - 1); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsLoading(true);
    try {
      // 🔴 MENGIRIM DATA KE API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: formData.businessName,
          tagline: formData.tagline,
          address: formData.address,
          ownerName: formData.ownerName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal melakukan pendaftaran.');
      }

      // Jika berhasil, tampilkan layar sukses
      // setIsSuccess(true);
      window.location.href = `/${data.slug}/cashier`;

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    hiddenRight: { x: 50, opacity: 0 },
    hiddenLeft: { x: -50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exitRight: { x: 50, opacity: 0, transition: { duration: 0.3 } },
    exitLeft: { x: -50, opacity: 0, transition: { duration: 0.3 } },
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-stone-100">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-[#0E5C37]" /></div>
          <h2 className="text-2xl font-black text-stone-900 mb-3">Registrasi Berhasil!</h2>
          <p className="text-sm text-stone-500 mb-8">Akun <span className="font-bold text-stone-800">{formData.businessName}</span> telah berhasil dibuat.</p>
          <Link href="/login" className="block w-full py-4 bg-[#0E5C37] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors">Menuju Halaman Login</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      
      {/* OVERLAY MODAL DOKUMEN */}
      <AnimatePresence>
        {activeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-[#0E5C37] rounded-xl flex items-center justify-center"><ScrollText className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-stone-900 leading-tight">{activeModal === 'terms' ? 'Syarat & Ketentuan' : 'Kebijakan Privasi'}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Silakan baca hingga selesai</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:text-stone-700 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              
              <div onScroll={handleScroll} className="p-6 overflow-y-auto custom-scrollbar text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
                {activeModal === 'terms' ? TERMS_CONTENT : PRIVACY_CONTENT}
                <div className="h-10" />
              </div>

              <div className="p-5 border-t border-stone-100 bg-white">
                <button onClick={closeModal} disabled={!hasScrolledToBottom} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${hasScrolledToBottom ? 'bg-[#0E5C37]' : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}>
                  {hasScrolledToBottom ? <><CheckCircle2 className="w-4 h-4" /> Setuju & Tutup</> : 'Scroll ke bawah untuk menyetujui'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-stone-100 relative z-10 overflow-hidden flex flex-col h-[650px]">
        {/* Header Indicator */}
        <div className="px-8 pt-10 pb-6 border-b border-stone-50 bg-white z-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              {[1,2,3].map((item) => (
                <div key={item} className={`h-2 rounded-full transition-all duration-500 ${step >= item ? 'w-8 bg-[#0E5C37]' : 'w-4 bg-stone-100'}`} />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Langkah {step} dari 3</span>
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight leading-none mb-2">
            {step === 1 ? 'Data Bisnis' : step === 2 ? 'Profil Pemilik' : 'Persetujuan'}
          </h1>
          <p className="text-xs text-stone-500">
            {step === 1 ? 'Ceritakan tentang usaha hebat Anda.' : step === 2 ? 'Informasi kredensial untuk akses dashboard.' : 'Langkah terakhir sebelum memulai.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative px-8 py-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="hiddenRight" animate="visible" exit="exitLeft" className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Nama Bisnis *</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="E.g. Kopi Kenangan" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Slogan / Tagline</label>
                  <div className="relative">
                    <Quote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" name="tagline" value={formData.tagline} onChange={handleInputChange} placeholder="E.g. Kopi dari hati" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Alamat Lengkap *</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-stone-400" />
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} placeholder="Alamat operasional usaha..." className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all resize-none" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="hiddenRight" animate="visible" exit="exitLeft" className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Nama Pemilik *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} placeholder="Nama lengkap Anda" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Email Aktif *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@domain.com" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Kata Sandi *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-10 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">Ulangi Sandi *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#0E5C37] transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="hiddenRight" animate="visible" exit="exitLeft" className="space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl mb-6">
                  <h3 className="text-sm font-bold text-stone-900 mb-1">Hampir Selesai!</h3>
                  <p className="text-xs text-stone-500">Klik kotak di bawah ini dan baca dokumen hingga selesai untuk menyetujui ketentuan kami.</p>
                </div>

                <div onClick={() => openModal('terms')} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${formData.agreeTerms ? 'bg-emerald-50/50 border-[#0E5C37]' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <div className="relative flex items-center mt-0.5">
                    <input type="checkbox" readOnly checked={formData.agreeTerms} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-stone-300 rounded peer-checked:bg-[#0E5C37] peer-checked:border-[#0E5C37] flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" /></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-stone-800">Syarat & Ketentuan</span>
                    <span className="text-xs text-stone-500 mt-0.5">Ketentuan penggunaan platform dan layanan.</span>
                  </div>
                </div>

                <div onClick={() => openModal('privacy')} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${formData.agreePrivacy ? 'bg-emerald-50/50 border-[#0E5C37]' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <div className="relative flex items-center mt-0.5">
                    <input type="checkbox" readOnly checked={formData.agreePrivacy} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-stone-300 rounded peer-checked:bg-[#0E5C37] peer-checked:border-[#0E5C37] flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" /></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-stone-800">Kebijakan Privasi</span>
                    <span className="text-xs text-stone-500 mt-0.5">Bagaimana kami mengelola data bisnis Anda.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 bg-white border-t border-stone-100 z-20">
          <div className="flex gap-3">
            {step > 1 && (
              <button type="button" onClick={prevStep} className="w-14 h-14 shrink-0 bg-stone-100 text-stone-500 rounded-xl flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
            )}
            {step < 3 ? (
              <button type="button" onClick={nextStep} className="flex-1 bg-[#0E5C37] text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">Lanjutkan <ChevronRight className="w-4 h-4" /></button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isLoading || !formData.agreeTerms || !formData.agreePrivacy} className="flex-1 bg-[#0E5C37] text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:bg-stone-300">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Selesaikan Pendaftaran'}
              </button>
            )}
          </div>
          <p className="text-center text-[10px] font-bold text-stone-400 mt-6 uppercase tracking-widest">Sudah punya akun? <Link href="/login" className="text-[#0E5C37] hover:underline">Masuk di sini</Link></p>
        </div>
      </div>
    </div>
  );
}