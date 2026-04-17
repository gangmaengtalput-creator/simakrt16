// File: src/app/dashboard/warga/page.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

// === IMPORT KOMPONEN YANG TELAH DIPECAH ===
import PermintaanSuratView from '../../../components/DashboardWarga/PermintaanSuratView';
import UsulanWargaView from '../../../components/DashboardWarga/UsulanWargaView';
import IuranWargaView from '../../../components/DashboardWarga/IuranWargaView';
import PetugasPemungutanView from '../../../components/DashboardWarga/PetugasPemungutanView';

export const dynamic = 'force-dynamic';

export default function DashboardWarga() {
  const router = useRouter();
  
  // ==========================================
  // STATE KEAMANAN & AUTENTIKASI AWAL
  // ==========================================
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Gembok Halaman

  // ==========================================
  // STATE AUTENTIKASI & DATA DIRI
  // ==========================================
  const [wargaAktif, setWargaAktif] = useState(null);
  const [inputNik, setInputNik] = useState('');
  const [inputTanggalLahir, setInputTanggalLahir] = useState(''); 
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // STATE MODAL ERROR
  const [errorModal, setErrorModal] = useState({ open: false, message: '', type: 'WARNING' });

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
  // FUNGSI UMUM & AUTENTIKASI (WITH ERROR HANDLING)
  // ==========================================
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.push('/'); 
    } catch (err) {
      console.error("Logout Error:", err);
    }
  }, [router]);

  const handleErrorModalClose = async () => {
    if (errorModal.type === 'FATAL') {
      await handleLogout();
    } else {
      setErrorModal({ open: false, message: '', type: 'WARNING' });
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
  }, [router]);

  // ==========================================
  // EFFECT 2: AUTO LOGOUT (IDLE 5 MENIT)
  // ==========================================
  useEffect(() => {
    // Jangan jalankan timer jika halaman masih memuat awal
    if (isCheckingAuth) return;

    let timeoutId;
    const IDLE_TIME_LIMIT = 5 * 60 * 1000; // 5 Menit

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 5 menit.");
        await handleLogout();
      }, IDLE_TIME_LIMIT);
    };

    // Deteksi interaksi pengguna
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Mulai timer pertama kali

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isCheckingAuth, handleLogout]);

  // ==========================================
  // FUNGSI VERIFIKASI WARGA (2FA SEDERHANA)
  // ==========================================
  const verifikasiWarga = async (e) => {
    e.preventDefault();
    setIsLoadingAuth(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorModal({ open: true, message: "Sesi Anda tidak valid atau telah habis. Silakan login kembali.", type: 'FATAL' });
        setIsLoadingAuth(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nik')
        .eq('id', user.id) 
        .single();

      if (profileError || !profileData || !profileData.nik) {
        setErrorModal({ open: true, message: `INFO SISTEM: Akun Anda tidak memiliki data NIK di tabel profiles. Harap hubungi Admin.`, type: 'FATAL' });
        setIsLoadingAuth(false);
        return;
      }

      const nikInputBersih = String(inputNik).trim();
      const nikLoginBersih = String(profileData.nik).trim();

      if (nikInputBersih !== nikLoginBersih) {
        setErrorModal({ open: true, message: `AKSES DITOLAK: Anda terdeteksi mencoba menggunakan NIK warga lain. (Akun ini terikat dengan NIK: ${nikLoginBersih}).`, type: 'FATAL' });
        setIsLoadingAuth(false);
        return;
      }

      const { data: wargaData, error: wargaError } = await supabase
        .from('master_warga')
        .select('*')
        .eq('nik', nikInputBersih)
        .single(); 
      
      const tglLahirDB = wargaData?.tgl_lahir ? String(wargaData.tgl_lahir).split('T')[0] : null;

      if (wargaError || !wargaData) {
        setErrorModal({ open: true, message: "NIK tidak ditemukan dalam database warga RT kami.", type: 'FATAL' });
      } else if (tglLahirDB !== String(inputTanggalLahir).trim()) {
        setErrorModal({ open: true, message: "Masukkan tanggal lahir yang benar, ulangi login.", type: 'WARNING' });
      } else {
        setWargaAktif(wargaData);
        fetchDataWarga(wargaData.nik);
        fetchIuranWarga(wargaData.no_kk); 
        fetchTotalSaldoKas(); 
      }

    } catch (err) {
      console.error(err);
      setErrorModal({ open: true, message: "Terjadi kesalahan sistem saat memverifikasi data.", type: 'FATAL' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const fetchDataWarga = async (nik) => {
    try {
      const { data: dataSurat, error: errorSurat } = await supabase.from('permintaan_surat').select('*').eq('nik_pemohon', nik).order('created_at', { ascending: false });
      if (errorSurat) throw errorSurat;
      if (dataSurat) setListPermintaan(dataSurat);

      const { data: dataUsulan, error: errorUsulan } = await supabase.from('usulan_warga').select('*').eq('nik_pengusul', nik).order('created_at', { ascending: false });
      if (errorUsulan) throw errorUsulan;
      if (dataUsulan) setListUsulan(dataUsulan);
    } catch (err) {
      console.error("Gagal menarik data personal warga:", err.message);
    }
  };

  const fetchIuranWarga = async (no_kk) => {
    setIsLoadingIuran(true);
    try {
      if (!no_kk) {
        setListIuran([]);
        return;
      }

      const { data: anggotaKeluarga, error: kkError } = await supabase.from('master_warga').select('nik').eq('no_kk', String(no_kk));
      if (kkError || !anggotaKeluarga) throw kkError;
      
      const listNikKeluarga = anggotaKeluarga.map(anggota => String(anggota.nik));
      if (listNikKeluarga.length === 0) {
        setListIuran([]);
        return;
      }

      const { data, error } = await supabase
        .from('iuran_kas')
        .select('*')
        .in('nik_warga', listNikKeluarga)
        .ilike('tipe_transaksi', 'pemasukan')
        .order('tahun_iuran', { ascending: false })
        .order('bulan_iuran', { ascending: false });

      if (error) throw error;
      if (data) setListIuran(data);
    } catch (err) {
      console.error("Gagal menarik data iuran:", err.message);
    } finally {
      setIsLoadingIuran(false);
    }
  };

  const fetchTotalSaldoKas = async () => {
    try {
      const { data: dataIuran, error: errIuran } = await supabase.from('iuran_kas').select('*');
      const { data: dataPengeluaran, error: errKeluar } = await supabase.from('pengeluaran_kas').select('*');

      if (errIuran) throw errIuran;
      if (errKeluar) throw errKeluar;

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
  // RENDER LAYAR LOADING (SECURITY FIRST)
  // ==========================================
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium animate-pulse">Memverifikasi Sesi Warga...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 1: VERIFIKASI NIK
  // ==========================================
  if (!wargaAktif) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-blue-600">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Verifikasi Warga</h2>
            <p className="text-sm text-gray-500 mt-2">Pastikan NIK dan Tanggal Lahir sesuai dengan Kartu Keluarga.</p>
          </div>
          <form onSubmit={verifikasiWarga} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-left">Nomor Induk Kependudukan (NIK)</label>
              <input type="text" required value={inputNik} onChange={(e) => setInputNik(e.target.value)} placeholder="Masukkan 16 Digit NIK..." className="w-full border p-3 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-left">Tanggal Lahir</label>
              <input type="date" required value={inputTanggalLahir} onChange={(e) => setInputTanggalLahir(e.target.value)} className="w-full border p-3 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={isLoadingAuth} className="w-full bg-blue-600 text-white font-bold py-3 mt-4 rounded-lg hover:bg-blue-700 transition-colors">
              {isLoadingAuth ? 'Mencocokkan Data...' : 'Akses Dasbor Warga'}
            </button>
          </form>
          <button onClick={handleLogout} className="w-full mt-4 text-red-500 font-medium text-sm hover:underline">Kembali ke Halaman Utama</button>
        </div>

        {errorModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
              <div className={`p-6 text-white flex flex-col justify-center items-center ${errorModal.type === 'FATAL' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {errorModal.type === 'FATAL' ? (
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                ) : (
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
                <h3 className="text-xl font-bold">{errorModal.type === 'FATAL' ? 'Akses Ditolak!' : 'Verifikasi Gagal'}</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-700 text-base mb-8">{errorModal.message}</p>
                <button onClick={handleErrorModalClose} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-colors ${errorModal.type === 'FATAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                  {errorModal.type === 'FATAL' ? 'Keluar' : 'Coba Lagi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 2: DASBOR UTAMA WARGA
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8 print:p-0 print:bg-white relative">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-sm border-t-4 border-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
            {wargaAktif.nama.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Halo, {wargaAktif.nama}</h1>
            <p className="text-xs sm:text-sm text-gray-600">Panel Layanan Mandiri RT.16</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold text-sm transition-colors">Keluar</button>
      </div>

      {/* NAVIGASI TAB */}
      {!cetakSurat && (
        <div className="max-w-5xl mx-auto mb-6 print:hidden">
          <div className="flex bg-gray-200 p-1 rounded-lg flex-wrap">
            <button onClick={() => setActiveTab('surat')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'surat' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              💌 Permintaan Surat
            </button>
            <button onClick={() => setActiveTab('usulan')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'usulan' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              🗣️ Usulan Warga
            </button>
            <button onClick={() => setActiveTab('iuran')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'iuran' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              💰 Iuran Kas
            </button>
            {wargaAktif.is_petugas_iuran && (
              <button onClick={() => setActiveTab('tugas_petugas')} className={`flex-1 min-w-[150px] py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'tugas_petugas' ? 'bg-green-600 text-white shadow' : 'bg-green-100 text-green-800 hover:bg-green-200 ml-1'}`}>
                📝 Tugas Pungut Kas
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* RENDER KOMPONEN BERDASARKAN TAB AKTIF */}
      {/* ========================================== */}
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

      {/* ========================================== */}
      {/* TAMPILAN PREVIEW & CETAK SURAT KELURAHAN (RESPONSIVE) */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print-container m-0 p-0 shadow-none max-w-5xl mx-auto print:font-serif">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-gray-800 p-4 rounded-lg print:hidden sticky top-4 z-50">
            <p className="text-white font-medium text-sm">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500 transition-colors">
                Tutup Dokumen
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-400 transition-colors">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-white print:p-0 flex justify-center">
            
            {/* KERTAS A4 - RESPONSIVE DI HP, KAKU SAAT PRINT/DESKTOP */}
            <div 
              className="bg-white shadow-2xl print:shadow-none font-serif text-sm sm:text-[12pt] print:text-[12pt] leading-snug text-justify text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:h-[297mm] p-4 sm:p-[1.5cm_2cm] print:p-[1.5cm_2cm] box-border mx-auto"
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
      `}} />
    </div>
  );
}