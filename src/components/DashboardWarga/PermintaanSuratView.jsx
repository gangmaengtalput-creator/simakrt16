// File: src/components/DashboardWarga/PermintaanSuratView.jsx
import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PermintaanSuratView({ 
  wargaAktif, 
  listPermintaan, 
  fetchDataWarga, 
  cetakSurat, // Pastikan prop ini diterima dari Parent component
  setCetakSurat 
}) {
  const supabase = getSupabaseClient();
  const [formSurat, setFormSurat] = useState({ tujuan: '', keterangan: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalInfo, setModalInfo] = useState({ open: false, message: '', type: 'success' }); 

  const submitPermintaanSurat = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // 1. Simpan ke database Supabase
    const { error } = await supabase.from('permintaan_surat').insert([{
      nik_pemohon: wargaAktif.nik,
      nama_pemohon: wargaAktif.nama,
      tujuan: formSurat.tujuan,
      keterangan: formSurat.keterangan,
      status: 'Menunggu'
    }]);
    
    if (!error) {
      // 2. KIRIM NOTIFIKASI EMAIL KE BELAKANG LAYAR (Background)
      const dataNotif = {
        nama: wargaAktif.nama, 
        pesan: `Permintaan Surat Pengantar Baru!\n\nNIK: ${wargaAktif.nik}\nKeperluan: ${formSurat.tujuan}\nKeterangan Tambahan: ${formSurat.keterangan}\n\nSilakan cek Dashboard Ketua RT untuk memprosesnya.`
      };

      try {
        await Promise.all([
          fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataNotif) }).catch(err => console.error(err)),
          fetch('/api/send-wa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataNotif) }).catch(err => console.error(err))
        ]);
      } catch (err) {
        console.error("Notifikasi email gagal, tapi data surat tersimpan.", err);
      }

      setIsProcessing(false);
      setModalInfo({ open: true, message: "Permintaan surat pengantar berhasil dikirim ke Ketua RT!", type: 'success' });
      setFormSurat({ tujuan: '', keterangan: '' });
      fetchDataWarga(wargaAktif.nik);
    } else {
      setIsProcessing(false);
      setModalInfo({ open: true, message: "Gagal mengirim permintaan: " + error.message, type: 'error' });
    }
  };

  const aksiLihatSuratSelesai = async (idSuratKeterangan) => {
    if (!idSuratKeterangan) {
      setModalInfo({ open: true, message: "ID Surat tidak valid. Harap hubungi Ketua RT.", type: 'error' });
      return;
    }

    const { data: suratData, error } = await supabase
      .from('surat_keterangan')
      .select('*')
      .eq('id', idSuratKeterangan)
      .maybeSingle(); 
      
    if (error) {
      setModalInfo({ open: true, message: "Terjadi kesalahan sistem database: " + error.message, type: 'error' });
      return;
    }
    
    if (!suratData) {
      setModalInfo({ open: true, message: "Dokumen Gagal Dimuat: Surat ini kemungkinan besar sudah DIHAPUS dari arsip oleh Ketua RT.", type: 'warning' });
      return;
    }

    // Set data cetak dengan format yang sama dengan dashboard RT
    setCetakSurat({ 
      nomorSurat: suratData.nomor_surat, 
      warga: wargaAktif, 
      deskripsi: suratData.deskripsi, 
      tujuan: suratData.tujuan_surat, 
      pbb: 'Lunas', 
      tanggal: new Date(suratData.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative print:font-serif">
      
      {/* TAMPILKAN FORM DAN TABEL HANYA JIKA TIDAK SEDANG MELIHAT SURAT */}
      {!cetakSurat && (
        <>
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border print:hidden">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Buat Permintaan Surat Pengantar</h2>
            <form onSubmit={submitPermintaanSurat} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tujuan / Keperluan Surat:</label>
                <input required type="text" value={formSurat.tujuan} onChange={(e) => setFormSurat({...formSurat, tujuan: e.target.value})} placeholder="Contoh: Melamar Pekerjaan, Pembuatan SKCK..." className="w-full border p-3 rounded-lg focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan Tambahan:</label>
                <textarea required value={formSurat.keterangan} onChange={(e) => setFormSurat({...formSurat, keterangan: e.target.value})} placeholder="Berikan penjelasan singkat untuk Ketua RT..." rows="3" className="w-full border p-3 rounded-lg focus:ring-blue-500"></textarea>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {isProcessing ? 'Mengirim...' : 'Kirim Permintaan ke RT'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
            <div className="bg-gray-800 p-4"><h3 className="font-bold text-white">Status Permintaan Surat Saya</h3></div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Tujuan Surat</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-center">Dokumen</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y">
                  {listPermintaan.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-3 font-medium">{item.tujuan}</td>
                      <td className="py-3 px-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'Selesai' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'Selesai' && item.surat_keterangan_id ? (
                          <button 
                            onClick={() => aksiLihatSuratSelesai(item.surat_keterangan_id)} 
                            className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
                          >
                            Lihat & Cetak PDF
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Menunggu Ketua RT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* PRINT PREVIEW SURAT (RESPONSIVE DI MOBILE) */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print-container m-0 p-0 shadow-none">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-gray-800 p-4 rounded-lg print:hidden sticky top-4 z-50">
            <p className="text-white font-medium text-sm">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500">
                Tutup Dokumen
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-400">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-white print:p-0 flex justify-center">
            
            {/* KERTAS A4 - RESPONSIVE DI HP, KAKU SAAT PRINT/DESKTOP */}
            <div 
              className="bg-white shadow-2xl print:shadow-none font-serif text-sm sm:text-[12pt] print:text-[12pt] leading-snug text-justify text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:h-[297mm] p-4 sm:p-[1.5cm_2cm] print:p-[1.5cm_2cm] box-border mx-auto"
            >
              
              {/* --- KOP SURAT --- */}
              <div className="relative border-b-[3px] border-black pb-2 mb-4 flex justify-center items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <img src="/logo-palembang.png" alt="Logo Palembang" className="w-14 h-14 sm:w-24 sm:h-24 print:w-24 print:h-24 object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                </div>
                <div className="w-full text-center pl-16 sm:pl-8 print:pl-8">
                  <h2 className="text-[11pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight">PEMERINTAH KOTA PALEMBANG</h2>
                  <h2 className="text-[11pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight whitespace-normal sm:whitespace-nowrap print:whitespace-nowrap">KELURAHAN TALANGPUTRI KECAMATAN PLAJU</h2>
                  <h1 className="text-[12pt] sm:text-[14pt] print:text-[14pt] font-bold uppercase leading-tight mt-1">KETUA RT.16 RW.04</h1>
                  <p className="text-[9pt] sm:text-[11pt] print:text-[11pt] mt-1 leading-tight">Jl. Kapten Robani Kadir RT.16 RW.04 Kode Pos : 30267</p>
                </div>
              </div>

              {/* --- JUDUL SURAT --- */}
              <div className="text-center mb-5 break-inside-avoid">
                <h1 className="font-bold text-base sm:text-[14pt] print:text-[14pt] underline tracking-wide uppercase">SURAT KETERANGAN</h1>
                <p className="text-sm sm:text-[12pt] print:text-[12pt] mt-1">Nomor : {cetakSurat?.nomorSurat}</p>
              </div>

              {/* --- ISI SURAT --- */}
              <p className="mb-2 text-left">Yang bertanda tangan dibawah ini :</p>
              <table className="mb-3 ml-0 sm:ml-4 print:ml-4 leading-snug break-inside-avoid w-full sm:w-auto text-[10pt] sm:text-[12pt] print:text-[12pt]">
                <tbody>
                  <tr><td className="w-24 sm:w-40 print:w-40 align-top">Nama</td><td className="w-2 sm:w-4 print:w-4 align-top">:</td><td className="font-bold uppercase align-top">GUNTUR BAYU JANTORO</td></tr>
                  <tr><td className="align-top">Jabatan</td><td className="align-top">:</td><td className="align-top">Ketua RT.16</td></tr>
                </tbody>
              </table>

              <p className="mb-2 text-left">Dengan ini menerangkan bahwa :</p>
              <table className="mb-3 ml-0 sm:ml-4 print:ml-4 leading-snug break-inside-avoid w-full sm:w-auto text-[10pt] sm:text-[12pt] print:text-[12pt]">
                <tbody>
                  <tr><td className="w-24 sm:w-40 print:w-40 align-top py-0.5">Nama</td><td className="w-2 sm:w-4 print:w-4 align-top py-0.5">:</td><td className="font-bold uppercase align-top py-0.5">{cetakSurat?.warga?.nama || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">NIK</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.nik || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Jenis Kelamin</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{(cetakSurat?.warga?.jenis_kelamin || '').toLowerCase().startsWith('l') ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td className="align-top py-0.5">Tempat/Tgl. Lahir</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.tempat_lahir || '-'} / {cetakSurat?.warga?.tgl_lahir || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Bangsa/Agama</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">Indonesia / {cetakSurat?.warga?.agama || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Pekerjaan</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5 capitalize">{cetakSurat?.warga?.pekerjaan || '-'}</td></tr>
                  <tr><td className="align-top py-0.5">Alamat</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.alamat || '-'}<br/>RT.16 RW.04 Kelurahan Talangputri Kec. Plaju</td></tr>
                  <tr><td className="align-top py-0.5">Kartu Keluarga No</td><td className="align-top py-0.5">:</td><td className="align-top py-0.5">{cetakSurat?.warga?.no_kk || '-'}</td></tr>
                </tbody>
              </table>

              <p className="mb-2 text-justify indent-6 sm:indent-[1cm] print:indent-[1cm]">Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas {cetakSurat?.deskripsi}</p>
              
              <p className="mb-2 text-left">Surat Keterangan ini diberikan untuk : <strong className="uppercase">{cetakSurat?.tujuan}</strong></p>
              <p className="mb-4 text-left break-inside-avoid">Demikian keterangan ini untuk dipergunakan seperlunya.</p>
              
              {/* --- AREA TANDA TANGAN --- */}
              <div className="w-full mt-4 break-inside-avoid text-[10pt] sm:text-[12pt] print:text-[12pt] leading-normal flex relative z-10">
                <div className="w-1/2 text-center">
                  <p className="invisible mb-1">Palembang, {cetakSurat?.tanggal}</p>
                  <p className="font-bold">Mengetahui,<br/>Ketua RW.04</p>
                  <div className="h-16 sm:h-20 print:h-20"></div>
                  <p className="font-bold uppercase underline" style={{ textUnderlineOffset: '2px' }}>HERIYANSAH</p>
                </div>
                
                <div className="w-1/2 text-center flex flex-col items-center">
                  <p className="mb-1">Palembang, {cetakSurat?.tanggal}</p>
                  <p className="font-bold"><span className="invisible">Mengetahui,</span><br/>Ketua RT.16</p>
                  
                  <div className="h-16 sm:h-20 print:h-20 relative w-full flex items-center justify-center">
                    <img src="/ttd-guntur.png" alt="TTD" className="absolute bottom-[-15px] sm:bottom-[-30px] print:bottom-[-30px] w-28 sm:w-56 print:w-56 h-auto z-10 pointer-events-none" style={{ mixBlendMode: 'multiply' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>

                  <p className="font-bold uppercase underline relative z-0" style={{ textUnderlineOffset: '2px' }}>
                    GUNTUR BAYU JANTORO
                  </p>
                </div>
              </div>

              {/* --- CATATAN PBB --- */}
              <div className="mt-6 text-xs sm:text-[11pt] print:text-[11pt] leading-tight break-inside-avoid text-left relative z-10">
                <p className="font-bold">Catatan :</p>
                <p>PBB Tahun {new Date().getFullYear()} : <span className="font-bold">{cetakSurat?.pbb || 'Lunas'}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIFIKASI KUSTOM */}
      {modalInfo.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
            <div className={`p-6 text-white flex flex-col justify-center items-center ${
              modalInfo.type === 'success' ? 'bg-green-500' : 
              modalInfo.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {/* Icon Berhasil */}
              {modalInfo.type === 'success' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              )}
              {/* Icon Peringatan */}
              {modalInfo.type === 'warning' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              )}
              {/* Icon Error */}
              {modalInfo.type === 'error' && (
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}

              <h3 className="text-xl font-bold">
                {modalInfo.type === 'success' ? 'Berhasil' : modalInfo.type === 'warning' ? 'Peringatan' : 'Gagal'}
              </h3>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-700 text-sm md:text-base mb-8">{modalInfo.message}</p>
              <button
                onClick={() => setModalInfo({ open: false, message: '', type: 'success' })}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-colors ${
                  modalInfo.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                  modalInfo.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PRINT CSS MURNI DAN AMAN (NO BLANK PAGE) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait !important; margin: 0 !important; }
          body, html { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
          .print-container { 
            display: flex !important; 
            justify-content: center !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            border: none !important; 
            box-shadow: none !important; 
          }
          .break-inside-avoid { break-inside: avoid !important; }
          table { page-break-inside: avoid !important; }
        }
        .text-capitalize { text-transform: capitalize; }
        .text-indent-8 { text-indent: 1cm; }
      `}} />
    </div>
  );
}