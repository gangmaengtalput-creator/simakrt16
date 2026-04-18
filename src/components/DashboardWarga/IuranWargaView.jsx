import React, { useState, useMemo } from 'react';

export default function IuranWargaView({ 
  saldoTotal, 
  listIuran, 
  isLoadingIuran,
  wargaAktif,
  listBukuKas 
}) {
  // ==========================================
  // STATE FILTER BULAN DAN TAHUN
  // ==========================================
  const tahunSekarang = new Date().getFullYear();
  const [filterBulan, setFilterBulan] = useState('Semua Bulan');
  const [filterTahun, setFilterTahun] = useState('Semua Tahun');

  // ==========================================
  // LOGIKA FILTER DATA
  // ==========================================
  const filteredIuran = useMemo(() => {
    return listIuran.filter(item => {
      const matchBulan = filterBulan === 'Semua Bulan' || item.bulan_iuran === filterBulan;
      const matchTahun = filterTahun === 'Semua Tahun' || Number(item.tahun_iuran) === Number(filterTahun);
      return matchBulan && matchTahun;
    });
  }, [listIuran, filterBulan, filterTahun]);

  const filteredBukuKas = useMemo(() => {
    if (!listBukuKas) return [];
    return listBukuKas.filter(trx => {
      // Ambil nama bulan dari properti Date
      const trxBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(trx.tanggal);
      const trxTahun = trx.tanggal.getFullYear();
      
      const matchBulan = filterBulan === 'Semua Bulan' || trxBulan === filterBulan;
      const matchTahun = filterTahun === 'Semua Tahun' || trxTahun === Number(filterTahun);
      return matchBulan && matchTahun;
    });
  }, [listBukuKas, filterBulan, filterTahun]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 print:hidden">
      
      {/* ========================================== */}
      {/* KONTROL FILTER PERIODE TRANSAKSI           */}
      {/* ========================================== */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 p-3 rounded-2xl text-gray-500 border border-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          </div>
          <div>
            <h3 className="font-black text-gray-800 tracking-tight text-lg">Filter Periode Transaksi</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Tampilkan data riwayat & kas berdasarkan bulan dan tahun.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto bg-gray-50 p-2 rounded-2xl border border-gray-200">
          <select 
            value={filterBulan} 
            onChange={(e) => setFilterBulan(e.target.value)} 
            className="bg-white border border-gray-200 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer flex-1 sm:flex-none shadow-sm transition-all"
          >
            <option value="Semua Bulan">Semua Bulan</option>
            {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className="text-gray-300 font-black">-</span>
          <select 
            value={filterTahun} 
            onChange={(e) => setFilterTahun(e.target.value)} 
            className="bg-white border border-gray-200 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer flex-1 sm:flex-none shadow-sm transition-all"
          >
            <option value="Semua Tahun">Semua Tahun</option>
            {[tahunSekarang, tahunSekarang - 1, tahunSekarang - 2].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. BAGIAN ATAS: RIWAYAT IURAN KELUARGA       */}
      {/* ========================================== */}
      <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden relative">
        {/* Dekorasi Latar Belakang */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full opacity-60 pointer-events-none"></div>

        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight">Riwayat Iuran Keluarga</h3>
              <p className="text-green-100 text-xs font-medium mt-0.5">Pantau histori pembayaran kas bulanan keluarga Anda.</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-md border border-white/40 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <span className="text-green-50 text-[11px] font-bold uppercase tracking-wider">No. KK:</span>
            <span className="text-white font-black tracking-widest">{wargaAktif?.no_kk || '-'}</span>
          </div>
        </div>
        
        <div className="p-6 sm:p-8 bg-gray-50/30">
          {isLoadingIuran ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-70">
              <svg className="w-8 h-8 animate-spin text-emerald-500 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="text-gray-500 text-sm font-bold tracking-wide">Memuat data iuran...</p>
            </div>
          ) : filteredIuran.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <p className="text-gray-500 font-bold text-base">Belum ada histori pembayaran.</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Data iuran untuk periode ini tidak ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[350px] custom-scrollbar overflow-y-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/90 backdrop-blur-sm text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                    <th className="py-4 px-5 font-bold">Periode</th>
                    <th className="py-4 px-5 font-bold">Tanggal Bayar</th>
                    <th className="py-4 px-5 font-bold">Atas Nama</th>
                    <th className="py-4 px-5 font-bold">Nominal</th>
                    <th className="py-4 px-5 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {filteredIuran.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors group">
                      <td className="py-4 px-5 font-black uppercase text-gray-700 tracking-wide">{item.bulan_iuran} {item.tahun_iuran}</td>
                      <td className="py-4 px-5 text-gray-500 font-medium">{new Date(item.tanggal_bayar).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td>
                      <td className="py-4 px-5 font-bold text-gray-800">{item.nama_warga}</td>
                      <td className="py-4 px-5 font-black text-emerald-600">Rp {item.jumlah.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider border border-emerald-200">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                          Lunas
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. BAGIAN BAWAH: LAPORAN KAS TRANSPARAN      */}
      {/* ========================================== */}
      <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        
        {/* Header Saldo dengan Glassmorphism & Gradient Biru */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          {/* Efek Lingkaran Abstrak */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/40 rounded-full blur-2xl"></div>

          <div className="text-center md:text-left relative z-10 flex flex-col md:flex-row items-center gap-5">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner shrink-0 rotate-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Buku Kas RT.16 Transparan</h2>
              <p className="text-blue-100 text-sm font-medium mt-1">Laporan mutasi seluruh pemasukan & pengeluaran dana operasional warga.</p>
            </div>
          </div>
          
          {/* Kotak Saldo Keren (Tetap Tampilkan Saldo Total Keseluruhan) */}
          <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-3xl border border-white/30 text-center w-full md:w-auto shadow-xl relative z-10">
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1 opacity-90">Sisa Saldo Kas Terkini</p>
            <h3 className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">Rp {saldoTotal.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Tabel Buku Kas (Pemasukan & Pengeluaran) */}
        <div className="p-6 sm:p-8 bg-gray-50/50">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-widest sticky top-0 z-10 shadow-sm border-b border-gray-200">
                  <th className="py-4 px-5 font-bold">Tanggal</th>
                  <th className="py-4 px-5 font-bold">Keterangan Transaksi</th>
                  <th className="py-4 px-5 font-bold text-right text-emerald-700 bg-emerald-50/50">Pemasukan (Rp)</th>
                  <th className="py-4 px-5 font-bold text-right text-rose-700 bg-rose-50/50">Pengeluaran (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBukuKas.map((trx) => (
                  <tr key={trx.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-4 px-5 text-gray-500 font-medium whitespace-nowrap">
                      {trx.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-gray-800">{trx.keterangan}</div>
                      <span className={`inline-flex items-center gap-1 mt-1.5 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest border ${
                        trx.tipe === 'Pemasukan' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {trx.tipe === 'Pemasukan' ? (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                        ) : (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                        )}
                        {trx.tipe}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-black text-emerald-600 bg-emerald-50/10">
                      {trx.tipe === 'Pemasukan' ? trx.nominal.toLocaleString('id-ID') : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4 px-5 text-right font-black text-rose-600 bg-rose-50/10">
                      {trx.tipe === 'Pengeluaran' ? trx.nominal.toLocaleString('id-ID') : <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                ))}
                {filteredBukuKas.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-16 text-gray-500 bg-gray-50 border border-dashed border-gray-200 m-4 rounded-xl">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p className="font-bold text-gray-500">Belum ada riwayat transaksi kas pada periode ini.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>

      {/* KUSTOMISASI SCROLLBAR */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}