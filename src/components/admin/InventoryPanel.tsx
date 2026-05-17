import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Plus, Minus } from 'lucide-react';
import { useInventoryStore } from '../../store/inventory.store';
import { formatPrice } from '../../utils/formatters';

export default function InventoryPanel() {
  const { materials, expenses, initializeDefaultMaterials, updateMaterialStock, recordExpense } = useInventoryStore();
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', type: 'Operational' as const });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    initializeDefaultMaterials();
  }, [initializeDefaultMaterials]);

  const lowStock = materials.filter(m => m.stock <= m.lowStockThreshold);

  const totalExpenses = expenses
    .filter(e => {
      const d = new Date(e.timestamp);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const handleAdjustStock = (id: string, current: number, delta: number) => {
    const next = Math.max(0, current + delta);
    updateMaterialStock(id, next, 'admin');
  };

  const handleRecordExpense = () => {
    const amt = parseFloat(expenseForm.amount);
    if (!expenseForm.description || isNaN(amt) || amt <= 0) return;
    recordExpense({ description: expenseForm.description, amount: amt, type: expenseForm.type, actor: 'owner' });
    setExpenseForm({ description: '', amount: '', type: 'Operational' });
    setShowExpenseForm(false);
    setSavedMsg('Pengeluaran tercatat!');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  return (
    <div className="p-6 space-y-8 pb-40">
      {/* Monthly Expenses Summary */}
      <div className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mb-1">Pengeluaran Bulan Ini</p>
          <p className="text-2xl font-display font-bold">{totalExpenses > 0 ? formatPrice(totalExpenses) : '—'}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-label uppercase tracking-widest text-amber-600 font-bold">Perlu Restock</p>
          </div>
          {lowStock.map(m => (
            <div key={m.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans font-medium text-stone-800">{m.name}</p>
                <p className="text-[10px] text-amber-500">{m.stock} {m.unit} tersisa (min: {m.lowStockThreshold})</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleAdjustStock(m.id, m.stock, -50)} className="w-7 h-7 rounded-full bg-white border border-stone-100 flex items-center justify-center active:scale-95">
                  <Minus className="w-3 h-3 text-stone-400" />
                </button>
                <button onClick={() => handleAdjustStock(m.id, m.stock, 500)} className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center active:scale-95">
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Materials */}
      <div className="space-y-3">
        <p className="text-[10px] font-label uppercase tracking-[0.4em] text-stone-400 pl-1">Semua Bahan Baku</p>
        {materials.map((m, i) => {
          const pct = Math.min((m.stock / (m.lowStockThreshold * 3)) * 100, 100);
          const isLow = m.stock <= m.lowStockThreshold;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isLow
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  }
                  <span className="text-sm font-sans font-medium text-stone-800">{m.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleAdjustStock(m.id, m.stock, -50)} className="w-7 h-7 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center active:scale-95">
                    <Minus className="w-3 h-3 text-stone-400" />
                  </button>
                  <span className="text-xs font-bold text-stone-600 w-16 text-center">{m.stock} {m.unit}</span>
                  <button onClick={() => handleAdjustStock(m.id, m.stock, 500)} className="w-7 h-7 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center active:scale-95">
                    <Plus className="w-3 h-3 text-stone-400" />
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expense Logger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <p className="text-[10px] font-label uppercase tracking-[0.4em] text-stone-400">Catat Pengeluaran</p>
          <button
            onClick={() => setShowExpenseForm(v => !v)}
            className="px-4 py-1.5 bg-[var(--color-primary)] text-white rounded-xl text-[10px] font-label uppercase tracking-widest flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3" /> Tambah
          </button>
        </div>

        {showExpenseForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4"
          >
            <input
              type="text"
              placeholder="Deskripsi pengeluaran..."
              value={expenseForm.description}
              onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={expenseForm.amount}
              onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
            <select
              value={expenseForm.type}
              onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value as any })}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="Operational">Operasional</option>
              <option value="Restock">Restock Bahan</option>
              <option value="Equipment">Peralatan</option>
              <option value="Other">Lainnya</option>
            </select>
            <button
              onClick={handleRecordExpense}
              className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-label uppercase tracking-widest active:scale-[0.98] transition-all"
            >
              Simpan Pengeluaran
            </button>
          </motion.div>
        )}

        {savedMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-xs text-emerald-700 font-label">
            ✓ {savedMsg}
          </div>
        )}

        {/* Recent Expenses */}
        {expenses.slice(0, 5).map(e => (
          <div key={e.id} className="bg-white p-5 rounded-[1.5rem] border border-stone-100 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-sm font-sans text-stone-700">{e.description}</p>
              <p className="text-[10px] text-stone-400 font-label uppercase tracking-widest mt-0.5">{e.type}</p>
            </div>
            <p className="text-sm font-bold text-rose-500">-{formatPrice(e.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
