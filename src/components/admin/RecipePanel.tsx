"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Trash2, BookOpen } from 'lucide-react';
import { Toast } from '@/utils/toast';

export default function RecipePanel({ products, materials }: { products: any[], materials: any[] }) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [newRecipe, setNewRecipe] = useState({ productId: '', materialId: '', amount: '' });

  const fetchRecipes = useCallback(async () => {
    const res = await fetch('/api/recipes');
    const result = await res.json();
    if (result.success) setRecipes(result.data);
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleAddRecipe = async () => {
    if (!newRecipe.productId || !newRecipe.materialId || !newRecipe.amount) return;
    
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecipe)
    });
    
    Toast.fire({ icon: 'success', title: 'Resep disimpan!' });
    setNewRecipe({ productId: '', materialId: '', amount: '' });
    fetchRecipes();
  };

  return (
    <div className="space-y-6">
      {/* Form Input Resep */}
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
        <h3 className="text-sm font-black text-stone-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0E5C37]" /> Tambah Komposisi Resep
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={newRecipe.productId} onChange={e => setNewRecipe({...newRecipe, productId: e.target.value})} className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-sm">
            <option value="">Pilih Produk</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={newRecipe.materialId} onChange={e => setNewRecipe({...newRecipe, materialId: e.target.value})} className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-sm">
            <option value="">Pilih Bahan</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="Jumlah" value={newRecipe.amount} onChange={e => setNewRecipe({...newRecipe, amount: e.target.value})} className="flex-1 bg-stone-50 p-3 rounded-xl border border-stone-200 text-sm" />
            <button onClick={handleAddRecipe} className="bg-[#0E5C37] text-white px-4 rounded-xl"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* List Resep */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center shadow-sm">
                <div>
                    <p className="text-xs font-bold text-stone-500 uppercase">{r.productName}</p>
                    <p className="text-sm font-black text-stone-800 mt-1">{r.materialName}</p>
                </div>
                <span className="text-sm font-bold text-[#0E5C37] bg-emerald-50 px-3 py-1 rounded-lg">{r.amountNeeded} {r.unit}</span>
            </div>
        ))}
      </div>
    </div>
  );
}