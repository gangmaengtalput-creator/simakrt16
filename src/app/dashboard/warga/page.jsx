"use client";

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

// === IMPORT KOMPONEN YANG TELAH DIPECAH ===
import PermintaanSuratView from '../../../components/DashboardWarga/PermintaanSuratView';
import UsulanWargaView from '../../../components/DashboardWarga/UsulanWargaView';
import IuranWargaView from '../../../components/DashboardWarga/IuranWargaView';
import PetugasPemungutanView from '../../../components/DashboardWarga/PetugasPemungutanView';

export const dynamic = 'force-dynamic';

export default function DashboardWarga() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  // ==========================================
  // STATE KEAMANAN & AUTENTIKASI AWAL
  // ==========================================
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); 
  const [isLoggingOut, setIsLoggingOut] = useState(false); // State Animasi Keluar

  // ==========================================
  // STATE AUTENTIKASI & DATA DIRI
  // ==========================================
  const [wargaAktif, setWargaAktif] = useState(null);
  const [inputNik, setInputNik] = useState('');
  const [inputTanggalLahir, setInputTanggalLahir] = useState(''); 
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // STATE NAVIGASI & TAB
  const [activeTab, setActiveTab] = useState('surat'); 

  // ==========================================
  // STATE DATA GLOBAL WARGA
  // ==========================================
  const [listPermintaan, setListPermintaan] = useState([]);
  const [listUsulan, setListUsulan] = useState([]);
  const [listIuran, setListIuran] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [isLoadingIuran, setIsLoadingIuran] = useState(false);
  const [listBukuKas, setListBukuKas] = useState([]); 
  const [cetakSurat, setCetakSurat] = useState(null); 

  // ==========================================
  // STATE MODAL GLOBAL PROFESIONAL
  // ==========================================
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'error', 'warning', 'success', 'info', 'fatal'
    showCancel: false,
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false, confirmText = 'Mengerti') => {
    setModal({ isOpen: true, title, message, type, onConfirm, showCancel, confirmText, cancelText: 'Batal' });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  const executeConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  // ==========================================
  // FUNGSI UMUM & AUTENTIKASI KELUAR
  // ==========================================
  const handleLogoutRequest = () => {
    showModal(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari Dasbor Warga? Anda perlu login kembali untuk mengakses layanan RT.",
      "warning",
      performLogout,
      true,
      "Ya, Keluar"
    );
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Efek delay loading keren selama 1.5 detik
      await new Promise(resolve => setTimeout(resolve, 1500));
      await supabase.auth.signOut();
      router.push('/'); 
    } catch (err) {
      console.error("Logout Error:", err);
      setIsLoggingOut(false);
      showModal("Gagal Keluar", "Terjadi kesalahan saat memutus sesi. Coba lagi.", "error");
    }
  };

  // ==========================================
  // EFFECT 1: CEK OTORISASI (AUTH GUARD)
  // ==========================================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          router.push('/');
          return;
        }
      } catch (err) {
        console.error("Gagal memverifikasi sesi:", err.message);
        router.push('/');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router, supabase]);

  // ==========================================
  // EFFECT 2: AUTO LOGOUT (IDLE 5 MENIT)
  // ==========================================
  useEffect(() => {
    if (isCheckingAuth) return;

    let timeoutId;
    const IDLE_TIME_LIMIT = 5 * 60 * 1000; // 5 Menit

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        showModal(
          "Sesi Habis",
          "Sesi Anda telah berakhir karena tidak ada aktivitas selama 5 menit untuk menjaga keamanan data.",
          "info",
          performLogout,
          false,
          "Tutup & Keluar"
        );
      }, IDLE_TIME_LIMIT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); 

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAuth]);

  // ==========================================
  // FUNGSI VERIFIKASI WARGA (2FA SEDERHANA)
  // ==========================================
  const verifikasiWarga = async (e) => {
    e.preventDefault();
    setIsLoadingAuth(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        showModal("Akses Ditolak", "Sesi Anda tidak valid atau telah habis. Silakan login kembali.", "fatal", performLogout, false, "Keluar");
        setIsLoadingAuth(false); return;
      }

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('nik').eq('id', user.id).single();

      if (profileError || !profileData || !profileData.nik) {
        showModal("Data Tidak Lengkap", "INFO SISTEM: Akun Anda tidak memiliki data NIK. Harap hubungi Ketua RT.", "fatal", performLogout, false, "Keluar");
        setIsLoadingAuth(false); return;
      }

      const nikInputBersih = String(inputNik).trim();
      const nikLoginBersih = String(profileData.nik).trim();

      if (nikInputBersih !== nikLoginBersih) {
        showModal("Peringatan Keamanan", `Anda terdeteksi mencoba menggunakan NIK warga lain. Akun ini hanya terikat dengan NIK: ${nikLoginBersih}.`, "fatal", performLogout, false, "Keluar");
        setIsLoadingAuth(false); return;
      }

      const { data: wargaData, error: wargaError } = await supabase.from('master_warga').select('*').eq('nik', nikInputBersih).single(); 
      const tglLahirDB = wargaData?.tgl_lahir ? String(wargaData.tgl_lahir).split('T')[0] : null;

      if (wargaError || !wargaData) {
        showModal("Tidak Terdaftar", "NIK Anda tidak ditemukan dalam database master warga RT.16.", "fatal", performLogout, false, "Keluar");
      } else if (tglLahirDB !== String(inputTanggalLahir).trim()) {
        showModal("Verifikasi Gagal", "Tanggal lahir yang Anda masukkan salah. Silakan periksa kembali Kartu Keluarga Anda.", "warning");
      } else {
        // Sukses Verifikasi
        setWargaAktif(wargaData);
        fetchDataWarga(wargaData.nik);
        fetchIuranWarga(wargaData.no_kk); 
        fetchTotalSaldoKas(); 
      }

    } catch (err) {
      console.error(err);
      showModal("Kesalahan Server", "Terjadi kesalahan sistem saat memverifikasi data. Coba beberapa saat lagi.", "fatal", performLogout, false, "Keluar");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const fetchDataWarga = async (nik) => {
    try {
      const { data: dataSurat } = await supabase.from('permintaan_surat').select('*').eq('nik_pemohon', nik).order('created_at', { ascending: false });
      if (dataSurat) setListPermintaan(dataSurat);

      const { data: dataUsulan } = await supabase.from('usulan_warga').select('*').eq('nik_pengusul', nik).order('created_at', { ascending: false });
      if (dataUsulan) setListUsulan(dataUsulan);
    } catch (err) {
      console.error("Gagal menarik data:", err.message);
    }
  };

  const fetchIuranWarga = async (no_kk) => {
    setIsLoadingIuran(true);
    try {
      if (!no_kk) { setListIuran([]); return; }
      const { data: anggotaKeluarga } = await supabase.from('master_warga').select('nik').eq('no_kk', String(no_kk));
      if (!anggotaKeluarga) return;
      
      const listNikKeluarga = anggotaKeluarga.map(anggota => String(anggota.nik));
      if (listNikKeluarga.length === 0) return;

      const { data } = await supabase.from('iuran_kas').select('*').in('nik_warga', listNikKeluarga).ilike('tipe_transaksi', 'pemasukan').order('tahun_iuran', { ascending: false }).order('bulan_iuran', { ascending: false });
      if (data) setListIuran(data);
    } catch (err) {
      console.error("Gagal menarik iuran:", err.message);
    } finally {
      setIsLoadingIuran(false);
    }
  };

  const fetchTotalSaldoKas = async () => {
    try {
      const { data: dataIuran } = await supabase.from('iuran_kas').select('*');
      const { data: dataPengeluaran } = await supabase.from('pengeluaran_kas').select('*');

      let totalPemasukan = 0; let totalPengeluaran = 0; const gabunganKas = []; 

      if (dataIuran) {
        dataIuran.forEach(item => {
          const isMasuk = String(item.tipe_transaksi).toLowerCase() === 'pemasukan';
          if (isMasuk) {
            totalPemasukan += Number(item.jumlah);
            if (Number(item.jumlah) > 0) {
              gabunganKas.push({ id: `in_${item.id}`, tanggal: new Date(item.tanggal_bayar), keterangan: `Iuran Warga - ${item.nama_warga} (${item.bulan_iuran} ${item.tahun_iuran})`, tipe: 'Pemasukan', nominal: Number(item.jumlah) });
            }
          } else { totalPemasukan -= Number(item.jumlah); }
        });
      }

      if (dataPengeluaran) {
        dataPengeluaran.forEach(item => {
          totalPengeluaran += Number(item.nominal);
          gabunganKas.push({ id: `out_${item.id}`, tanggal: new Date(item.tanggal), keterangan: item.keterangan || item.nama_pengeluaran || 'Pengeluaran RT', tipe: 'Pengeluaran', nominal: Number(item.nominal) });
        });
      }

      gabunganKas.sort((a, b) => b.tanggal - a.tanggal);
      setSaldoTotal(totalPemasukan - totalPengeluaran);
      setListBukuKas(gabunganKas); 
    } catch (err) { 
      console.error("Gagal menghitung saldo kas:", err.message); 
    }
  };

  // ==========================================
  // RENDER LAYAR LOADING AUTH GUARD
  // ==========================================
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse tracking-wide">Memverifikasi Otorisasi Warga...</p>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 1: FORM VERIFIKASI 2FA (NIK & TGL LAHIR)
  // ==========================================
  if (!wargaAktif) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative">
        
        {/* LAYAR LOADING SAAT LOGOUT */}
        {isLoggingOut && (
          <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-20 h-20 relative mb-6">
              <div className="absolute inset-0 border-4 border-red-50 border-t-red-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-gray-50 border-b-gray-400 rounded-full animate-spin-slow"></div>
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Sedang mengeluarkan Anda...</h2>
            <p className="text-gray-500 mt-2 font-medium">Menghapus sesi keamanan anda secara aman.</p>
          </div>
        )}

        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] max-w-md w-full border-t-[6px] border-blue-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-50 rounded-full opacity-50"></div>
          
          <div className="text-center mb-8 relative z-10">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Verifikasi Warga</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">Pastikan NIK dan Tanggal Lahir sesuai dengan Kartu Keluarga Anda.</p>
          </div>
          
          <form onSubmit={verifikasiWarga} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Nomor Induk Kependudukan</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                <input type="text" required value={inputNik} onChange={(e) => setInputNik(e.target.value)} placeholder="16 Digit NIK..." className="w-full border border-gray-200 pl-11 pr-4 py-3 rounded-xl bg-gray-50 focus:bg-white text-lg font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-left">Tanggal Lahir</label>
              <input type="date" required value={inputTanggalLahir} onChange={(e) => setInputTanggalLahir(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl text-center bg-gray-50 focus:bg-white text-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
            </div>
            <button type="submit" disabled={isLoadingAuth} className="w-full bg-blue-600 text-white font-bold py-4 mt-2 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
              {isLoadingAuth ? 'Mencocokkan Data...' : 'Akses Dasbor Warga'}
            </button>
          </form>
          
          <div className="mt-6 text-center relative z-10">
            <button onClick={handleLogoutRequest} className="text-red-500 font-bold text-sm hover:text-red-600 transition-colors">Batal & Keluar</button>
          </div>
        </div>

        {/* MODAL GLOBAL UI - Render di level utama jika !wargaAktif */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
              <div className="p-8 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                  (modal.type === 'error' || modal.type === 'fatal') ? 'bg-red-50 text-red-500 shadow-red-100' :
                  modal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                  modal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                  'bg-blue-50 text-blue-500 shadow-blue-100'
                }`}>
                  {(modal.type === 'error' || modal.type === 'fatal') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                  {modal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                  {modal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                  {modal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{modal.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{modal.message}</p>
                
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={executeConfirm}
                    className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                      (modal.type === 'error' || modal.type === 'fatal') ? 'bg-red-500 shadow-red-200' :
                      modal.type === 'warning' ? 'bg-amber-500 shadow-amber-200' :
                      modal.type === 'success' ? 'bg-green-500 shadow-green-200' :
                      'bg-blue-600 shadow-blue-200'
                    }`}
                  >
                    {modal.confirmText}
                  </button>
                  
                  {modal.showCancel && (
                    <button onClick={closeModal} className="w-full py-4 px-6 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-colors">
                      {modal.cancelText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <style jsx global>{`
          @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        `}</style>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 2: DASBOR UTAMA WARGA
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-6 md:p-10 print:p-0 print:bg-white relative">
      
      {/* LOADING OVERLAY SAAT LOGOUT */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative mb-6">
            <div className="absolute inset-0 border-4 border-red-50 border-t-red-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-gray-50 border-b-gray-400 rounded-full animate-spin-slow"></div>
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Sedang mengeluarkan Anda...</h2>
          <p className="text-gray-500 mt-2 font-medium">Menghapus sesi keamanan anda secara aman.</p>
        </div>
      )}

      {/* HEADER UTAMA */}
      <div className="max-w-6xl mx-auto bg-white p-5 md:p-7 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200 shrink-0 border border-blue-400">
            {wargaAktif.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">Halo, <span className="text-blue-700">{wargaAktif.nama.split(' ')[0]}</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-sm font-medium text-gray-500">Panel Layanan Mandiri RT.16</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogoutRequest} 
          className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-50 px-6 py-3.5 rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 font-bold shadow-sm hover:shadow-red-200"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Keluar
        </button>
      </div>

      {/* NAVIGASI TAB ELEGANT */}
      {!cetakSurat && (
        <div className="max-w-6xl mx-auto mb-8 print:hidden">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex-wrap gap-1">
            <button onClick={() => setActiveTab('surat')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'surat' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
              💌 Permintaan Surat
            </button>
            <button onClick={() => setActiveTab('usulan')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'usulan' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
              🗣️ Usulan Warga
            </button>
            <button onClick={() => setActiveTab('iuran')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'iuran' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
              💰 Iuran Kas
            </button>
            {wargaAktif.is_petugas_iuran && (
              <button onClick={() => setActiveTab('tugas_petugas')} className={`flex-1 min-w-[150px] py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'tugas_petugas' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-100'}`}>
                📝 Tugas Pungut Kas
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* RENDER KOMPONEN BERDASARKAN TAB AKTIF */}
      {/* ========================================== */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'surat' && !cetakSurat && (
          <PermintaanSuratView 
            wargaAktif={wargaAktif}
            listPermintaan={listPermintaan}
            fetchDataWarga={fetchDataWarga}
            cetakSurat={cetakSurat}
            setCetakSurat={setCetakSurat}
          />
        )}
        {activeTab === 'usulan' && !cetakSurat && <UsulanWargaView wargaAktif={wargaAktif} listUsulan={listUsulan} fetchDataWarga={fetchDataWarga} setActiveTab={setActiveTab} />}
        {activeTab === 'iuran' && !cetakSurat && <IuranWargaView saldoTotal={saldoTotal} listIuran={listIuran} isLoadingIuran={isLoadingIuran} wargaAktif={wargaAktif} listBukuKas={listBukuKas} />}
        {activeTab === 'tugas_petugas' && !cetakSurat && wargaAktif.is_petugas_iuran && <PetugasPemungutanView wargaAktif={wargaAktif} />}
      </div>

      {/* ========================================== */}
      {/* TAMPILAN PREVIEW & CETAK SURAT KELURAHAN (RESPONSIVE) */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print-container m-0 p-0 shadow-none max-w-5xl mx-auto print:font-serif animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-900 p-5 rounded-2xl print:hidden sticky top-4 z-50 shadow-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>
              <p className="text-white font-bold text-sm tracking-wide">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-600 transition-colors">
                Tutup Dokumen
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-100 p-4 sm:p-8 rounded-2xl print:bg-white print:p-0 flex justify-center">
            
            <div 
              className="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] print:shadow-none font-serif text-sm sm:text-[12pt] print:text-[12pt] leading-snug text-justify text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:h-[297mm] p-4 sm:p-[1.5cm_2cm] print:p-[1.5cm_2cm] box-border mx-auto"
            >
              
              {/* --- KOP SURAT --- */}
              <div className="relative border-b-[3px] border-black pb-2 mb-4 flex justify-center items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <img src="/logo-palembang.png" alt="Logo Palembang" className="w-14 h-14 sm:w-24 sm:h-24 print:w-24 print:h-24 object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                </div>
                <div className="w-full text-center pl-16 sm:pl-8 print:pl-8">
                  <h2 className="text-[11pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight">PEMERINTAH KOTA PALEMBANG</h2>
                  <h2 className="text-[11pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight whitespace-normal sm:whitespace-nowrap print:whitespace-nowrap">KELURAHAN TALANGPUTRI KECAMATAN PLAJU</h2>
                  <h1 className="text-[12pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight mt-1">KETUA RT.16 RW.04</h1>
                  <p className="text-[9pt] sm:text-[11pt] print:text-[11pt] mt-1 leading-tight">Jl. Kapten Robani Kadir RT.16 RW.04 Kode Pos : 30267</p>
                </div>
              </div>

              {/* --- JUDUL SURAT --- */}
              <div className="text-center mb-5 break-inside-avoid">
                <h1 className="font-bold text-base sm:text-[14pt] print:text-[14pt] underline tracking-wide uppercase">SURAT KETERANGAN</h1>
                <p className="text-sm sm:text-[12pt] print:text-[12pt] mt-1">Nomor : {cetakSurat?.nomorSurat}</p>
              </div>

              {/* --- ISI SURAT --- */}
              <p className="mb-2 text-left">Yang bertanda tangan dibawah ini :</p>
              <table className="mb-3 ml-0 sm:ml-4 print:ml-4 leading-snug break-inside-avoid w-full sm:w-auto text-[10pt] sm:text-[12pt] print:text-[12pt]">
                <tbody>
                  <tr><td className="w-24 sm:w-40 print:w-40 align-top">Nama</td><td className="w-2 sm:w-4 print:w-4 align-top">:</td><td className="font-bold uppercase align-top">GUNTUR BAYU JANTORO</td></tr>
                  <tr><td className="align-top">Jabatan</td><td className="align-top">:</td><td className="align-top">Ketua RT.16</td></tr>
                </tbody>
              </table>

              <p className="mb-2 text-left">Dengan ini menerangkan bahwa :</p>
              <table className="mb-3 ml-0 sm:ml-4 print:ml-4 leading-snug break-inside-avoid w-full sm:w-auto text-[10pt] sm:text-[12pt] print:text-[12pt]">
                <tbody>
                  <tr><td className="w-24 sm:w-40 print:w-40 align-top py-0.5">Nama</td><td className="w-2 sm:w-4 print:w-4 align-top py-0.5">:</td><td className="font-bold uppercase align-top py-0.5">{cetakSurat?.warga?.nama || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">NIK</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.nik || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Jenis Kelamin</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{(cetakSurat?.warga?.jenis_kelamin || '').toLowerCase().startsWith('l') ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td className="align-top py-0.5">Tempat/Tgl. Lahir</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.tempat_lahir || '-'} / {cetakSurat?.warga?.tgl_lahir || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Bangsa/Agama</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">Indonesia / {cetakSurat?.warga?.agama || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Pekerjaan</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5 capitalize">{cetakSurat?.warga?.pekerjaan || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Alamat</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.alamat || '-'}<br/>RT.16 RW.04 Kelurahan Talangputri Kec. Plaju</td></tr>
                  <tr><td className="align-top py-0.5">Kartu Keluarga No</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.no_kk || '-'}</td></tr>
                </tbody>
              </table>

              <p className="mb-2 text-justify indent-6 sm:indent-[1cm] print:indent-[1cm]">Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas {cetakSurat?.deskripsi}</p>
              
              <p className="mb-2 text-left">Surat Keterangan ini diberikan untuk : <strong className="uppercase">{cetakSurat?.tujuan}</strong></p>
              <p className="mb-4 text-left break-inside-avoid">Demikian keterangan ini untuk dipergunakan seperlunya.</p>
              
              {/* --- AREA TANDA TANGAN --- */}
              <div className="w-full mt-4 break-inside-avoid text-[10pt] sm:text-[12pt] print:text-[12pt] leading-normal flex relative z-10">
                <div className="w-1/2 text-center">
                  <p className="invisible mb-1">Palembang, {cetakSurat?.tanggal}</p>
                  <p className="font-bold">Mengetahui,<br/>Ketua RW.04</p>
                  <div className="h-16 sm:h-20 print:h-20"></div>
                  <p className="font-bold uppercase underline" style={{ textUnderlineOffset: '2px' }}>HERIYANSAH</p>
                </div>
                
                <div className="w-1/2 text-center flex flex-col items-center">
                  <p className="mb-1">Palembang, {cetakSurat?.tanggal}</p>
                  <p className="font-bold"><span className="invisible">Mengetahui,</span><br/>Ketua RT.16</p>
                  
                  <div className="h-16 sm:h-20 print:h-20 relative w-full flex items-center justify-center">
                    <img src="/ttd-guntur.png" alt="TTD" className="absolute bottom-[-15px] sm:bottom-[-30px] print:bottom-[-30px] w-28 sm:w-56 print:w-56 h-auto z-10 pointer-events-none" style={{ mixBlendMode: 'multiply' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>

                  <p className="font-bold uppercase underline relative z-0" style={{ textUnderlineOffset: '2px' }}>
                    GUNTUR BAYU JANTORO
                  </p>
                </div>
              </div>

              {/* --- CATATAN PBB --- */}
              <div className="mt-6 text-xs sm:text-[11pt] print:text-[11pt] leading-tight break-inside-avoid text-left relative z-10">
                <p className="font-bold">Catatan :</p>
                <p>PBB Tahun {new Date().getFullYear()} : <span className="font-bold">{cetakSurat?.pbb || 'Lunas'}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL UI - Render jika Warga Aktif sudah terverifikasi */}
      {wargaAktif && modal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                (modal.type === 'error' || modal.type === 'fatal') ? 'bg-red-50 text-red-500 shadow-red-100' :
                modal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                modal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {(modal.type === 'error' || modal.type === 'fatal') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {modal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {modal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {modal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{modal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{modal.message}</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={executeConfirm}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                    (modal.type === 'error' || modal.type === 'fatal') ? 'bg-red-500 shadow-red-200' :
                    modal.type === 'warning' ? 'bg-amber-500 shadow-amber-200' :
                    modal.type === 'success' ? 'bg-green-500 shadow-green-200' :
                    'bg-blue-600 shadow-blue-200'
                  }`}
                >
                  {modal.confirmText}
                </button>
                
                {modal.showCancel && (
                  <button onClick={closeModal} className="w-full py-4 px-6 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-colors">
                    {modal.cancelText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PRINT CSS MURNI DAN AMAN (NO BLANK PAGE) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait !important; margin: 0 !important; }
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
          .print-container { 
            display: flex !important; 
            justify-content: center !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            border: none !important; 
            box-shadow: none !important; 
          }
          .break-inside-avoid { break-inside: avoid !important; }
          table { page-break-inside: avoid !important; }
        }
        .text-capitalize { text-transform: capitalize; }
        .text-indent-8 { text-indent: 1cm; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}} />
    </div>
  );
}