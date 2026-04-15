// File: src/components/DashboardKetua/PermintaanMasukView.jsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PermintaanMasukView({ 
  setActiveView, 
  permintaanMasuk, 
  fetchPermintaanMasuk,
  prosesPermintaanWarga,
  isLoading
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  // ==========================================
  // FUNGSI LOKAL (TOLAK & HAPUS LOG)
  // ==========================================
  const tolakPermintaan = async (id) => {
    const alasan = prompt("Masukkan alasan penolakan:");
    if (!alasan) return;
    
    setIsProcessing(true);
    const { error } = await supabase
      .from('permintaan_surat')
      .update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` })
      .eq('id', id);
      
    setIsProcessing(false);
    
    if (!error) {
      fetchPermintaanMasuk();
    } else {
      alert("Gagal menolak permintaan: " + error.message);
    }
  };

  const hapusLogPermintaan = async (id) => {
    if(!confirm("Hapus catatan ini dari daftar Kotak Masuk? (Tenang, arsip surat asli tidak akan terhapus)")) return;
    
    setIsProcessing(true);
    const { error } = await supabase
      .from('permintaan_surat')
      .delete()
      .eq('id', id);
      
    setIsProcessing(false);
    
    if (!error) {
      fetchPermintaanMasuk();
    } else {
      alert("Gagal menghapus log: " + error.message);
    }
  };

  // ==========================================
  // TAMPILAN UI
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto space-y-4 print:hidden">
      <button onClick={() => setActiveView('menu')} className="text-sm text-orange-700 font-bold hover:underline bg-orange-100 px-4 py-2 rounded-lg">
        &larr; Kembali ke Menu Utama
      </button>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-orange-500 p-4">
          <h2 className="text-lg font-bold text-white">Kotak Masuk Permintaan Surat Warga</h2>
        </div>
        <div className="overflow-x-auto p-4 max-w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                <th className="py-2 px-3">Tanggal</th>
                <th className="py-2 px-3">Pemohon</th>
                <th className="py-2 px-3">Tujuan & Keterangan</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {permintaanMasuk.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 px-3 font-bold text-gray-800">
                    {item.nama_pemohon}<br/>
                    <span className="text-xs text-gray-500 font-normal">{item.nik_pemohon}</span>
                  </td>
                  <td className="py-3 px-3">
                    <strong>{item.tujuan}</strong><br/>
                    <span className="text-xs text-gray-500 whitespace-normal block w-64">{item.keterangan}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Selesai' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 flex justify-center gap-2 items-center h-full">
                    {item.status === 'Menunggu' && (
                      <>
                        <button 
                          onClick={() => prosesPermintaanWarga(item)} 
                          disabled={isLoading || isProcessing} 
                          className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-blue-700 shadow-sm disabled:opacity-50"
                        >
                          Proses Buat Surat
                        </button>
                        <button 
                          onClick={() => tolakPermintaan(item.id)} 
                          disabled={isProcessing}
                          className="bg-red-100 text-red-700 px-3 py-1.5 rounded font-bold text-xs hover:bg-red-200 disabled:opacity-50"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    {item.status === 'Selesai' && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Selesai Diproses</span>
                        <button onClick={() => hapusLogPermintaan(item.id)} disabled={isProcessing} className="text-[10px] text-gray-400 hover:text-red-500 underline disabled:opacity-50">Bersihkan Log</button>
                      </div>
                    )}
                    {item.status === 'Ditolak' && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-red-600 font-bold">Ditolak</span>
                        <button onClick={() => hapusLogPermintaan(item.id)} disabled={isProcessing} className="text-[10px] text-gray-400 hover:text-red-500 underline disabled:opacity-50">Bersihkan Log</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {permintaanMasuk.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-gray-500">Belum ada permintaan masuk dari warga.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}