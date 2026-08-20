"use client";

import { useState } from 'react';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';

export default function ShareButtons({ title, slug }: { title: string, slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    
    // Kembalikan status icon setelah 2 detik
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${slug}`;
    
    // Cek apakah browser/HP mendukung Web Share API bawaan (biasanya di HP berjalan sangat mulus)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url,
        });
      } catch (err) {
        console.error("Share dibatalkan", err);
      }
    } else {
      // Fallback jika dibuka di desktop lama, langsung copy link
      handleCopy();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleShare} 
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition-colors shadow-sm" 
        title="Bagikan via Aplikasi"
      >
        <Share2 className="w-4 h-4" />
      </button>
      <button 
        onClick={handleCopy} 
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white transition-colors text-sm font-semibold shadow-sm w-[140px] justify-center" 
        title="Copy Link"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" /> Tersalin!
          </>
        ) : (
          <>
            <LinkIcon className="w-4 h-4" /> Salin Tautan
          </>
        )}
      </button>
    </div>
  );
}