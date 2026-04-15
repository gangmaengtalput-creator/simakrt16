// File: src/components/DashboardWarga/UsulanWargaView.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function UsulanWargaView({ 
  wargaAktif, 
  listUsulan, 
  fetchDataWarga, 
  setActiveTab 
}) {
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
  // CRUD USULAN
  // ==========================================
  const submitUsulan = async (e) => {
    e.preventDefault();
    if (fotos.length === 0) return alert("Wajib melampirkan minimal 1 foto dokumentasi!");
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
      alert("Usulan berhasil dikirim ke RT!");
      setFotos([]); setFotosPreview([]);
      setFormUsulan({ nama_usulan: '', jenis_usulan: 'Pembangunan', keterangan: '', panjang: '', lebar: '', tinggi: '', estimasi_harga: '' });
      fetchDataWarga(wargaAktif.nik);
    } catch (err) {
      alert("Gagal mengirim usulan: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const hapusUsulan = async (id) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan dan menghapus usulan ini?")) return;
    setIsProcessing(true);
    const { error } = await supabase.from('usulan_warga').delete().eq('id', id);
    setIsProcessing(false);
    if (!error) fetchDataWarga(wargaAktif.nik);
    else alert("Gagal menghapus: " + error.message);
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
      alert("Usulan berhasil diperbarui!");
    } else alert("Gagal update: " + error.message);
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
    <div className="max-w-5xl mx-auto space-y-6 print:hidden">
      
      {/* FORM USULAN BARU */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Sampaikan Usulan / Aspirasi Warga</h2>
        <form onSubmit={submitUsulan} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nama / Judul Usulan:</label>
            <input required type="text" value={formUsulan.nama_usulan} onChange={(e) => setFormUsulan({...formUsulan, nama_usulan: e.target.value})} placeholder="Contoh: Perbaikan Jalan Berlubang di Blok A" className="w-full border p-3 rounded-lg focus:ring-green-500 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Kategori Usulan:</label>
            <select value={formUsulan.jenis_usulan} onChange={(e) => setFormUsulan({...formUsulan, jenis_usulan: e.target.value})} className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-green-500 font-medium">
              <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
              <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {formUsulan.jenis_usulan === 'Pembangunan' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="sm:col-span-4"><h3 className="font-bold text-green-800 text-sm">Rincian Dimensi Bangunan (Wajib)</h3></div>
              <div><label className="text-xs font-bold text-gray-600">Panjang (m)</label><input type="number" step="0.01" required value={formUsulan.panjang} onChange={e=>setFormUsulan({...formUsulan, panjang: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
              <div><label className="text-xs font-bold text-gray-600">Lebar (m)</label><input type="number" step="0.01" required value={formUsulan.lebar} onChange={e=>setFormUsulan({...formUsulan, lebar: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
              <div><label className="text-xs font-bold text-gray-600">Tinggi (m)</label><input type="number" step="0.01" required value={formUsulan.tinggi} onChange={e=>setFormUsulan({...formUsulan, tinggi: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
              <div><label className="text-xs font-bold text-gray-600">Luas (Otomatis)</label><div className="w-full bg-gray-200 border p-2 rounded mt-1 font-mono text-center">{luasOtomatis} m²</div></div>
              <div className="sm:col-span-4"><label className="text-xs font-bold text-gray-600">Estimasi Kebutuhan Dana (Rp)</label><input type="number" required value={formUsulan.estimasi_harga} onChange={e=>setFormUsulan({...formUsulan, estimasi_harga: e.target.value})} className="w-full border p-2 rounded mt-1 font-mono focus:ring-green-500" placeholder="Contoh: 5000000 (tanpa titik/koma)" /></div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Penjelasan / Latar Belakang Usulan:</label>
            <textarea required rows="4" value={formUsulan.keterangan} onChange={e=>setFormUsulan({...formUsulan, keterangan: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-green-500" placeholder="Mengapa hal ini sangat dibutuhkan warga? Berikan alasan rinci..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Dokumentasi Foto Lokasi <span className="text-red-500">*Wajib</span></label>
            <input type="file" multiple accept="image/*" onChange={handleFotoChange} ref={fileInputRef} className="hidden" />
            {fotosPreview.length === 0 ? (
              <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-green-300 bg-green-50 rounded-xl p-8 text-center cursor-pointer hover:bg-green-100 transition-colors">
                <div className="text-4xl mb-2">📸</div>
                <p className="font-bold text-green-800 text-sm sm:text-base">Klik di sini untuk upload foto</p>
                <p className="text-xs text-gray-500 mt-1">Otomatis dikompres &lt;100KB per foto.</p>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap gap-4">
                  {fotosPreview.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg shadow-sm border border-gray-300" alt={`Preview ${idx}`} />
                      <button type="button" onClick={() => removeFoto(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-transform hover:scale-110">&times;</button>
                    </div>
                  ))}
                  <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center border-2 border-dashed border-green-400 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                    <span className="text-3xl text-green-500 font-light">+</span>
                    <span className="text-[10px] font-bold text-green-700 mt-1">Tambah Foto</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="pt-4 border-t"><button type="submit" disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-lg hover:bg-green-700 shadow-lg text-lg transition-colors">{isProcessing ? 'Memproses...' : 'Kirim Usulan ke RT'}</button></div>
        </form>
      </div>

      {/* DAFTAR RIWAYAT USULAN */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-800 p-4"><h3 className="font-bold text-white">Riwayat Usulan & Pantauan Saya</h3></div>
        <div className="p-4 space-y-4">
          {listUsulan.map(usulan => {
            const fotoArrayParsed = parseFotoUsulan(usulan.foto_usulan);
            const isMenunggu = usulan.status === 'Menunggu Tinjauan RT';

            return (
            <div key={usulan.id} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-green-500 flex flex-col lg:flex-row gap-6 relative">
              
              {isMenunggu && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button onClick={() => setEditModal({ open: true, data: { ...usulan } })} className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors">✎ Edit</button>
                  <button onClick={() => hapusUsulan(usulan.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors">🗑 Hapus</button>
                </div>
              )}

              <div className="flex-1 space-y-3 mt-8 lg:mt-0">
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 pr-20">
                  <div>
                    <span className="text-xs bg-gray-200 text-gray-600 font-bold px-2 py-1 rounded">{new Date(usulan.created_at).toLocaleDateString('id-ID')}</span>
                    <h3 className="text-lg font-bold text-gray-800 mt-2">{usulan.nama_usulan || usulan.jenis_usulan}</h3>
                    <p className="text-xs text-green-700 font-bold mb-2">Kategori: {usulan.jenis_usulan}</p>
                  </div>
                </div>
                
                <span className={`inline-block text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-center ${usulan.status === 'Telah Ditindaklanjuti' ? 'bg-green-100 text-green-700' : usulan.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  Status: {usulan.status}
                </span>
                
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{usulan.keterangan}</p>
                
                {usulan.jenis_usulan === 'Pembangunan' && (
                  <div className="text-xs bg-gray-50 p-2 rounded border font-mono text-gray-600">
                    Est. Harga: <strong>Rp {Number(usulan.estimasi_harga).toLocaleString('id-ID')}</strong> | Dimensi: {usulan.panjang}m x {usulan.lebar}m x {usulan.tinggi}m | Luas: {usulan.luas}m²
                  </div>
                )}
                
                {usulan.catatan_rt && ( 
                  <div className="text-sm bg-blue-50 p-3 rounded border border-blue-100 text-blue-800 font-medium mt-2">
                    <strong>Komentar RT:</strong> {usulan.catatan_rt}
                  </div> 
                )}
              </div>

              <div className="w-full lg:w-72 shrink-0 space-y-4 lg:border-l lg:pl-6 border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b border-gray-200 pb-1">Lampiran Foto Warga</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                    {fotoArrayParsed.length > 0 ? fotoArrayParsed.map((foto, idx) => (
                      <div key={idx} className="shrink-0 snap-center relative group flex flex-col items-center">
                         <img 
                            src={foto} 
                            onError={(e)=>{e.target.src="https://via.placeholder.com/150?text=Akses+Ditolak"}} 
                            className="w-16 h-16 object-cover rounded-md shadow-sm border border-gray-300" 
                            alt={`Usulan ${idx+1}`} 
                         />
                         <a href={foto} target="_blank" rel="noreferrer" className="text-[8px] text-blue-500 mt-1 underline max-w-[64px] truncate" title={foto}>Buka Link</a>
                      </div>
                    )) : <span className="text-xs text-gray-400">Tidak ada foto</span>}
                  </div>
                </div>

                {usulan.foto_tindak_lanjut && (
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-2 border-b border-green-200 pb-1 flex items-center gap-1">✅ Hasil Tindak Lanjut RT</p>
                    <a href={usulan.foto_tindak_lanjut} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-md shadow-sm border-2 border-green-400">
                      <img src={usulan.foto_tindak_lanjut} onError={(e)=>{e.target.src="https://via.placeholder.com/300?text=Akses+Ditolak"}} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" alt="Tindak Lanjut" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )})}
          {listUsulan.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">Anda belum pernah membuat usulan warga.</div>
          )}
        </div>
      </div>

      {/* MODAL EDIT USULAN */}
      {editModal.open && editModal.data && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <form onSubmit={simpanEditUsulan} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-yellow-500 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Edit Usulan</h2>
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="text-xl font-bold hover:text-yellow-200">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-4">
                <strong>Catatan:</strong> Foto lampiran tidak dapat diubah setelah diunggah. Jika foto salah, harap Hapus usulan ini dan buat yang baru.
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Nama / Judul Usulan:</label>
                <input required type="text" value={editModal.data.nama_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, nama_usulan: e.target.value}})} className="w-full border p-2 rounded focus:ring-yellow-500" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Kategori Usulan:</label>
                <select value={editModal.data.jenis_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, jenis_usulan: e.target.value}})} className="w-full border p-2 rounded bg-gray-50">
                  <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
                  <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {editModal.data.jenis_usulan === 'Pembangunan' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border">
                  <div><label className="text-xs font-bold text-gray-600">Panjang (m)</label><input type="number" step="0.01" required value={editModal.data.panjang || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, panjang: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Lebar (m)</label><input type="number" step="0.01" required value={editModal.data.lebar || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, lebar: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Tinggi (m)</label><input type="number" step="0.01" required value={editModal.data.tinggi || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, tinggi: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Luas (Otomatis)</label><div className="w-full bg-gray-200 border p-2 rounded mt-1 font-mono text-center">{luasOtomatisEdit} m²</div></div>
                  <div className="sm:col-span-4"><label className="text-xs font-bold text-gray-600">Estimasi Dana (Rp)</label><input type="number" required value={editModal.data.estimasi_harga || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, estimasi_harga: e.target.value}})} className="w-full border p-2 rounded mt-1 font-mono" /></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1">Penjelasan / Keterangan:</label>
                <textarea required rows="4" value={editModal.data.keterangan} onChange={e=>setEditModal({...editModal, data:{...editModal.data, keterangan: e.target.value}})} className="w-full border p-2 rounded"></textarea>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="px-4 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300 transition-colors">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-500 text-white rounded font-bold hover:bg-yellow-600 transition-colors">{isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}