// File: src/app/dashboard/warga/page.jsx
"use client";

import { useState, useEffect } from 'react';
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
  // STATE AUTENTIKASI & DATA DIRI
  // ==========================================
  const [wargaAktif, setWargaAktif] = useState(null);
  const [inputNik, setInputNik] = useState('');
  const [inputTanggalLahir, setInputTanggalLahir] = useState(''); 
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // STATE MODAL ERROR (Pengganti Alert Rejection)
  const [errorModal, setErrorModal] = useState({ open: false, message: '', type: 'WARNING' }); // type: 'FATAL' | 'WARNING'

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
  const [cetakSurat, setCetakSurat] = useState(null); // Menyimpan data surat untuk dicetak

  // ==========================================
  // FUNGSI UMUM & AUTENTIKASI
  // ==========================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Pastikan '/' adalah path landing page Anda
  };

  const handleErrorModalClose = async () => {
    if (errorModal.type === 'FATAL') {
      await handleLogout();
    } else {
      setErrorModal({ open: false, message: '', type: 'WARNING' });
    }
  };

  const verifikasiWarga = async (e) => {
    e.preventDefault();
    setIsLoadingAuth(true);

    try {
      // 1. Dapatkan sesi user yang sedang login (hanya bawa email & ID auth)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorModal({ open: true, message: "Sesi Anda tidak valid atau telah habis. Silakan login kembali.", type: 'FATAL' });
        setIsLoadingAuth(false);
        return;
      }

      // 2. MENCARI NIK DARI TABEL PROFILES BERDASARKAN ID AKUN LOGIN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nik')
        .eq('id', user.id) // Cocokkan dengan ID user auth
        .single();

      if (profileError || !profileData || !profileData.nik) {
        setErrorModal({ 
          open: true, 
          message: `INFO SISTEM: Akun Anda tidak memiliki data NIK di tabel profiles. Harap hubungi Admin.`, 
          type: 'FATAL' 
        });
        setIsLoadingAuth(false);
        return;
      }

      // 3. PEMBERSIHAN FORMAT INPUT & DATABASE
      const nikInputBersih = String(inputNik).trim();
      const nikLoginBersih = String(profileData.nik).trim();

      // 4. PENCOCOKAN KETAT (Mencegah pakai NIK warga lain)
      if (nikInputBersih !== nikLoginBersih) {
        setErrorModal({ 
          open: true, 
          message: `AKSES DITOLAK: Anda terdeteksi mencoba menggunakan NIK warga lain. (Akun ini terikat dengan NIK: ${nikLoginBersih}).`, 
          type: 'FATAL' 
        });
        setIsLoadingAuth(false);
        return;
      }

      // 5. Verifikasi di Database master_warga untuk mengecek TANGGAL LAHIR
      const { data: wargaData, error: wargaError } = await supabase
        .from('master_warga')
        .select('*')
        .eq('nik', nikInputBersih)
        .single(); 
      
      const tglLahirDB = wargaData?.tgl_lahir ? String(wargaData.tgl_lahir).split('T')[0] : null;

      // 6. Logika Penolakan Akhir
      if (wargaError || !wargaData) {
        setErrorModal({ open: true, message: "NIK tidak ditemukan dalam database warga RT kami.", type: 'FATAL' });
      } else if (tglLahirDB !== String(inputTanggalLahir).trim()) {
        setErrorModal({ open: true, message: "Masukkan tanggal lahir yang benar, ulangi login.", type: 'WARNING' });
      } else {
        // Semua Cocok! Lolos Verifikasi
        setWargaAktif(wargaData);
        fetchDataWarga(wargaData.nik);
        fetchIuranWarga(wargaData.no_kk); // Tarik Iuran berdasar No. KK
        fetchTotalSaldoKas();
      }

    } catch (err) {
      console.error(err);
      setErrorModal({ open: true, message: "Terjadi kesalahan sistem saat memverifikasi data.", type: 'FATAL' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ==========================================
  // FUNGSI PENARIKAN DATA GLOBAL
  // ==========================================
  const fetchDataWarga = async (nik) => {
    const { data: dataSurat } = await supabase.from('permintaan_surat').select('*').eq('nik_pemohon', nik).order('created_at', { ascending: false });
    if (dataSurat) setListPermintaan(dataSurat);

    const { data: dataUsulan } = await supabase.from('usulan_warga').select('*').eq('nik_pengusul', nik).order('created_at', { ascending: false });
    if (dataUsulan) setListUsulan(dataUsulan);
  };

  const fetchIuranWarga = async (no_kk) => {
    setIsLoadingIuran(true);
    try {
      if (!no_kk) {
        setListIuran([]);
        setIsLoadingIuran(false);
        return;
      }

      const { data: anggotaKeluarga, error: kkError } = await supabase
        .from('master_warga')
        .select('nik')
        .eq('no_kk', String(no_kk));

      if (kkError || !anggotaKeluarga) throw kkError;
      const listNikKeluarga = anggotaKeluarga.map(anggota => String(anggota.nik));

      if (listNikKeluarga.length === 0) {
        setListIuran([]);
        setIsLoadingIuran(false);
        return;
      }

      const { data, error } = await supabase
        .from('iuran_kas')
        .select('*')
        .in('nik_warga', listNikKeluarga)
        .ilike('tipe_transaksi', 'pemasukan')
        .order('tahun_iuran', { ascending: false })
        .order('bulan_iuran', { ascending: false });

      if (!error) setListIuran(data || []);
    } catch (err) {
      console.error("Gagal menarik data iuran keluarga:", err);
    } finally {
      setIsLoadingIuran(false);
    }
  };

  const fetchTotalSaldoKas = async () => {
      try {
        // 1. Hitung Total Iuran (Pemasukan)
        const { data: dataIuran, error: errIuran } = await supabase
          .from('iuran_kas')
          .select('jumlah, tipe_transaksi');

        let totalPemasukan = 0;
        if (!errIuran && dataIuran) {
          totalPemasukan = dataIuran.reduce((acc, curr) => {
            return String(curr.tipe_transaksi).toLowerCase() === 'pemasukan' 
              ? acc + Number(curr.jumlah) 
              : acc - Number(curr.jumlah);
          }, 0);
        }

        // 2. Hitung Total Pengeluaran Kas
        const { data: dataPengeluaran, error: errPengeluaran } = await supabase
          .from('pengeluaran_kas')
          .select('nominal');

        let totalPengeluaran = 0;
        if (!errPengeluaran && dataPengeluaran) {
          totalPengeluaran = dataPengeluaran.reduce((acc, curr) => acc + Number(curr.nominal), 0);
        }

        // 3. Kurangi Pemasukan dengan Pengeluaran untuk mendapat Saldo Akhir
        const saldoAkhir = totalPemasukan - totalPengeluaran;
        setSaldoTotal(saldoAkhir);
        
      } catch (err) {
        console.error("Gagal menghitung saldo transparan:", err);
      }
    };

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

        {/* MODAL ERROR VERIFIKASI */}
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
                <button
                  onClick={handleErrorModalClose}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-colors ${errorModal.type === 'FATAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                >
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
        <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold text-sm">Keluar</button>
      </div>

      {/* NAVIGASI TAB */}
      {!cetakSurat && (
        <div className="max-w-5xl mx-auto mb-6 print:hidden">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button onClick={() => setActiveTab('surat')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'surat' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              📄 Permintaan Surat
            </button>
            <button onClick={() => setActiveTab('usulan')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'usulan' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              💡 Usulan Warga
            </button>
            <button onClick={() => setActiveTab('iuran')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'iuran' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              💰 Iuran Kas
            </button>
            {wargaAktif.is_petugas_iuran && (
            <button onClick={() => setActiveTab('tugas_petugas')} className={`flex-1 min-w-[150px] py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'tugas_petugas' ? 'bg-green-600 text-white shadow' : 'bg-green-100 text-green-800 hover:bg-green-200 ml-1'}`}>
            🛡️ Tugas Pungut Kas
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
          setCetakSurat={setCetakSurat}
        />
      )}

      {activeTab === 'usulan' && !cetakSurat && (
        <UsulanWargaView 
          wargaAktif={wargaAktif} 
          listUsulan={listUsulan} 
          fetchDataWarga={fetchDataWarga} 
          setActiveTab={setActiveTab} 
        />
      )}

      {activeTab === 'iuran' && !cetakSurat && (
        <IuranWargaView 
          saldoTotal={saldoTotal}
          listIuran={listIuran}
          isLoadingIuran={isLoadingIuran}
          wargaAktif={wargaAktif}
        />
      )}

      {activeTab === 'tugas_petugas' && !cetakSurat && wargaAktif.is_petugas_iuran && (
        <PetugasPemungutanView wargaAktif={wargaAktif} />
      )}

      {/* ========================================== */}
      {/* TAMPILAN PREVIEW & CETAK SURAT (PDF) */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print:m-0 print:p-0 max-w-5xl mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-gray-800 p-4 rounded-lg print:hidden sticky top-4 z-50">
            <p className="text-white font-medium text-sm">Dokumen Siap Cetak (A4)</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500 transition-colors">Tutup Dokumen</button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-400 transition-colors">Cetak PDF</button>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-white print:p-0 shadow-inner">
            <div className="bg-white mx-auto shadow-2xl print:shadow-none font-serif text-[12pt] leading-relaxed text-justify text-black" style={{ width: '210mm', minWidth: '210mm', minHeight: '297mm', padding: '2cm' }}>
              <div className="text-center mb-8">
                <h1 className="font-bold text-xl underline tracking-wide uppercase">Surat Keterangan</h1>
                <p>Nomor : {cetakSurat?.nomorSurat}</p>
              </div>

              <p className="mb-4">Yang bertanda tangan dibawah ini :</p>
              <table className="mb-6 ml-4">
                <tbody>
                  <tr><td className="w-48 align-top">Nama</td><td className="w-4 align-top">:</td><td className="font-bold">GUNTUR BAYU JANTORO</td></tr>
                  <tr><td className="align-top">Jabatan</td><td className="align-top">:</td><td>Ketua RT.16</td></tr>
                </tbody>
              </table>

              <p className="mb-4">Dengan ini menerangkan bahwa :</p>
              <table className="mb-6 ml-4">
                <tbody>
                  <tr><td className="w-48 align-top">Nama</td><td className="w-4 align-top">:</td><td className="font-bold">{cetakSurat?.warga?.nama || '-'}</td></tr>
                  <tr><td className="align-top">NIK</td><td className="align-top">:</td><td>{cetakSurat?.warga?.nik || '-'}</td></tr>
                  <tr><td className="align-top">Jenis Kelamin</td><td className="align-top">:</td><td>{cetakSurat?.warga?.jenis_kelamin?.charAt(0) + cetakSurat?.warga?.jenis_kelamin?.slice(1).toLowerCase()}</td></tr>
                  <tr><td className="align-top">Tempat/Tgl. Lahir</td><td className="align-top">:</td><td>{cetakSurat?.warga?.tempat_lahir || '-'} / {cetakSurat?.warga?.tgl_lahir || '-'}</td></tr>
                  <tr><td className="align-top">Bangsa/Agama</td><td className="align-top">:</td><td>Indonesia / {cetakSurat?.warga?.agama || '-'}</td></tr>
                  <tr><td className="align-top">Pekerjaan</td><td className="align-top">:</td><td>{cetakSurat?.warga?.pekerjaan || '-'}</td></tr>
                  <tr><td className="align-top">Alamat</td><td className="align-top">:</td><td>{cetakSurat?.warga?.alamat || '-'}<br/>RT.16 RW.04 Kelurahan Talangputri Kec. Plaju Kota Palembang</td></tr>
                  <tr><td className="align-top">Kartu Keluarga No</td><td className="align-top">:</td><td>{cetakSurat?.warga?.no_kk || '-'}</td></tr>
                </tbody>
              </table>

              <p className="mb-4 indent-8">Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas {cetakSurat?.deskripsi}</p>
              <p className="mb-4">Surat Keterangan ini diberikan untuk : <strong>{cetakSurat?.tujuan}</strong></p>
              <p className="mb-12">Demikian keterangan ini untuk dipergunakan seperlunya.</p>
              
              <div className="w-full mt-8">
                <div className="flex w-full mb-2">
                  <div className="w-1/2"></div>
                  <div className="w-1/2 text-center"><p>Palembang, {cetakSurat?.tanggal}</p></div>
                </div>
                <div className="flex w-full">
                  <div className="w-1/2 text-center"><p>Mengetahui,</p><p>Ketua RW.04</p></div>
                  <div className="w-1/2 text-center"><p className="invisible">Spacer</p><p>Ketua RT.16</p></div>
                </div>
                <div className="h-24 w-full"></div>
                <div className="flex w-full">
                  <div className="w-1/2 text-center"><p className="font-bold underline uppercase">Heriyansah</p></div>
                  <div className="w-1/2 text-center"><p className="font-bold underline uppercase">Guntur Bayu Jantoro</p></div>
                </div>
              </div>

              <div className="mt-16 text-sm">
                <p className="font-bold">Catatan :</p>
                <p>PBB Tahun {new Date().getFullYear()}</p>
                <p className="font-bold">{cetakSurat?.pbb}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}