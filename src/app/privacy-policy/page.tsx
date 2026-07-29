"use client";

import { LEGAL_LAST_UPDATED, PRIVACY_CONTENT } from '@/constants/legal';
import { ArrowLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6 font-sans text-stone-900 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] p-8 sm:p-10 border border-stone-100 shadow-xl shadow-emerald-900/5">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-[#0E5C37] uppercase tracking-widest mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Kembali
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-50 text-[#0E5C37] border border-emerald-100 rounded-2xl flex items-center justify-center shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none mb-1">Kebijakan Privasi</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Terakhir Diperbarui: {LEGAL_LAST_UPDATED}</p>
          </div>
        </div>

        <div className="text-stone-600 whitespace-pre-wrap leading-relaxed text-sm border-t border-stone-100 pt-6">
          {PRIVACY_CONTENT}
        </div>
      </div>
    </div>
  );
}