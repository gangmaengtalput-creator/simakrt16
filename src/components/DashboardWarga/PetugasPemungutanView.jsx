// File: src/components/DashboardWarga/PetugasPemungutanView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PetugasPemungutanView({ wargaAktif }) {
  const supabase = getSupabaseClient();
  const [dataWargaGlobal, setDataWargaGlobal] = useState([]);
  const [listRiwayatIuran, setListRiwayatIuran] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const namaBulanSekarang = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const tahunSekarang = new Date().getFullYear();

  const [filterBulanIuran, setFilterBulanIuran] = useState(namaBulanSekarang);
  const [filterTahunIuran, setFilterTahunIuran] = useState(tahunSekarang);
  const [iuranData, setIuranData] = useState({ nik: '', status_pembayaran: 'Lunas' });

  // Tarik data khusus untuk operasional petugas
  const fetchDataOperasional = async () => {
    setIsLoading(true);
    const { data: warga } = await supabase.from('master_warga').select('*');
    if (warga) setDataWargaGlobal(warga);

    const { data: iuran } = await supabase.from('iuran_kas').select('*').order('tanggal_bayar', { ascending: false });
    if (iuran) setListRiwayatIuran(iuran);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDataOperasional();
  }, []);

  // Logika Kalkulasi Cerdas (Menghitung Statistik sekaligus Daftar Warga)
  const infoIuran = useMemo(() => {
    // 1. Ambil semua Kepala Keluarga aktif
    const listKK = dataWargaGlobal.filter(w => w.status_kk?.toUpperCase() === 'KEPALA KELUARGA' && w.status_warga !== 'mantan');
    
    // 2. Ambil riwayat transaksi sesuai bulan & tahun filter
    const riwayatBulanIni = listRiwayatIuran.filter(r => r.bulan_iuran === filterBulanIuran && Number(r.tahun_iuran) === Number(filterTahunIuran));
    const nikSudahDiproses = riwayatBulanIni.map(r => String(r.nik_warga));
    
    // 3. Pisahkan KK yang belum diproses
    const kkBelumProses = listKK.filter(kk => !nikSudahDiproses.includes(String(kk.nik)));

    // 4. Hitung Statistik untuk Kartu Ringkasan
    const stats = {
      totalKK: listKK.length,
      sisaBelumProses: kkBelumProses.length,
      totalLunas: riwayatBulanIni.filter(r => String(r.tipe_transaksi).toLowerCase() === 'pemasukan' || r.jumlah > 0).length,
      totalPengecualian: riwayatBulanIni.filter(r => String(r.tipe_transaksi).toLowerCase() === 'pengecualian' || r.jumlah === 0).length
    };

    return { kkBelumProses, riwayatBulanIni, stats };
  }, [dataWargaGlobal, listRiwayatIuran, filterBulanIuran, filterTahunIuran]);

  const submitIuran = async (e) => {
    e.preventDefault();
    if (!iuranData.nik) return alert('Pilih Kepala Keluarga!');
    setIsProcessing(true);

    const warga = dataWargaGlobal.find(w => String(w.nik) === String(iuranData.nik));
    const isLunas = iuranData.status_pembayaran === 'Lunas';
    const finalNominal = isLunas ? 5000 : 0; 
    const finalKeterangan = isLunas ? `Diterima oleh Petugas: ${wargaAktif.nama}` : iuranData.status_pembayaran;

    const { error } = await supabase.from('iuran_kas').insert([{
      nik_warga: warga.nik,
      nama_warga: warga.nama,
      jumlah: finalNominal,
      bulan_iuran: filterBulanIuran,
      tahun_iuran: filterTahunIuran,
      tipe_transaksi: isLunas ? 'pemasukan' : 'pengecualian',
      keterangan: finalKeterangan,
    }]);

    setIsProcessing(false);
    if (!error) {
      alert(`Berhasil memproses iuran untuk ${warga.nama}`);
      setIuranData({ nik: '', status_pembayaran: 'Lunas' }); 
      fetchDataOperasional(); 
    } else {
      alert("Gagal menyimpan iuran: " + error.message);
    }
  };

  const hapusIuran = async (id) => {
    if (!confirm("Hapus data iuran ini? Catatan KK ini akan kembali ke daftar 'Belum Proses'.")) return;
    setIsProcessing(true);
    const { error } = await supabase.from('iuran_kas').delete().eq('id', id);
    setIsProcessing(false);
    if (!error) fetchDataOperasional();
    else alert('Gagal menghapus data: ' + error.message);
  };

  if (isLoading) return <div className="text-center py-10 font-bold text-green-600 animate-pulse">Memuat Data Sistem Pemungutan...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-green-600 p-4 rounded-xl shadow text-white flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Panel Petugas Iuran</h2>
          <p className="text-xs text-green-200">Akses khusus diberikan oleh Ketua RT.</p>
        </div>
        <span className="bg-white text-green-700 font-bold px-3 py-1 rounded-full text-xs shadow-sm">Aktif</span>
      </div>

      {/* ========================================== */}
      {/* KARTU STATISTIK RINGKASAN                  */}
      {/* ========================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Target KK RT.16</p>
          <h3 className="text-2xl font-black text-gray-800">{infoIuran.stats.totalKK}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Belum Proses</p>
          <h3 className="text-2xl font-black text-orange-600">{infoIuran.stats.sisaBelumProses}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Sudah Lunas</p>
          <h3 className="text-2xl font-black text-green-600">{infoIuran.stats.totalLunas}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pengecualian</p>
          <h3 className="text-2xl font-black text-red-600">{infoIuran.stats.totalPengecualian}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Proses */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            Proses Tagihan 
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-sm uppercase">{filterBulanIuran} {filterTahunIuran}</span>
          </h3>
          <form onSubmit={submitIuran} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kepala Keluarga (Belum Proses)</label>
              <select required value={iuranData.nik} onChange={(e) => setIuranData({...iuranData, nik: e.target.value})} className="w-full border p-2.5 rounded-lg bg-gray-50 text-sm focus:ring-green-500 outline-none">
                <option value="">-- Pilih KK --</option>
                {infoIuran.kkBelumProses.map(kk => <option key={kk.nik} value={kk.nik}>{kk.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Pembayaran</label>
              <select required value={iuranData.status_pembayaran} onChange={(e) => setIuranData({...iuranData, status_pembayaran: e.target.value})} className="w-full border p-2.5 rounded-lg bg-gray-50 text-sm focus:ring-green-500 outline-none">
                <option value="Lunas">LUNAS (Rp 5.000)</option>
                <option value="Keluarga Tidak Mampu">Keluarga Tidak Mampu</option>
                <option value="Rumah tidak di lingkungan gang maeng">Tidak di lingkungan gang</option>
                <option value="Pindah / Kosong">Rumah Kosong / Pindah</option>
              </select>
            </div>
            <button type="submit" disabled={isProcessing || infoIuran.kkBelumProses.length === 0} className="w-full bg-green-600 text-white font-bold py-3 mt-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
              {isProcessing ? 'Menyimpan...' : infoIuran.kkBelumProses.length === 0 ? 'Semua KK Sudah Diproses 🎉' : 'Simpan Proses Warga'}
            </button>
          </form>
        </div>

        {/* Tabel Riwayat */}
        <div className="bg-white p-6 rounded-xl shadow-md border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b">
            <h3 className="font-bold text-gray-800">Riwayat Transaksi</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <select value={filterBulanIuran} onChange={(e) => setFilterBulanIuran(e.target.value)} className="border p-1.5 rounded-md text-xs font-bold bg-gray-50 flex-1 sm:flex-none outline-none focus:ring-1 focus:ring-green-500">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterTahunIuran} onChange={(e) => setFilterTahunIuran(Number(e.target.value))} className="border p-1.5 rounded-md text-xs font-bold bg-gray-50 flex-1 sm:flex-none outline-none focus:ring-1 focus:ring-green-500">
                 {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y">
                {infoIuran.riwayatBulanIni.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-2">
                      <p className="font-bold text-gray-800">{item.nama_warga}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(item.tanggal_bayar).toLocaleDateString('id-ID')}</p>
                    </td>
                    <td className="py-3 text-right">
                      {item.jumlah > 0 ? (
                        <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Rp 5.000</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded inline-block">{item.keterangan}</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right w-12">
                      <button onClick={() => hapusIuran(item.id)} className="text-red-500 font-bold hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors" title="Batal & Kembalikan KK ini ke daftar Belum Proses">
                        Batal
                      </button>
                    </td>
                  </tr>
                ))}
                {infoIuran.riwayatBulanIni.length === 0 && (
                  <tr><td colSpan="3" className="py-8 text-center text-gray-400 italic">Belum ada transaksi di bulan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}