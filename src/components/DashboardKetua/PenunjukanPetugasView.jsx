// File: src/components/DashboardKetua/PenunjukanPetugasView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PenunjukanPetugasView({ setActiveView }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataWargaLokal, setDataWargaLokal] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE UNTUK MODAL ---
  const [modalConfig, setModalConfig] = useState({
    open: false,
    type: 'confirm', // 'confirm' | 'result'
    status: 'info',  // 'info' | 'success' | 'error' | 'warning'
    title: '',
    message: '',
    onConfirm: null, // Fungsi yang dijalankan jika klik "Ya"
    targetWarga: null
  });

  const fetchWargaLokal = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('master_warga')
      .select('nik, nama, status_kk, is_petugas_iuran, status_warga')
      .order('nama', { ascending: true });
      
    if (!error && data) setDataWargaLokal(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWargaLokal();
  }, []);

  const daftarPetugasAktif = dataWargaLokal.filter(w => w.is_petugas_iuran === true);
  
  const hasilPencarian = dataWargaLokal.filter(w => {
    const amanNama = w.nama ? String(w.nama).toLowerCase() : '';
    const amanNik = w.nik ? String(w.nik) : '';
    const query = searchQuery.toLowerCase().trim();
    return (
      w.is_petugas_iuran !== true &&
      w.status_warga !== 'mantan' &&
      (amanNama.includes(query) || amanNik.includes(query))
    );
  }).slice(0, 5);

  // --- FUNGSI PROSES DATABASE ---
  const eksekusiTunjuk = async (warga) => {
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ is_petugas_iuran: true }).eq('nik', warga.nik);
    setIsProcessing(false);
    
    if (!error) {
      setModalConfig({
        open: true,
        type: 'result',
        status: 'success',
        title: 'Berhasil!',
        message: `${warga.nama} kini resmi menjadi Petugas Pemungut Iuran.`,
        onConfirm: null
      });
      setSearchQuery('');
      fetchWargaLokal(); 
    } else {
      setModalConfig({
        open: true,
        type: 'result',
        status: 'error',
        title: 'Gagal',
        message: "Terjadi kesalahan: " + error.message,
        onConfirm: null
      });
    }
  };

  const eksekusiCabut = async (warga) => {
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ is_petugas_iuran: false }).eq('nik', warga.nik);
    setIsProcessing(false);
    
    if (!error) {
      setModalConfig({
        open: true,
        type: 'result',
        status: 'success',
        title: 'Penugasan Berakhir',
        message: `Akses pemungutan iuran untuk ${warga.nama} telah dicabut.`,
        onConfirm: null
      });
      fetchWargaLokal();
    } else {
      setModalConfig({
        open: true,
        type: 'result',
        status: 'error',
        title: 'Gagal',
        message: "Gagal mencabut tugas: " + error.message,
        onConfirm: null
      });
    }
  };

  // --- TRIGGER MODAL KONFIRMASI ---
  const handleTunjukClick = (warga) => {
    setModalConfig({
      open: true,
      type: 'confirm',
      status: 'info',
      title: 'Konfirmasi Penunjukan',
      message: `Tunjuk ${warga.nama} sebagai Petugas Pemungut Iuran? Fitur pemungutan akan otomatis muncul di dasbornya.`,
      onConfirm: () => eksekusiTunjuk(warga)
    });
  };

  const handleCabutClick = (warga) => {
    setModalConfig({
      open: true,
      type: 'confirm',
      status: 'warning',
      title: 'Akhiri Penugasan',
      message: `Apakah Anda yakin ingin mengakhiri masa tugas ${warga.nama}?`,
      onConfirm: () => eksekusiCabut(warga)
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">
        &larr; Kembali ke Menu Utama
      </button>

      <div className="bg-white rounded-xl shadow-md border-t-4 border-green-500 overflow-hidden">
        <div className="p-4 bg-green-50 border-b border-green-100">
          <h2 className="text-lg font-bold text-green-800">Petugas Pemungut Kas Saat Ini</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
             <p className="text-gray-500 text-sm text-center py-4 animate-pulse font-bold">Memuat data...</p>
          ) : daftarPetugasAktif.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center py-4">Belum ada petugas yang ditunjuk.</p>
          ) : (
            <div className="space-y-3">
              {daftarPetugasAktif.map(petugas => (
                <div key={petugas.nik} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                  <div>
                    <h3 className="font-bold text-gray-800">{petugas.nama}</h3>
                    <p className="text-xs text-gray-500">NIK: {petugas.nik}</p>
                  </div>
                  <button onClick={() => handleCabutClick(petugas)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">
                    Akhiri Penugasan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border">
        <h3 className="font-bold text-gray-800 mb-4">Tunjuk Petugas Baru</h3>
        <input 
          type="text" 
          placeholder="Cari Nama atau NIK..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-blue-500 mb-4 outline-none"
        />
        
        {searchQuery.trim().length > 1 && (
          <div className="space-y-2">
            {hasilPencarian.map(warga => (
              <div key={warga.nik} className="flex justify-between items-center bg-white p-3 rounded-lg border hover:bg-blue-50">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{warga.nama}</h4>
                  <p className="text-xs text-gray-500">NIK: {warga.nik}</p>
                </div>
                <button onClick={() => handleTunjukClick(warga)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700">
                  + Tunjuk
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL KUSTOM (DIBAWAH)                      */}
      {/* ========================================== */}
      {modalConfig.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
            <div className={`p-6 text-white flex flex-col justify-center items-center ${
              modalConfig.status === 'success' ? 'bg-green-500' : 
              modalConfig.status === 'warning' ? 'bg-orange-500' : 
              modalConfig.status === 'error' ? 'bg-red-500' : 'bg-blue-600'
            }`}>
              <h3 className="text-xl font-bold">{modalConfig.title}</h3>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-700 text-sm mb-8 leading-relaxed">{modalConfig.message}</p>
              
              <div className="flex gap-3">
                {modalConfig.type === 'confirm' ? (
                  <>
                    <button
                      onClick={() => setModalConfig({ ...modalConfig, open: false })}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        modalConfig.onConfirm();
                        setModalConfig({ ...modalConfig, open: false });
                      }}
                      className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-colors ${
                        modalConfig.status === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Ya, Lanjutkan
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setModalConfig({ ...modalConfig, open: false })}
                    className="w-full py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-black shadow-md transition-colors"
                  >
                    Tutup
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