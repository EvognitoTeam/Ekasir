'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Receipt, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useMenuStore } from '@/store/menu.store';
import { useOrderStore } from '@/store/order.store';

type Props={onBackToMenu:()=>void;onTrackOrder:()=>void};
const active=new Set(['pending','confirmed','preparing','ready']);
const money=(v:any)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(Number(v||0)).replace(/\s/g,'');
const norm=(v:any)=>String(v||'').toLowerCase().trim();
const date=(v:any)=>{try{return new Date(v).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return'-'}};
const total=(o:any)=>Number(o.total_after_discount??o.totalAfterDiscount??o.total_price??o.totalPrice??0);
const code=(o:any)=>o.order_code||o.orderCode||o.id;
const label=(s:string)=>({pending:'Waiting confirmation',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready',completed:'Completed',cancelled:'Cancelled'} as any)[s]||s;

export default function CustomerOrderHistoryV3({onBackToMenu,onTrackOrder}:Props){
 const params=useParams();const slug=String(params.mitraSlug||'');const {userId,role}=useAuthStore();const menu=useMenuStore(s=>s.items);const [rows,setRows]=useState<any[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [tab,setTab]=useState<'active'|'past'>('active');const [open,setOpen]=useState<string|null>(null);
 async function load(silent=false){if(!silent)setLoading(true);try{let uid=Number(userId)||0;let rrole=norm(role);if(!uid||!rrole){const a=await fetch(`/api/auth/me${slug?`?slug=${encodeURIComponent(slug)}`:''}`,{credentials:'include',cache:'no-store'});const j=await a.json();if(a.ok&&j.success){uid=Number(j.user?.id??j.data?.user?.id??j.data?.id??0);rrole=norm(j.user?.role??j.data?.user?.role??j.data?.role)}}if(!rrole)throw new Error('Silakan login untuk melihat riwayat pesanan.');const q=new URLSearchParams();if(['owner','cashier','kitchen'].includes(rrole)){q.set('slug',slug)}else if(rrole==='user'&&uid){q.set('userId',String(uid))}else throw new Error('Akun ini tidak memiliki akses riwayat.');const r=await fetch(`/api/orders/history?${q}`,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||'Gagal mengambil riwayat.');setRows(Array.isArray(j.data)?j.data:[]);setError('')}catch(e){if(!silent)setError(e instanceof Error?e.message:'Gagal mengambil riwayat.')}finally{if(!silent)setLoading(false)}}
 useEffect(()=>{void load();const id=setInterval(()=>void load(true),5000);return()=>clearInterval(id)},[slug,userId,role]);
 const shown=useMemo(()=>rows.filter(o=>tab==='active'?active.has(norm(o.status)):!active.has(norm(o.status))),[rows,tab]);
 if(loading)return <div className="flex min-h-[70dvh] items-center justify-center bg-stone-50"><Loader2 className="h-6 w-6 animate-spin"/></div>;
 if(error&&!rows.length)return <div className="flex min-h-[70dvh] flex-col items-center justify-center bg-stone-50 px-6 text-center"><Receipt className="h-10 w-10 text-black/20"/><h2 className="mt-5 text-2xl font-black">Orders unavailable</h2><p className="mt-2 text-sm text-black/45">{error}</p><button onClick={onBackToMenu} className="mt-6 rounded-full bg-black px-6 py-3 text-xs font-black text-white">Back to menu</button></div>;
 return <div className="min-h-full bg-stone-50 px-4 pb-32 pt-6">
   <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-black/30">Order journal</p><h1 className="mt-2 text-[38px] font-black leading-[.95] tracking-[-.06em]">Your<br/>orders.</h1></div><button onClick={()=>void load()} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"><RefreshCw className="h-4 w-4"/></button></div>
   <div className="mt-7 flex gap-2"><button onClick={()=>setTab('active')} className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[.14em] ${tab==='active'?'bg-black text-white':'border border-black/10 bg-white text-black/40'}`}>Live</button><button onClick={()=>setTab('past')} className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[.14em] ${tab==='past'?'bg-black text-white':'border border-black/10 bg-white text-black/40'}`}>Archive</button></div>
   <div className="mt-8 space-y-8">{shown.length===0?<p className="py-12 text-center text-sm text-black/35">Belum ada pesanan di bagian ini.</p>:shown.map((o:any,i:number)=>{const s=norm(o.status),isActive=active.has(s),items=o.items||[];return <article key={o.id} className="relative pl-8"><span className={`absolute left-0 top-1 h-3 w-3 rounded-full ${isActive?'bg-black':'border border-black/20 bg-stone-50'}`}/><span className="absolute left-[5px] top-5 h-[calc(100%+1.5rem)] w-px bg-black/10"/>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-black/30">{date(o.created_at??o.createdAt)}</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">#{code(o)}</h2></div><span className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${s==='cancelled'?'bg-red-100 text-red-700':isActive?'bg-black text-white':'bg-stone-200 text-black/50'}`}>{label(s)}</span></div>
      <button onClick={()=>setOpen(open===String(o.id)?null:String(o.id))} className="mt-4 w-full rounded-3xl border border-black/[.07] bg-white p-4 text-left"><div className="flex items-end justify-between"><div><p className="text-xs text-black/40">{items.reduce((a:number,x:any)=>a+Number(x.quantity||0),0)} items</p><p className="mt-1 text-lg font-black">{money(total(o))}</p></div><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">{open===String(o.id)?'Close':'Receipt'}</span></div>
      {open===String(o.id)&&<div className="mt-4 border-t border-black/[.07] pt-4">{items.map((it:any,idx:number)=>{const id=String(it.product_id??it.menuItemId??'');const n=it.menu_name||it.name||menu.find(m=>String(m.id)===id)?.name||`Product ${id}`;return <div key={idx} className="flex justify-between gap-3 py-1.5 text-xs"><span className="min-w-0 truncate">{Number(it.quantity||1)}× {n}</span><span className="shrink-0 font-bold">{money(Number(it.price||0)*Number(it.quantity||1))}</span></div>})}</div>}</button>
      {isActive&&<button onClick={()=>{useOrderStore.setState({currentOrder:o as any});onTrackOrder()}} className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em]">Track order <ArrowRight className="h-3.5 w-3.5"/></button>}
    </article>})}</div>
 </div>;
}
