import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function PenunjukanPetugasView({ setActiveView }) {
  const supabase = getSupabaseClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataWargaLokal, setDataWargaLokal] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
  // FUNGSI FETCH DATA
  // ==========================================
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ==========================================
  // FUNGSI PROSES DATABASE & TRIGGER MODAL
  // ==========================================
  const eksekusiTunjuk = async (warga) => {
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ is_petugas_iuran: true }).eq('nik', warga.nik);
    setIsProcessing(false);
    
    if (!error) {
      setSearchQuery('');
      fetchWargaLokal(); 
      showModal({
        type: 'success',
        title: 'Penunjukan Berhasil!',
        message: `${warga.nama} kini resmi memiliki akses sebagai Petugas Pemungut Iuran di dasbornya.`,
        confirmText: 'Tutup'
      });
    } else {
      showModal({
        type: 'error',
        title: 'Gagal Menunjuk Petugas',
        message: `Terjadi kesalahan pada sistem: ${error.message}`,
        confirmText: 'Tutup'
      });
    }
  };

  const eksekusiCabut = async (warga) => {
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ is_petugas_iuran: false }).eq('nik', warga.nik);
    setIsProcessing(false);
    
    if (!error) {
      fetchWargaLokal();
      showModal({
        type: 'success',
        title: 'Penugasan Berakhir',
        message: `Akses menu pemungutan iuran untuk ${warga.nama} telah berhasil dicabut.`,
        confirmText: 'Tutup'
      });
    } else {
      showModal({
        type: 'error',
        title: 'Gagal Mencabut Penugasan',
        message: `Terjadi kesalahan sistem: ${error.message}`,
        confirmText: 'Tutup'
      });
    }
  };

  const handleTunjukClick = (warga) => {
    showModal({
      type: 'confirm',
      title: 'Konfirmasi Penunjukan',
      message: `Apakah Anda yakin ingin menunjuk ${warga.nama} sebagai Petugas Pemungut Iuran Kas?`,
      confirmText: 'Ya, Tunjuk Petugas',
      cancelText: 'Batal',
      onConfirm: () => {
        closeModal();
        eksekusiTunjuk(warga);
      }
    });
  };

  const handleCabutClick = (warga) => {
    showModal({
      type: 'confirm',
      title: 'Akhiri Penugasan?',
      message: `Anda akan mencabut hak akses ${warga.nama} sebagai petugas pencatat iuran. Lanjutkan?`,
      confirmText: 'Ya, Akhiri Penugasan',
      cancelText: 'Batal',
      onConfirm: () => {
        closeModal();
        eksekusiCabut(warga);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative print:hidden">
      
      {/* HEADER ACTION */}
      <div className="flex justify-start">
        <button onClick={() => setActiveView('menu')} className="text-sm text-blue-700 font-bold hover:underline bg-blue-50 hover:bg-blue-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
      </div>

      {/* PANEL PETUGAS AKTIF */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">Petugas Pemungut Kas Aktif</h2>
            <p className="text-blue-100 text-xs font-medium mt-0.5">Warga yang memiliki hak akses untuk mengelola pembayaran kas.</p>
          </div>
        </div>
        
        <div className="p-5 sm:p-6 bg-gray-50/50">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-8 opacity-50">
               <svg className="w-8 h-8 animate-spin text-blue-500 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <p className="text-gray-500 text-sm font-bold tracking-wide">Memuat data petugas...</p>
             </div>
          ) : daftarPetugasAktif.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm font-medium">Belum ada petugas yang ditunjuk saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {daftarPetugasAktif.map(petugas => (
                <div key={petugas.nik} className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-lg border border-blue-200 shrink-0">
                      {petugas.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 leading-tight">{petugas.nama}</h3>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">NIK: {petugas.nik}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCabutClick(petugas)} disabled={isProcessing} className="w-full sm:w-auto bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white border border-red-100 transition-all active:scale-95 disabled:opacity-50">
                    Akhiri Penugasan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PANEL CARI & TUNJUK PETUGAS BARU */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
        <h3 className="text-lg font-black text-gray-800 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          Tunjuk Petugas Baru
        </h3>
        <p className="text-xs text-gray-500 mb-5">Cari warga yang ingin Anda berikan tugas sebagai pengelola kas RT.</p>
        
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Cari Nama atau NIK warga..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
          />
        </div>
        
        {searchQuery.trim().length > 1 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {hasilPencarian.length > 0 ? hasilPencarian.map(warga => (
              <div key={warga.nik} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors shadow-sm">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{warga.nama}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">NIK: {warga.nik}</p>
                </div>
                <button onClick={() => handleTunjukClick(warga)} disabled={isProcessing} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                  Tunjuk
                </button>
              </div>
            )) : (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-medium">Data warga tidak ditemukan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Akhiri')) ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
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