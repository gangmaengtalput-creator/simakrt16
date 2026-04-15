// File: src/components/DashboardWarga/IuranWargaView.jsx
import React from 'react';

export default function IuranWargaView({ 
  saldoTotal, 
  listIuran, 
  isLoadingIuran,
  wargaAktif,
  listBukuKas // Menerima data gabungan kas
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* ========================================== */}
      {/* 1. BAGIAN ATAS: RIWAYAT IURAN KELUARGA       */}
      {/* ========================================== */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center">
          <h3 className="font-bold text-white">Riwayat Iuran Kas Keluarga</h3>
          <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded font-bold">No. KK: {wargaAktif?.no_kk || '-'}</span>
        </div>
        
        <div className="p-4">
          {isLoadingIuran ? (
            <p className="text-center text-gray-500 py-4 animate-pulse">Memuat data iuran keluarga...</p>
          ) : listIuran.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">Belum ada riwayat pembayaran iuran kas untuk Kartu Keluarga ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] custom-scrollbar overflow-y-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm border-b-2 sticky top-0 shadow-sm z-10">
                    <th className="py-2 px-3">Periode</th>
                    <th className="py-2 px-3">Tanggal Bayar</th>
                    <th className="py-2 px-3">Atas Nama</th>
                    <th className="py-2 px-3">Nominal</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y">
                  {listIuran.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold uppercase text-gray-700">{item.bulan_iuran} {item.tahun_iuran}</td>
                      <td className="py-3 px-3 text-gray-600">{new Date(item.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">{item.nama_warga}</td>
                      <td className="py-3 px-3 font-bold text-blue-600">Rp {item.jumlah.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-700 uppercase tracking-wider">
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
      <div className="bg-white rounded-xl shadow-md border-t-4 border-blue-500 overflow-hidden print:hidden">
        
        {/* Header Saldo */}
        <div className="p-6 bg-blue-50 border-b border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-black text-blue-900 uppercase tracking-wide">Buku Kas RT.16 Transparan</h2>
            <p className="text-sm text-blue-700 mt-1">Laporan mutasi seluruh pemasukan & pengeluaran dana RT.</p>
          </div>
          <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-blue-200 text-center w-full sm:w-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa Saldo Kas Terkini</p>
            <h3 className="text-3xl font-black text-blue-700 mt-1">Rp {saldoTotal.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Tabel Buku Kas (Pemasukan & Pengeluaran) */}
        <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-800 text-white sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 font-semibold tracking-wide">Tanggal</th>
                <th className="py-3 px-4 font-semibold tracking-wide">Keterangan Transaksi</th>
                <th className="py-3 px-4 font-semibold tracking-wide text-right bg-green-700">Pemasukan (Rp)</th>
                <th className="py-3 px-4 font-semibold tracking-wide text-right bg-red-700">Pengeluaran (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listBukuKas?.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                    {trx.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-gray-800">
                    <div className="font-medium">{trx.keterangan}</div>
                    <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      trx.tipe === 'Pemasukan' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {trx.tipe}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-green-600 bg-green-50/30">
                    {trx.tipe === 'Pemasukan' ? trx.nominal.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-red-600 bg-red-50/30">
                    {trx.tipe === 'Pengeluaran' ? trx.nominal.toLocaleString('id-ID') : '-'}
                  </td>
                </tr>
              ))}
              {listBukuKas?.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500 italic">
                    Belum ada riwayat transaksi kas di sistem RT ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
      </div>

    </div>
  );
}