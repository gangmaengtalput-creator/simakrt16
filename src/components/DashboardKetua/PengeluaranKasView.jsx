// File: src/components/DashboardKetua/PengeluaranKasView.jsx
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

  const [filterBulanKeluar, setFilterBulanKeluar] = useState(namaBulanSekarang);
  const [filterTahunKeluar, setFilterTahunKeluar] = useState(tahunSekarang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [fotoBukti, setFotoBukti] = useState([]); 
  const [pengeluaranData, setPengeluaranData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nominal: '', kategori: '', penerima: '', keterangan: ''
  });

  // --- TAMBAHAN: Agar data langsung tampil saat menu dibuka ---
  useEffect(() => {
    fetchRiwayatPengeluaran();
  }, []);

  // --- TAMBAHAN: Fungsi Hapus Pengeluaran ---
  const handleHapusPengeluaran = async (id, namaFoto) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data pengeluaran ini secara permanen?")) return;

    setIsProcessing(true);
    try {
      // 1. Hapus data di tabel database
      const { error } = await supabase
        .from('pengeluaran_kas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert("Data pengeluaran berhasil dihapus!");
      fetchRiwayatPengeluaran(); // Refresh tabel
    } catch (error) {
      alert("Gagal menghapus: " + error.message);
    } finally {
      setIsProcessing(false);
    }
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
      alert("Gagal memproses gambar.");
    } finally {
      setIsCompressing(false);
    }
  };

  const hapusFotoPreview = (index) => {
    setFotoBukti((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPengeluaran = async (e) => {
    e.preventDefault();
    if (fotoBukti.length === 0) {
      alert("Wajib melampirkan minimal 1 foto bukti!"); return;
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
      alert("Data pengeluaran berhasil dicatat!");
      setPengeluaranData({ tanggal: new Date().toISOString().split('T')[0], nominal: '', kategori: '', penerima: '', keterangan: '' });
      setFotoBukti([]);
      fetchRiwayatPengeluaran(); 
    } catch (error) {
      alert("Gagal menyimpan data: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRiwayat = listRiwayatPengeluaran.filter(item => {
    const itemDate = new Date(item.tanggal);
    const itemMonth = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(itemDate);
    const itemYear = itemDate.getFullYear();
    return itemMonth === filterBulanKeluar && itemYear === filterTahunKeluar;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden">
      <button onClick={() => setActiveView('menu')} className="text-sm text-red-600 font-bold hover:underline bg-red-50 px-4 py-2 rounded-lg">
        &larr; Kembali ke Menu Utama
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM INPUT (Sama seperti sebelumnya) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-red-100 text-red-600 p-2 rounded-full">📤</span> Catat Pengeluaran
          </h2>
          <form onSubmit={submitPengeluaran} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal</label>
              <input type="date" required value={pengeluaranData.tanggal} onChange={(e) => setPengeluaranData({...pengeluaranData, tanggal: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nominal (Rp)</label>
              <input type="number" required value={pengeluaranData.nominal} onChange={(e) => setPengeluaranData({...pengeluaranData, nominal: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label>
              <select required value={pengeluaranData.kategori} onChange={(e) => setPengeluaranData({...pengeluaranData, kategori: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50">
                <option value="">-- Pilih --</option>
                <option value="Operasional RT">Operasional RT</option>
                <option value="Pembangunan/Infrastruktur">Pembangunan</option>
                <option value="Kegiatan Sosial/Warga">Kegiatan Sosial</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Penerima</label>
              <input type="text" required value={pengeluaranData.penerima} onChange={(e) => setPengeluaranData({...pengeluaranData, penerima: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan</label>
              <textarea rows="2" value={pengeluaranData.keterangan} onChange={(e) => setPengeluaranData({...pengeluaranData, keterangan: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50"></textarea>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <label className="block text-sm font-bold text-red-800 mb-2">Upload Bukti</label>
              <input type="file" multiple accept="image/*" onChange={handleFotoChange} className="w-full text-sm" disabled={isCompressing || isProcessing} />
              {fotoBukti.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {fotoBukti.map((foto, index) => (
                    <div key={index} className="relative">
                      <img src={foto.preview} alt="preview" className="w-12 h-12 object-cover rounded border" />
                      <button type="button" onClick={() => hapusFotoPreview(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px]">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={isProcessing || isCompressing} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {isProcessing ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>

        {/* TABEL DAFTAR PENGELUARAN */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-lg font-bold text-gray-800">Daftar Pengeluaran</h2>
            <div className="flex gap-2">
              <select value={filterBulanKeluar} onChange={(e) => setFilterBulanKeluar(e.target.value)} className="border p-2 rounded-lg text-xs font-bold bg-gray-50">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterTahunKeluar} onChange={(e) => setFilterTahunKeluar(Number(e.target.value))} className="border p-2 rounded-lg text-xs font-bold bg-gray-50">
                {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Detail</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-center">Bukti</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRiwayat.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-red-600 block">{item.kategori}</span>
                      <p className="font-medium text-gray-800">{item.penerima}</p>
                      <p className="text-gray-500 italic">{item.keterangan}</p>
                    </td>
                    <td className="p-3 text-right font-bold text-red-600">Rp {item.nominal.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {item.foto_bukti && item.foto_bukti.map((foto, i) => (
                          <a key={i} href={foto} target="_blank" rel="noreferrer" className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">Foto {i+1}</a>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {/* --- TOMBOL HAPUS --- */}
                      <button 
                        onClick={() => handleHapusPengeluaran(item.id)}
                        disabled={isProcessing}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                        title="Hapus Data"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRiwayat.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">Tidak ada data untuk periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}