"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useMenuStore } from '@/store/menu.store';
import { useInventoryStore } from '@/store/inventory.store';
import { Search, Save, Power, Edit3, Loader2, Image as ImageIcon, Plus, X, Layers, Box, Tag, Settings, CheckCircle2, BookOpen, Trash2, Store } from 'lucide-react'; // 🔴 Tambah Store icon
import { formatPrice } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '@/utils/toast';

import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

type AddModalTab = 'menu' | 'category' | 'addon';
type AddonType = 'group' | 'item';
type ModalMode = 'add' | 'edit';

export default function MenuEditor() {
  const params = useParams();
  const slug = (params.mitraSlug as string) || "";

  const { items, setMenu } = useMenuStore();
  const { materials, initializeDefaultMaterials } = useInventoryStore();
  const [search, setSearch] = useState('');
  
  // 🔴 STATE UNTUK CABANG
  const [dbBranches, setDbBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>(''); // '' berarti Pusat / Semua Cabang

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbAddonGroups, setDbAddonGroups] = useState<any[]>([]);
  const [dbAddons, setDbAddons] = useState<any[]>([]); 
  const [recipes, setRecipes] = useState<any[]>([]);
  const [dbMaterials, setDbMaterials] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AddModalTab>('menu');
  const [addonType, setAddonType] = useState<AddonType>('group');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  const [tempMat, setTempMat] = useState('');
  const [tempAmt, setTempAmt] = useState('');

  // FORM STATES
  const [formMenu, setFormMenu] = useState({ 
    name: '', 
    image: '', 
    imageFile: null as File | null, 
    price: '', 
    stock: '', 
    category: '', 
    description: '',
    addonGroups: [] as number[],
    recipes: [] as { materialId: string, amount: string, materialName: string, unit: string }[] 
  });
  const [formCategory, setFormCategory] = useState({ name: '' });
  const [formAddonGroup, setFormAddonGroup] = useState({ name: '', isRequired: '0', maxSelected: '1' });
  const [formAddonItem, setFormAddonItem] = useState({ name: '', price: '', groupId: '' });
  const [formRecipe, setFormRecipe] = useState({ productId: '', materialId: '', amount: '' });

  // 🔴 FETCH DATA DENGAN FILTER CABANG
  const fetchAllData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      // Tambahkan branch_id ke URL jika tidak kosong
      const menuUrl = activeBranchId 
        ? `/api/menu?slug=${slug}&branch_id=${activeBranchId}` 
        : `/api/menu?slug=${slug}`;

      const [menuRes, recipeRes, invRes, branchRes] = await Promise.all([
        fetch(menuUrl),
        fetch('/api/recipes'),
        fetch('/api/inventory'), 
        fetch(`/api/pos/branches?slug=${slug}`) // Ambil data cabang
      ]);

      const data = await menuRes.json();
      const recipeData = await recipeRes.json();
      const invData = await invRes.json(); 
      const branchData = await branchRes.json();
      
      if (data.success) {
        setMenu(data.items, data.categories);
        setDbCategories(data.categories || []);
        setDbAddonGroups(data.addonCategories || []);
        setDbAddons(data.addons || []); 
      }
      if (recipeData.success) setRecipes(recipeData.data);
      if (invData.success) setDbMaterials(invData.data); 
      if (branchData.success) setDbBranches(branchData.data);

    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [slug, activeBranchId, setMenu]); // 🔴 activeBranchId masuk dependency agar re-fetch saat tab diganti

  useEffect(() => {
    fetchAllData();
    initializeDefaultMaterials();
  }, [fetchAllData, initializeDefaultMaterials]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addRecipe = (materialId: string, amount: string) => {
      const mat = dbMaterials.find(m => m.id.toString() === materialId);
      if (!mat || !amount) return;
      setFormMenu(prev => ({
          ...prev,
          recipes: [...prev.recipes, { materialId, amount, materialName: mat.name, unit: mat.unit}]
      }));
  };

  const removeRecipe = (index: number) => {
      setFormMenu(prev => ({ ...prev, recipes: prev.recipes.filter((_, i) => i !== index) }));
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setSavingId(id);
    try {
      const response = await fetch('/api/menu', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isAvailable: !currentStatus }) 
      });
      const result = await response.json();

      if (result.success) {
        const newItems = items.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item);
        setMenu(newItems, dbCategories);
        
        Toast.fire({
          icon: 'success',
          title: !currentStatus ? 'Menu berhasil diaktifkan!' : 'Menu ditandai sebagai habis!'
        });
      } else {
        Toast.fire({ icon: 'error', title: `Gagal: ${result.message}` });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem.' });
    } finally {
      setSavingId(null);
    }
  };

  const saveInlinePrice = async (id: string) => {
    const priceNum = parseInt(tempPrice);
    if (isNaN(priceNum)) return;
    setSavingId(id);
    try {
      const response = await fetch('/api/menu', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, basePrice: priceNum }) 
      });
      const result = await response.json();

      if (result.success) {
        const newItems = items.map(item => item.id === id ? { ...item, basePrice: priceNum } : item);
        setMenu(newItems, dbCategories);
        setEditingId(null);
        Toast.fire({ icon: 'success', title: 'Harga menu berhasil diperbarui!' });
      } else {
        Toast.fire({ icon: 'error', title: `Gagal: ${result.message}` });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Gagal memperbarui harga menu.' });
    } finally {
      setSavingId(null);
    }
  };

  const startInlinePriceEdit = (id: string, price: number) => {
    setEditingId(id);
    setTempPrice(price.toString());
  };

  const openAddModal = () => {
    setModalMode('add');
    setActiveTab('menu');
    setEditingSubId(null);
    setFormMenu({ name: '', image: '', imageFile: null, price: '', stock: '', category: '', description: '', addonGroups: [], recipes: [] });
    setFormCategory({ name: '' });
    setFormAddonGroup({ name: '', isRequired: '0', maxSelected: '1' });
    setFormAddonItem({ name: '', price: '', groupId: '' });
    setShowModal(true);
  };

  const openEditModal = async (item: any) => {    
    setModalMode('edit');
    setActiveTab('menu');
    setEditingSubId(null);
    setEditItemId(item.id);
    try{
      const res = await fetch(`/api/recipes?productId=${item.id}`);
      const result = await res.json();
    
      const loadedRecipes = result.success ? result.data.map((r: any) => ({
          materialId: r.materialId?.toString() || r.material_id?.toString(), 
          amount: r.amountNeeded?.toString() || r.amount_needed?.toString(), 
          materialName: r.materialName || r.material_name, 
          unit: r.unit 
      })) : [];

      setFormMenu({
        name: item.name || '',
        image: item.image || '',
        imageFile: null, 
        price: item.basePrice?.toString() || '',
        stock: item.stock?.toString() || '', 
        category: item.categoryId || '',
        description: item.description || '',
        addonGroups: Array.isArray(item.addonGroups) ? item.addonGroups.map(Number) : [],
        recipes: loadedRecipes
      });
    }catch (error) {
        console.error("Gagal load resep:", error);
    }
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormMenu({ ...formMenu, image: imageUrl, imageFile: file });
    }
  };

  const handleToggleAddonItem = (addonId: number) => {
    setFormMenu(prev => {
      const exists = prev.addonGroups.includes(addonId);
      if (exists) {
        return { ...prev, addonGroups: prev.addonGroups.filter(id => id !== addonId) };
      } else {
        return { ...prev, addonGroups: [...prev.addonGroups, addonId] };
      }
    });
  };

  const startEditCategory = (cat: any) => {
    setEditingSubId(cat.id);
    setFormCategory({ name: cat.name });
  };

  const startEditAddonGroup = (group: any) => {
    setEditingSubId(group.id);
    setFormAddonGroup({ name: group.name, isRequired: group.isRequired?.toString() || '0', maxSelected: group.maxSelected?.toString() || '1' });
  };

  const startEditAddonItem = (addon: any) => {
    setEditingSubId(addon.id);
    setFormAddonItem({ name: addon.name, price: addon.price?.toString() || '', groupId: addon.category_id?.toString() || '' });
  };

  const cancelSubEdit = () => {
    setEditingSubId(null);
    setFormCategory({ name: '' });
    setFormAddonGroup({ name: '', isRequired: '0', maxSelected: '1' });
    setFormAddonItem({ name: '', price: '', groupId: '' });
  };

  const handleSaveForm = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      formData.append('entity', activeTab); 

      // 🔴 SUNTIKKAN BRANCH ID SAAT MENAMBAHKAN/MENGEDIT
      if (activeBranchId) {
        formData.append('branch_id', activeBranchId);
      }

      if (activeTab === 'menu') {
        formData.append('name', formMenu.name);
        formData.append('price', formMenu.price);
        formData.append('stock', formMenu.stock);
        formData.append('category_id', formMenu.category);
        formData.append('description', formMenu.description);
        formData.append('addon_id', JSON.stringify(formMenu.addonGroups)); 
        formData.append('recipes', JSON.stringify(formMenu.recipes));
        if (formMenu.imageFile) formData.append('image', formMenu.imageFile);
        if (modalMode === 'edit' && editItemId) formData.append('id', editItemId);
      } 
      else if (activeTab === 'category') {
        formData.append('name', formCategory.name);
        if (editingSubId) formData.append('id', editingSubId.toString());
      } 
      else if (activeTab === 'addon') {
        if (addonType === 'group') {
          formData.append('type', 'group');
          formData.append('name', formAddonGroup.name);
          formData.append('is_required', formAddonGroup.isRequired);
          formData.append('max_selected', formAddonGroup.maxSelected);
        } else {
          formData.append('type', 'item');
          formData.append('name', formAddonItem.name);
          formData.append('price', formAddonItem.price);
          formData.append('category_id', formAddonItem.groupId);
        }
        if (editingSubId) formData.append('id', editingSubId.toString());
      }

      const method = (modalMode === 'edit' || editingSubId) ? 'PUT' : 'POST';
      
      const response = await fetch('/api/menu', { 
        method: method, 
        body: formData 
      });

      const result = await response.json();
      
      if (result.success) {
        Toast.fire({
          icon: 'success',
          title: modalMode === 'edit' || editingSubId ? 'Data berhasil diperbarui!' : 'Data baru berhasil disimpan!'
        });
        
        await fetchAllData();
        cancelSubEdit();
        if (activeTab === 'menu') setShowModal(false);

      } else {
        Toast.fire({ icon: 'error', title: `Gagal: ${result.message}` });
      }
      
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-10 relative">

      {/* 🔴 TAB FILTER CABANG */}
      {dbBranches.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-stone-200">
          <button
            onClick={() => setActiveBranchId('')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              activeBranchId === '' ? 'bg-[#0E5C37] text-white shadow-md' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            Semua Cabang (Pusat)
          </button>
          {dbBranches.map(branch => (
            <button
              key={branch.id}
              onClick={() => setActiveBranchId(branch.id.toString())}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                activeBranchId === branch.id.toString() ? 'bg-[#0E5C37] text-white shadow-md' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              {branch.name}
            </button>
          ))}
        </div>
      )}
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group w-full md:max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#0E5C37] transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="Cari nama menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0E5C37]/20 focus:border-[#0E5C37] transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Database</p>
              <p className="text-sm font-black text-stone-800">{items.length} Menu | {dbAddons.length} Addons</p>
           </div>
           <button 
             onClick={openAddModal}
             className="px-5 py-3 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-900/10"
           >
             <Plus className="w-4 h-4" /> Tambah Baru
           </button>
        </div>
      </div>

      {/* KONTEN UTAMA - GRID KARTU MENU */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0E5C37] animate-spin mb-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sinkronisasi Database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-stone-200 rounded-[1.5rem] flex flex-col items-center justify-center bg-white/50 mt-6">
          <p className="text-sm font-bold text-stone-400">Tidak ada menu yang ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                className={`bg-white p-5 rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  !item.isAvailable ? 'opacity-70 border-stone-200' : 'border-stone-100 hover:border-emerald-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-stone-100 shadow-inner bg-stone-50 flex items-center justify-center relative group">
                    {item.image ? (
                      <img src={item.image.startsWith('blob:') ? item.image : "/"+item.image} alt={item.name} className={`w-full h-full object-cover transition-all duration-500 ${!item.isAvailable ? 'grayscale opacity-50' : ''}`} />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-stone-300" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black tracking-tight text-stone-800 leading-tight line-clamp-2">{item.name}</h4>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1 truncate">
                       {dbCategories.find(c => c.id.toString() === item.categoryId)?.name || 'Kategori Tidak Diketahui'}
                    </p>
                    
                    <div className="flex gap-2 mt-2.5">
                      <button 
                        onClick={() => toggleAvailability(item.id, item.isAvailable)}
                        disabled={savingId === item.id}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ${
                          item.isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {savingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{item.isAvailable ? 'Tersedia' : 'Habis'}</span>
                      </button>
                      
                      <button 
                        onClick={() => openEditModal(item)}
                        className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-md hover:bg-stone-50 hover:text-[#0E5C37] transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Settings className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Edit Data</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 border-t border-stone-100 pt-4">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">Rp</span>
                        <input autoFocus type="number" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveInlinePrice(item.id)} className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-8 pr-3 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all" />
                      </div>
                      <button onClick={() => saveInlinePrice(item.id)} disabled={savingId === item.id} className="p-2.5 bg-[#0E5C37] text-white rounded-lg active:scale-95 shadow-md shadow-emerald-900/10 hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        {savingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-stone-800">{formatPrice(item.basePrice)}</span>
                        <button onClick={() => startInlinePriceEdit(item.id, item.basePrice)} className="p-1.5 text-stone-400 hover:text-[#0E5C37] hover:bg-emerald-50 rounded-md transition-colors" title="Edit Harga Cepat">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 🔴 MODAL MASTER DATA MANAGER */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-[#0E5C37] rounded-xl flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 leading-tight">
                      {modalMode === 'edit' ? 'Edit Data Menu' : editingSubId ? 'Modifikasi Konten' : 'Master Data'}
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
                      {modalMode === 'edit' ? 'Modifikasi Entitas' : 'Penambahan Entitas Baru'}
                      {/* 🔴 Tampilkan info cabang yang sedang dituju */}
                      {activeBranchId && ` • ${dbBranches.find(b => b.id.toString() === activeBranchId)?.name}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:text-stone-700 rounded-full transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalMode === 'add' && (
                <div className="px-6 py-3 border-b border-stone-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                  {[
                    { id: 'menu', label: 'Produk Menu', icon: <Box className="w-4 h-4" /> },
                    { id: 'category', label: 'Kategori Utama', icon: <Layers className="w-4 h-4" /> },
                    { id: 'addon', label: 'Addon Ekstra', icon: <Tag className="w-4 h-4" /> },
                    // { id: 'recipe', label: 'Resep (BoM)', icon: <BookOpen className="w-4 h-4" /> }

                  ].map(tab => (
                    <button 
                      key={tab.id} onClick={() => { setActiveTab(tab.id as AddModalTab); cancelSubEdit(); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id ? 'bg-[#0E5C37] text-white shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="p-6 overflow-y-auto no-scrollbar flex-1 bg-stone-50/30">
                
                {/* 🟢 TAB 1: FORM INPUT MENU */}
                
                {activeTab === 'menu' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Nama Menu</label>
                        <input type="text" placeholder="Cth: Nasi Goreng Spesial" value={formMenu.name} onChange={e => setFormMenu({...formMenu, name: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37] focus:ring-2 focus:ring-[#0E5C37]/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Pilih Kategori</label>
                        <select value={formMenu.category} onChange={e => setFormMenu({...formMenu, category: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37] focus:ring-2 focus:ring-[#0E5C37]/20">
                          <option value="">-- Pilih Kategori --</option>
                          {dbCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Harga (Rp)</label>
                        <input type="number" placeholder="25000" value={formMenu.price} onChange={e => setFormMenu({...formMenu, price: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37] focus:ring-2 focus:ring-[#0E5C37]/20" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Stok Jual</label>
                        <input type="number" placeholder="Cth: 100" value={formMenu.stock} onChange={e => setFormMenu({...formMenu, stock: e.target.value})} className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37] focus:ring-2 focus:ring-[#0E5C37]/20" />
                      </div>
                    </div>

                    {/* GRUP ADDON SELECTION BY ITEM ID */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#0E5C37] flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Pilihan Item Addon
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto no-scrollbar bg-white p-3 border border-stone-200/60 rounded-xl">
                        {dbAddons.length === 0 ? (
                          <p className="text-xs text-stone-400 italic">Belum ada item addon yang terdaftar di database.</p>
                        ) : (
                          dbAddons.map((addon) => {
                            const isSelected = formMenu.addonGroups.includes(Number(addon.id));
                            const groupName = dbAddonGroups.find(g => g.id === addon.category_id)?.name || 'Lainnya';
                            
                            return (
                              <button
                                type="button"
                                key={addon.id}
                                onClick={() => handleToggleAddonItem(Number(addon.id))}
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold border tracking-tight transition-all flex items-center gap-2 active:scale-95 ${
                                  isSelected 
                                    ? 'bg-emerald-50 border-[#0E5C37] text-[#0E5C37] shadow-sm font-black' 
                                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0E5C37]" />}
                                <div className="text-left">
                                  <span className="block font-sans">{addon.name}</span>
                                  <span className="block text-[8px] uppercase tracking-wider text-stone-400 font-medium">
                                    {groupName} • +{formatPrice(Number(addon.price))}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* FOTO MENU */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Foto Menu</label>
                      <div className="flex items-center gap-4">
                        {formMenu.image ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shadow-sm shrink-0 bg-stone-100 flex items-center justify-center">
                            <img src={formMenu.image.startsWith('blob:') ? formMenu.image : "/"+formMenu.image} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-stone-300" />
                          </div>
                        )}
                        
                        <div className="flex-1 relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#0E5C37] hover:file:bg-emerald-100 transition-all cursor-pointer focus:outline-none focus:border-[#0E5C37]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* QUILL EDITOR */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Deskripsi (Rich Text)</label>
                      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden focus-within:border-[#0E5C37] focus-within:ring-2 focus-within:ring-[#0E5C37]/20 transition-all">
                        <ReactQuill 
                          theme="snow" 
                          value={formMenu.description} 
                          onChange={(val) => setFormMenu({...formMenu, description: val})} 
                          className="[&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-stone-50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-stone-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-sm [&_.ql-editor]:font-medium [&_.ql-editor]:text-stone-700"
                          placeholder="Ceritakan kelezatan menu ini..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 🟢 TAB 2: FORM & LIST DATA KATEGORI LIVE */}
                {activeTab === 'category' && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-stone-200 flex items-end gap-3 shadow-sm">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#0E5C37]">
                          {editingSubId ? 'Modifikasi Kategori' : 'Nama Kategori Baru'}
                        </label>
                        <input type="text" placeholder="Cth: Makanan Ringan" value={formCategory.name} onChange={e => setFormCategory({...formCategory, name: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:border-[#0E5C37]" />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {editingSubId && <button type="button" onClick={cancelSubEdit} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold uppercase">Batal</button>}
                        <button type="button" onClick={handleSaveForm} className="px-5 py-2.5 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase hover:bg-emerald-700">{editingSubId ? 'Update' : 'Simpan'}</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Daftar Kategori Aktif</p>
                      <div className="bg-white rounded-xl border border-stone-100 shadow-sm divide-y divide-stone-100 overflow-hidden max-h-56 overflow-y-auto no-scrollbar">
                        {dbCategories.length === 0 ? <p className="p-4 text-center text-xs text-stone-400 italic">Belum ada kategori.</p> :
                          dbCategories.map(cat => (
                            <div key={cat.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/40">
                              <span className="text-sm font-bold text-stone-800">{cat.name}</span>
                              <button type="button" onClick={() => startEditCategory(cat)} className="p-1.5 text-stone-400 hover:text-[#0E5C37] hover:bg-emerald-50 rounded-md transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* 🟢 TAB 3: FORM & LIST DATA ADDON LIVE */}
                {activeTab === 'addon' && (
                  <div className="space-y-6">
                    <div className="flex bg-stone-200/50 p-1 rounded-xl w-fit">
                      <button type="button" onClick={() => { setAddonType('group'); cancelSubEdit(); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${addonType === 'group' ? 'bg-white text-[#0E5C37] shadow-sm' : 'text-stone-500'}`}>Kategori Addon</button>
                      <button type="button" onClick={() => { setAddonType('item'); cancelSubEdit(); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${addonType === 'item' ? 'bg-white text-[#0E5C37] shadow-sm' : 'text-stone-500'}`}>Item Addon</button>
                    </div>

                    {addonType === 'group' ? (
                      <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#0E5C37]">Nama Kategori Addon</label>
                              <input type="text" placeholder="Cth: Topping Tambahan" value={formAddonGroup.name} onChange={e => setFormAddonGroup({...formAddonGroup, name: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Sifat</label>
                              <select value={formAddonGroup.isRequired} onChange={e => setFormAddonGroup({...formAddonGroup, isRequired: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37] bg-white">
                                <option value="0">Opsional</option>
                                <option value="1">Wajib Dipilih</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Maksimal Pilih</label>
                              <input type="number" placeholder="Cth: 3" value={formAddonGroup.maxSelected} onChange={e => setFormAddonGroup({...formAddonGroup, maxSelected: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37]" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                            {editingSubId && <button type="button" onClick={cancelSubEdit} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold uppercase">Batal</button>}
                            <button type="button" onClick={handleSaveForm} className="px-5 py-2 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase hover:bg-emerald-700">{editingSubId ? 'Update' : 'Simpan'}</button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Daftar Kategori Addon Live</p>
                          <div className="bg-white rounded-xl border border-stone-100 divide-y overflow-hidden max-h-48 overflow-y-auto no-scrollbar shadow-sm">
                            {dbAddonGroups.map(group => (
                              <div key={group.id} className="p-3.5 flex items-center justify-between">
                                <span className="text-sm font-bold text-stone-800">{group.name} <span className="text-[10px] font-medium text-stone-400 ml-2">({group.isRequired === 1 ? 'Wajib' : 'Opsional'} • Max: {group.maxSelected})</span></span>
                                <button type="button" onClick={() => startEditAddonGroup(group)} className="p-1.5 text-stone-400 hover:text-[#0E5C37] rounded-md"><Edit3 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Pilih Grup Induk</label>
                              <select value={formAddonItem.groupId} onChange={e => setFormAddonItem({...formAddonItem, groupId: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37] bg-white">
                                <option value="">-- Pilih Kategori Addon --</option>
                                {dbAddonGroups.map(group => (
                                  <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-[#0E5C37]">Nama Addon</label>
                              <input type="text" placeholder="Cth: Ekstra Keju" value={formAddonItem.name} onChange={e => setFormAddonItem({...formAddonItem, name: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Harga (Rp)</label>
                              <input type="number" placeholder="5000" value={formAddonItem.price} onChange={e => setFormAddonItem({...formAddonItem, price: e.target.value})} className="w-full bg-stone-50/50 border border-stone-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#0E5C37]" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                            {editingSubId && <button type="button" onClick={cancelSubEdit} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold uppercase">Batal</button>}
                            <button type="button" onClick={handleSaveForm} className="px-5 py-2 bg-[#0E5C37] text-white rounded-xl text-xs font-bold uppercase hover:bg-emerald-700">{editingSubId ? 'Update' : 'Simpan'}</button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">Daftar Item Addon Live</p>
                          <div className="bg-white rounded-xl border border-stone-100 divide-y overflow-hidden max-h-48 overflow-y-auto no-scrollbar shadow-sm">
                            {dbAddons.map(addon => {
                              const pGroup = dbAddonGroups.find(g => g.id === addon.category_id)?.name || 'Lainnya';
                              return (
                                <div key={addon.id} className="p-3.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-bold text-stone-800 block">{addon.name}</span>
                                    <span className="text-[9px] font-bold uppercase text-stone-400 tracking-wider block mt-0.5">{pGroup} • +{formatPrice(Number(addon.price))}</span>
                                  </div>
                                  <button type="button" onClick={() => startEditAddonItem(addon)} className="p-1.5 text-stone-400 hover:text-[#0E5C37] rounded-md"><Edit3 className="w-3.5 h-3.5" /></button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              
              </div>

              {/* FOOTER UTAMA */}
              {activeTab === 'menu' && (
                <div className="p-5 border-t border-stone-100 bg-white shrink-0 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 rounded-xl transition-colors">
                    Batal
                  </button>
                  <button type="button" onClick={handleSaveForm} disabled={isSubmitting} className="px-6 py-3 bg-[#0E5C37] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-900/10">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Menu
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function DatabaseIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
      <path d="M3 12A9 3 0 0 0 21 12"/>
    </svg>
  );
}