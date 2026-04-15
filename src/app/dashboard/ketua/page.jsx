// File: src/app/dashboard/ketua/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

import MainMenu from '../../../components/DashboardKetua/MainMenu';
import ManajemenUsulanView from '../../../components/DashboardKetua/ManajemenUsulanView';
import PengeluaranKasView from '../../../components/DashboardKetua/PengeluaranKasView';
import IuranKasView from '../../../components/DashboardKetua/IuranKasView';
import DataWargaView from '../../../components/DashboardKetua/DataWargaView';
import PermintaanMasukView from '../../../components/DashboardKetua/PermintaanMasukView';
import BuatSuratView from '../../../components/DashboardKetua/BuatSuratView';
import PenunjukanPetugasView from '../../../components/DashboardKetua/PenunjukanPetugasView';

export const dynamic = 'force-dynamic';

export default function DashboardKetua() {
  const router = useRouter();
  
  // ==========================================
  // STATE GLOBAL UTAMA
  // ==========================================
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
  // FUNGSI FETCH & LOGIC GLOBAL
  // ==========================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); 
  };

  const fetchWarga = async () => {
    setIsLoading(true); 
    setActiveView('data_warga');
    const { data } = await supabase.from('master_warga').select('*').order('nama', { ascending: true });
    if (data) setDataWarga(data);
    setIsLoading(false);
  };

  const fetchPermintaanMasuk = async () => {
    setActiveView('permintaan_masuk');
    const { data } = await supabase.from('permintaan_surat').select('*').order('created_at', { ascending: false });
    if (data) setPermintaanMasuk(data);
  };

  const fetchUsulan = async () => {
    setActiveView('manajemen_usulan');
    const { data } = await supabase.from('usulan_warga').select('*').order('created_at', { ascending: false });
    if (data) setUsulanMasuk(data);
  };

  const fetchRiwayatIuran = async () => {
    setIsLoading(true);
    if (dataWarga.length === 0) { 
      const { data } = await supabase.from('master_warga').select('*').order('nama', { ascending: true }); 
      if (data) setDataWarga(data); 
    }
    const { data: iuranDb } = await supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false });
    if (iuranDb) {
      setListRiwayatIuran(iuranDb);
      const totalSemua = iuranDb.reduce((acc, item) => acc + (item.jumlah || 0), 0);
      setTotalSaldoAllTime(totalSemua);
    }
    setActiveView('iuran_kas');
    setIsLoading(false);
  };

  const fetchRiwayatPengeluaran = async (changeView = false) => {
    const { data } = await supabase.from('pengeluaran_kas').select('*').order('tanggal', { ascending: false });
    if (data) {
      setListRiwayatPengeluaran(data);
      const total = data.reduce((acc, item) => acc + (item.nominal || 0), 0);
      setTotalPengeluaranAllTime(total);
    }
    if (changeView) setActiveView('pengeluaran_kas');
  };

  const fetchRiwayatSurat = async () => {
    if (dataWarga.length === 0) { 
      const { data } = await supabase.from('master_warga').select('*'); 
      if (data) setDataWarga(data); 
    }
    const { data: suratData } = await supabase.from('surat_keterangan').select('*').order('created_at', { ascending: false });
    if (suratData) setRiwayatSurat(suratData);
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
    const { data: wargaInfo } = await supabase.from('master_warga').select('*').eq('nik', permintaan.nik_pemohon).single();
    
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
    setIsLoading(false);
  };

  // Kalkulasi awal untuk saldo kas saat web dimuat
  useEffect(() => {
    fetchRiwayatPengeluaran();
    const initSaldoIuran = async () => {
      const { data } = await supabase.from('iuran_kas').select('jumlah');
      if (data) {
        setTotalSaldoAllTime(data.reduce((acc, item) => acc + (item.jumlah || 0), 0));
      }
    };
    initSaldoIuran();
  }, []);


  // ==========================================
  // RENDER UI BERDASARKAN KOMPONEN
  // ==========================================
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
          activeView={activeView}     // <-- KINI MASUK KE SINI DENGAN AMAN
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

    </div>
  );
}