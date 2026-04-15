// File: src/components/DashboardKetua/MainMenu.jsx
import React from 'react';

export default function MainMenu({
  totalSaldoAllTime,
  totalPengeluaranAllTime,
  fetchWarga,
  fetchPermintaanMasuk,
  goToBuatSurat,
  fetchUsulan,
  fetchRiwayatIuran,
  setActiveView
}) {
  // Hitung saldo riil
  const saldoRiil = totalSaldoAllTime - totalPengeluaranAllTime;

  return (
    <div className="max-w-7xl mx-auto print:hidden">
      
      {/* KARTU SALDO KAS RT */}
      <div className="bg-[#fcd34d] p-6 sm:p-8 rounded-2xl shadow-sm mb-8 flex justify-between items-center text-yellow-900 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm font-bold uppercase tracking-widest text-yellow-700/80 mb-1">Total Saldo Kas RT</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Rp {saldoRiil.toLocaleString('id-ID')}</h2>
        </div>
        {/* Dekorasi Icon Latar Belakang */}
        <div className="absolute right-[-20px] top-[-20px] opacity-20 pointer-events-none">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
        </div>
      </div>

      {/* GRID MENU UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* 1. Data Warga */}
        <button onClick={fetchWarga} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-blue-700 mb-2 flex items-center justify-between">
            <span>1. Data Warga</span>
            <span className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Kelola database kependudukan, lihat statistik usia warga, dan mutasi data.</p>
        </button>

        {/* 2. Kotak Masuk Surat */}
        <button onClick={fetchPermintaanMasuk} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-orange-600 mb-2 flex items-center justify-between">
            <span>2. Kotak Masuk Surat</span>
            <span className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Lihat dan proses permohonan surat pengantar dari dasbor warga.</p>
        </button>

        {/* 3. Buat Surat Manual */}
        <button onClick={goToBuatSurat} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-green-700 mb-2 flex items-center justify-between">
            <span>3. Buat Surat Manual</span>
            <span className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Buat nomor surat otomatis dan cetak surat resmi format kelurahan.</p>
        </button>

        {/* 4. Manajemen Usulan */}
        <button onClick={fetchUsulan} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-purple-700 mb-2 flex items-center justify-between">
            <span>4. Manajemen Usulan</span>
            <span className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Tinjau usulan warga, update status proyek, & upload foto tindak lanjut.</p>
        </button>

        {/* 5. Pemungutan Iuran */}
        <button onClick={fetchRiwayatIuran} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-emerald-700 mb-2 flex items-center justify-between">
            <span>5. Pemungutan Iuran</span>
            <span className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Catat pembayaran kas bulanan warga dan kelola status tagihan KK.</p>
        </button>

        {/* 6. Pengeluaran Kas */}
        <button onClick={() => setActiveView('pengeluaran_kas')} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-rose-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-rose-700 mb-2 flex items-center justify-between">
            <span>6. Pengeluaran Kas</span>
            <span className="text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Catat dan pantau riwayat pengeluaran operasional dan kegiatan RT.</p>
        </button>

        {/* 7. Penunjukan Petugas */}
        <button onClick={() => setActiveView('penunjukan_petugas')} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-cyan-500 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-cyan-700 mb-2 flex items-center justify-between">
            <span>7. Penugasan Petugas</span>
            <span className="text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Beri akses pungut kas ke warga tertentu sebagai petugas bendahara.</p>
        </button>

        {/* 8. Laporan */}
        <button onClick={() => setActiveView('laporan')} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-800 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
          <h3 className="font-bold text-lg text-gray-800 mb-2 flex items-center justify-between">
            <span>8. Laporan RT</span>
            <span className="text-gray-300 group-hover:text-gray-800 group-hover:translate-x-1 transition-all">→</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Cetak Laporan Triwulan dan Data Dasar Keluarga (Format PDF).</p>
        </button>
        
      </div>
    </div>
  );
}