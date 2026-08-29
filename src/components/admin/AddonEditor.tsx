"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Store, Plus, Edit3, Save, X, Loader2, Tag, Layers, CheckCircle2, Box } from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { Toast } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddonEditor() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const [dbBranches, setDbBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>(''); // '' = Pusat

  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'group' | 'item'>('group');
  const [editId, setEditId] = useState<string | null>(null);

  // States untuk Group
  const [groupForm, setGroupForm] = useState({ name: '', isRequired: '0', maxSelected: '1' });
  
  // States untuk Item
  const [itemForm, setItemForm] = useState({ name: '', price: '', groupId: '', stock: '', isTrackStock: '1' });

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const [branchRes, addonRes] = await Promise.all([
        fetch(`/api/pos/branches?slug=${slug}`),
        fetch(`/api/addons?slug=${slug}${activeBranchId ? `&branch_id=${activeBranchId}` : ''}`)
      ]);

      const bData = await branchRes.json();
      const aData = await addonRes.json();

      if (bData.success) setDbBranches(bData.data);
      if (aData.success) {
        setGroups(aData.groups || []);
        setItems(aData.items || []);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [slug, activeBranchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Modal Handlers
  const openGroupModal = (group?: any) => {
    setModalType('group');
    setEditId(group ? group.id.toString() : null);
    setGroupForm(group ? { 
      name: group.name, 
      isRequired: group.isRequired.toString(), 
      maxSelected: group.maxSelected.toString() 
    } : { name: '', isRequired: '0', maxSelected: '1' });
    setModalOpen(true);
  };

  const openItemModal = (groupId?: string, item?: any) => {
    setModalType('item');
    setEditId(item ? item.id.toString() : null);
    setItemForm(item ? {
      name: item.name,
      price: item.price.toString(),
      groupId: item.category_id.toString(),
      stock: item.stock?.toString() || '0',
      isTrackStock: item.is_track_stock ? '1' : '0'
    } : { 
      name: '', price: '', groupId: groupId || '', stock: '', isTrackStock: '1' 
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const body = modalType === 'group' 
        ? { ...groupForm, type: 'group' } 
        : { ...itemForm, type: 'item' };

      const payload = { ...body, branch_id: activeBranchId, id: editId };
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch('/api/addons', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        Toast.fire({ icon: 'success', title: 'Data addon tersimpan!' });
        setModalOpen(false);
        fetchData();
      } else {
        Toast.fire({ icon: 'error', title: data.message });
      }
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-10">
      
      {/* FILTER CABANG */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-stone-200">
        <button
          onClick={() => setActiveBranchId('')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
            activeBranchId === '' ? 'bg-[#0E5C37] text-white shadow-md' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          Semua Cabang (Pusat)
        </button>
        {dbBranches.map(b => (
          <button
            key={b.id} onClick={() => setActiveBranchId(b.id.toString())}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
              activeBranchId === b.id.toString() ? 'bg-[#0E5C37] text-white shadow-md' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> {b.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-stone-800">Manajemen Addon & Ekstra</h2>
          <p className="text-sm text-stone-500">Kelola topping, level pedas, dan varian ekstra.</p>
        </div>
        <button 
          onClick={() => openGroupModal()}
          className="px-5 py-2.5 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Tambah Grup Baru
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0E5C37] animate-spin mb-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Memuat Data Addon...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-stone-200 rounded-[1.5rem] flex flex-col items-center justify-center bg-white/50">
          <p className="text-sm font-bold text-stone-400">Belum ada grup addon di cabang ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Header Grup */}
              <div className="p-4 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-stone-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" /> {group.name}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1">
                    {group.isRequired === 1 ? 'Wajib Pilih' : 'Opsional'} • Maks: {group.maxSelected}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openGroupModal(group)} className="p-2 text-stone-400 hover:text-[#0E5C37] hover:bg-emerald-50 rounded-lg transition-all" title="Edit Grup">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => openItemModal(group.id.toString())} className="p-2 bg-[#0E5C37] text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm" title="Tambah Item">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Daftar Item dalam Grup */}
              <div className="flex-1 p-4 overflow-y-auto max-h-64 no-scrollbar">
                {items.filter(i => i.category_id === group.id).length === 0 ? (
                  <p className="text-xs text-stone-400 italic text-center py-4">Belum ada item di dalam grup ini.</p>
                ) : (
                  <div className="space-y-2">
                    {items.filter(i => i.category_id === group.id).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-stone-800">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-[#0E5C37] uppercase tracking-widest">+ {formatPrice(Number(item.price))}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">
                              Stok: {item.is_track_stock ? item.stock : '∞'}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => openItemModal(group.id.toString(), item)} className="p-1.5 text-stone-400 hover:text-[#0E5C37] bg-white border border-stone-200 rounded-md shadow-sm transition-all">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 className="text-lg font-black text-stone-900 leading-tight">
                  {editId ? 'Edit ' : 'Tambah '} {modalType === 'group' ? 'Grup Addon' : 'Item Addon'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:text-stone-700 rounded-full transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 bg-stone-50/30">
                {modalType === 'group' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Nama Grup (Contoh: Topping)</label>
                      <input type="text" value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Sifat</label>
                        <select value={groupForm.isRequired} onChange={e => setGroupForm({...groupForm, isRequired: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]">
                          <option value="0">Opsional</option>
                          <option value="1">Wajib Dipilih</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Maksimal Pilih</label>
                        <input type="number" value={groupForm.maxSelected} onChange={e => setGroupForm({...groupForm, maxSelected: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Grup Induk</label>
                      <select value={itemForm.groupId} onChange={e => setItemForm({...itemForm, groupId: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]">
                        <option value="">-- Pilih Grup --</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Nama Item</label>
                        <input type="text" placeholder="Ekstra Keju" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Harga (Rp)</label>
                        <input type="number" placeholder="0" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]" />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Lacak Stok Item Ini?</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={itemForm.isTrackStock === '1'} onChange={e => setItemForm({...itemForm, isTrackStock: e.target.checked ? '1' : '0'})} className="sr-only peer" />
                          <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0E5C37]"></div>
                        </label>
                      </div>
                      {itemForm.isTrackStock === '1' && (
                        <div className="pt-2 border-t border-stone-100">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#0E5C37] block mb-1">Jumlah Stok Saat Ini</label>
                          <input type="number" placeholder="50" value={itemForm.stock} onChange={e => setItemForm({...itemForm, stock: e.target.value})} className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37]" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="p-5 border-t border-stone-100 bg-white flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-stone-500 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 rounded-xl transition-colors">Batal</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-[#0E5C37] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}