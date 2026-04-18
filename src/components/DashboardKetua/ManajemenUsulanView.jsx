// File: src/components/DashboardKetua/ManajemenUsulanView.jsx
import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function ManajemenUsulanView({ 
  setActiveView, 
  usulanMasuk, 
  fetchUsulan 
}) {
  // ==========================================
  // STATE LOKAL (Hanya untuk fitur Usulan)
  // ==========================================
  const supabase = getSupabaseClient();
  const [showUsulanModal, setShowUsulanModal] = useState(false);
  const [selectedUsulan, setSelectedUsulan] = useState(null);
  const [tindakLanjutData, setTindakLanjutData] = useState({ status: '', catatan_rt: '' });
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ==========================================
  // FUNGSI KOMPRES FOTO (Khusus Usulan)
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

  // ==========================================
  // FUNGSI UPDATE STATUS USULAN
  // ==========================================
  const simpanTindakLanjut = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    let fotoUrl = selectedUsulan?.foto_tindak_lanjut || null;

    try {
      if (fotoTindakLanjut) {
        const compressedFile = await compressImage(fotoTindakLanjut);
        const fileName = `tindaklanjut_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('usulan').upload(fileName, compressedFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('usulan').getPublicUrl(fileName);
          fotoUrl = data.publicUrl;
        } else {
            throw uploadError;
        }
      }

      const { error } = await supabase.from('usulan_warga').update({
        status: tindakLanjutData.status, 
        catatan_rt: tindakLanjutData.catatan_rt, 
        foto_tindak_lanjut: fotoUrl
      }).eq('id', selectedUsulan.id);

      if (error) throw error;
      
      setShowUsulanModal(false); 
      fetchUsulan(); // Refresh tabel setelah berhasil
      alert("Status usulan berhasil diperbarui!");
      
    } catch (error) {
        alert("Gagal update: " + error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <>
      {/* TAMPILAN TABEL USULAN */}
      <div className="max-w-7xl mx-auto space-y-4 print:hidden">
        <button onClick={() => setActiveView('menu')} className="text-sm text-purple-700 font-bold hover:underline bg-purple-100 px-4 py-2 rounded-lg">
          &larr; Kembali ke Menu Utama
        </button>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-purple-600 p-4">
            <h2 className="text-lg font-bold text-white">Manajemen Usulan Warga</h2>
          </div>
          <div className="overflow-x-auto p-4 max-w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                  <th className="p-3">Tgl Usul</th>
                  <th className="p-3">Pengusul</th>
                  <th className="p-3">Jenis & Keterangan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {usulanMasuk.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 align-top">
                    <td className="p-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 font-bold">
                      {item.nama_pengusul}<br/>
                      <span className="font-normal text-xs text-gray-500">{item.nik_pengusul}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-purple-700">{item.jenis_usulan}</span>
                      {item.jenis_usulan === 'Pembangunan' && (
                         <div className="text-xs bg-purple-50 p-2 rounded mt-1 border border-purple-100 font-mono text-purple-800">
                           Dimensi: {item.panjang}m x {item.lebar}m x {item.tinggi}m | Luas: {item.luas}m²<br/>
                           Est. Harga: Rp {Number(item.estimasi_harga).toLocaleString('id-ID')}
                         </div>
                      )}
                      <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{item.keterangan}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {item.foto_usulan?.map((foto, idx) => ( 
                          <a key={idx} href={foto} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">
                            Lihat Foto {idx+1}
                          </a> 
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Telah Ditindaklanjuti' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center align-middle">
                      <button onClick={() => { 
                        setSelectedUsulan(item); 
                        setTindakLanjutData({ status: item.status, catatan_rt: item.catatan_rt || '' }); 
                        setFotoTindakLanjut(null); 
                        setShowUsulanModal(true); 
                      }} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded font-bold text-xs hover:bg-purple-200 w-full">
                        Update Status /<br/>Tindak Lanjut
                      </button>
                    </td>
                  </tr>
                ))}
                {usulanMasuk.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">Belum ada usulan masuk dari warga.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL TINDAK LANJUT USULAN */}
      {showUsulanModal && selectedUsulan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <form onSubmit={simpanTindakLanjut} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-purple-600 text-white"><h2 className="text-lg font-bold">Update Tindak Lanjut Usulan</h2></div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Ubah Status Usulan:</label>
                <select required value={tindakLanjutData.status} onChange={(e) => setTindakLanjutData({...tindakLanjutData, status: e.target.value})} className="w-full border p-2 rounded focus:ring-purple-500">
                  <option value="Menunggu Tinjauan RT">Menunggu Tinjauan RT</option>
                  <option value="On Proses Pengajuan Musrenbang">On Proses Pengajuan Musrenbang</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Telah Ditindaklanjuti">Telah Ditindaklanjuti</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Catatan / Keterangan RT:</label>
                <textarea rows="3" value={tindakLanjutData.catatan_rt} onChange={(e) => setTindakLanjutData({...tindakLanjutData, catatan_rt: e.target.value})} className="w-full border p-2 rounded focus:ring-purple-500" placeholder="Opsional..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Upload Foto Tindak Lanjut (Wajib jika selesai):</label>
                <input type="file" accept="image/*" onChange={(e) => setFotoTindakLanjut(e.target.files[0])} className="w-full border p-2 rounded text-sm" />
                <p className="text-[10px] text-gray-500 mt-1">Foto otomatis dikompres max 100kb.</p>
                {selectedUsulan.foto_tindak_lanjut && !fotoTindakLanjut && ( <div className="mt-2"><span className="text-xs text-green-600 font-bold">Sudah ada foto tersimpan.</span></div> )}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setShowUsulanModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">{isProcessing ? 'Menyimpan...' : 'Simpan Update'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}