"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, Receipt, Package, X, Save, Edit2, Check, RefreshCw, ImageIcon } from 'lucide-react';
import { Toast } from '@/utils/toast';
import { formatPrice } from '@/utils/formatters';
import Image from 'next/image';

interface Material {
  id: number;
  mitra_id: number;
  name: string;
  unit: string;
  stock: string | number;
  low_stock_threshold: string | number;
  cost_per_unit: string | number;
  image?: string;
}

export default function InventoryPanel() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'G',
    threshold: 0,
    cost: 0,
    initialStock: 0,
    image: null as File | null,
  });
  const [previewImage, setPreviewImage] = useState('');

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const result = await res.json();
      if (result.success) setMaterials(result.data);
    } catch (error) { console.error(error); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleSubmit = async () => {
    const url = '/api/inventory';
    const method = editingMaterial ? 'PATCH' : 'POST';

    const data = new FormData();

    data.append('name', formData.name);
    data.append('unit', formData.unit);
    data.append('stock', String(formData.initialStock));
    data.append(
      'low_stock_threshold',
      String(formData.threshold)
    );
    data.append(
      'cost_per_unit',
      String(formData.cost)
    );

    if (editingMaterial) {
      data.append('id', String(editingMaterial.id));
    }

    if (formData.image) {
      data.append('image', formData.image);
    }

    await fetch(url, {
      method,
      body: data,
    });

    Toast.fire({
      icon: 'success',
      title: editingMaterial
        ? 'Data diupdate!'
        : 'Bahan disimpan!',
    });

    setIsModalOpen(false);

    setEditingMaterial(null);

    setFormData({
      name: '',
      unit: 'G',
      threshold: 100,
      cost: 0,
      initialStock: 0,
      image: null,
    });

    fetchInventory();
  };

  // Input teks untuk update stok
  const handleStockTextChange = async (
    id: number,
    val: string
  ) => {
    const newStock = Number(val);

    if (isNaN(newStock)) return;

    const data = new FormData();

    data.append('id', String(id));
    data.append('stock', String(newStock));

    await fetch('/api/inventory', {
      method: 'PATCH',
      body: data,
    });

    fetchInventory();
  };

  const openEdit = (m: Material) => {
    setEditingMaterial(m);

    setFormData({
      name: m.name,
      unit: m.unit,
      threshold: Number(m.low_stock_threshold),
      cost: Number(m.cost_per_unit),
      initialStock: Number(m.stock),
      image: null,
    });

    setPreviewImage(m.image || '');

    setIsModalOpen(true);
  };

  return (
    <div className="w-full pb-10">
      <div className="flex items-center justify-between">
         <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">Inventory Bahan Baku</p>
         <button
            onClick={() => {
              setEditingMaterial(null);

              setFormData({
                name: '',
                unit: 'G',
                threshold: 100,
                cost: 0,
                initialStock: 0,
                image: null,
              });

              setPreviewImage('');

              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#0E5C37] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Tambah Bahan
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((m) => {
          const stock = Number(m.stock);
          return (
            <div key={m.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-4">
               <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center">
                        {m.image ? (
                          <Image
                            src={m.image}
                            alt={m.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-stone-300" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-black text-stone-800">
                          {m.name}
                        </span>

                        <button
                          onClick={() => openEdit(m)}
                          className="ml-2 text-stone-400 hover:text-[#0E5C37]"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <span className="text-[18px] font-bold text-stone-400 uppercase">Cost: {formatPrice(Number(m.cost_per_unit))}</span>
               </div>
               
               <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase">Input Stok Baru</label>
                    <input
                      type="number"
                      defaultValue={stock}
                      onBlur={(e) =>
                        handleStockTextChange(
                          m.id,
                          e.target.value
                        )
                      }
                      className="w-full bg-stone-50 p-2 rounded-lg border border-stone-200 text-sm font-bold"
                    />
                  </div>
                  <div className="text-right">
                    <label className="text-[9px] font-bold text-stone-400 uppercase block">Total</label>
                    <span className="text-sm font-black text-[#0E5C37]">{stock} {m.unit}</span>
                    {stock <= Number(m.low_stock_threshold) && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </div>
                    )}
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl">
              <div className="flex justify-between mb-6">
                <h3 className="text-lg font-black">{editingMaterial ? 'Edit Bahan' : 'Tambah Bahan'}</h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setPreviewImage('');
                  }}
                ><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Nama Bahan</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder='Cth: Beras' className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Gambar Bahan
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;

                      setFormData({
                        ...formData,
                        image: file,
                      });

                      if (file) {
                        setPreviewImage(
                          URL.createObjectURL(file)
                        );
                      }
                    }}
                    className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-[#0E5C37] file:text-white"
                  />
                  {previewImage && (
                    <Image
                      src={previewImage}
                      alt="Preview"
                      width={96}
                      height={96}
                      unoptimized
                      className="w-24 h-24 mt-3 rounded-xl object-cover border border-stone-200"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Unit
                  </label>

                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#0E5C37]"
                  >
                    <option value="" disabled>
                      Pilih Unit
                    </option>

                    {/* Berat */}
                    <optgroup label="Berat">
                      <option value="MG">Milligram (MG)</option>
                      <option value="G">Gram (G)</option>
                      <option value="KG">Kilogram (KG)</option>
                    </optgroup>

                    {/* Volume */}
                    <optgroup label="Volume">
                      <option value="ML">Mililiter (ML)</option>
                      <option value="L">Liter (L)</option>
                      <option value="CC">Cubic Centimeter (CC)</option>
                    </optgroup>

                    {/* Satuan */}
                    <optgroup label="Satuan">
                      <option value="PCS">Pieces (PCS)</option>
                      <option value="UNIT">Unit</option>
                      <option value="ITEM">Item</option>
                      <option value="PAIR">Pair</option>
                      <option value="SET">Set</option>
                    </optgroup>

                    {/* Packaging */}
                    <optgroup label="Packaging">
                      <option value="PACK">Pack</option>
                      <option value="BOX">Box</option>
                      <option value="CARTON">Carton</option>
                      <option value="SACHET">Sachet</option>
                      <option value="BOTTLE">Bottle</option>
                      <option value="CAN">Can</option>
                      <option value="BAG">Bag</option>
                      <option value="TRAY">Tray</option>
                    </optgroup>

                    {/* Kitchen / Recipe */}
                    <optgroup label="Kitchen / Recipe">
                      <option value="SHOT">Shot</option>
                      <option value="SCOOP">Scoop</option>
                      <option value="SLICE">Slice</option>
                      <option value="TBSP">Tablespoon (TBSP)</option>
                      <option value="TSP">Teaspoon (TSP)</option>
                      <option value="PINCH">Pinch</option>
                    </optgroup>

                    {/* Serving */}
                    <optgroup label="Serving">
                      <option value="CUP">Cup</option>
                      <option value="GLASS">Glass</option>
                      <option value="PLATE">Plate</option>
                      <option value="BOWL">Bowl</option>
                      <option value="PORTION">Portion</option>
                      <option value="SERVING">Serving</option>
                      <option value="PAX">Pax</option>
                    </optgroup>

                    {/* Produksi */}
                    <optgroup label="Produksi">
                      <option value="BATCH">Batch</option>
                      <option value="DOUGH">Dough</option>
                      <option value="CONTAINER">Container</option>
                      <option value="TUB">Tub</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">
                    Stok Awal
                  </label>

                  <input
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initialStock: Number(e.target.value),
                      })
                    }
                    className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#0E5C37]"
                  />
                </div>
              </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Batas Minimum</label>
                    <input type="number" value={formData.threshold} onChange={e => setFormData({...formData, threshold: Number(e.target.value)})} className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Biaya per Unit</label>
                    <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-sm" />
                  </div>
                </div>
                <button onClick={handleSubmit} className="w-full bg-[#0E5C37] text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2">
                   <Save className="w-4 h-4" /> Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}