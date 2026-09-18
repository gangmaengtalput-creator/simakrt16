import React, { useState, useRef } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function UsulanWargaView({ 
  wargaAktif, 
  listUsulan, 
  fetchDataWarga, 
  setActiveTab 
}) {
  const supabase = getSupabaseClient();
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [fotosPreview, setFotosPreview] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, data: null });
  
  const [formUsulan, setFormUsulan] = useState({ 
    nama_usulan: '', 
    jenis_usulan: 'Pembangunan', 
    keterangan: '',
    panjang: '', lebar: '', tinggi: '', estimasi_harga: '' 
  });

  const luasOtomatis = (formUsulan.panjang && formUsulan.lebar) ? (parseFloat(formUsulan.panjang) * parseFloat(formUsulan.lebar)) : 0;
  const luasOtomatisEdit = (editModal.data?.panjang && editModal.data?.lebar) ? (parseFloat(editModal.data.panjang) * parseFloat(editModal.data.lebar)) : 0;

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
    if (alertModal.type !== 'confirm') closeModal(); 
  };

  // ==========================================
  // LOGIKA FOTO & KOMPRESI
  // ==========================================
  const handleFotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setFotos(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setFotosPreview(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFoto = (index) => {
    const newFotos = [...fotos]; newFotos.splice(index, 1); setFotos(newFotos);
    const newPreviews = [...fotosPreview]; newPreviews.splice(index, 1); setFotosPreview(newPreviews);
  };

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

  // ==========================================
  // CRUD USULAN DENGAN CUSTOM MODAL
  // ==========================================
  const submitUsulan = async (e) => {
    e.preventDefault();
    if (fotos.length === 0) {
      return showModal({ type: 'warning', title: 'Foto Diperlukan', message: 'Wajib melampirkan minimal 1 foto dokumentasi lokasi untuk mendukung usulan Anda.', confirmText: 'Mengerti' });
    }
    
    setIsProcessing(true);

    try {
      const uploadedUrls = [];
      for (const file of fotos) {
        const compressed = await compressImage(file);
        const fileName = `usulan_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const { error: uploadError } = await supabase.storage.from('usulan').upload(fileName, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('usulan').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('usulan_warga').insert([{
        nik_pengusul: wargaAktif.nik,
        nama_pengusul: wargaAktif.nama,
        nama_usulan: formUsulan.nama_usulan, 
        jenis_usulan: formUsulan.jenis_usulan,
        keterangan: formUsulan.keterangan,
        foto_usulan: uploadedUrls,
        panjang: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.panjang) : null,
        lebar: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.lebar) : null,
        tinggi: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.tinggi) : null,
        luas: formUsulan.jenis_usulan === 'Pembangunan' ? luasOtomatis : null,
        estimasi_harga: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.estimasi_harga) : null
      }]);

      if (error) throw error;
      
      setFotos([]); setFotosPreview([]);
      setFormUsulan({ nama_usulan: '', jenis_usulan: 'Pembangunan', keterangan: '', panjang: '', lebar: '', tinggi: '', estimasi_harga: '' });
      fetchDataWarga(wargaAktif.nik);
      
      showModal({ type: 'success', title: 'Usulan Terkirim!', message: 'Aspirasi / Usulan Anda berhasil dikirim ke Ketua RT untuk ditinjau.', confirmText: 'Tutup' });
    } catch (err) {
      showModal({ type: 'error', title: 'Gagal Mengirim', message: `Terjadi kesalahan saat mengirim usulan: ${err.message}`, confirmText: 'Tutup' });
    } finally {
      setIsProcessing(false);
    }
  };

  const hapusUsulan = (id) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Usulan?',
      message: 'Apakah Anda yakin ingin membatalkan dan menghapus usulan ini secara permanen?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        closeModal();
        setIsProcessing(true);
        const { error } = await supabase.from('usulan_warga').delete().eq('id', id);
        setIsProcessing(false);
        
        if (!error) {
          fetchDataWarga(wargaAktif.nik);
          showModal({ type: 'success', title: 'Usulan Dihapus', message: 'Data usulan berhasil dibatalkan dan dihapus.', confirmText: 'OK' });
        } else {
          showModal({ type: 'error', title: 'Gagal Menghapus', message: `Terjadi kesalahan: ${error.message}`, confirmText: 'Tutup' });
        }
      }
    });
  };

  const simpanEditUsulan = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const payload = {
      nama_usulan: editModal.data.nama_usulan,
      jenis_usulan: editModal.data.jenis_usulan,
      keterangan: editModal.data.keterangan,
      panjang: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.panjang) : null,
      lebar: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.lebar) : null,
      tinggi: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.tinggi) : null,
      luas: editModal.data.jenis_usulan === 'Pembangunan' ? luasOtomatisEdit : null,
      estimasi_harga: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.estimasi_harga) : null
    };

    const { error } = await supabase.from('usulan_warga').update(payload).eq('id', editModal.data.id);
    setIsProcessing(false);
    
    if (!error) {
      setEditModal({ open: false, data: null });
      fetchDataWarga(wargaAktif.nik);
      showModal({ type: 'success', title: 'Berhasil Diperbarui', message: 'Perubahan pada usulan Anda telah berhasil disimpan.', confirmText: 'Tutup' });
    } else {
      showModal({ type: 'error', title: 'Gagal Memperbarui', message: `Terjadi kesalahan saat mengupdate usulan: ${error.message}`, confirmText: 'Tutup' });
    }
  };

  const parseFotoUsulan = (fotoData) => {
    if (!fotoData) return [];
    if (Array.isArray(fotoData)) return fotoData;
    try {
      const parsed = JSON.parse(fotoData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return typeof fotoData === 'string' ? [fotoData] : [];
    }
  };

  // ==========================================
  // TAMPILAN UI
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto space-y-8 print:hidden relative">
      
      {/* FORM USULAN BARU */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 relative overflow-hidden">
        {/* Dekorasi Latar Belakang */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-50 rounded-bl-full opacity-60 pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4 relative z-10">
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Sampaikan Usulan / Aspirasi</h2>
        </div>

        <form onSubmit={submitUsulan} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nama / Judul Usulan <span className="text-red-500">*</span></label>
            <input required type="text" value={formUsulan.nama_usulan} onChange={(e) => setFormUsulan({...formUsulan, nama_usulan: e.target.value})} placeholder="Contoh: Perbaikan Jalan Berlubang di Blok A" className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-green-500 font-medium bg-gray-50 focus:bg-white transition-all outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Kategori Usulan <span className="text-red-500">*</span></label>
            <select value={formUsulan.jenis_usulan} onChange={(e) => setFormUsulan({...formUsulan, jenis_usulan: e.target.value})} className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 font-medium transition-all outline-none">
              <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
              <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {formUsulan.jenis_usulan === 'Pembangunan' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-green-50/50 p-5 rounded-2xl border border-green-100 animate-in fade-in duration-300">
              <div className="sm:col-span-4"><h3 className="font-bold text-green-800 text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Rincian Dimensi Bangunan (Wajib)</h3></div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase">Panjang (m)</label><input type="number" step="0.01" required value={formUsulan.panjang} onChange={e=>setFormUsulan({...formUsulan, panjang: e.target.value})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" /></div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase">Lebar (m)</label><input type="number" step="0.01" required value={formUsulan.lebar} onChange={e=>setFormUsulan({...formUsulan, lebar: e.target.value})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" /></div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase">Tinggi (m)</label><input type="number" step="0.01" required value={formUsulan.tinggi} onChange={e=>setFormUsulan({...formUsulan, tinggi: e.target.value})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none" /></div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase">Luas Area</label><div className="w-full bg-gray-200/70 border border-gray-200 p-2.5 rounded-lg mt-1 font-mono text-center font-bold text-gray-700">{luasOtomatis} m²</div></div>
              <div className="sm:col-span-4"><label className="text-[11px] font-bold text-gray-500 uppercase">Estimasi Kebutuhan Dana (Rp)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-bold text-sm">Rp</span>
                  <input type="number" required value={formUsulan.estimasi_harga} onChange={e=>setFormUsulan({...formUsulan, estimasi_harga: e.target.value})} className="w-full border border-gray-200 pl-10 pr-3 py-2.5 rounded-lg font-mono focus:ring-2 focus:ring-green-500 outline-none" placeholder="Contoh: 5000000" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Penjelasan / Latar Belakang Usulan <span className="text-red-500">*</span></label>
            <textarea required rows="4" value={formUsulan.keterangan} onChange={e=>setFormUsulan({...formUsulan, keterangan: e.target.value})} className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 font-medium transition-all outline-none" placeholder="Mengapa hal ini sangat dibutuhkan warga? Berikan alasan rinci..."></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
              Dokumentasi Foto Lokasi <span className="text-red-500">*</span>
            </label>
            <input type="file" multiple accept="image/*" onChange={handleFotoChange} ref={fileInputRef} className="hidden" />
            
            {fotosPreview.length === 0 ? (
              <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-green-300 bg-green-50/50 hover:bg-green-100 rounded-2xl p-8 text-center cursor-pointer transition-colors group">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📸</span>
                </div>
                <p className="font-bold text-green-800 text-sm">Klik di sini untuk upload foto bukti</p>
                <p className="text-xs text-gray-500 mt-1">Otomatis dikompres &lt;100KB per foto untuk menghemat kuota.</p>
              </div>
            ) : (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <div className="flex flex-wrap gap-4">
                  {fotosPreview.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shadow-sm border border-gray-300" alt={`Preview ${idx}`} />
                      <button type="button" onClick={() => removeFoto(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-transform hover:scale-110">&times;</button>
                    </div>
                  ))}
                  <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center border-2 border-dashed border-green-400 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
                    <span className="text-3xl text-green-500 font-light">+</span>
                    <span className="text-[10px] font-bold text-green-700 mt-1">Tambah Foto</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
              {isProcessing ? 'Mengirim Data...' : 'Kirim Usulan ke RT'}
            </button>
          </div>
        </form>
      </div>

      {/* DAFTAR RIWAYAT USULAN */}
      <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h3 className="font-black text-white text-lg tracking-wide">Riwayat Usulan & Pantauan Saya</h3>
            <p className="text-gray-300 text-xs font-medium mt-0.5">Lihat proses tindak lanjut dari usulan yang pernah Anda buat.</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 bg-gray-50/30">
          {listUsulan.map(usulan => {
            const fotoArrayParsed = parseFotoUsulan(usulan.foto_usulan);
            const isMenunggu = usulan.status === 'Menunggu Tinjauan RT';

            return (
            <div key={usulan.id} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 border-l-[6px] border-l-green-500 flex flex-col lg:flex-row gap-6 relative hover:shadow-md transition-shadow">
              
              {isMenunggu && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button onClick={() => setEditModal({ open: true, data: { ...usulan } })} className="bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 border border-amber-100 hover:border-transparent flex items-center gap-1">✎ Edit</button>
                  <button onClick={() => hapusUsulan(usulan.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 border border-red-100 hover:border-transparent flex items-center gap-1">🗑 Hapus</button>
                </div>
              )}

              <div className="flex-1 space-y-3 mt-8 lg:mt-0">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 pr-20">
                  <div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">{new Date(usulan.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
                    <h3 className="text-xl font-black text-gray-800 mt-2 leading-tight">{usulan.nama_usulan || usulan.jenis_usulan}</h3>
                    <p className="text-xs text-green-600 font-bold mt-1">Kategori: {usulan.jenis_usulan}</p>
                  </div>
                </div>
                
                <div className="py-1">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    usulan.status === 'Telah Ditindaklanjuti' ? 'bg-green-50 text-green-700 border-green-200' : 
                    usulan.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' : 
                    'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  }`}>
                    Status: {usulan.status}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{usulan.keterangan}</p>
                
                {usulan.jenis_usulan === 'Pembangunan' && (
                  <div className="text-xs bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-gray-700 mt-3 shadow-inner">
                    <span className="text-green-700 font-bold">Est. Harga:</span> <strong>Rp {Number(usulan.estimasi_harga).toLocaleString('id-ID')}</strong><br/>
                    <span className="text-blue-700 font-bold">Dimensi:</span> {usulan.panjang}m x {usulan.lebar}m x {usulan.tinggi}m | <span className="text-purple-700 font-bold">Luas:</span> {usulan.luas}m²
                  </div>
                )}
                
                {usulan.catatan_rt && ( 
                  <div className="text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-blue-800 mt-4 relative">
                    <span className="absolute -top-2.5 left-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">Komentar / Respon RT</span>
                    <p className="font-medium mt-1 leading-relaxed">"{usulan.catatan_rt}"</p>
                  </div> 
                )}
              </div>

              {/* FOTO & LAMPIRAN */}
              <div className="w-full lg:w-72 shrink-0 space-y-5 lg:border-l lg:pl-6 border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Lampiran Anda
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
                    {fotoArrayParsed.length > 0 ? fotoArrayParsed.map((foto, idx) => (
                      <div key={idx} className="shrink-0 snap-center relative group flex flex-col items-center">
                         <a href={foto} target="_blank" rel="noreferrer" className="block relative overflow-hidden rounded-xl shadow-sm border border-gray-200">
                           <img src={foto} onError={(e)=>{e.target.src="https://via.placeholder.com/150?text=Akses+Ditolak"}} className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-110 transition-transform duration-300" alt={`Usulan ${idx+1}`} />
                         </a>
                      </div>
                    )) : <span className="text-xs text-gray-400 font-medium">Tidak ada foto</span>}
                  </div>
                </div>

                {usulan.foto_tindak_lanjut && (
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2 border-b border-green-100 pb-1.5 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Hasil Tindak Lanjut RT
                    </p>
                    <a href={usulan.foto_tindak_lanjut} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl shadow-md border-2 border-green-300">
                      <img src={usulan.foto_tindak_lanjut} onError={(e)=>{e.target.src="https://via.placeholder.com/300?text=Akses+Ditolak"}} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300" alt="Tindak Lanjut" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Lihat Penuh</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )})}
          {listUsulan.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <span className="text-2xl opacity-50">📂</span>
              </div>
              <p className="text-gray-500 font-bold text-base">Belum ada usulan.</p>
              <p className="text-xs text-gray-400 mt-1">Anda belum pernah membuat usulan warga.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL EDIT USULAN (KUSTOMIZED UI)            */}
      {/* ========================================== */}
      {editModal.open && editModal.data && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <form onSubmit={simpanEditUsulan} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></div>
                <h2 className="text-xl font-black">Edit Usulan Anda</h2>
              </div>
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-7 overflow-y-auto space-y-5 bg-gray-50/50">
              <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 border border-amber-200 flex items-start gap-2 shadow-sm">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p><strong>Penting:</strong> Foto lampiran tidak dapat diubah setelah diunggah. Jika foto keliru, harap <strong>Hapus</strong> usulan ini sepenuhnya dan buat pengajuan yang baru.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nama / Judul Usulan:</label>
                <input required type="text" value={editModal.data.nama_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, nama_usulan: e.target.value}})} className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium outline-none transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Kategori Usulan:</label>
                <select value={editModal.data.jenis_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, jenis_usulan: e.target.value}})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-amber-500 font-medium outline-none transition-all">
                  <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
                  <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {editModal.data.jenis_usulan === 'Pembangunan' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Panjang (m)</label><input type="number" step="0.01" required value={editModal.data.panjang || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, panjang: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Lebar (m)</label><input type="number" step="0.01" required value={editModal.data.lebar || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, lebar: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Tinggi (m)</label><input type="number" step="0.01" required value={editModal.data.tinggi || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, tinggi: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Luas Area</label><div className="w-full bg-gray-100 border border-gray-200 p-2.5 rounded-lg mt-1 font-mono text-center font-bold text-gray-600">{luasOtomatisEdit} m²</div></div>
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Estimasi Dana (Rp)</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-500 font-bold text-sm">Rp</span>
                      <input type="number" required value={editModal.data.estimasi_harga || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, estimasi_harga: e.target.value}})} className="w-full border border-gray-200 pl-10 pr-3 py-2.5 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Penjelasan / Keterangan:</label>
                <textarea required rows="4" value={editModal.data.keterangan} onChange={e=>setEditModal({...editModal, data:{...editModal.data, keterangan: e.target.value}})} className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"></textarea>
              </div>
            </div>
            
            <div className="p-5 border-t bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="w-full sm:w-auto px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors active:scale-95 text-sm">Batal</button>
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-colors active:scale-95 text-sm flex justify-center items-center gap-2">
                {isProcessing && <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {(alertModal.type === 'info' || alertModal.type === 'confirm') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Hapus')) ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
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

      {/* HIDE SCROLLBAR CSS UNTUK PREVIEW FOTO */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}