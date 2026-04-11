import Link from 'next/link';
import Image from 'next/image'; // Impor komponen Image Next.js

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* --- NAVBAR (NAVIGASI ATAS) --- */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* --- PEMBARUAN: Logo Garuda & Judul --- */}
            <div className="flex items-center gap-4">
              {/* Kotak Logo Baru */}
              <div className="p-1">
                <Image 
                  src="/logo_garuda.jpeg" // Pastikan file ada di folder public/
                  alt="Logo Garuda Pancasila"
                  width={50} // Ukuran di navbar
                  height={50}
                  className="object-contain"
                />
              </div>
              {/* Tulisan Judul */}
              <div>
                <span className="font-extrabold text-2xl text-gray-800 tracking-tight">SIMAK<span className="text-blue-600">RT</span></span>
                <p className="text-xs text-gray-500 font-medium">RT.16 Kel. Talangputri</p>
              </div>
            </div>
            
            {/* Tombol Login */}
            <div>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                <span>Masuk Dasbor</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION (BAGIAN UTAMA) --- */}
      <main className="flex-grow">
        <div className="relative bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-16 px-4 sm:px-6 lg:px-8">
              <div className="sm:text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm mb-6 border border-blue-100">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Digitalisasi Pelayanan Warga Resmi
                </div>
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
                  <span className="block xl:inline">Sistem Informasi</span>{' '}
                  <span className="block text-blue-600 xl:inline">Manajemen Kependudukan</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Platform digital resmi untuk pengurus RT.16 RW.04 Kelurahan Talangputri. Kelola data warga, pantau demografi, dan terbitkan surat keterangan dengan cepat, aman, dan akurat sesuai standar pelayanan publik.
                </p>
                <div className="mt-8 sm:mt-12 flex gap-4 sm:justify-center lg:justify-start">
                  <Link href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 sm:w-auto">
                    Mulai Bekerja
                  </Link>
                  <a href="#fitur" className="w-full flex items-center justify-center px-8 py-3 border-2 border-gray-200 text-base font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-all sm:w-auto">
                    Pelajari Fitur
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* --- PEMBARUAN: Grafis Hero dengan Logo Garuda Besar --- */}
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-blue-50 flex items-center justify-center p-12">
            <div className="grid grid-cols-2 gap-4 transform rotate-3 scale-105 items-center">
              
              {/* Kotak Putih Berisi Logo Garuda Besar */}
              <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-gray-100 flex items-center justify-center col-span-1 row-span-2">
                <Image 
                  src="/logo_garuda.jpeg"
                  alt="Lambang Garuda Pancasila Besar"
                  width={200} // Ukuran besar di hero area
                  height={200}
                  className="object-contain"
                />
              </div>

              {/* Kotak Dekoratif Pengiring */}
              <div className="bg-indigo-500 w-32 h-40 rounded-2xl shadow-xl opacity-80 mt-12"></div>
              <div className="bg-teal-400 w-40 h-32 rounded-2xl shadow-xl opacity-90 -mt-12"></div>
            </div>
          </div>
        </div>

        {/* --- FITUR SECTION (Sama seperti sebelumnya) --- */}
        <div id="fitur" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-base text-blue-600 font-bold tracking-wide uppercase">Keunggulan Sistem</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Cara Baru Mengelola Administrasi RT
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                Tinggalkan cara lama yang memakan waktu. SIMAK RT membawa kemudahan pengelolaan data ke dalam genggaman Anda dengan standar resmi.
              </p>
            </div>

            <div className="mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Fitur 1 */}
                <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Database Terpusat Aman</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Seluruh data KK, NIK, dan profil warga tersimpan aman di Cloud sesuai standar privasi. Cari data warga dalam hitungan detik.
                  </p>
                </div>
                {/* Fitur 2 */}
                <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Surat Otomatis Resmi</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Generator surat keterangan terintegrasi menghasilkan dokumen siap cetak dengan format resmi kelurahan yang akurat.
                  </p>
                </div>
                {/* Fitur 3 */}
                <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Statistik Demografi</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Pantau grafik demografi warga secara real-time untuk pendataan yang lebih baik, mencakup distribusi usia dan jenis kelamin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- FOOTER (Sama seperti sebelumnya) --- */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-white">SIMAK<span className="text-blue-500">RT</span></span>
            <p className="mt-2 text-gray-400 text-sm">Sistem Informasi Manajemen Kependudukan Resmi</p>
          </div>
          <div className="text-gray-400 text-sm">
            <p className="font-bold text-gray-300">RT.16 RW.04 Kelurahan Talangputri</p>
            <p>Kecamatan Plaju, Kota Palembang, Sumatera Selatan</p>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Hak Cipta Dilindungi.<br/>
            Dibuat untuk pelayanan warga yang lebih baik dan transparan.
          </div>
        </div>
      </footer>

    </div>
  );
}