// File: src/components/DashboardKetua/IuranKasView.jsx
import React, { useState, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function IuranKasView({
  setActiveView,
  dataWarga,
  listRiwayatIuran,
  fetchRiwayatIuran,
  totalSaldoAllTime
}) {
  // ==========================================
  // STATE LOKAL KHUSUS IURAN
  // ==========================================
  const supabase = getSupabaseClient();
  const namaBulanSekarang = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const tahunSekarang = new Date().getFullYear();

  const [filterBulanIuran, setFilterBulanIuran] = useState(namaBulanSekarang);
  const [filterTahunIuran, setFilterTahunIuran] = useState(tahunSekarang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pengecualianKK, setPengecualianKK] = useState([]);
  
  // Nominal dihapus dari state karena sudah fixed 5000
  const [iuranData, setIuranData] = useState({ 
    nik: '', 
    status_pembayaran: 'Lunas' 
  });

  // ==========================================
  // LOGIKA & STATISTIK IURAN
  // ==========================================
  const infoIuran = useMemo(() => {
    const listKK = dataWarga.filter(w => 
      w.status_kk?.toUpperCase() === 'KEPALA KELUARGA' && 
      w.status_warga !== 'mantan' &&
      !pengecualianKK.includes(w.nik)
    );

    const riwayatBulanIni = listRiwayatIuran.filter(r => 
      r.bulan_iuran === filterBulanIuran && 
      Number(r.tahun_iuran) === Number(filterTahunIuran)
    );

    const nikSudahDiproses = riwayatBulanIni.map(r => String(r.nik_warga));
    const kkBelumProses = listKK.filter(kk => !nikSudahDiproses.includes(String(kk.nik)));

    const jumlahLunas = riwayatBulanIni.filter(r => r.jumlah > 0).length;
    const jumlahTidakBayar = riwayatBulanIni.filter(r => r.jumlah === 0).length;

    return { 
      kkBelumProses, 
      jumlahLunas, 
      jumlahTidakBayar, 
      sisaBelumProses: kkBelumProses.length, 
      riwayatBulanIni 
    };
  }, [dataWarga, listRiwayatIuran, filterBulanIuran, filterTahunIuran, pengecualianKK]);

  const cekStatusIuran = (nik) => {
    const riwayatWargaIni = listRiwayatIuran.filter(r => String(r.nik_warga) === String(nik));
    const pernahLunas = riwayatWargaIni.filter(r => r.jumlah > 0);
    const lunasBulanIni = pernahLunas.some(r => r.bulan_iuran === filterBulanIuran && Number(r.tahun_iuran) === Number(filterTahunIuran));

    if (pernahLunas.length === 0) {
      return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">Tidak pernah bayar iuran</span>;
    } else if (lunasBulanIni) {
      return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">Lancar</span>;
    } else {
      return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">Iuran kas tidak lancar</span>;
    }
  };

  // ==========================================
  // FUNGSI AKSI (SUBMIT, HAPUS, KECUALIKAN)
  // ==========================================
  const submitIuran = async (e) => {
    e.preventDefault();
    if (!iuranData.nik) return alert('Silakan pilih Kepala Keluarga terlebih dahulu!');
    setIsProcessing(true);

    const warga = dataWarga.find(w => String(w.nik) === String(iuranData.nik));
    const isLunas = iuranData.status_pembayaran === 'Lunas';
    
    // NOMINAL DIBUAT FIXED 5000 DI SINI
    const finalNominal = isLunas ? 5000 : 0; 
    const finalKeterangan = isLunas ? 'Iuran Bulanan Warga' : iuranData.status_pembayaran;

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
      fetchRiwayatIuran(); 
    } else {
      alert("Gagal menyimpan iuran: " + error.message);
    }
  };

  const hapusIuran = async (id) => {
    if (!confirm("Hapus data iuran ini?")) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase.from('iuran_kas').delete().eq('id', id);
      if (error) throw error;
      alert('Data riwayat iuran berhasil dihapus!');
      fetchRiwayatIuran(); 
    } catch (error) {
      alert('Gagal menghapus data iuran: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const kecualikanWarga = (nik) => {
    if (confirm("Kecualikan Kepala Keluarga ini dari daftar dropdown bulan ini?")) {
      setPengecualianKK([...pengecualianKK, nik]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden">
      {/* HEADER & SALDO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={() => setActiveView('menu')} className="text-sm text-green-700 font-bold hover:underline bg-green-100 px-4 py-2 rounded-lg">
          &larr; Kembali ke Menu Utama
        </button>
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm">
          <span className="font-medium text-sm">Total Saldo Kas RT: </span>
          <span className="font-extrabold">Rp {totalSaldoAllTime.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* STATISTIK IURAN (Filter dipindah dari sini) */}
      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500">
        <div className="mb-4 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Statistik Iuran Warga</h2>
          <p className="text-sm text-gray-500 mt-1">
            Menampilkan data untuk bulan <span className="font-bold text-gray-700">{filterBulanIuran} {filterTahunIuran}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <p className="text-sm font-bold text-orange-600">Belum Diproses</p>
            <h3 className="text-3xl font-extrabold text-orange-700">{infoIuran.sisaBelumProses} KK</h3>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-sm font-bold text-green-600">Sudah Lunas</p>
            <h3 className="text-3xl font-extrabold text-green-700">{infoIuran.jumlahLunas} KK</h3>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <p className="text-sm font-bold text-red-600">Dikecualikan / Tidak Mampu</p>
            <h3 className="text-3xl font-extrabold text-red-700">{infoIuran.jumlahTidakBayar} KK</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM INPUT IURAN */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md h-fit sticky top-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Proses Pembayaran</h3>
          <form onSubmit={submitIuran} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Kepala Keluarga</label>
              <select required value={iuranData.nik} onChange={(e) => setIuranData({...iuranData, nik: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50 focus:ring-green-500 text-sm">
                <option value="">-- Pilih KK yang belum proses --</option>
                {infoIuran.kkBelumProses.map(kk => (
                  <option key={kk.nik} value={kk.nik}>{kk.nama}</option>
                ))}
              </select>
            </div>
            
            {iuranData.nik && (
              <div className="bg-gray-50 p-3 rounded border text-sm mt-2">
                <span className="font-bold text-gray-600 block mb-1">Status Histori:</span>
                {cekStatusIuran(iuranData.nik)}
                <div className="mt-3 text-right">
                   <button type="button" onClick={() => kecualikanWarga(iuranData.nik)} className="text-xs text-red-500 hover:text-red-700 font-medium underline">
                     Lewati KK ini untuk bulan ini
                   </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Status Pembayaran</label>
              <select required value={iuranData.status_pembayaran} onChange={(e) => setIuranData({...iuranData, status_pembayaran: e.target.value})} className="w-full border p-2 rounded-lg bg-gray-50 focus:ring-green-500">
                <option value="Lunas">LUNAS (Masuk Kas Rp 5.000)</option>
                <option value="Keluarga Tidak Mampu">Keluarga Tidak Mampu</option>
                <option value="Menolak Bayar">Menolak Bayar</option>
                <option value="Pindah / Kosong">Rumah Kosong / Pindah</option>
                {/* OPSI BARU DITAMBAHKAN DI SINI */}
                <option value="Rumah tidak di lingkungan gang maeng">Rumah tidak di lingkungan gang maeng</option>
              </select>
            </div>

            {/* FORM INPUT NOMINAL DIHAPUS */}

            <button type="submit" disabled={isProcessing || infoIuran.kkBelumProses.length === 0} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50 mt-4">
              {isProcessing ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>

        {/* TABEL RIWAYAT IURAN (Filter dipindah ke sini) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b pb-4">
            <h3 className="text-lg font-bold text-gray-800">Riwayat Pembayaran</h3>
            
            {/* FILTER BULAN DAN TAHUN PINDAH KESINI */}
            <div className="flex items-center gap-2">
              <select value={filterBulanIuran} onChange={(e) => setFilterBulanIuran(e.target.value)} className="border p-2 rounded-lg bg-gray-50 text-xs font-bold focus:ring-green-500">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterTahunIuran} onChange={(e) => setFilterTahunIuran(Number(e.target.value))} className="border p-2 rounded-lg bg-gray-50 text-xs font-bold focus:ring-green-500">
                 {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b-2">
                  <th className="p-3">Waktu Proses</th>
                  <th className="p-3">Kepala Keluarga</th>
                  <th className="p-3">Nominal / Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {infoIuran.riwayatBulanIni.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} <br/>
                      {new Date(item.tanggal_bayar).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-3 font-bold text-gray-800">{item.nama_warga}</td>
                    <td className="p-3">
                      {item.jumlah > 0 ? (
                        <span className="font-extrabold text-green-600">Rp {item.jumlah.toLocaleString('id-ID')}</span>
                      ) : (
                         <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">{item.keterangan}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => hapusIuran(item.id)} disabled={isProcessing} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Batalkan/Hapus">
                         <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {infoIuran.riwayatBulanIni.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">Belum ada transaksi di bulan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}