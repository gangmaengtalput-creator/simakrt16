import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import IuranKasView from '../DashboardKetua/IuranKasView';

/**
 * Panel petugas iuran memakai form yang sama persis dengan Ketua RT (IuranKasView).
 */
export default function PetugasPemungutanView({ wargaAktif }) {
  const supabase = getSupabaseClient();
  const [dataWarga, setDataWarga] = useState([]);
  const [listRiwayatIuran, setListRiwayatIuran] = useState([]);
  const [totalSaldoAllTime, setTotalSaldoAllTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRiwayatIuran = async () => {
    setIsLoading(true);
    try {
      const [{ data: warga }, { data: iuran }, { data: pengeluaran }] = await Promise.all([
        supabase.from('master_warga').select('*').order('nama', { ascending: true }),
        supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false }),
        supabase.from('pengeluaran_kas').select('*'),
      ]);

      if (warga) setDataWarga(warga);
      if (iuran) setListRiwayatIuran(iuran);

      let totalMasuk = 0;
      let totalKeluar = 0;
      (iuran || []).forEach((item) => {
        const jumlah = Number(item.jumlah) || 0;
        if (String(item.tipe_transaksi).toLowerCase() === 'pemasukan') totalMasuk += jumlah;
        else if (String(item.tipe_transaksi).toLowerCase() === 'pengeluaran') totalKeluar += jumlah;
      });
      (pengeluaran || []).forEach((item) => {
        totalKeluar += Number(item.nominal) || 0;
      });
      setTotalSaldoAllTime(totalMasuk - totalKeluar);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiwayatIuran();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && dataWarga.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-70">
        <svg className="w-10 h-10 animate-spin text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">Menyiapkan Panel Petugas...</p>
      </div>
    );
  }

  return (
    <IuranKasView
      setActiveView={() => {}}
      dataWarga={dataWarga}
      listRiwayatIuran={listRiwayatIuran}
      fetchRiwayatIuran={fetchRiwayatIuran}
      totalSaldoAllTime={totalSaldoAllTime}
      showBackButton={false}
      modeLabel="Panel Petugas Iuran Kas"
      recordedBy={wargaAktif?.nama || null}
    />
  );
}
