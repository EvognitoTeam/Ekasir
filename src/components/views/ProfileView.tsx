"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation'; 
import { 
  User, History, Globe, Shield, ChevronRight, KeyRound, 
  LogOut, CheckCircle, AlertCircle, Ticket, Mail, Loader2,
  LayoutDashboard, Store 
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useOrderStore } from '../../store/order.store';

interface Props {
  onViewHistory: () => void;
  onViewCoupons: () => void; 
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

export default function ProfileView({ onViewHistory, onViewCoupons }: Props) {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const { isLoggedIn, username, role, loginError, isLoading, login, logout, clearError } = useAuthStore();
  const { orderHistory } = useOrderStore();
  
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // 🔴 NORMALISASI ROLE: Apapun bentuk dari database (Owner, OWNER, owner), akan dibaca huruf kecil semua.
  const userRole = role?.toLowerCase() || 'user';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const ok = await login(inputEmail.trim(), inputPassword, slug);
    
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setInputEmail('');
      setInputPassword('');
    }
  };

  const totalSpent = orderHistory.reduce((sum, order) => sum + ((order as any).totalAfterDiscount || order.totalPrice), 0);

  // 🔴 LOGIKA MENU KHUSUS STAFF (Menggunakan userRole yang sudah dinormalisasi)
  const staffMenu = [];
  if (userRole === 'owner') {
    staffMenu.push({ 
      id: 'dashboard', 
      label: 'Go To Dashboard', 
      icon: LayoutDashboard, 
      hasBorder: true, 
      action: () => window.location.href = `/${slug}/admin` 
    });
  } else if (userRole === 'cashier') {
    staffMenu.push({ 
      id: 'pos', 
      label: 'Open POS Cashier', 
      icon: Store, 
      hasBorder: true, 
      action: () => window.location.href = `/${slug}/pos` 
    });
  }

  const settingsMenu = [
    ...(isLoggedIn ? [
      ...staffMenu, 
      { id: 'history', label: 'Order History', icon: History, hasBorder: true, action: onViewHistory },
      { id: 'coupons', label: 'Coupons & Vouchers', icon: Ticket, hasBorder: true, action: onViewCoupons },
    ] : []),
    { id: 'language', label: 'Language Settings', icon: Globe, hasBorder: true, action: () => {} },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield, hasBorder: false, action: () => {} },
  ];

  return (
    <div className="py-8 px-6 min-h-screen bg-[#F7F8FA] font-sans">
      <header className="mb-10">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex items-center gap-4 mb-6"
        >
           <div className="w-12 h-[2px] bg-[#0E5C37]" />
           <span className="font-bold text-[10px] uppercase tracking-[0.4em] text-[#0E5C37]">User Access</span>
        </motion.div>
        
        <h1 className="text-4xl font-black tracking-tight leading-none mb-4 text-stone-900">Profile.</h1>
      </header>

      <div className="flex flex-col gap-6">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {isLoggedIn ? (
              <motion.div
                key="logged-in"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0E5C37] flex items-center justify-center shadow-lg shadow-emerald-900/20">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      {/* 🔴 BADGE ROLE DINAMIS (Juga menggunakan userRole yang sudah dinormalisasi) */}
                      <p className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md w-fit mb-1.5 ${
                        userRole === 'owner' ? 'bg-amber-100 text-amber-700' :
                        userRole === 'cashier' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {userRole === 'owner' ? 'Store Owner' : userRole === 'cashier' ? 'Cashier Staff' : 'Verified User'}
                      </p>
                      <h2 className="text-lg font-black text-stone-900">{username}</h2>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3 pt-5 border-t border-stone-50">
                  <div className="flex-1 bg-stone-50 p-4 rounded-xl text-center">
                    <p className="text-xl font-black text-stone-800">{orderHistory.length}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1">Total Orders</p>
                  </div>
                  <div className="flex-1 bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center flex flex-col justify-center items-center">
                    <p className="text-lg font-black text-[#0E5C37]">
                      {formatIDR(totalSpent)}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Total Spent</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black text-stone-900">Access your account</h2>
                  <p className="text-xs text-stone-500 font-medium">Sign in to track orders, claim coupons, and save preferences.</p>
                </div>

                <AnimatePresence>
                  {showSuccess && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Welcome back! You're now signed in.
                    </motion.div>
                  )}
                  {loginError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input 
                        type="email" 
                        placeholder="Enter your email" 
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        required
                        className="w-full bg-stone-50 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#0E5C37] transition-all placeholder:text-stone-300 border border-transparent focus:border-[#0E5C37]/30"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input 
                        type="password" 
                        placeholder="Enter your password" 
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        required
                        className="w-full bg-stone-50 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#0E5C37] transition-all placeholder:text-stone-300 border border-transparent focus:border-[#0E5C37]/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full bg-[#0E5C37] disabled:bg-stone-300 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authenticate'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div layout className="w-full bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden mb-20">
          <AnimatePresence>
            {settingsMenu.map((item) => (
              <motion.button 
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                key={item.id}
                onClick={item.action}
                className={`w-full p-5 flex flex-col justify-center bg-white hover:bg-stone-50 transition-colors group ${item.hasBorder ? 'border-b border-stone-50' : ''}`}
              >
                 <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-[#0E5C37] group-hover:shadow-sm transition-all duration-300">
                          <item.icon className="w-4 h-4" />
                       </div>
                       <span className="text-sm font-bold text-stone-700">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#0E5C37] transition-colors duration-300" />
                 </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}