"use client";

import { useState } from 'react';

export default function CardPenggalangan({ acara }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Kalkulasi Target (Total Kebutuhan)
  const targetDana = acara.kebutuhan_dana?.reduce((sum, item) => sum + Number(item.estimasi_harga || 0), 0) || 0;

  // 2. Kalkulasi Terkumpul (Hanya dari Uang)
  const terkumpul = acara.donatur_penggalangan?.reduce((sum, item) => {
    if (item.jenis_donasi === 'Uang') {
      return sum + Number(item.nominal_uang || 0);
    }
    return sum;
  }, 0) || 0;

  // 3. Persentase Progres (Maksimal 100% untuk UI)
  const persentase = targetDana === 0 ? 0 : Math.min((terkumpul / targetDana) * 100, 100);

  // 4. Pisahkan Donatur Barang
  const donaturBarang = acara.donatur_penggalangan?.filter(d => d.jenis_donasi === 'Barang') || [];

  return (
    <>
      {/* --- KARTU PENGGALANGAN (TAMPILAN DI LANDING PAGE) --- */}
      <div className="w-full sm:w-[380px] bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-300 flex flex-col overflow-hidden group">
        
        {/* Banner Image */}
        <div className="relative h-52 bg-gray-100 overflow-hidden">
          <img 
            src={acara.banner_url || 'https://via.placeholder.com/400x250?text=Tanpa+Banner'} 
            alt={acara.nama_acara} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x250?text=Gambar+Rusak' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          
          <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-full font-black tracking-widest uppercase shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            Sedang Berjalan
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-xs font-medium opacity-90 mb-1">Panitia: {acara.ketua_panitia}</p>
            <h3 className="text-xl font-black leading-tight line-clamp-2">{acara.nama_acara}</h3>
          </div>
        </div>

        {/* Konten Kartu */}
        <div className="p-6 sm:p-8 flex flex-col flex-1">
          <div className="mb-5">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Terkumpul</p>
                <p className="text-lg font-black text-green-600">Rp {terkumpul.toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Target</p>
                <p className="text-sm font-bold text-gray-700">Rp {targetDana.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-green-400 to-emerald-600 h-full rounded-full relative" 
                style={{ width: `${persentase}%` }}
              >
                {/* Efek kilap pada progress bar */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 w-full overflow-hidden shimmer-effect"></div>
              </div>
            </div>
            <p className="text-xs text-right font-bold text-gray-500 mt-1.5">{persentase.toFixed(1)}% Tercapai</p>
          </div>

          <p className="text-gray-500 text-sm line-clamp-2 mb-6 leading-relaxed font-medium">
            {acara.deskripsi || 'Tidak ada deskripsi tambahan untuk program ini.'}
          </p>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-auto w-full py-3.5 bg-gray-50 hover:bg-green-50 text-green-700 font-bold rounded-xl border border-gray-200 hover:border-green-200 transition-colors flex items-center justify-center gap-2"
          >
            Lihat Detail & Donatur
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>

      {/* --- MODAL DETAIL (MUNCUL SAAT DIKLIK) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="relative h-40 sm:h-56 shrink-0">
              <img 
                src={acara.banner_url || 'https://via.placeholder.com/800x400?text=Tanpa+Banner'} 
                alt={acara.nama_acara} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <span className="bg-green-500 text-white text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider mb-2 inline-block">Tanggal: {acara.tanggal_acara}</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{acara.nama_acara}</h2>
                <p className="text-sm text-gray-200 mt-1 font-medium">Ketua Panitia: {acara.ketua_panitia}</p>
              </div>
            </div>

            {/* Modal Body (Bisa di-scroll) */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              
              {/* Progress Info Modal */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-700">Progres Pengumpulan Dana</span>
                  <span className="font-black text-green-600">{persentase.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-green-200/50 rounded-full h-4 overflow-hidden mb-3">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${persentase}%` }}></div>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-green-700">Rp {terkumpul.toLocaleString('id-ID')}</span>
                  <span className="text-gray-500">Rp {targetDana.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="mb-8">
                <h3 className="text-lg font-black text-gray-900 mb-2">Tentang Program</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {acara.deskripsi || 'Tidak ada keterangan tambahan.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-4">
                {/* Rincian Kebutuhan */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4 border-b pb-2">Rincian Anggaran</h3>
                  <ul className="space-y-3">
                    {acara.kebutuhan_dana?.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Belum ada rincian kebutuhan.</p>
                    ) : (
                      acara.kebutuhan_dana?.map((keb, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">{keb.nama_kebutuhan}</span>
                          <span className="font-bold text-gray-800">Rp {Number(keb.estimasi_harga).toLocaleString('id-ID')}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Daftar Donatur */}
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4 border-b pb-2">Daftar Donatur / Sponsor</h3>
                  
                  {acara.donatur_penggalangan?.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Belum ada donatur, jadilah yang pertama!</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Donasi Uang */}
                      {acara.donatur_penggalangan?.filter(d => d.jenis_donasi === 'Uang').map((don, idx) => (
                        <div key={`u-${idx}`} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {don.nama_donatur.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{don.nama_donatur}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Uang Tunai</p>
                          </div>
                          <div className="text-sm font-black text-green-600 shrink-0">
                            Rp {Number(don.nominal_uang).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ))}

                      {/* Donasi Barang */}
                      {donaturBarang.map((don, idx) => (
                        <div key={`b-${idx}`} className="flex items-center gap-3 bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                          <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {don.nama_donatur.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800">{don.nama_donatur}</p>
                            <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider">Sumbangan Barang</p>
                            <p className="text-xs text-gray-600 mt-0.5">{don.deskripsi_barang}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Styles tambahan khusus untuk komponen ini */}
      <style dangerouslySetInnerHTML={{__html: `
        .shimmer-effect {
          background-image: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </>
  );
}