'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, Server, Activity, Database, Settings, 
  ShieldAlert, Search, TrendingUp, Store, CreditCard, TerminalSquare, LogOut
} from "lucide-react";
import MitraManagementView from '@/components/kalooadm/MitraManagementView';

export default function SuperadminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data statistik untuk tampilan Overview
  const stats = [
    { label: "Total Mitra (Tenants)", value: "124", icon: Store, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Transaksi F&B", value: "84.2K", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "MRR / Pendapatan", value: "Rp 18.5M", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Beban Server (CPU)", value: "32%", icon: Server, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="flex h-screen w-full bg-stone-50 text-stone-800 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-stone-950 flex flex-col justify-between flex-shrink-0 text-stone-300">
        <div>
          <div className="h-20 flex items-center px-6 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">EVOGNITO</h1>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Superadmin</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "mitra", label: "Manajemen Mitra", icon: Users },
              { id: "subscription", label: "Langganan SaaS", icon: CreditCard },
              { id: "database", label: "Database Center", icon: Database },
              { id: "logs", label: "System Logs", icon: TerminalSquare },
              { id: "health", label: "Server Health", icon: Activity },
              { id: "settings", label: "Pengaturan Global", icon: Settings },
            ].map((menu) => (
              <button
                key={menu.id}
                onClick={() => setActiveTab(menu.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === menu.id 
                    ? "bg-stone-800 text-white shadow-inner" 
                    : "hover:bg-stone-800/50 hover:text-stone-100"
                }`}
              >
                <menu.icon className="w-4 h-4" />
                {menu.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-stone-800">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-bold transition-all">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {activeTab === 'overview' && (
          <div className="flex flex-col h-full">
            {/* TOPBAR OVERVIEW */}
            <header className="h-20 bg-white border-b border-stone-200 px-8 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-stone-800">Dashboard Overview</h2>
                <p className="text-xs text-stone-500 font-medium">Pantau aktivitas seluruh tenant KALOO POS</p>
              </div>
            </header>

            {/* KONTEN OVERVIEW */}
            <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-2xl font-black text-stone-800">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tempat konten overview lainnya (seperti tabel lite di kode sebelumnya) bisa dimasukkan ke sini... */}
            </div>
          </div>
        )}

        {/* VIEW MANAJEMEN MITRA */}
        {activeTab === 'mitra' && (
          <MitraManagementView />
        )}

      </main>
    </div>
  );
}