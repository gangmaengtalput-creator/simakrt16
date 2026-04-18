import React, { useState, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function IuranKasView({
  setActiveView,
  dataWarga,
  listRiwayatIuran,
  fetchRiwayatIuran,
  totalSaldoAllTime
}) {
  const supabase = getSupabaseClient();
  const namaBulanSekarang = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const tahunSekarang = new Date().getFullYear();

  // ==========================================
  // STATE LOKAL KHUSUS IURAN
  // ==========================================
  const [filterBulanIuran, setFilterBulanIuran] = useState(namaBulanSekarang);
  const [filterTahunIuran, setFilterTahunIuran] = useState(tahunSekarang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pengecualianKK, setPengecualianKK] = useState([]);
  
  const [iuranData, setIuranData] = useState({ 
    nik: '', 
    status_pembayaran: 'Lunas' 
  });

  // ==========================================
  // STATE MODAL GLOBAL PROFESIONAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'warning', 'info', 'confirm'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const showModal = (config) => setAlertModal({ ...alertModal, ...config, isOpen: true });
  
  const closeModal = () => setAlertModal({ ...alertModal, isOpen: false });

  const handleConfirm = () => {
    if (alertModal.onConfirm) alertModal.onConfirm();
    if (alertModal.type !== 'confirm') closeModal(); // Tutup otomatis jika bukan confirm action yang butuh proses lama
  };

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
      return <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded border border-red-200 text-[11px] font-bold tracking-wide">Tidak pernah bayar iuran</span>;
    } else if (lunasBulanIni) {
      return <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded border border-green-200 text-[11px] font-bold tracking-wide">Lancar</span>;
    } else {
      return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded border border-amber-200 text-[11px] font-bold tracking-wide">Iuran kas tidak lancar</span>;
    }
  };

  // ==========================================
  // FUNGSI AKSI (SUBMIT, HAPUS, KECUALIKAN)
  // ==========================================
  const submitIuran = async (e) => {
    e.preventDefault();
    if (!iuranData.nik) {
      return showModal({ type: 'warning', title: 'Perhatian', message: 'Silakan pilih Kepala Keluarga terlebih dahulu dari daftar dropdown.', confirmText: 'Mengerti' });
    }
    
    setIsProcessing(true);

    const warga = dataWarga.find(w => String(w.nik) === String(iuranData.nik));
    const isLunas = iuranData.status_pembayaran === 'Lunas';
    
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
      showModal({ type: 'success', title: 'Transaksi Berhasil', message: `Berhasil memproses status iuran untuk ${warga.nama}.`, confirmText: 'Tutup' });
      setIuranData({ nik: '', status_pembayaran: 'Lunas' }); 
      fetchRiwayatIuran(); 
    } else {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: `Gagal menyimpan iuran: ${error.message}`, confirmText: 'Tutup' });
    }
  };

  const hapusIuran = (id) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Riwayat Iuran?',
      message: 'Apakah Anda yakin ingin menghapus data riwayat pembayaran iuran ini? Data yang terhapus akan memengaruhi saldo kas keseluruhan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        closeModal();
        setIsProcessing(true);
        const { error } = await supabase.from('iuran_kas').delete().eq('id', id);
        setIsProcessing(false);
        
        if (!error) {
          fetchRiwayatIuran();
          showModal({ type: 'success', title: 'Data Dihapus', message: 'Data riwayat iuran berhasil dihapus dari sistem.', confirmText: 'OK' });
        } else {
          showModal({ type: 'error', title: 'Gagal Menghapus', message: `Terjadi kesalahan: ${error.message}`, confirmText: 'Tutup' });
        }
      }
    });
  };

  const kecualikanWarga = (nik) => {
    showModal({
      type: 'confirm',
      title: 'Kecualikan Warga',
      message: 'Apakah Anda ingin menyembunyikan Kepala Keluarga ini dari daftar proses bulan ini? (Ini berguna jika Anda ingin memprosesnya belakangan)',
      confirmText: 'Ya, Lewati',
      cancelText: 'Batal',
      onConfirm: () => {
        setPengecualianKK([...pengecualianKK, nik]);
        setIuranData({ nik: '', status_pembayaran: 'Lunas' });
        closeModal();
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden relative">
      
      {/* HEADER & SALDO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={() => setActiveView('menu')} className="text-sm text-green-700 font-bold hover:underline bg-green-50 hover:bg-green-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-green-200/50 flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-[10px] text-green-100 font-bold uppercase tracking-wider mb-0.5">Total Saldo Kas RT</p>
            <p className="font-black text-xl leading-none">Rp {totalSaldoAllTime.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* STATISTIK IURAN */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <svg className="w-32 h-32 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </div>
        
        <div className="mb-6 border-b border-gray-100 pb-4 relative z-10">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Statistik Iuran Warga</h2>
          <p className="text-sm text-gray-500 mt-1">
            Menampilkan rekap data untuk bulan <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{filterBulanIuran} {filterTahunIuran}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-center relative z-10">
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 transition-transform hover:-translate-y-1">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Belum Diproses</p>
            <h3 className="text-4xl font-black text-amber-700">{infoIuran.sisaBelumProses} <span className="text-lg font-bold text-amber-600/50">KK</span></h3>
          </div>
          <div className="bg-green-50 p-5 rounded-2xl border border-green-100 transition-transform hover:-translate-y-1">
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Sudah Lunas</p>
            <h3 className="text-4xl font-black text-green-700">{infoIuran.jumlahLunas} <span className="text-lg font-bold text-green-600/50">KK</span></h3>
          </div>
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 transition-transform hover:-translate-y-1">
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Dikecualikan / Tdk Mampu</p>
            <h3 className="text-4xl font-black text-red-700">{infoIuran.jumlahTidakBayar} <span className="text-lg font-bold text-red-600/50">KK</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM INPUT IURAN */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <h3 className="text-lg font-black text-gray-800 tracking-tight">Proses Pembayaran</h3>
          </div>
          
          <form onSubmit={submitIuran} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Kepala Keluarga</label>
              <select required value={iuranData.nik} onChange={(e) => setIuranData({...iuranData, nik: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-medium text-gray-700">
                <option value="">-- Pilih KK yang belum proses --</option>
                {infoIuran.kkBelumProses.map(kk => (
                  <option key={kk.nik} value={kk.nik}>{kk.nama}</option>
                ))}
              </select>
            </div>
            
            {iuranData.nik && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm animate-in fade-in zoom-in-95 duration-200">
                <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider block mb-2">Status Histori Kepatuhan:</span>
                {cekStatusIuran(iuranData.nik)}
                <div className="mt-4 text-right border-t border-gray-200 pt-3">
                   <button type="button" onClick={() => kecualikanWarga(iuranData.nik)} className="text-[11px] text-gray-400 hover:text-amber-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-amber-200 transition-colors shadow-sm flex items-center gap-1.5 ml-auto">
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                     Lewati KK ini untuk bulan ini
                   </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status Pembayaran</label>
              <select required value={iuranData.status_pembayaran} onChange={(e) => setIuranData({...iuranData, status_pembayaran: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-medium text-gray-700">
                <option value="Lunas">LUNAS (Masuk Kas Rp 5.000)</option>
                <option value="Keluarga Tidak Mampu">Keluarga Tidak Mampu</option>
                <option value="Menolak Bayar">Menolak Bayar</option>
                <option value="Pindah / Kosong">Rumah Kosong / Pindah</option>
                <option value="Rumah tidak di lingkungan gang maeng">Bukan Lingkungan Gang Maeng</option>
              </select>
            </div>

            <button type="submit" disabled={isProcessing || infoIuran.kkBelumProses.length === 0} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-200 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              {isProcessing ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>

        {/* TABEL RIWAYAT IURAN */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-black text-gray-800 tracking-tight">Riwayat Pembayaran</h3>
            
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <select value={filterBulanIuran} onChange={(e) => setFilterBulanIuran(e.target.value)} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-sm font-bold text-green-700 focus:ring-0 cursor-pointer outline-none">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span className="text-gray-300">|</span>
              <select value={filterTahunIuran} onChange={(e) => setFilterTahunIuran(Number(e.target.value))} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-sm font-bold text-green-700 focus:ring-0 cursor-pointer outline-none">
                 {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4 font-bold">Waktu Proses</th>
                  <th className="py-3 px-4 font-bold">Kepala Keluarga</th>
                  <th className="py-3 px-4 font-bold">Nominal / Status</th>
                  <th className="py-3 px-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {infoIuran.riwayatBulanIni.map(item => (
                  <tr key={item.id} className="hover:bg-green-50/30 transition-colors group">
                    <td className="py-3 px-4 text-xs text-gray-500 font-medium">
                      {new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} <br/>
                      <span className="text-[10px] text-gray-400">{new Date(item.tanggal_bayar).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">{item.nama_warga}</td>
                    <td className="py-3 px-4">
                      {item.jumlah > 0 ? (
                        <span className="font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">Rp {item.jumlah.toLocaleString('id-ID')}</span>
                      ) : (
                         <span className="text-[11px] bg-red-50 text-red-600 px-2.5 py-1 rounded-lg font-bold border border-red-100">{item.keterangan}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => hapusIuran(item.id)} disabled={isProcessing} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-100 disabled:opacity-50" title="Batalkan/Hapus Riwayat">
                         <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {infoIuran.riwayatBulanIni.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                      </div>
                      <p className="text-gray-400 font-medium text-sm">Belum ada transaksi di bulan ini.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                (alertModal.type === 'warning' || alertModal.type === 'confirm') ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {(alertModal.type === 'warning' || alertModal.type === 'confirm') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Hapus')) ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                    alertModal.type === 'confirm' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                    alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : alertModal.confirmText}
                </button>
                
                {alertModal.type === 'confirm' && (
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