import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function VerifikasiAkunView({ setActiveView, akunPending, fetchAkunPending }) {
  const supabase = getSupabaseClient();
  const [isProcessing, setIsProcessing] = useState(false);

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
  // FUNGSI LOGIKA DATABASE
  // ==========================================
  
  // 1. Eksekusi ACC Akun
  const executeAcc = async (akun) => {
    setIsProcessing(true);
    closeModal();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'aktif' })
        .eq('id', akun.id);

      if (error) throw error;

      // Kirim Notifikasi Email ke Warga (Berjalan di Background)
      try {
        fetch('/api/notify-acc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: akun.email, 
            nama: akun.nama || 'Warga' 
          })
        }).catch(err => console.error("Gagal kirim email ACC:", err));
      } catch (notifErr) {
        console.error("Gagal mengeksekusi API Notifikasi ACC:", notifErr);
      }

      fetchAkunPending(); 
      showModal({ 
        type: 'success', 
        title: 'Akun Diaktifkan', 
        message: `Akun ${akun.email} berhasil di-ACC. Warga sekarang sudah bisa login ke sistem.`, 
        confirmText: 'Tutup' 
      });
      
    } catch (err) {
      showModal({ 
        type: 'error', 
        title: 'Gagal Mengaktifkan', 
        message: `Terjadi kesalahan saat ACC akun: ${err.message}`, 
        confirmText: 'Tutup' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Eksekusi Tolak Akun
  const executeTolak = async (akun) => {
    setIsProcessing(true);
    closeModal();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'ditolak' })
        .eq('id', akun.id);

      if (error) throw error;
      
      fetchAkunPending();
      showModal({ 
        type: 'success', 
        title: 'Akun Ditolak', 
        message: `Pendaftaran akun untuk ${akun.email} telah ditolak dan tidak akan bisa mengakses sistem.`, 
        confirmText: 'Tutup' 
      });
      
    } catch (err) {
      showModal({ 
        type: 'error', 
        title: 'Gagal Menolak', 
        message: `Terjadi kesalahan saat menolak akun: ${err.message}`, 
        confirmText: 'Tutup' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // TRIGGER MODAL KONFIRMASI
  // ==========================================
  const handleAccClick = (akun) => {
    showModal({
      type: 'confirm',
      title: 'Terima Pendaftaran Akun?',
      message: `Anda akan memberikan hak akses login kepada ${akun.email}. Apakah data pendaftaran ini valid?`,
      confirmText: 'Ya, Aktifkan Akun',
      cancelText: 'Batal',
      onConfirm: () => executeAcc(akun)
    });
  };

  const handleTolakClick = (akun) => {
    showModal({
      type: 'confirm',
      title: 'Tolak Akun?',
      message: `Anda akan menolak pendaftaran dari ${akun.email}. Akun ini tidak akan bisa login ke dalam aplikasi.`,
      confirmText: 'Ya, Tolak',
      cancelText: 'Batal',
      onConfirm: () => executeTolak(akun)
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden relative">
      
      {/* HEADER ACTION */}
      <div className="flex justify-start">
        <button onClick={() => setActiveView('menu')} className="text-sm text-amber-700 font-bold hover:underline bg-amber-50 hover:bg-amber-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
      </div>

      {/* PANEL TABEL VERIFIKASI */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        
        {/* HEADER GRADIENT AMBER */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Verifikasi Akun Baru</h2>
              <p className="text-amber-50 text-xs font-medium mt-0.5">Daftar pendaftaran warga yang menunggu persetujuan Anda.</p>
            </div>
          </div>
          <div className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm backdrop-blur-sm">
            {akunPending.length} Akun Menunggu
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="py-4 px-5 font-bold">Email Pendaftar</th>
                <th className="py-4 px-5 font-bold text-center">Status Saat Ini</th>
                <th className="py-4 px-5 font-bold text-center">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {akunPending.map((akun) => (
                <tr key={akun.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="font-bold text-gray-800">{akun.email}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">ID: {akun.id.split('-')[0]}...</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border border-amber-200 animate-pulse">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Menunggu ACC
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleAccClick(akun)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-green-200 active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                        ACC Akun
                      </button>
                      <button 
                        onClick={() => handleTolakClick(akun)}
                        disabled={isProcessing}
                        className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {akunPending.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-16 text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                      <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p className="text-gray-600 font-semibold text-base">Semua akun sudah terverifikasi.</p>
                    <p className="text-sm text-gray-400 mt-1">Tidak ada pendaftaran baru yang menunggu persetujuan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                (alertModal.type === 'warning' || alertModal.type === 'confirm') ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {(alertModal.type === 'warning' || alertModal.type === 'confirm') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
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
                    alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Tolak')) ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                    alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                    (alertModal.type === 'confirm' || alertModal.type === 'success') ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                    'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
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