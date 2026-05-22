"use client";

import { useState, useEffect } from 'react'; // 🔴 Tambahin useEffect
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔴 TANGKAP ERROR DARI URL MIDDLEWARE
  useEffect(() => {
    // Pake window.location biar aman dari error 'Suspense Boundary' Next.js
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = searchParams.get('error');

    if (urlError) {
      if (urlError === 'not_authorized') {
        setError('Akses ditolak. Anda tidak memiliki izin untuk halaman tersebut.');
      } else if (urlError === 'session_expired') {
        setError('Sesi Anda telah berakhir. Silakan masuk kembali.');
      } else if (urlError === 'invalid_tenant') {
        setError('Akses ditolak. Anda mencoba masuk ke dashboard toko yang salah.');
      } else {
        setError('Terjadi kesalahan otentikasi. Silakan masuk kembali.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Tembak API Login (Tanpa mengirimkan slug)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
      }

      // 2. Login Sukses! Cookie sudah tertanam otomatis.
      // Ambil slug toko milik user dari response API, lalu redirect ke dashboard admin
      const storeSlug = data.user.slug;
      
      if (storeSlug) {
        window.location.href = `/${storeSlug}/dashboard`;
      } else {
        // Fallback jika user biasa (bukan owner) yang mencoba login di sini
        window.location.href = '/'; 
      }

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Dekorasi Background */}
      <div className="absolute top-0 right-0 w-[80vw] sm:w-[40vw] h-[80vw] sm:h-[40vw] bg-[#0E5C37] opacity-[0.03] blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[60vw] sm:w-[30vw] h-[60vw] sm:h-[30vw] bg-emerald-200 opacity-[0.05] blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-emerald-900/5 border border-stone-100 relative z-10 overflow-hidden"
      >
        {/* Header Section */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-inner">
            <Lock className="w-7 h-7 text-[#0E5C37]" />
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight leading-none mb-2">
            Selamat Datang
          </h1>
          <p className="text-xs text-stone-500">
            Masuk ke akun Anda untuk mengelola bisnis.
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-10">
          
          {/* Notifikasi Error (Otomatis muncul kalau state error terisi) */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} 
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(''); // Hilangkan error saat user mulai ngetik lagi
                  }}
                  placeholder="admin@bisnis.com" 
                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0E5C37]/20 focus:border-[#0E5C37] transition-all placeholder:text-stone-300" 
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1 mr-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                  Password
                </label>
                {/* Opsi Lupa Password */}
                <Link href="/forgot-password" className="text-[10px] font-bold text-[#0E5C37] hover:underline">
                  Lupa Sandi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(''); // Hilangkan error saat user mulai ngetik lagi
                  }}
                  placeholder="••••••••" 
                  className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0E5C37]/20 focus:border-[#0E5C37] transition-all placeholder:text-stone-300" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Login */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-2 bg-[#0E5C37] text-white rounded-xl py-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none shadow-lg shadow-emerald-900/10"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Masuk Sekarang <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Footer Link ke Register */}
          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              Belum punya akun?{' '}
              <Link href="/register" className="text-[#0E5C37] hover:underline">
                Daftar Sekarang
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}