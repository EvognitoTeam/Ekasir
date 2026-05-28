import { useState, useEffect } from 'react';
import { useInventoryStore } from '@/store/inventory.store';
import { useAuthStore } from '@/store/auth.store';
import { Search, Plus, Edit3, Save, Package, TrendingDown, Clock, Trash2, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '@/utils/formatters';

export default function StockManagement() {
  const { materials, expenses, initializeDefaultMaterials, updateMaterialStock, addRestockPurchase, recordExpense, deleteExpense } = useInventoryStore();
  const { username } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'materials' | 'expenses'>('materials');
  const [search, setSearch] = useState('');
  
  // Edit Stock State
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState('');

  // Purchase Form State
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'Restock' | 'Operational' | 'Other'>('Restock');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    initializeDefaultMaterials();
  }, [initializeDefaultMaterials]);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveStock = (id: string) => {
    const val = parseFloat(tempStock);
    if (!isNaN(val) && val >= 0) {
      updateMaterialStock(id, val, username || 'owner', 'Manual stock adjustment');
    }
    setEditingStockId(null);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(purchaseCost);
    if (isNaN(cost) || cost <= 0) return;

    if (purchaseType === 'Restock') {
      if (!selectedMaterialId) return;
      const qty = parseFloat(purchaseQty);
      if (isNaN(qty) || qty <= 0) return;
      
      addRestockPurchase(selectedMaterialId, qty, cost, username || 'owner', supplier);
    } else {
      if (!purchaseDesc) return;
      recordExpense({
        type: purchaseType,
        description: purchaseDesc,
        amount: cost,
        actor: username || 'owner'
      });
    }

    // Reset Form
    setIsPurchaseFormOpen(false);
    setPurchaseQty('');
    setPurchaseCost('');
    setPurchaseDesc('');
    setSupplier('');
    setSelectedMaterialId('');
  };

  return (
    <div className="p-6 space-y-8 pb-40">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-3xl font-display text-stone-900 leading-tight">Inventory & Expenses</h2>
           <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mt-1">Manage Raw Materials & Operational Costs</p>
        </div>

        <div className="flex items-center bg-stone-100 p-1 rounded-full w-fit">
          <button 
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-2 rounded-full text-xs font-label uppercase tracking-widest transition-all ${
              activeTab === 'materials' ? 'bg-white text-stone-900 shadow-sm font-bold' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Raw Materials
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-6 py-2 rounded-full text-xs font-label uppercase tracking-widest transition-all ${
              activeTab === 'expenses' ? 'bg-white text-stone-900 shadow-sm font-bold' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Expenses Log
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        
        {/* Action Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
          {activeTab === 'materials' ? (
            <div className="relative w-72 group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[var(--color-primary)] transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-stone-50 border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans focus:outline-none focus:bg-white focus:border-[var(--color-primary)] transition-all"
              />
            </div>
          ) : (
            <div className="text-sm font-sans text-stone-500 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-stone-400" />
              All recorded operational expenses and restocks.
            </div>
          )}

          <button 
            onClick={() => setIsPurchaseFormOpen(!isPurchaseFormOpen)}
            className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-[10px] font-label uppercase tracking-widest font-bold rounded-xl hover:bg-[var(--color-primary)]/90 transition-colors flex items-center gap-2 shadow-md shadow-[var(--color-primary)]/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Catat Belanja
          </button>
        </div>

        {/* Purchase Form Dropdown */}
        {isPurchaseFormOpen && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white p-6 rounded-2xl border border-[var(--color-primary)]/20 shadow-lg relative overflow-hidden"
            onSubmit={handlePurchaseSubmit}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]" />
            <h3 className="text-lg font-display text-stone-800 mb-6">Formulir Pencatatan Belanja</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Tipe Belanja</label>
                <select 
                  value={purchaseType} 
                  onChange={(e) => setPurchaseType(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="Restock">Bahan Baku (Restock)</option>
                  <option value="Operational">Operasional (Listrik, Internet, Air)</option>
                  <option value="Equipment">Peralatan / Aset</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>

              {purchaseType === 'Restock' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Bahan Baku</label>
                    <select 
                      required
                      value={selectedMaterialId} 
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Kuantitas Masuk</label>
                    <input 
                      type="number" required min="0.1" step="0.1"
                      placeholder="Contoh: 5000"
                      value={purchaseQty} onChange={e => setPurchaseQty(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Supplier (Opsional)</label>
                    <input 
                      type="text"
                      placeholder="Nama Toko/Supplier"
                      value={supplier} onChange={e => setSupplier(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Deskripsi Pengeluaran</label>
                  <input 
                    type="text" required
                    placeholder="Contoh: Bayar Tagihan Listrik PLN Bulan Ini"
                    value={purchaseDesc} onChange={e => setPurchaseDesc(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-label uppercase tracking-widest text-stone-500">Total Harga (Rp)</label>
                <input 
                  type="number" required min="1"
                  placeholder="Total biaya belanja..."
                  value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                type="button"
                onClick={() => setIsPurchaseFormOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-8 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[var(--color-primary)]/90 transition-all active:scale-95"
              >
                Simpan & Catat
              </button>
            </div>
          </motion.form>
        )}

        {/* Tab Content: Materials */}
        {activeTab === 'materials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMaterials.map(material => {
              const isLow = material.stock <= material.lowStockThreshold;
              return (
                <div key={material.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-stone-50 rounded-xl text-stone-500">
                        <Package className="w-5 h-5" />
                      </div>
                      {isLow && (
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-display text-stone-800 leading-tight">{material.name}</h4>
                    <p className="text-[10px] font-label uppercase tracking-widest text-stone-400 mt-1">{material.category}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-1">Fisik Gudang</p>
                      {editingStockId === material.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            autoFocus
                            type="number"
                            value={tempStock}
                            onChange={(e) => setTempStock(e.target.value)}
                            className="w-20 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm font-bold"
                          />
                          <button onClick={() => handleSaveStock(material.id)} className="text-[var(--color-primary)] hover:opacity-80">
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1 group">
                          <span className={`text-2xl font-bold ${isLow ? 'text-rose-600' : 'text-stone-800'}`}>
                            {material.stock.toLocaleString('id-ID')}
                          </span>
                          <span className="text-sm font-medium text-stone-400">{material.unit}</span>
                          <button onClick={() => {
                            setEditingStockId(material.id);
                            setTempStock(material.stock.toString());
                          }} className="ml-2 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-[var(--color-primary)] transition-all">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {material.lastRestockDate && (
                      <div className="text-right">
                         <Clock className="w-3 h-3 text-stone-300 inline-block mb-1" />
                         <p className="text-[9px] font-label uppercase tracking-widest text-stone-400">Last In</p>
                         <p className="text-xs font-sans text-stone-500">{new Date(material.lastRestockDate).toLocaleDateString('id-ID')}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Expenses */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
             {expenses.length === 0 ? (
               <div className="p-12 text-center text-stone-400">
                 <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p className="font-display text-lg text-stone-600">Belum ada catatan pengeluaran.</p>
                 <p className="text-sm font-sans mt-2">Gunakan tombol "Catat Belanja" untuk mulai mencatat arus kas keluar.</p>
               </div>
             ) : (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-stone-50 border-b border-stone-100 text-[10px] font-label uppercase tracking-widest text-stone-500">
                     <th className="py-4 px-6 font-bold">Tanggal</th>
                     <th className="py-4 px-6 font-bold">Kategori</th>
                     <th className="py-4 px-6 font-bold">Deskripsi</th>
                     <th className="py-4 px-6 font-bold text-right">Total Biaya</th>
                     <th className="py-4 px-6 font-bold text-center">Aksi</th>
                   </tr>
                 </thead>
                 <tbody>
                   {expenses.map(expense => (
                     <tr key={expense.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors text-sm font-sans group">
                       <td className="py-4 px-6 text-stone-500">
                         {new Date(expense.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                         <span className="block text-[10px] mt-0.5">{new Date(expense.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                       </td>
                       <td className="py-4 px-6">
                         <span className={`inline-block px-2 py-1 rounded text-[10px] font-label uppercase tracking-widest font-bold ${
                           expense.type === 'Restock' ? 'bg-emerald-50 text-emerald-600' :
                           expense.type === 'Operational' ? 'bg-blue-50 text-blue-600' :
                           'bg-stone-100 text-stone-600'
                         }`}>
                           {expense.type}
                         </span>
                       </td>
                       <td className="py-4 px-6 font-medium text-stone-800">
                         {expense.description}
                         <span className="block text-[10px] font-label uppercase tracking-widest text-stone-400 mt-1 opacity-60">BY: {expense.actor}</span>
                       </td>
                       <td className="py-4 px-6 text-right font-bold text-rose-600">
                         {formatPrice(expense.amount)}
                       </td>
                       <td className="py-4 px-6 text-center">
                         <button 
                           onClick={() => deleteExpense(expense.id)}
                           className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-rose-50"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
