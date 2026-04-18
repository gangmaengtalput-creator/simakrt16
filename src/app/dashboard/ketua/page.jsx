// File: src/app/dashboard/ketua/page.jsx
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

export const dynamic = 'force-dynamic';

export default function DashboardKetua() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  // ==========================================
  // STATE GLOBAL UTAMA
  // ==========================================
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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

  // State Khusus Surat (Dishare antara Kotak Masuk & Generator)
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
  // FUNGSI FETCH & LOGIC GLOBAL (WITH ERROR HANDLING)
  // ==========================================
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/'); 
    } catch (err) {
      console.error("Gagal logout:", err.message);
      alert("Terjadi kesalahan saat logout. Silakan coba lagi.");
    }
  };

  const fetchWarga = async () => {
    setIsLoading(true); 
    setActiveView('data_warga');
    try {
      const { data, error } = await supabase.from('master_warga').select('*').order('nama', { ascending: true });
      if (error) throw error;
      if (data) setDataWarga(data);
    } catch (err) {
      console.error("Error fetchWarga:", err.message);
      alert("Gagal mengambil data warga.");
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
      console.error("Error fetchPermintaanMasuk:", err.message);
      alert("Gagal mengambil data permintaan surat masuk.");
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
      console.error("Error fetchUsulan:", err.message);
      alert("Gagal mengambil data usulan warga.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiwayatIuran = async () => {
    setIsLoading(true);
    setActiveView('iuran_kas');
    try {
      if (dataWarga.length === 0) { 
        const { data, error } = await supabase.from('master_warga').select('*').order('nama', { ascending: true }); 
        if (error) throw error;
        if (data) setDataWarga(data); 
      }
      const { data: iuranDb, error: iuranError } = await supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false });
      if (iuranError) throw iuranError;
      
      if (iuranDb) {
        setListRiwayatIuran(iuranDb);
        const totalSemua = iuranDb.reduce((acc, item) => acc + (item.jumlah || 0), 0);
        setTotalSaldoAllTime(totalSemua);
      }
    } catch (err) {
      console.error("Error fetchRiwayatIuran:", err.message);
      alert("Gagal mengambil riwayat iuran.");
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
        const total = data.reduce((acc, item) => acc + (item.nominal || 0), 0);
        setTotalPengeluaranAllTime(total);
      }
    } catch (err) {
      console.error("Error fetchRiwayatPengeluaran:", err.message);
      if (changeView) alert("Gagal mengambil data riwayat pengeluaran.");
    } finally {
      if (changeView) setIsLoading(false);
    }
  };

  const fetchRiwayatSurat = async () => {
    setIsLoading(true);
    try {
      if (dataWarga.length === 0) { 
        const { data, error } = await supabase.from('master_warga').select('*'); 
        if (error) throw error;
        if (data) setDataWarga(data); 
      }
      const { data: suratData, error: suratError } = await supabase.from('surat_keterangan').select('*').order('created_at', { ascending: false });
      if (suratError) throw suratError;
      if (suratData) setRiwayatSurat(suratData);
    } catch (err) {
      console.error("Error fetchRiwayatSurat:", err.message);
      alert("Gagal mengambil riwayat surat.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAkunPending = async () => {
  setActiveView('verifikasi_akun');
  setIsLoading(true);
  try {
    // Mengambil akun yang statusnya masih 'pending'
    const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending');
    if (error) throw error;
    if (data) setAkunPending(data);
  } catch (err) {
    console.error("Error fetch pending:", err.message);
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
      
      if (error) throw error;
      
      if (!wargaInfo) {
        alert("Error: Data warga pemohon tidak ditemukan di master database.");
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
      console.error("Error prosesPermintaanWarga:", err.message);
      alert("Terjadi kesalahan saat memproses data warga pemohon.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // CEK LOGIN & INISIALISASI DATA AWAL
  // ==========================================
  useEffect(() => {
    const checkAuthAndInitData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (!session || authError) {
          router.push('/');
          return; 
        }

        // Jalankan fetch awal tanpa menghentikan flow jika ada error di salah satu fetch
        fetchRiwayatPengeluaran(false);
        
        const { data: iuranData, error: iuranError } = await supabase.from('iuran_kas').select('jumlah');
        if (iuranError) {
          console.error("Gagal init total iuran:", iuranError.message);
        } else if (iuranData) {
          setTotalSaldoAllTime(iuranData.reduce((acc, item) => acc + (item.jumlah || 0), 0));
        }

      } catch (err) {
        console.error("Sistem gagal inisialisasi:", err.message);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndInitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ==========================================
  // AUTO LOGOUT JIKA IDLE (TIDAK AKTIF 5 MENIT)
  // ==========================================
  useEffect(() => {
    let timeoutId;
    
    // 5 menit dalam milidetik
    const IDLE_TIMEOUT = 5 * 60 * 1000; 

    const handleIdleLogout = async () => {
      try {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali.");
        await supabase.auth.signOut();
        router.push('/');
      } catch (err) {
        console.error("Error idle logout:", err);
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdleLogout, IDLE_TIMEOUT);
    };

    const events = [
      'mousemove', 
      'keydown', 
      'wheel', 
      'DOMMouseScroll', 
      'mouseWheel', 
      'mousedown', 
      'touchstart', 
      'touchmove'
    ];

    if (!isCheckingAuth) {
      events.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isCheckingAuth, router]); 

  // ==========================================
  // RENDER UI BERDASARKAN KOMPONEN
  // ==========================================

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-600 font-semibold animate-pulse">
          Memeriksa otorisasi...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-8 print:p-0 print:bg-white">
      
      {/* HEADER UTAMA */}
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-sm border-t-4 border-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Panel Ketua RT</h1>
          <p className="text-xs sm:text-sm text-gray-600">Sistem Informasi Manajemen Kependudukan</p>
        </div>
        <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold">
          Keluar
        </button>
      </div>

      {/* RENDER VIEW SWITCHER */}
      {activeView === 'menu' && (
        <MainMenu 
          totalSaldoAllTime={totalSaldoAllTime}
          totalPengeluaranAllTime={totalPengeluaranAllTime}
          fetchWarga={fetchWarga}
          fetchPermintaanMasuk={fetchPermintaanMasuk}
          goToBuatSurat={goToBuatSurat}
          fetchUsulan={fetchUsulan}
          fetchRiwayatIuran={fetchRiwayatIuran}
          setActiveView={setActiveView}
          fetchAkunPending={fetchAkunPending}
          akunPending={akunPending}
        />
      )}

      {activeView === 'data_warga' && (
        <DataWargaView 
          setActiveView={setActiveView} 
          dataWarga={dataWarga} 
          fetchWarga={fetchWarga} 
        />
      )}

      {activeView === 'permintaan_masuk' && (
        <PermintaanMasukView 
          setActiveView={setActiveView} 
          permintaanMasuk={permintaanMasuk} 
          fetchPermintaanMasuk={fetchPermintaanMasuk}
          prosesPermintaanWarga={prosesPermintaanWarga}
          isLoading={isLoading}
        />
      )}

      {activeView === 'buat_surat' && (
        <BuatSuratView
          activeView={activeView}     
          setActiveView={setActiveView}
          dataWarga={dataWarga}
          riwayatSurat={riwayatSurat}
          fetchRiwayatSurat={fetchRiwayatSurat}
          suratNIK={suratNIK} setSuratNIK={setSuratNIK}
          wargaSurat={wargaSurat} setWargaSurat={setWargaSurat}
          suratFormData={suratFormData} setSuratFormData={setSuratFormData}
          cetakSurat={cetakSurat} setCetakSurat={setCetakSurat}
          permintaanAktifId={permintaanAktifId} setPermintaanAktifId={setPermintaanAktifId}
          fetchPermintaanMasuk={fetchPermintaanMasuk}
        />
      )}

      {activeView === 'manajemen_usulan' && (
        <ManajemenUsulanView 
          setActiveView={setActiveView} 
          usulanMasuk={usulanMasuk} 
          fetchUsulan={fetchUsulan} 
        />
      )}

      {activeView === 'iuran_kas' && (
        <IuranKasView 
          setActiveView={setActiveView} 
          dataWarga={dataWarga} 
          listRiwayatIuran={listRiwayatIuran} 
          fetchRiwayatIuran={fetchRiwayatIuran} 
          totalSaldoAllTime={totalSaldoAllTime}
        />
      )}

      {activeView === 'pengeluaran_kas' && (
        <PengeluaranKasView 
          setActiveView={setActiveView} 
          listRiwayatPengeluaran={listRiwayatPengeluaran} 
          fetchRiwayatPengeluaran={fetchRiwayatPengeluaran} 
        />
      )}
      
      {activeView === 'penunjukan_petugas' && (
        <PenunjukanPetugasView 
          setActiveView={setActiveView} 
          dataWarga={dataWarga} 
          fetchWarga={fetchWarga} 
        />
      )}

      {activeView === 'laporan' && (
        <LaporanView 
          setActiveView={setActiveView} 
          dataWarga={dataWarga} 
        />
      )}

      {activeView === 'verifikasi_akun' && (
        <VerifikasiAkunView 
          setActiveView={setActiveView} 
          akunPending={akunPending} 
          fetchAkunPending={fetchAkunPending} 
        />
      )}

    </div>
  );
}