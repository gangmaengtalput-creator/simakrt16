import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function PengeluaranKasView({ 
  setActiveView, 
  listRiwayatPengeluaran, 
  fetchRiwayatPengeluaran 
}) {
  const supabase = getSupabaseClient();
  const namaBulanSekarang = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const tahunSekarang = new Date().getFullYear();

  // ==========================================
  // STATE LOKAL KHUSUS PENGELUARAN
  // ==========================================
  const [filterBulanKeluar, setFilterBulanKeluar] = useState(namaBulanSekarang);
  const [filterTahunKeluar, setFilterTahunKeluar] = useState(tahunSekarang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [fotoBukti, setFotoBukti] = useState([]); 
  const [pengeluaranData, setPengeluaranData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nominal: '', kategori: '', penerima: '', keterangan: ''
  });

  // ==========================================
  // STATE MODAL GLOBAL PROFESIONAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'warning', 'info', 'confirm'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const showModal = (config) => setAlertModal({ ...alertModal, ...config, isOpen: true });
  
  const closeModal = () => setAlertModal({ ...alertModal, isOpen: false });

  const handleConfirm = () => {
    if (alertModal.onConfirm) alertModal.onConfirm();
    if (alertModal.type !== 'confirm') closeModal(); // Tutup otomatis jika bukan confirm
  };

  // --- Agar data langsung tampil saat menu dibuka ---
  useEffect(() => {
    fetchRiwayatPengeluaran();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // FUNGSI KOMPRES GAMBAR
  // ==========================================
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.8;
          const compress = () => {
            canvas.toBlob((blob) => {
              if (blob.size / 1024 > 100 && quality > 0.1) { quality -= 0.1; compress(); } 
              else { resolve(new File([blob], file.name, { type: 'image/jpeg' })); }
            }, 'image/jpeg', quality);
          };
          compress();
        };
      };
    });
  };

  const handleFotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsCompressing(true);
    try {
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const compressedFile = await compressImage(file); 
          return Object.assign(compressedFile, { preview: URL.createObjectURL(compressedFile) });
        })
      );
      setFotoBukti((prev) => [...prev, ...processedFiles]);
    } catch (error) {
      showModal({ type: 'error', title: 'Gagal Memproses', message: 'Gagal memproses gambar bukti pengeluaran.', confirmText: 'Tutup' });
    } finally {
      setIsCompressing(false);
    }
  };

  const hapusFotoPreview = (index) => {
    setFotoBukti((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // FUNGSI CRUD
  // ==========================================
  const submitPengeluaran = async (e) => {
    e.preventDefault();
    if (fotoBukti.length === 0) {
      return showModal({ type: 'warning', title: 'Bukti Diperlukan', message: 'Wajib melampirkan minimal 1 foto bukti fisik pengeluaran untuk transparansi kas!', confirmText: 'Mengerti' });
    }
    
    setIsProcessing(true);
    try {
      const fotoUrls = [];
      for (const file of fotoBukti) {
        const fileName = `bukti_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('bukti_pengeluaran').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('bukti_pengeluaran').getPublicUrl(fileName);
        fotoUrls.push(publicUrlData.publicUrl);
      }
      
      const { error: dbError } = await supabase.from('pengeluaran_kas').insert([{
        tanggal: pengeluaranData.tanggal,
        nominal: parseInt(pengeluaranData.nominal),
        kategori: pengeluaranData.kategori,
        penerima: pengeluaranData.penerima,
        keterangan: pengeluaranData.keterangan,
        foto_bukti: fotoUrls
      }]);
      
      if (dbError) throw dbError;
      
      showModal({ type: 'success', title: 'Berhasil Dicatat', message: 'Data pengeluaran berhasil dicatat ke dalam buku kas RT.', confirmText: 'Tutup' });
      setPengeluaranData({ tanggal: new Date().toISOString().split('T')[0], nominal: '', kategori: '', penerima: '', keterangan: '' });
      setFotoBukti([]);
      fetchRiwayatPengeluaran(); 
    } catch (error) {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: `Terjadi kesalahan saat menyimpan data: ${error.message}`, confirmText: 'Tutup' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHapusPengeluaran = (id) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Data Pengeluaran?',
      message: 'Apakah Anda yakin ingin menghapus data pengeluaran ini secara permanen? Data ini penting untuk pelaporan kas.',
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
      onConfirm: async () => {
        closeModal();
        setIsProcessing(true);
        try {
          const { error } = await supabase.from('pengeluaran_kas').delete().eq('id', id);
          if (error) throw error;
          fetchRiwayatPengeluaran(); 
          showModal({ type: 'success', title: 'Data Dihapus', message: 'Data riwayat pengeluaran berhasil dihapus.', confirmText: 'OK' });
        } catch (error) {
          showModal({ type: 'error', title: 'Gagal Menghapus', message: `Terjadi kesalahan: ${error.message}`, confirmText: 'Tutup' });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const filteredRiwayat = listRiwayatPengeluaran.filter(item => {
    const itemDate = new Date(item.tanggal);
    const itemMonth = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(itemDate);
    const itemYear = itemDate.getFullYear();
    return itemMonth === filterBulanKeluar && itemYear === filterTahunKeluar;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden relative">
      
      {/* HEADER ACTION */}
      <div className="flex justify-start">
        <button onClick={() => setActiveView('menu')} className="text-sm text-red-700 font-bold hover:underline bg-red-50 hover:bg-red-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM INPUT PENGELUARAN */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 h-fit sticky top-4">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            </div>
            <h2 className="text-lg font-black text-gray-800 tracking-tight">Catat Pengeluaran</h2>
          </div>

          <form onSubmit={submitPengeluaran} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal Keluar</label>
              <input type="date" required value={pengeluaranData.tanggal} onChange={(e) => setPengeluaranData({...pengeluaranData, tanggal: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nominal (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-gray-500 font-bold text-sm">Rp</span>
                <input type="number" required value={pengeluaranData.nominal} onChange={(e) => setPengeluaranData({...pengeluaranData, nominal: e.target.value})} className="w-full border border-gray-200 pl-10 pr-3 py-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-bold text-gray-800" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kategori</label>
              <select required value={pengeluaranData.kategori} onChange={(e) => setPengeluaranData({...pengeluaranData, kategori: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-medium">
                <option value="">-- Pilih Kategori --</option>
                <option value="Operasional RT">Operasional RT (Rapat, ATK)</option>
                <option value="Pembangunan/Infrastruktur">Pembangunan / Perbaikan</option>
                <option value="Kegiatan Sosial/Warga">Kegiatan Sosial Warga</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Penerima Dana</label>
              <input type="text" required value={pengeluaranData.penerima} onChange={(e) => setPengeluaranData({...pengeluaranData, penerima: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-medium" placeholder="Nama toko / orang..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Keterangan / Rincian</label>
              <textarea rows="2" required value={pengeluaranData.keterangan} onChange={(e) => setPengeluaranData({...pengeluaranData, keterangan: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-medium" placeholder="Contoh: Beli cat dinding gapura..."></textarea>
            </div>
            
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Upload Bukti (Nota/Kwitansi) <span className="text-red-500">*</span>
              </label>
              <input type="file" multiple accept="image/*" onChange={handleFotoChange} className="w-full text-xs text-red-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-100 file:text-red-700 hover:file:bg-red-200 transition-all cursor-pointer" disabled={isCompressing || isProcessing} />
              
              {fotoBukti.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {fotoBukti.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img src={foto.preview} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-red-200 shadow-sm transition-transform group-hover:scale-105" />
                      <button type="button" onClick={() => hapusFotoPreview(index)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-700 transition-colors border-2 border-white">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isProcessing || isCompressing} className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 mt-2 flex justify-center items-center gap-2">
              {isCompressing ? <span className="animate-pulse">Mengompres Foto...</span> : isProcessing ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </form>
        </div>

        {/* TABEL DAFTAR PENGELUARAN */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden flex flex-col h-fit">
          
          <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h2 className="text-lg font-black text-white tracking-wide">Daftar Riwayat Pengeluaran</h2>
            </div>
            
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20 backdrop-blur-sm">
              <select value={filterBulanKeluar} onChange={(e) => setFilterBulanKeluar(e.target.value)} className="bg-transparent border-none py-1 pl-2 pr-6 text-xs font-bold text-white focus:ring-0 cursor-pointer outline-none appearance-none">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b} className="text-gray-800">{b}</option>)}
              </select>
              <span className="text-red-300">|</span>
              <select value={filterTahunKeluar} onChange={(e) => setFilterTahunKeluar(Number(e.target.value))} className="bg-transparent border-none py-1 pl-2 pr-6 text-xs font-bold text-white focus:ring-0 cursor-pointer outline-none appearance-none">
                {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t} className="text-gray-800">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4 font-bold">Tanggal</th>
                  <th className="py-3 px-4 font-bold">Detail Pengeluaran</th>
                  <th className="py-3 px-4 font-bold text-right">Nominal</th>
                  <th className="py-3 px-4 font-bold text-center">Bukti Nota</th>
                  <th className="py-3 px-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRiwayat.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-red-50/40 transition-colors group">
                    <td className="py-4 px-4 whitespace-nowrap text-gray-500 font-medium">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded uppercase tracking-wider">{item.kategori}</span>
                      <p className="font-bold text-gray-800 mt-2 text-sm">{item.penerima}</p>
                      <p className="text-gray-500 text-xs italic mt-0.5 w-64 whitespace-normal leading-relaxed">{item.keterangan}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 whitespace-nowrap">
                        Rp {item.nominal.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex gap-1.5 justify-center flex-wrap max-w-[100px] mx-auto">
                        {item.foto_bukti && item.foto_bukti.map((foto, i) => (
                          <a key={i} href={foto} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-white text-gray-600 px-2 py-1 rounded border border-gray-200 font-bold hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                            File {i+1}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => handleHapusPengeluaran(item.id)}
                        disabled={isProcessing}
                        className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm disabled:opacity-50"
                        title="Hapus Data Pengeluaran"
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRiwayat.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <p className="text-gray-500 font-bold">Tidak ada pengeluaran di periode ini.</p>
                      <p className="text-xs text-gray-400 mt-1">Laporan keuangan Anda aman.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER (Nuansa Merah dominan sesuai konteks) */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                (alertModal.type === 'error' || alertModal.type === 'confirm') ? 'bg-red-50 text-red-500 shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {(alertModal.type === 'error' || alertModal.type === 'confirm') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    (alertModal.type === 'error' || alertModal.type === 'confirm') ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                    alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                    alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : alertModal.confirmText}
                </button>
                
                {alertModal.type === 'confirm' && (
                  <button
                    onClick={closeModal}
                    disabled={isProcessing}
                    className="w-full py-4 px-6 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50"
                  >
                    {alertModal.cancelText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}