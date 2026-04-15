// File: src/components/DashboardWarga/PermintaanSuratView.jsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PermintaanSuratView({ 
  wargaAktif, 
  listPermintaan, 
  fetchDataWarga, 
  setCetakSurat 
}) {
  const [formSurat, setFormSurat] = useState({ tujuan: '', keterangan: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [modalInfo, setModalInfo] = useState({ open: false, message: '', type: 'success' }); 

  const submitPermintaanSurat = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const { error } = await supabase.from('permintaan_surat').insert([{
      nik_pemohon: wargaAktif.nik,
      nama_pemohon: wargaAktif.nama,
      tujuan: formSurat.tujuan,
      keterangan: formSurat.keterangan,
      status: 'Menunggu'
    }]);
    
    setIsProcessing(false);
    
    if (!error) {
      setModalInfo({ open: true, message: "Permintaan surat pengantar berhasil dikirim ke Ketua RT!", type: 'success' });
      setFormSurat({ tujuan: '', keterangan: '' });
      fetchDataWarga(wargaAktif.nik);
    } else {
      setModalInfo({ open: true, message: "Gagal mengirim permintaan: " + error.message, type: 'error' });
    }
  };

  // --- FUNGSI YANG DIPERBAIKI MENGGUNAKAN .maybeSingle() ---
  const aksiLihatSuratSelesai = async (idSuratKeterangan) => {
    if (!idSuratKeterangan) {
      setModalInfo({ open: true, message: "ID Surat tidak valid. Harap hubungi Ketua RT.", type: 'error' });
      return;
    }

    // Gunakan .maybeSingle() agar tidak menjadi error jika data kosong/dihapus
    const { data: suratData, error } = await supabase
      .from('surat_keterangan')
      .select('*')
      .eq('id', idSuratKeterangan)
      .maybeSingle(); 
      
    // Jika terjadi error jaringan atau sistem database
    if (error) {
      setModalInfo({ 
        open: true, 
        message: "Terjadi kesalahan sistem database: " + error.message, 
        type: 'error' 
      });
      return;
    }
    
    // Jika suratData null (artinya data sudah dihapus oleh Ketua RT di database)
    if (!suratData) {
      setModalInfo({ 
        open: true, 
        message: "Dokumen Gagal Dimuat: Surat ini kemungkinan besar sudah DIHAPUS dari arsip oleh Ketua RT. Silakan buat permintaan baru.", 
        type: 'warning' 
      });
      return;
    }

    // Jika data berhasil ditemukan
    setCetakSurat({ 
      nomorSurat: suratData.nomor_surat, 
      warga: wargaAktif, 
      deskripsi: suratData.deskripsi, 
      tujuan: suratData.tujuan_surat, 
      pbb: 'Lunas', 
      tanggal: new Date(suratData.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border print:hidden">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Buat Permintaan Surat Pengantar</h2>
        <form onSubmit={submitPermintaanSurat} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tujuan / Keperluan Surat:</label>
            <input required type="text" value={formSurat.tujuan} onChange={(e) => setFormSurat({...formSurat, tujuan: e.target.value})} placeholder="Contoh: Melamar Pekerjaan, Pembuatan SKCK..." className="w-full border p-3 rounded-lg focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan Tambahan:</label>
            <textarea required value={formSurat.keterangan} onChange={(e) => setFormSurat({...formSurat, keterangan: e.target.value})} placeholder="Berikan penjelasan singkat untuk Ketua RT..." rows="3" className="w-full border p-3 rounded-lg focus:ring-blue-500"></textarea>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isProcessing ? 'Mengirim...' : 'Kirim Permintaan ke RT'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
        <div className="bg-gray-800 p-4"><h3 className="font-bold text-white">Status Permintaan Surat Saya</h3></div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                <th className="py-2 px-3">Tanggal</th>
                <th className="py-2 px-3">Tujuan Surat</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-center">Dokumen</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {listPermintaan.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 px-3 font-medium">{item.tujuan}</td>
                  <td className="py-3 px-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'Selesai' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.status === 'Selesai' && item.surat_keterangan_id ? (
                      <button 
                        onClick={() => aksiLihatSuratSelesai(item.surat_keterangan_id)} 
                        className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
                      >
                        Lihat & Cetak PDF
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Menunggu Ketua RT</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL NOTIFIKASI KUSTOM */}
      {/* ========================================== */}
      {modalInfo.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
            <div className={`p-6 text-white flex flex-col justify-center items-center ${
              modalInfo.type === 'success' ? 'bg-green-500' : 
              modalInfo.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              
              {/* Icon Sukses */}
              {modalInfo.type === 'success' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              )}
              {/* Icon Peringatan */}
              {modalInfo.type === 'warning' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              )}
              {/* Icon Error */}
              {modalInfo.type === 'error' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}

              <h3 className="text-xl font-bold">
                {modalInfo.type === 'success' ? 'Berhasil' : modalInfo.type === 'warning' ? 'Peringatan' : 'Gagal'}
              </h3>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-700 text-sm md:text-base mb-8">{modalInfo.message}</p>
              <button
                onClick={() => setModalInfo({ open: false, message: '', type: 'success' })}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-colors ${
                  modalInfo.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                  modalInfo.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}