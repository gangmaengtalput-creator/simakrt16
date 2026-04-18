import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function PermintaanMasukView({ 
  setActiveView, 
  permintaanMasuk, 
  fetchPermintaanMasuk,
  prosesPermintaanWarga,
  isLoading
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = getSupabaseClient();

  // ==========================================
  // STATE MODAL GLOBAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'warning', 'info', 'confirm', 'prompt'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const [promptInput, setPromptInput] = useState('');
  const [promptError, setPromptError] = useState('');

  // ==========================================
  // FUNGSI KONTROL MODAL
  // ==========================================
  const showModal = (config) => {
    setPromptInput('');
    setPromptError('');
    setAlertModal({ ...alertModal, ...config, isOpen: true });
  };

  const closeModal = () => {
    setAlertModal({ ...alertModal, isOpen: false });
  };

  const handleConfirm = () => {
    if (alertModal.type === 'prompt') {
      if (!promptInput.trim()) {
        setPromptError('Alasan penolakan tidak boleh kosong!');
        return;
      }
      if (alertModal.onConfirm) alertModal.onConfirm(promptInput);
    } else {
      if (alertModal.onConfirm) alertModal.onConfirm();
    }
  };

  // ==========================================
  // FUNGSI LOGIKA (TOLAK & HAPUS LOG)
  // ==========================================
  const triggerTolak = (item) => {
    showModal({
      type: 'prompt',
      title: 'Tolak Permintaan',
      message: `Berikan alasan mengapa Anda menolak permintaan surat dari ${item.nama_pemohon}:`,
      confirmText: 'Tolak Permintaan',
      cancelText: 'Batal',
      onConfirm: (alasan) => executeTolak(item, alasan)
    });
  };

  const executeTolak = async (item, alasan) => {
    setIsProcessing(true);
    closeModal(); 

    const { error } = await supabase
      .from('permintaan_surat')
      .update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` })
      .eq('id', item.id);
      
    if (!error) {
      fetchPermintaanMasuk(); 
      showModal({
        type: 'success',
        title: 'Berhasil Ditolak',
        message: `Permintaan dari ${item.nama_pemohon} telah ditolak. Warga akan mendapatkan notifikasi.`,
        confirmText: 'OK',
        onConfirm: closeModal
      });

      const { data: profile } = await supabase.from('profiles').select('email').eq('nik', item.nik_pemohon).single();
      if (profile?.email) {
        fetch('/api/notify-warga', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailTujuan: profile.email,
            nama: item.nama_pemohon,
            status: 'Ditolak',
            tujuan: item.tujuan,
            catatan: alasan
          })
        }).catch(err => console.error("Gagal kirim email penolakan:", err));
      }
    } else {
      showModal({ type: 'error', title: 'Gagal Menolak', message: error.message, confirmText: 'Tutup', onConfirm: closeModal });
    }
    
    setIsProcessing(false);
  };

  const triggerHapus = (id) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Log Permintaan?',
      message: 'Apakah Anda yakin ingin menghapus catatan ini dari daftar Kotak Masuk? (Arsip surat asli yang sudah dicetak tidak akan terhapus)',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: () => executeHapus(id)
    });
  };

  const executeHapus = async (id) => {
    setIsProcessing(true);
    closeModal();

    const { error } = await supabase.from('permintaan_surat').delete().eq('id', id);
      
    setIsProcessing(false);
    
    if (!error) {
      fetchPermintaanMasuk();
      showModal({ type: 'success', title: 'Log Dihapus', message: 'Catatan permintaan berhasil dibersihkan dari kotak masuk.', confirmText: 'OK', onConfirm: closeModal });
    } else {
      showModal({ type: 'error', title: 'Gagal Menghapus', message: error.message, confirmText: 'Tutup', onConfirm: closeModal });
    }
  };

  // ==========================================
  // TAMPILAN UI
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden relative">
      
      {/* HEADER ACTION */}
      <div className="flex justify-start">
        <button onClick={() => setActiveView('menu')} className="text-sm text-blue-700 font-bold hover:underline bg-blue-50 hover:bg-blue-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
      </div>
      
      {/* KOTAK MASUK CONTAINER */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        {/* TEMA DIUBAH KE BIRU-INDIGO AGAR LEBIH TEDUH */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Kotak Masuk Permintaan Surat</h2>
            <p className="text-blue-100 text-xs font-medium mt-0.5">Pantau dan proses pengajuan surat pengantar warga secara real-time.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="py-4 px-5 font-bold">Tanggal</th>
                <th className="py-4 px-5 font-bold">Pemohon</th>
                <th className="py-4 px-5 font-bold">Tujuan & Keterangan</th>
                <th className="py-4 px-5 font-bold text-center">Status</th>
                <th className="py-4 px-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {permintaanMasuk.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="py-4 px-5 text-gray-500 font-medium">{new Date(item.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-gray-800">{item.nama_pemohon}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 py-0.5 rounded">NIK: {item.nik_pemohon}</div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-gray-700">{item.tujuan}</div>
                    <div className="text-[11px] text-gray-500 whitespace-normal block w-64 mt-1 leading-relaxed border-l-2 border-blue-200 pl-2">{item.keterangan}</div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                      item.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 
                      item.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-center items-center gap-2">
                      {item.status === 'Menunggu' && (
                        <>
                          <button 
                            onClick={() => prosesPermintaanWarga(item)} 
                            disabled={isLoading || isProcessing} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Buat Surat
                          </button>
                          <button 
                            onClick={() => triggerTolak(item)} 
                            disabled={isProcessing}
                            className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-3 py-2 rounded-xl font-bold text-xs border border-red-100 hover:border-red-500 transition-all active:scale-95 disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      
                      {(item.status === 'Selesai' || item.status === 'Ditolak') && (
                        <button 
                          onClick={() => triggerHapus(item.id)} 
                          disabled={isProcessing} 
                          className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-red-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Bersihkan Log
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {permintaanMasuk.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                      <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <p className="text-gray-600 font-semibold text-base">Belum ada permintaan masuk dari warga.</p>
                    <p className="text-sm text-gray-400 mt-1">Sistem sedang memantau pengajuan surat secara otomatis.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL SISTEM (GLOBAL UNTUK COMPONENT INI)  */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                (alertModal.type === 'warning' || alertModal.type === 'confirm' || alertModal.type === 'prompt') ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {(alertModal.type === 'warning' || alertModal.type === 'confirm' || alertModal.type === 'prompt') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-6 px-2">{alertModal.message}</p>
              
              {/* PROMPT INPUT */}
              {alertModal.type === 'prompt' && (
                <div className="w-full text-left mb-6">
                  <textarea 
                    autoFocus
                    rows="3"
                    className={`w-full p-3 rounded-xl border ${promptError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 bg-gray-50 focus:ring-blue-500'} focus:bg-white focus:outline-none focus:ring-2 transition-all`}
                    placeholder="Contoh: Berkas tidak lengkap..."
                    value={promptInput}
                    onChange={(e) => {
                      setPromptInput(e.target.value);
                      if (promptError) setPromptError(''); 
                    }}
                  ></textarea>
                  {promptError && <p className="text-xs text-red-500 font-bold mt-1.5 animate-pulse">{promptError}</p>}
                </div>
              )}
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    alertModal.type === 'error' ? 'bg-red-500 shadow-red-200' :
                    (alertModal.type === 'confirm' || alertModal.type === 'prompt') ? 'bg-amber-500 shadow-amber-200' :
                    alertModal.type === 'success' ? 'bg-green-500 shadow-green-200' :
                    'bg-blue-600 shadow-blue-200'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : alertModal.confirmText}
                </button>
                
                {(alertModal.type === 'confirm' || alertModal.type === 'prompt') && (
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