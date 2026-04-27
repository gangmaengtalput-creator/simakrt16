"use client";

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

import MainMenu from '../../../components/DashboardKetua/MainMenu';
import ManajemenUsulanView from '../../../components/DashboardKetua/ManajemenUsulanView';
import PengeluaranKasView from '../../../components/DashboardKetua/PengeluaranKasView';
import IuranKasView from '../../../components/DashboardKetua/IuranKasView';
import DataWargaView from '../../../components/DashboardKetua/DataWargaView';
import PermintaanMasukView from '../../../components/DashboardKetua/PermintaanMasukView';
import BuatSuratView from '../../../components/DashboardKetua/BuatSuratView';
import PenunjukanPetugasView from '../../../components/DashboardKetua/PenunjukanPetugasView';
import LaporanView from '../../../components/DashboardKetua/LaporanView';
import VerifikasiAkunView from '../../../components/DashboardKetua/VerifikasiAkunView';
// TAMBAHAN: Import komponen LaporanKasView
import LaporanKasView from '../../../components/DashboardKetua/LaporanKasView';

export const dynamic = 'force-dynamic';

export default function DashboardKetua() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  // ==========================================
  // STATE GLOBAL UTAMA
  // ==========================================
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [akunPending, setAkunPending] = useState([]);

  const [activeView, setActiveView] = useState('menu'); 
  const [isLoading, setIsLoading] = useState(false);

  const [dataWarga, setDataWarga] = useState([]);
  const [permintaanMasuk, setPermintaanMasuk] = useState([]);
  const [usulanMasuk, setUsulanMasuk] = useState([]);
  const [listRiwayatIuran, setListRiwayatIuran] = useState([]);
  const [totalSaldoAllTime, setTotalSaldoAllTime] = useState(0);
  const [listRiwayatPengeluaran, setListRiwayatPengeluaran] = useState([]);
  const [totalPengeluaranAllTime, setTotalPengeluaranAllTime] = useState(0);

  // State Khusus Surat
  const [permintaanAktifId, setPermintaanAktifId] = useState(null);
  const [suratNIK, setSuratNIK] = useState('');
  const [wargaSurat, setWargaSurat] = useState(null);
  const [suratFormData, setSuratFormData] = useState({
    deskripsi: 'berkelakuan baik dan belum pernah tersangkut perkara pidana maupun perdata.',
    tujuan_surat: 'Melamar Pekerjaan',
    pbb: 'Lunas'
  });
  const [cetakSurat, setCetakSurat] = useState(null);
  const [riwayatSurat, setRiwayatSurat] = useState([]);

  // ==========================================
  // MODAL STATE & HANDLER
  // ==========================================
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'error', 'warning', 'success', 'info'
    showCancel: false,
    confirmText: 'Mengerti',
    onConfirm: null,
  });

  const showModal = (title, message, type = 'info', onConfirm = null, showCancel = false, confirmText = 'Mengerti') => {
    setModal({ isOpen: true, title, message, type, onConfirm, showCancel, confirmText });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  const executeConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  // ==========================================
  // LOGIKA LOGOUT DENGAN KONFIRMASI
  // ==========================================
  const handleLogoutRequest = () => {
    showModal(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses panel ini.",
      "warning",
      performLogout,
      true,
      "Ya, Keluar"
    );
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Simulasi delay sedikit agar loading terasa "keren"
      await new Promise(resolve => setTimeout(resolve, 1500));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/'); 
    } catch (err) {
      console.error("Gagal logout:", err.message);
      setIsLoggingOut(false);
      showModal("Gagal Keluar", "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.", "error");
    }
  };

  // ==========================================
  // FUNGSI FETCH DATA (REFINED WITH MODALS)
  // ==========================================
  const fetchWarga = async () => {
    setIsLoading(true); 
    setActiveView('data_warga');
    try {
      const { data, error } = await supabase.from('master_warga').select('*').order('nama', { ascending: true });
      if (error) throw error;
      if (data) setDataWarga(data);
    } catch (err) {
      showModal("Gagal Mengambil Data", "Data warga tidak dapat dimuat.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermintaanMasuk = async () => {
    setActiveView('permintaan_masuk');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('permintaan_surat').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setPermintaanMasuk(data);
    } catch (err) {
      showModal("Gagal", "Permintaan surat tidak dapat dimuat.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsulan = async () => {
    setActiveView('manajemen_usulan');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('usulan_warga').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setUsulanMasuk(data);
    } catch (err) {
      showModal("Gagal", "Data usulan tidak dapat dimuat.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiwayatIuran = async () => {
    setIsLoading(true);
    setActiveView('iuran_kas');
    try {
      if (dataWarga.length === 0) { 
        const { data } = await supabase.from('master_warga').select('*').order('nama', { ascending: true }); 
        if (data) setDataWarga(data); 
      }
      const { data: iuranDb, error } = await supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false });
      if (error) throw error;
      if (iuranDb) {
        setListRiwayatIuran(iuranDb);
        setTotalSaldoAllTime(iuranDb.reduce((acc, item) => acc + (item.jumlah || 0), 0));
      }
    } catch (err) {
      showModal("Gagal", "Riwayat iuran tidak dapat dimuat.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiwayatPengeluaran = async (changeView = false) => {
    if (changeView) {
      setActiveView('pengeluaran_kas');
      setIsLoading(true);
    }
    try {
      const { data, error } = await supabase.from('pengeluaran_kas').select('*').order('tanggal', { ascending: false });
      if (error) throw error;
      if (data) {
        setListRiwayatPengeluaran(data);
        setTotalPengeluaranAllTime(data.reduce((acc, item) => acc + (item.nominal || 0), 0));
      }
    } catch (err) {
      if (changeView) showModal("Gagal", "Data pengeluaran tidak dapat dimuat.", "error");
    } finally {
      if (changeView) setIsLoading(false);
    }
  };

  const fetchRiwayatSurat = async () => {
    setIsLoading(true);
    try {
      if (dataWarga.length === 0) { 
        const { data } = await supabase.from('master_warga').select('*'); 
        if (data) setDataWarga(data); 
      }
      const { data: suratData, error } = await supabase.from('surat_keterangan').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (suratData) setRiwayatSurat(suratData);
    } catch (err) {
      showModal("Gagal", "Riwayat surat tidak dapat dimuat.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAkunPending = async () => {
    setActiveView('verifikasi_akun');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending');
      if (error) throw error;
      if (data) setAkunPending(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToBuatSurat = () => {
    setActiveView('buat_surat'); 
    setCetakSurat(null); 
    setWargaSurat(null); 
    setSuratNIK(''); 
    setPermintaanAktifId(null); 
    fetchRiwayatSurat();
  };

  const prosesPermintaanWarga = async (permintaan) => {
    setIsLoading(true);
    try {
      const { data: wargaInfo, error } = await supabase.from('master_warga').select('*').eq('nik', permintaan.nik_pemohon).single();
      if (error || !wargaInfo) {
        showModal("Warga Tidak Ditemukan", "NIK pemohon tidak terdaftar di data master.", "warning");
        setIsLoading(false); return;
      }
      setWargaSurat(wargaInfo);
      setSuratFormData({
        deskripsi: permintaan.keterangan,
        tujuan_surat: permintaan.tujuan,
        pbb: 'Lunas'
      });
      setPermintaanAktifId(permintaan.id);
      setActiveView('buat_surat');
    } catch (err) {
      showModal("Error", "Gagal memproses permintaan.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CEK LOGIN & INISIALISASI
  // ==========================================
  useEffect(() => {
    const checkAuthAndInitData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (!session || authError) {
          router.push('/');
          return; 
        }
        fetchRiwayatPengeluaran(false);
        const { data: iuranData } = await supabase.from('iuran_kas').select('jumlah');
        if (iuranData) {
          setTotalSaldoAllTime(iuranData.reduce((acc, item) => acc + (item.jumlah || 0), 0));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuthAndInitData();
  }, [router]);

  // ==========================================
  // AUTO LOGOUT (IDLE 5 MENIT)
  // ==========================================
  useEffect(() => {
    let timeoutId;
    const IDLE_TIMEOUT = 5 * 60 * 1000; 

    const handleIdleLogout = async () => {
      try {
        await supabase.auth.signOut();
        showModal(
          "Sesi Berakhir", 
          "Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas.", 
          "info",
          () => router.push('/')
        );
      } catch (err) {
        router.push('/');
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdleLogout, IDLE_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    if (!isCheckingAuth) {
      events.forEach((event) => window.addEventListener(event, resetTimer));
      resetTimer();
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isCheckingAuth, router]); 

  // TAMBAHAN: Auto-fetch data Iuran & Pengeluaran saat menu Laporan Kas dibuka
  useEffect(() => {
    if (activeView === 'laporan_kas') {
      const fetchSemuaDataKas = async () => {
        setIsLoading(true);
        try {
          const [{ data: iuran }, { data: pengeluaran }] = await Promise.all([
            supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false }),
            supabase.from('pengeluaran_kas').select('*').order('tanggal', { ascending: false })
          ]);
          if (iuran) setListRiwayatIuran(iuran);
          if (pengeluaran) setListRiwayatPengeluaran(pengeluaran);
        } catch (err) {
          console.error("Gagal menarik data Laporan Kas:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSemuaDataKas();
    }
  }, [activeView, supabase]);

  // ==========================================
  // RENDER UI
  // ==========================================

  // Loading Screen Saat Cek Auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Menyiapkan Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-6 md:p-10 print:p-0 print:bg-white relative">
      
      {/* LOADING OVERLAY SAAT LOGOUT */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative mb-6">
            <div className="absolute inset-0 border-4 border-red-50 border-t-red-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-gray-50 border-b-gray-400 rounded-full animate-spin-slow"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Sedang mengeluarkan Anda...</h2>
          <p className="text-gray-500 mt-2">Menghapus sesi keamanan anda secara aman.</p>
        </div>
      )}

      {/* HEADER UTAMA */}
      <div className="max-w-7xl mx-auto bg-white p-5 md:p-7 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">Panel Ketua RT</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-sm font-medium text-gray-500">Sistem Manajemen Kependudukan Aktif</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogoutRequest} 
          className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-50 px-6 py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 font-bold shadow-sm hover:shadow-red-200"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Keluar
        </button>
      </div>

      {/* VIEW SWITCHER */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'menu' && (
          <MainMenu 
            totalSaldoAllTime={totalSaldoAllTime} totalPengeluaranAllTime={totalPengeluaranAllTime}
            fetchWarga={fetchWarga} fetchPermintaanMasuk={fetchPermintaanMasuk}
            goToBuatSurat={goToBuatSurat} fetchUsulan={fetchUsulan}
            fetchRiwayatIuran={fetchRiwayatIuran} setActiveView={setActiveView}
            fetchAkunPending={fetchAkunPending} akunPending={akunPending}
          />
        )}

        {activeView === 'data_warga' && (
          <DataWargaView setActiveView={setActiveView} dataWarga={dataWarga} fetchWarga={fetchWarga} />
        )}

        {activeView === 'permintaan_masuk' && (
          <PermintaanMasukView 
            setActiveView={setActiveView} permintaanMasuk={permintaanMasuk} 
            fetchPermintaanMasuk={fetchPermintaanMasuk} prosesPermintaanWarga={prosesPermintaanWarga}
            isLoading={isLoading}
          />
        )}

        {activeView === 'buat_surat' && (
          <BuatSuratView
            activeView={activeView} setActiveView={setActiveView}
            dataWarga={dataWarga} riwayatSurat={riwayatSurat} fetchRiwayatSurat={fetchRiwayatSurat}
            suratNIK={suratNIK} setSuratNIK={setSuratNIK}
            wargaSurat={wargaSurat} setWargaSurat={setWargaSurat}
            suratFormData={suratFormData} setSuratFormData={setSuratFormData}
            cetakSurat={cetakSurat} setCetakSurat={setCetakSurat}
            permintaanAktifId={permintaanAktifId} setPermintaanAktifId={setPermintaanAktifId}
            fetchPermintaanMasuk={fetchPermintaanMasuk}
          />
        )}

        {activeView === 'manajemen_usulan' && (
          <ManajemenUsulanView setActiveView={setActiveView} usulanMasuk={usulanMasuk} fetchUsulan={fetchUsulan} />
        )}

        {activeView === 'iuran_kas' && (
          <IuranKasView setActiveView={setActiveView} dataWarga={dataWarga} listRiwayatIuran={listRiwayatIuran} fetchRiwayatIuran={fetchRiwayatIuran} totalSaldoAllTime={totalSaldoAllTime} />
        )}

        {activeView === 'pengeluaran_kas' && (
          <PengeluaranKasView setActiveView={setActiveView} listRiwayatPengeluaran={listRiwayatPengeluaran} fetchRiwayatPengeluaran={fetchRiwayatPengeluaran} />
        )}
        
        {activeView === 'penunjukan_petugas' && (
          <PenunjukanPetugasView setActiveView={setActiveView} dataWarga={dataWarga} fetchWarga={fetchWarga} />
        )}

        {activeView === 'laporan' && (
          <LaporanView setActiveView={setActiveView} dataWarga={dataWarga} />
        )}

        {activeView === 'verifikasi_akun' && (
          <VerifikasiAkunView setActiveView={setActiveView} akunPending={akunPending} fetchAkunPending={fetchAkunPending} />
        )}

        {/* TAMBAHAN: View Switcher untuk Laporan Kas */}
        {activeView === 'laporan_kas' && (
          <LaporanKasView
            setActiveView={setActiveView}
            listRiwayatIuran={listRiwayatIuran}
            listRiwayatPengeluaran={listRiwayatPengeluaran}
          />
        )}
      </div>

      {/* MODAL GLOBAL PROFESIONAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* Icon Container */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                modal.type === 'error' ? 'bg-red-50 text-red-500' :
                modal.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                modal.type === 'success' ? 'bg-green-50 text-green-500' :
                'bg-blue-50 text-blue-500'
              }`}>
                {modal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
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
                    modal.type === 'error' ? 'bg-red-500 shadow-red-200' :
                    modal.type === 'warning' ? 'bg-amber-500 shadow-amber-200' :
                    modal.type === 'success' ? 'bg-green-500 shadow-green-200' :
                    'bg-blue-600 shadow-blue-200'
                  }`}
                >
                  {modal.confirmText}
                </button>
                
                {modal.showCancel && (
                  <button
                    onClick={closeModal}
                    className="w-full py-4 px-6 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS KHUSUS UNTUK ANIMASI SLOW SPIN */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}