"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Trash2, Shield, UserCog, User, Save, Loader2, X, QrCode, Download, Mail
} from 'lucide-react';
import { Toast } from '@/utils/toast';
import { QRCodeCanvas } from 'qrcode.react'; 

export type Role = 'Owner' | 'Cashier' | 'Kitchen' | 'User';

export interface StaffData {
  id: number;
  name: string;
  email: string;
  token: string; 
  role: Role;
  defaultPassword?: string;
}

export default function StaffManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQR, setSelectedQR] = useState<StaffData | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Cashier' as Role
  });

  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── FETCH DATA STAF DARI API ───
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pos/staff');
      const result = await res.json();
      if (result.success) {
        setStaffList(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
  }, []);

  // ─── HELPER FUNCTIONS ───
  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'Owner': return 'Owner (Full Akses)';
      case 'Cashier': return 'Cashier (Akses POS)';
      case 'Kitchen': return 'Kitchen (Akses KDS)';
      case 'User': return 'User Biasa';
      default: return 'Staff';
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Owner': return 'bg-[#0E5C37]/10 text-[#0E5C37] border-[#0E5C37]/20';
      case 'Cashier': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Kitchen': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'User': return 'bg-stone-50 text-stone-600 border-stone-200';
      default: return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  const handleDownloadQR = () => {
    if (!selectedQR) return;
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Login_${selectedQR.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      Toast.fire({ icon: 'success', title: 'QR Code berhasil diunduh!' });
    }
  };

  // ─── ACTIONS ───
  const handleAddStaff = async () => {
    if (!formData.name || !formData.email) {
      Toast.fire({ icon: 'warning', title: 'Nama dan Email wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pos/staff', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData) 
      });
      const result = await res.json();

      if (result.success) {
        Toast.fire({ icon: 'success', title: result.message });
        
        // Buat objek untuk pop-up QR Code
        const newStaff: StaffData = {
          id: Date.now(), 
          name: result.data.name,
          email: result.data.email,
          token: result.data.token, 
          role: result.data.role,
          defaultPassword: result.data.defaultPassword // Ditampilkan di modal
        };
        
        setIsFormOpen(false);
        setFormData({ name: '', email: '', role: 'Cashier' }); 
        fetchStaff(); 
        setSelectedQR(newStaff); 
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Gagal menambahkan staf' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/pos/staff?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        Toast.fire({ icon: 'success', title: 'Akses karyawan dicabut!' });
        fetchStaff();
      } else {
        Toast.fire({ icon: 'error', title: result.message });
      }
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Terjadi kesalahan sistem' });
    }
  };

  return (
    <div className="w-full space-y-6 relative">
      
      {/* ─── MODAL QR CODE ─── */}
      <AnimatePresence>
        {selectedQR && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0E5C37] flex items-center justify-center mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-800 tracking-tight">{selectedQR.name}</h3>
              <span className={`mt-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getRoleColor(selectedQR.role)}`}>
                {getRoleLabel(selectedQR.role)}
              </span>

              <div className="mt-6 mb-2 p-4 bg-white border-2 border-dashed border-stone-200 rounded-2xl inline-block">
                <QRCodeCanvas 
                  id="qr-code-canvas"
                  value={selectedQR.token} 
                  size={200}
                  level="Q"
                  includeMargin={true}
                />
              </div>

              {/* 🔴 Helper Info Akun */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 w-full mb-5 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Email Login</p>
                </div>
                <p className="text-sm font-semibold text-stone-800 break-all">{selectedQR.email}</p>
                
                {selectedQR.defaultPassword && (
                  <div className="mt-2 pt-2 border-t border-stone-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-0.5">Password Default</p>
                    <p className="text-sm font-mono font-bold text-[#0E5C37]">{selectedQR.defaultPassword}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleDownloadQR}
                className="w-full py-3.5 rounded-xl bg-[#0E5C37] text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10"
              >
                <Download className="w-4 h-4" /> Unduh QR Code
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Pengaturan Akses</p>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">Manajemen Karyawan</h2>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm ${
            isFormOpen 
              ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' 
              : 'bg-[#0E5C37] text-white hover:bg-emerald-800'
          }`}
        >
          {isFormOpen ? (
            <><X className="w-4 h-4" /> Batal</>
          ) : (
            <><Plus className="w-4 h-4" /> Tambah Staf</>
          )}
        </button>
      </div>

      {/* ─── FORM TAMBAH STAF ─── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-6 mb-2">
              <h3 className="text-sm font-black text-stone-800 mb-5 border-b border-stone-100 pb-3">Informasi Karyawan Baru</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">Nama Karyawan</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Cth: Budi"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all"
                    />
                  </div>
                </div>

                {/* 🔴 Input Email Baru */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">Email Login</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="email" 
                      placeholder="Cth: budi@evognito.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">Peran / Akses</label>
                  <div className="relative">
                    <Shield className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <select
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as Role})}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none appearance-none focus:border-[#0E5C37] focus:ring-1 focus:ring-[#0E5C37] transition-all"
                    >
                      <option value="Owner">Owner (Full Akses)</option>
                      <option value="Cashier">Cashier (Akses POS)</option>
                      <option value="Kitchen">Kitchen (Akses Dapur KDS)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleAddStaff}
                  disabled={isSubmitting}
                  className="px-6 py-3.5 rounded-xl bg-[#0E5C37] text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-900/10"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                  Simpan & Buat QR
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TABEL KARYAWAN ─── */}
      <div className="bg-white rounded-[1.5rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Karyawan</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Peran & Akses</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center">Akses Login POS</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0E5C37] mx-auto" />
                  </td>
                </tr>
              ) : staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-stone-50/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                        <UserCog className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-stone-800">{staff.name}</span>
                        {/* 🔴 Tampilkan Email di bawah nama */}
                        <span className="text-[10px] text-stone-400 font-medium">{staff.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${getRoleColor(staff.role)}`}>
                      {getRoleLabel(staff.role)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setSelectedQR(staff)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-[#0E5C37] hover:text-white transition-colors border border-stone-200 hover:border-[#0E5C37] text-[10px] font-bold uppercase tracking-widest"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Lihat QR
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(staff.id)}
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cabut Akses Karyawan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && staffList.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-400 text-sm font-medium">
                    Belum ada data staf yang terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}