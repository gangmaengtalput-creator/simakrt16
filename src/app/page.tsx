"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient'; 

export default function Home() {
  const supabase = getSupabaseClient();
  
  const [usulanTerbaru, setUsulanTerbaru] = useState<any[]>([]);
  const [isLoadingUsulan, setIsLoadingUsulan] = useState(true);

  useEffect(() => {
    const fetchUsulanTerbaru = async () => {
      setIsLoadingUsulan(true);
      try {
        const { data, error } = await supabase
          .from('usulan_warga')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8); 
          
        if (error) {
          console.error('Supabase Error:', error);
          throw error;
        }
        
        if (data) {
          setUsulanTerbaru(data);
        }
      } catch (err: any) {
        console.error('Gagal mengambil data usulan:', err.message || JSON.stringify(err));
      } finally {
        setIsLoadingUsulan(false);
      }
    };

    fetchUsulanTerbaru();
  }, [supabase]);

  // Logika Parsing Foto Tetap Dipertahankan
  const getFotoWarga = (fotoData: any) => {
    if (!fotoData) return 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto';
    
    if (typeof fotoData === 'string') {
      if (fotoData.startsWith('[')) {
        try {
          const parsed = JSON.parse(fotoData);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto';
        } catch (e) {
          return fotoData; 
        }
      }
      return fotoData;
    }
    
    if (Array.isArray(fotoData) && fotoData.length > 0) {
      return fotoData[0];
    }
    
    return 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      
      {/* --- NAVBAR GLASSMORPHISM --- */}
      <nav className="fixed w-full top-0 z-50 glass-nav border-b border-gray-100/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="p-1 bg-white rounded-full shadow-sm border border-gray-100 group-hover:shadow-md transition-all">
                <Image 
                  src="/logo-maeng.png" 
                  alt="Logo Garuda Pancasila"
                  width={45} 
                  height={45}
                  className="object-contain rounded-full"
                />
              </div>
              <div>
                <span className="font-black text-2xl text-gray-900 tracking-tighter">SIMAK<span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">RT</span></span>
                <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">RT.16 Kel. Talangputri</p>
              </div>
            </div>
            
            <div>
              <Link href="/login" className="relative overflow-hidden group bg-gray-900 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold text-sm shadow-[0_8px_20px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_25px_rgb(0,0,0,0.2)] transition-all active:scale-95 flex items-center gap-2">
                <span className="relative z-10">Masuk Portal</span>
                <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1">
        
        {/* 1. HERO SECTION MEWAH (DEEP DARK & NEON ACCENTS) */}
        <div className="relative pt-36 pb-24 lg:pt-48 lg:pb-36 overflow-hidden bg-[#0B1120]">
          {/* Abstract Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            
            <div className="flex justify-center mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.15)] p-2.5 border border-white/20 backdrop-blur-sm">
                <div className="w-full h-full bg-white rounded-full p-2">
                  <img 
                    src="/logo-maeng.png" 
                    alt="Logo Besar RT 16" 
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <span className="text-blue-400 font-bold tracking-widest uppercase text-sm border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 rounded-full mb-6 inline-block backdrop-blur-md">
                Sistem Informasi Terpadu
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
                Selamat Datang di <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                  Keluarga Lrg Maeng
                </span>
              </h1>
              <p className="max-w-2xl text-lg sm:text-xl text-gray-300 mx-auto mb-10 leading-relaxed font-light">
                Akses layanan persuratan dan sampaikan usulan lingkungan Anda secara digital dengan cepat, aman, dan transparan untuk mewujudkan lingkungan RT.16 Kelurahan Talangputri yang lebih baik.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/login" className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:bg-gray-50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                Masuk / Daftar Sekarang
              </Link>
            </div>
          </div>
          
          {/* Wave Divider Bottom */}
          <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
            <svg className="relative block w-[calc(140%+1.3px)] h-[60px] sm:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118,152.47,143.62,243,128,269.64,123.39,295.58,115.3,321.39,56.44Z" fill="#F8FAFC"></path>
            </svg>
          </div>
        </div>

        {/* 2. USULAN WARGA (KARTU GESER INTERAKTIF MEWAH) */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-14 animate-fade-in-up">
              <span className="w-12 h-1.5 bg-blue-600 rounded-full mb-4"></span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Suara & Usulan Warga</h2>
              <p className="text-gray-500 mt-3 text-base sm:text-lg max-w-2xl">Transparansi aspirasi dan progres pembangunan serta kegiatan lingkungan RT.16 secara real-time.</p>
            </div>

            {isLoadingUsulan ? (
              <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="min-w-[320px] h-[480px] bg-white rounded-3xl animate-pulse shrink-0 border border-gray-100 shadow-sm">
                    <div className="h-48 bg-gray-200 rounded-t-3xl"></div>
                    <div className="p-6 space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-10 pt-4 px-2 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing scroll-smooth">
                {usulanTerbaru.map((usulan) => (
                  <div key={usulan.id} className="min-w-[320px] w-[320px] sm:min-w-[400px] sm:w-[400px] bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-300 snap-center shrink-0 flex flex-col overflow-hidden group">
                    
                    {/* FOTO USULAN WARGA (HEADER) */}
                    <div className="relative h-56 bg-gray-100 overflow-hidden">
                      <img 
                        src={getFotoWarga(usulan.foto_usulan)} 
                        alt="Foto Usulan Warga" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x250?text=Gambar+Rusak' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-blue-900 text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest uppercase shadow-sm">
                        {usulan.jenis_usulan || 'Umum'}
                      </div>
                      <div className={`absolute top-4 right-4 text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest uppercase shadow-md text-white ${usulan.status === 'Telah Ditindaklanjuti' ? 'bg-emerald-500' : usulan.status === 'Ditolak' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                        {usulan.status || 'Menunggu'}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                         <span className="text-xs font-medium opacity-90">
                           {usulan.created_at ? new Date(usulan.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                         </span>
                         <span className="text-xs font-bold px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg border border-white/20">
                           Oleh: {usulan.nama_pengusul ? String(usulan.nama_pengusul).split(' ')[0] : 'Warga'}
                         </span>
                      </div>
                    </div>
                    
                    {/* DETAIL USULAN WARGA */}
                    <div className="p-6 sm:p-8 flex flex-col flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight line-clamp-2">
                        {usulan.nama_usulan || `Usulan Warga`}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-3 mb-6 leading-relaxed font-medium">
                        {usulan.keterangan || 'Tidak ada keterangan tambahan.'}
                      </p>
                      
                      {/* TANGGAPAN KETUA RT (KOTAK MEWAH) */}
                      <div className="mt-auto">
                        {usulan.status === 'Menunggu Tinjauan RT' || !usulan.status ? (
                           <div className="text-center py-3 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-2">
                               <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               Menunggu Respon RT
                             </span>
                           </div>
                        ) : (
                           <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100/60 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full"></div>
                             
                             <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                               Tanggapan Ketua RT
                             </h4>
                             
                             <p className="text-sm text-gray-700 italic mb-3 line-clamp-2 leading-relaxed font-medium">
                               {usulan.catatan_rt ? `"${usulan.catatan_rt}"` : "Status usulan telah diperbarui."}
                             </p>

                             {usulan.foto_tindak_lanjut && getFotoWarga(usulan.foto_tindak_lanjut) !== 'https://via.placeholder.com/400x250?text=Tidak+Ada+Foto' && (
                               <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                 <img 
                                   src={getFotoWarga(usulan.foto_tindak_lanjut)} 
                                   className="w-12 h-12 object-cover rounded-lg border border-gray-100" 
                                   alt="Foto Tindak Lanjut" 
                                   onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/50?text=Error' }}
                                 />
                                 <a href={getFotoWarga(usulan.foto_tindak_lanjut)} target="_blank" rel="noreferrer" className="text-xs text-blue-700 font-bold hover:text-blue-800 flex-1 flex items-center justify-between pr-2">
                                   Lihat Bukti Foto
                                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
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
                  <div className="w-full py-16 text-center text-gray-400 bg-white border border-dashed border-gray-300 rounded-[2rem] font-medium text-lg">
                    Belum ada usulan warga yang dipublikasikan.
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 text-center">
              <Link href="/login" className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 text-gray-800 font-bold rounded-full hover:border-blue-300 hover:text-blue-700 hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] transition-all transform hover:-translate-y-1">
                Jelajahi Semua Usulan 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. STRUKTUR PENGURUS RT 16 (BAGAN MEWAH GLASSMORPHISM) */}
        <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
          {/* Decorative background for structure */}
          <div className="absolute top-0 w-full h-[300px] bg-gradient-to-b from-[#F8FAFC] to-white pointer-events-none"></div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">Struktur Pengurus RT.16</h2>
            <p className="text-gray-500 mb-16 text-base sm:text-lg">Berdedikasi melayani dan membangun lingkungan bersama warga.</p>

            <div className="flex flex-col items-center">
              
              {/* KETUA RT KARTU KACA */}
              <div className="flex flex-col items-center bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 relative z-10 w-64 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-[6px] border-white shadow-xl mb-4">
                  <span className="text-4xl text-white font-black">G</span>
                </div>
                <h3 className="text-xl font-black text-gray-900">Guntur</h3>
                <p className="text-xs font-black text-blue-600 tracking-widest uppercase mt-1 bg-blue-50 px-3 py-1 rounded-full">Ketua RT</p>
              </div>

              {/* GARIS PENGHUBUNG ELEGAN */}
              <div className="relative w-full max-w-[280px] sm:max-w-[450px] h-20 -my-4 z-0">
                <div className="absolute top-0 left-1/2 w-[3px] h-10 bg-gradient-to-b from-gray-200 to-gray-300 -translate-x-1/2"></div>
                <div className="absolute top-10 left-0 w-full h-[3px] bg-gray-300 rounded-full"></div>
                <div className="absolute top-10 left-0 w-[3px] h-10 bg-gradient-to-b from-gray-300 to-gray-100"></div>
                <div className="absolute top-10 right-0 w-[3px] h-10 bg-gradient-to-b from-gray-300 to-gray-100"></div>
              </div>

              <div className="flex justify-between w-full max-w-[340px] sm:max-w-[550px] z-10">
                
                {/* SEKRETARIS */}
                <div className="flex flex-col items-center bg-white p-5 sm:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100 w-36 sm:w-56 hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center border-[5px] border-white shadow-lg mb-4">
                    <span className="text-3xl text-white font-black">S</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Santo</h3>
                  <p className="text-[10px] sm:text-xs font-black text-emerald-600 tracking-widest uppercase mt-1 bg-emerald-50 px-2.5 py-1 rounded-full">Sekretaris</p>
                </div>

                {/* BENDAHARA */}
                <div className="flex flex-col items-center bg-white p-5 sm:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100 w-36 sm:w-56 hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-[5px] border-white shadow-lg mb-4">
                    <span className="text-3xl text-white font-black">M</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Mega</h3>
                  <p className="text-[10px] sm:text-xs font-black text-amber-600 tracking-widest uppercase mt-1 bg-amber-50 px-2.5 py-1 rounded-full">Bendahara</p>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>

      {/* --- FOOTER GELAP ELEGAN --- */}
      <footer className="bg-[#0B1120] text-white pt-16 pb-10 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10 text-center md:text-left mb-10">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="bg-white p-1 rounded-full"><Image src="/logo-maeng.png" alt="Logo" width={30} height={30} className="rounded-full"/></div>
                <span className="font-black text-2xl tracking-tighter text-white">SIMAK<span className="text-blue-500">RT</span></span>
              </div>
              <p className="text-gray-400 text-sm font-medium max-w-xs">Platform Sistem Informasi Manajemen Kependudukan Digital untuk kemudahan warga.</p>
            </div>
            
            <div className="text-gray-400 text-sm">
              <h4 className="text-white font-bold text-base mb-4 tracking-wider uppercase">Wilayah Administratif</h4>
              <p className="font-bold text-gray-300 mb-1">RT.16 RW.04 Kelurahan Talangputri</p>
              <p className="mb-1">Kecamatan Plaju, Kota Palembang</p>
              <p>Sumatera Selatan, Kode Pos: 30267</p>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-medium">
            <p>&copy; {new Date().getFullYear()} SIMAKRT Lrg Maeng. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-1">Dibuat dengan <span className="text-red-500">❤</span> untuk warga.</p>
          </div>
        </div>
      </footer>

      {/* GLOBAL STYLES & ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-nav { 
          background: rgba(255, 255, 255, 0.85); 
          backdrop-filter: blur(16px); 
          -webkit-backdrop-filter: blur(16px); 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .animate-fade-in-up { animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .animate-pulse-slow { animation: pulseSlow 6s infinite alternate; }

        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseSlow {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 0.8; transform: scale(1.05); }
        }
      `}} />
    </div>
  );
}