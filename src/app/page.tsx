"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; 

export default function Home() {
  const [usulanTerbaru, setUsulanTerbaru] = useState<any[]>([]);
  const [isLoadingUsulan, setIsLoadingUsulan] = useState(true);

  useEffect(() => {
    fetchUsulanTerbaru();
  }, []);

  const fetchUsulanTerbaru = async () => {
    // Mengambil usulan dari yang terbaru ke paling lama (descending)
    const { data, error } = await supabase
      .from('usulan_warga')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8); 
      
    if (!error && data) {
      setUsulanTerbaru(data);
    }
    setIsLoadingUsulan(false);
  };

  // Fallback untuk membaca foto warga (karena berbentuk array)
  const getFotoWarga = (fotoData: any) => {
    if (!fotoData) return 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto';
    let parsedArray = [];
    if (Array.isArray(fotoData)) {
      parsedArray = fotoData;
    } else {
      try {
        const parsed = JSON.parse(fotoData);
        parsedArray = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        parsedArray = typeof fotoData === 'string' ? [fotoData] : [];
      }
    }
    return parsedArray.length > 0 ? parsedArray[0] : 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* --- NAVBAR --- */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <div className="p-1">
                <Image 
                  src="/logo_garuda.jpeg" 
                  alt="Logo Garuda Pancasila"
                  width={50} 
                  height={50}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-2xl text-gray-800 tracking-tight">SIMAK<span className="text-blue-600">RT</span></span>
                <p className="text-xs text-gray-500 font-medium">RT.16 Kel. Talangputri</p>
              </div>
            </div>
            
            <div>
              <Link href="/login" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors">
                Masuk / Daftar Akun
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1">
        
        {/* 1. HERO SECTION */}
        <div className="bg-gradient-to-b from-blue-50 to-white py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
              Selamat Datang di <span className="text-blue-600">Portal RT.16</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg sm:text-xl text-gray-500 mx-auto mb-8">
              Sistem Informasi Terpadu RT.16 Kelurahan Talangputri. Akses layanan persuratan dan sampaikan usulan lingkungan Anda secara digital dengan cepat dan transparan.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-extrabold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                Masuk / Daftar Akun
              </Link>
            </div>
          </div>
        </div>

        {/* 2. USULAN WARGA (KARTU GESER INTERAKTIF LENGKAP) */}
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Suara & Usulan Warga</h2>
                <p className="text-gray-500 mt-2 text-sm sm:text-base">Transparansi aspirasi dan progres lingkungan RT.16 terbaru.</p>
              </div>
            </div>

            {/* Container Swipe Horizontal */}
            {isLoadingUsulan ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="min-w-[320px] h-[450px] bg-gray-100 rounded-2xl animate-pulse shrink-0"></div>
                ))}
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing scroll-smooth">
                {usulanTerbaru.map((usulan) => (
                  <div key={usulan.id} className="min-w-[320px] w-[320px] sm:min-w-[380px] sm:w-[380px] bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition-shadow snap-center shrink-0 flex flex-col overflow-hidden">
                    
                    {/* FOTO USULAN WARGA (HEADER) */}
                    <div className="relative h-48 bg-gray-200">
                      <img 
                        src={getFotoWarga(usulan.foto_usulan)} 
                        alt="Foto Usulan Warga" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x250?text=Gambar+Rusak' }}
                      />
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-full font-bold tracking-wider uppercase shadow-md">
                        {usulan.jenis_usulan}
                      </div>
                      <div className={`absolute top-3 right-3 text-[10px] px-3 py-1.5 rounded-full font-bold shadow-md text-white ${usulan.status === 'Telah Ditindaklanjuti' ? 'bg-green-500' : usulan.status === 'Ditolak' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                        {usulan.status}
                      </div>
                    </div>
                    
                    {/* DETAIL USULAN WARGA */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-500">
                          {new Date(usulan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Oleh: {usulan.nama_pengusul.split(' ')[0]}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight line-clamp-1">
                        {usulan.nama_usulan || `Usulan ${usulan.jenis_usulan}`}
                      </h3>
                      
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {usulan.keterangan}
                      </p>
                      
                      {/* MANAJEMEN USULAN (TANGGAPAN KETUA RT) */}
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        {usulan.status === 'Menunggu Tinjauan RT' ? (
                           <div className="text-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                             <span className="text-xs font-bold text-gray-400">⏳ Menunggu Respon Ketua RT</span>
                           </div>
                        ) : (
                           <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                             <h4 className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-2 border-b border-green-200 pb-1">
                               Tanggapan Ketua RT
                             </h4>
                             
                             {/* Catatan Ketua RT */}
                             <p className="text-xs text-gray-700 italic mb-2 line-clamp-2">
                               {usulan.catatan_rt ? `"${usulan.catatan_rt}"` : "Status usulan telah diperbarui."}
                             </p>

                             {/* Foto Bukti RT (Jika Ada) */}
                             {usulan.foto_tindak_lanjut && (
                               <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-green-100 shadow-sm">
                                 <img 
                                   src={usulan.foto_tindak_lanjut} 
                                   className="w-10 h-10 object-cover rounded" 
                                   alt="Foto RT" 
                                   onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/50?text=Error' }}
                                 />
                                 <a href={usulan.foto_tindak_lanjut} target="_blank" rel="noreferrer" className="text-[10px] text-green-700 font-bold hover:underline flex-1">
                                   Lihat Foto Bukti RT &rarr;
                                 </a>
                               </div>
                             )}
                           </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}

                {usulanTerbaru.length === 0 && !isLoadingUsulan && (
                  <div className="w-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-2xl">
                    Belum ada usulan warga yang dipublikasikan.
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                Lihat Semua Usulan <span>&rarr;</span>
              </Link>
              <p className="text-xs text-gray-400 mt-2">*Login warga diperlukan untuk melihat seluruh interaksi detail.</p>
            </div>
          </div>
        </section>

        {/* 3. STRUKTUR PENGURUS RT 16 (BAGAN) */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-gray-100 border-t">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Struktur Pengurus RT.16</h2>
            <p className="text-gray-500 mb-12">Siap melayani dan membangun lingkungan bersama warga.</p>

            {/* Tree Container */}
            <div className="flex flex-col items-center">
              
              {/* LEVEL 1: KETUA */}
              <div className="relative flex flex-col items-center z-10">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-3">
                  <span className="text-3xl text-white font-extrabold">G</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Guntur</h3>
                <p className="text-sm font-extrabold text-blue-600 tracking-widest uppercase">Ketua RT</p>
              </div>

              {/* GARIS PENGHUBUNG (Desktop & Mobile) */}
              <div className="relative w-full max-w-[280px] sm:max-w-md h-12">
                <div className="absolute top-0 left-1/2 w-0.5 h-6 bg-gray-300 -translate-x-1/2"></div>
                <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-300"></div>
                <div className="absolute top-6 left-0 w-0.5 h-6 bg-gray-300"></div>
                <div className="absolute top-6 right-0 w-0.5 h-6 bg-gray-300"></div>
              </div>

              {/* LEVEL 2: SEKRETARIS & BENDAHARA */}
              <div className="flex justify-between w-full max-w-[340px] sm:max-w-[500px] z-10">
                
                {/* SEKRETARIS */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-3">
                    <span className="text-2xl text-white font-extrabold">S</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Santo</h3>
                  <p className="text-xs font-extrabold text-emerald-600 tracking-widest uppercase">Sekretaris</p>
                </div>

                {/* BENDAHARA */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-3">
                    <span className="text-2xl text-white font-extrabold">M</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Mega</h3>
                  <p className="text-xs font-extrabold text-amber-600 tracking-widest uppercase">Bendahara</p>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-white">SIMAK<span className="text-blue-500">RT</span></span>
            <p className="mt-2 text-gray-400 text-sm">Sistem Informasi Manajemen Kependudukan RT</p>
          </div>
          <div className="text-gray-400 text-sm text-center md:text-left">
            <p className="font-bold text-gray-300">RT.16 RW.04 Kelurahan Talangputri</p>
            <p>Kecamatan Plaju, Kota Palembang, Sumatera Selatan</p>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}