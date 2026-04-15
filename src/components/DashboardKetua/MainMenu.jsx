// File: src/components/DashboardKetua/MainMenu.jsx
import React from 'react';

export default function MainMenu({
  totalSaldoAllTime,
  totalPengeluaranAllTime,
  fetchWarga,
  fetchPermintaanMasuk,
  goToBuatSurat, // Fungsi khusus yang akan kita buat di page.jsx
  fetchUsulan,
  fetchRiwayatIuran,
  setActiveView
}) {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print:hidden">
      
      {/* KARTU SALDO KAS (Pemasukan - Pengeluaran) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 col-span-1 lg:col-span-4">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl shadow-lg text-white col-span-1 md:col-span-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Total Saldo Kas RT</p>
              <h3 className="text-4xl font-extrabold mt-2">
                Rp {new Intl.NumberFormat('id-ID').format(totalSaldoAllTime - totalPengeluaranAllTime)}
              </h3>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 1. DATA WARGA */}
      <div onClick={fetchWarga} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-blue-500 cursor-pointer hover:bg-blue-50 transition-all">
        <h3 className="font-extrabold text-lg sm:text-xl text-blue-800">1. Data Warga &rarr;</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Kelola database kependudukan, lihat statistik usia warga, dan mutasi data.</p>
      </div>

      {/* 2. KOTAK MASUK SURAT */}
      <div onClick={fetchPermintaanMasuk} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-orange-500 cursor-pointer hover:bg-orange-50 transition-all">
        <h3 className="font-extrabold text-lg sm:text-xl text-orange-800">2. Kotak Masuk Surat &rarr;</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Lihat dan proses permohonan surat dari dasbor warga.</p>
      </div>

      {/* 3. BUAT SURAT MANUAL */}
      <div onClick={goToBuatSurat} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-green-500 cursor-pointer hover:bg-green-50 transition-all">
        <h3 className="font-extrabold text-lg sm:text-xl text-green-800">3. Buat Surat Manual &rarr;</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Buat nomor surat otomatis dan cetak surat pengantar resmi format kelurahan.</p>
      </div>

      {/* 4. MANAJEMEN USULAN */}
      <div onClick={fetchUsulan} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-purple-500 cursor-pointer hover:bg-purple-50 transition-all">
        <h3 className="font-extrabold text-lg sm:text-xl text-purple-800">4. Manajemen Usulan &rarr;</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">Tinjau usulan warga, update status Musrenbang, & foto tindak lanjut.</p>
      </div>

      {/* 5. PEMUNGUTAN IURAN */}
      <button onClick={fetchRiwayatIuran} className="bg-green-600 text-white p-6 rounded-xl shadow hover:bg-green-700 transition flex flex-col items-center justify-center gap-2 border-b-4 border-green-800">
        <span className="text-3xl">💰</span>
        <span className="font-bold text-center">Pemungutan Iuran</span>
      </button>

      {/* 6. PENGELUARAN KAS */}
      <button onClick={() => setActiveView('pengeluaran_kas')} className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        </div>
        <span className="font-bold text-gray-700">Pengeluaran Kas</span>
      </button>

      {/* Tambahkan tombol ini di dalam div grid menu Anda */}
      <button 
        onClick={() => setActiveView('penunjukan_petugas')} 
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-300 transition text-left group"
      >
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
          👮‍♂️
        </div>
        <h3 className="font-bold text-gray-800">Penunjukan Petugas</h3>
        <p className="text-xs text-gray-500 mt-1">Beri akses pungut kas ke warga.</p>
      </button>

    </div>
  );
}