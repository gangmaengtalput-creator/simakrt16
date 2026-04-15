// File: src/components/DashboardWarga/IuranWargaView.jsx
import React from 'react';

export default function IuranWargaView({ 
  saldoTotal, 
  listIuran, 
  isLoadingIuran,
  wargaAktif
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tampilan Saldo Kas Transparan */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center shadow-sm">
        <p className="text-sm uppercase font-bold text-blue-600">Total Saldo Kas RT Transparan</p>
        <h3 className="text-3xl font-black text-blue-800 mt-2">Rp {saldoTotal.toLocaleString('id-ID')}</h3>
        <p className="text-xs text-blue-500 mt-2">Diperbarui secara realtime</p>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center">
          <h3 className="font-bold text-white">Riwayat Iuran Keluarga</h3>
          <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded font-bold">No. KK: {wargaAktif?.no_kk || '-'}</span>
        </div>
        
        <div className="p-4">
          {isLoadingIuran ? (
            <p className="text-center text-gray-500 py-4">Memuat data iuran keluarga...</p>
          ) : listIuran.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">Belum ada riwayat pembayaran iuran kas untuk Kartu Keluarga ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                    <th className="py-2 px-3">Periode</th>
                    <th className="py-2 px-3">Tanggal Bayar</th>
                    <th className="py-2 px-3">Atas Nama</th>
                    <th className="py-2 px-3">Nominal</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y">
                  {listIuran.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
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
    </div>
  );
}