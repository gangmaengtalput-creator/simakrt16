import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

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
    if (alertModal.type !== 'confirm') closeModal(); 
  };

  // ==========================================
  // FETCH DATA SISTEM
  // ==========================================
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // LOGIKA KALKULASI & STATISTIK PETUGAS
  // ==========================================
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

  // ==========================================
  // FUNGSI CRUD IURAN
  // ==========================================
  const submitIuran = async (e) => {
    e.preventDefault();
    if (!iuranData.nik) {
      return showModal({ type: 'warning', title: 'Perhatian', message: 'Silakan pilih Kepala Keluarga terlebih dahulu dari daftar yang tersedia.', confirmText: 'Mengerti' });
    }
    
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
      showModal({ type: 'success', title: 'Berhasil Diproses', message: `Tagihan iuran untuk Kepala Keluarga ${warga.nama} telah berhasil dicatat ke sistem.`, confirmText: 'Tutup' });
      setIuranData({ nik: '', status_pembayaran: 'Lunas' }); 
      fetchDataOperasional(); 
    } else {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: `Terjadi kesalahan sistem: ${error.message}`, confirmText: 'Tutup' });
    }
  };

  const hapusIuran = (id) => {
    showModal({
      type: 'confirm',
      title: 'Batalkan Proses?',
      message: "Apakah Anda yakin ingin membatalkan catatan ini? Kepala Keluarga tersebut akan dikembalikan ke daftar 'Belum Proses'.",
      confirmText: 'Ya, Batalkan',
      cancelText: 'Tutup',
      onConfirm: async () => {
        closeModal();
        setIsProcessing(true);
        const { error } = await supabase.from('iuran_kas').delete().eq('id', id);
        setIsProcessing(false);
        
        if (!error) {
          fetchDataOperasional();
          showModal({ type: 'success', title: 'Dibatalkan', message: 'Catatan iuran berhasil dibatalkan dan dihapus.', confirmText: 'OK' });
        } else {
          showModal({ type: 'error', title: 'Gagal Menghapus', message: `Terjadi kesalahan: ${error.message}`, confirmText: 'Tutup' });
        }
      }
    });
  };

  // ==========================================
  // TAMPILAN UI
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-70">
        <svg className="w-10 h-10 animate-spin text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">Menyiapkan Panel Petugas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 print:hidden">
      
      {/* HEADER PETUGAS KHUSUS */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-3xl shadow-lg shadow-emerald-200 flex justify-between items-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <h2 className="font-black text-xl text-white tracking-wide">Panel Petugas Iuran</h2>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">Akses khusus pengelolaan kas diberikan oleh Ketua RT.</p>
          </div>
        </div>
        <span className="bg-white/20 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm border border-white/40 backdrop-blur-md relative z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span> Mode Aktif
        </span>
      </div>

      {/* ========================================== */}
      {/* KARTU STATISTIK RINGKASAN                  */}
      {/* ========================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-blue-500 hover:-translate-y-1 transition-transform">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Target KK RT.16</p>
          <h3 className="text-3xl font-black text-gray-800">{infoIuran.stats.totalKK} <span className="text-sm font-bold text-gray-400">KK</span></h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-amber-500 hover:-translate-y-1 transition-transform">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Belum Proses</p>
          <h3 className="text-3xl font-black text-amber-600">{infoIuran.stats.sisaBelumProses} <span className="text-sm font-bold text-amber-600/50">KK</span></h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Sudah Lunas</p>
          <h3 className="text-3xl font-black text-emerald-600">{infoIuran.stats.totalLunas} <span className="text-sm font-bold text-emerald-600/50">KK</span></h3>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-red-500 hover:-translate-y-1 transition-transform">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Pengecualian</p>
          <h3 className="text-3xl font-black text-red-600">{infoIuran.stats.totalPengecualian} <span className="text-sm font-bold text-red-600/50">KK</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* FORM PROSES TAGIHAN                        */}
        {/* ========================================== */}
        <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 h-fit sticky top-4">
          <h3 className="font-black text-gray-800 mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
            Proses Tagihan 
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest border border-emerald-100">
              {filterBulanIuran} {filterTahunIuran}
            </span>
          </h3>
          <form onSubmit={submitIuran} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Kepala Keluarga (Belum Proses) <span className="text-red-500">*</span></label>
              <select required value={iuranData.nik} onChange={(e) => setIuranData({...iuranData, nik: e.target.value})} className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium text-gray-700">
                <option value="">-- Pilih Kepala Keluarga --</option>
                {infoIuran.kkBelumProses.map(kk => <option key={kk.nik} value={kk.nik}>{kk.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Status Pembayaran <span className="text-red-500">*</span></label>
              <select required value={iuranData.status_pembayaran} onChange={(e) => setIuranData({...iuranData, status_pembayaran: e.target.value})} className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium text-gray-700">
                <option value="Lunas">LUNAS (Rp 5.000)</option>
                <option value="Keluarga Tidak Mampu">Keluarga Tidak Mampu</option>
                <option value="Rumah tidak di lingkungan gang maeng">Tidak di lingkungan gang</option>
                <option value="Pindah / Kosong">Rumah Kosong / Pindah</option>
              </select>
            </div>
            <button type="submit" disabled={isProcessing || infoIuran.kkBelumProses.length === 0} className="w-full bg-emerald-600 text-white font-bold py-3.5 mt-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex justify-center items-center gap-2">
              {isProcessing ? 'Memproses...' : infoIuran.kkBelumProses.length === 0 ? 'Semua KK Sudah Diproses 🎉' : 'Simpan Transaksi Warga'}
            </button>
          </form>
        </div>

        {/* ========================================== */}
        {/* TABEL RIWAYAT TRANSAKSI                    */}
        {/* ========================================== */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden flex flex-col h-fit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <h3 className="font-black text-gray-800 text-lg tracking-tight">Riwayat Eksekusi Anda</h3>
            <div className="flex gap-2 w-full sm:w-auto bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <select value={filterBulanIuran} onChange={(e) => setFilterBulanIuran(e.target.value)} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-700 focus:ring-0 cursor-pointer outline-none appearance-none flex-1 sm:flex-none">
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span className="text-gray-300 self-center">|</span>
              <select value={filterTahunIuran} onChange={(e) => setFilterTahunIuran(Number(e.target.value))} className="bg-transparent border-none py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-700 focus:ring-0 cursor-pointer outline-none appearance-none flex-1 sm:flex-none">
                 {[tahunSekarang, tahunSekarang - 1].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm">
                <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                  <th className="py-3 pr-2 font-bold">Warga / Waktu</th>
                  <th className="py-3 text-right font-bold">Nominal / Status</th>
                  <th className="py-3 pl-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {infoIuran.riwayatBulanIni.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="py-4 pr-2">
                      <p className="font-bold text-gray-800">{item.nama_warga}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</p>
                    </td>
                    <td className="py-4 text-right">
                      {item.jumlah > 0 ? (
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Rp 5.000</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-lg inline-block border border-red-100">{item.keterangan}</span>
                      )}
                    </td>
                    <td className="py-4 pl-4 text-center w-16">
                      <button onClick={() => hapusIuran(item.id)} disabled={isProcessing} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all border border-transparent hover:border-red-100 disabled:opacity-50" title="Batalkan Proses & Kembalikan KK">
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {infoIuran.riwayatBulanIni.length === 0 && (
                  <tr><td colSpan="3" className="py-12 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200 m-2">Anda belum memproses transaksi apapun di periode ini.</td></tr>
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                (alertModal.type === 'success' || alertModal.type === 'confirm') ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {(alertModal.type === 'info' || alertModal.type === 'confirm') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Batal')) ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                    (alertModal.type === 'success' || alertModal.type === 'confirm') ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' :
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

      {/* KUSTOMISASI SCROLLBAR */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}