import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PermintaanSuratView({ 
  wargaAktif, 
  listPermintaan, 
  fetchDataWarga, 
  cetakSurat, 
  setCetakSurat 
}) {
  const supabase = getSupabaseClient();
  const [formSurat, setFormSurat] = useState({ tujuan: '', keterangan: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ==========================================
  // STATE MODAL GLOBAL PROFESIONAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    onConfirm: null,
  });

  const showModal = (config) => setAlertModal({ ...alertModal, ...config, isOpen: true });
  const closeModal = () => setAlertModal({ ...alertModal, isOpen: false });
  const handleConfirm = () => {
    if (alertModal.onConfirm) alertModal.onConfirm();
    closeModal();
  };

  // ==========================================
  // FUNGSI LOGIKA DATABASE
  // ==========================================
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
      setFormSurat({ tujuan: '', keterangan: '' });
      fetchDataWarga(wargaAktif.nik);
      
      showModal({ 
        type: 'success', 
        title: 'Berhasil Terkirim!', 
        message: 'Permintaan surat pengantar Anda berhasil dikirim ke Ketua RT. Silakan pantau statusnya di tabel bawah secara berkala.', 
        confirmText: 'Tutup' 
      });
    } else {
      setIsProcessing(false);
      showModal({ 
        type: 'error', 
        title: 'Gagal Mengirim', 
        message: `Terjadi kesalahan saat mengirim permintaan: ${error.message}`, 
        confirmText: 'Tutup' 
      });
    }
  };

  const aksiLihatSuratSelesai = async (idSuratKeterangan) => {
    if (!idSuratKeterangan) {
      return showModal({ type: 'error', title: 'Data Tidak Valid', message: 'ID Surat tidak valid. Harap hubungi Ketua RT.', confirmText: 'Tutup' });
    }

    const { data: suratData, error } = await supabase
      .from('surat_keterangan')
      .select('*')
      .eq('id', idSuratKeterangan)
      .maybeSingle(); 
      
    if (error) {
      return showModal({ type: 'error', title: 'Kesalahan Sistem', message: `Terjadi kesalahan sistem database: ${error.message}`, confirmText: 'Tutup' });
    }
    
    if (!suratData) {
      return showModal({ type: 'warning', title: 'Dokumen Tidak Ditemukan', message: 'Surat ini kemungkinan besar sudah dihapus dari arsip oleh Ketua RT. Silakan buat permintaan baru jika diperlukan.', confirmText: 'Mengerti' });
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
    <div className="max-w-5xl mx-auto space-y-8 relative print:font-serif">
      
      {/* TAMPILKAN FORM DAN TABEL HANYA JIKA TIDAK SEDANG MELIHAT SURAT */}
      {!cetakSurat && (
        <>
          {/* FORM PENGAJUAN SURAT */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 print:hidden relative overflow-hidden">
            {/* Dekorasi Latar Belakang */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full opacity-50 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4 relative z-10">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">Pengajuan Surat Pengantar</h2>
            </div>

            <form onSubmit={submitPermintaanSurat} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tujuan / Keperluan Surat <span className="text-red-500">*</span></label>
                <input required type="text" value={formSurat.tujuan} onChange={(e) => setFormSurat({...formSurat, tujuan: e.target.value})} placeholder="Contoh: Melamar Pekerjaan, Pembuatan SKCK..." className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Keterangan Tambahan <span className="text-red-500">*</span></label>
                <textarea required value={formSurat.keterangan} onChange={(e) => setFormSurat({...formSurat, keterangan: e.target.value})} placeholder="Berikan penjelasan singkat untuk Ketua RT (contoh: untuk melamar ke PT. XYZ)..." rows="3" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"></textarea>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center gap-2">
                  {isProcessing ? 'Mengirim Data...' : 'Kirim Permohonan ke RT'}
                </button>
              </div>
            </form>
          </div>

          {/* TABEL STATUS PERMINTAAN */}
          <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden print:hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-5 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-wide">Status Pengajuan Saya</h3>
                <p className="text-gray-300 text-xs font-medium mt-0.5">Pantau riwayat surat pengantar yang pernah Anda ajukan.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="py-4 px-5 font-bold">Tanggal</th>
                    <th className="py-4 px-5 font-bold">Tujuan Surat</th>
                    <th className="py-4 px-5 font-bold text-center">Status</th>
                    <th className="py-4 px-5 font-bold text-center">Dokumen PDF</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {listPermintaan.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="py-4 px-5 text-gray-500 font-medium">{new Date(item.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</td>
                      <td className="py-4 px-5">
                        <span className="font-bold text-gray-800">{item.tujuan}</span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          item.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 
                          item.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        {item.status === 'Selesai' && item.surat_keterangan_id ? (
                          <button 
                            onClick={() => aksiLihatSuratSelesai(item.surat_keterangan_id)} 
                            className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-transparent shadow-sm transition-all active:scale-95"
                          >
                            Lihat & Cetak PDF
                          </button>
                        ) : item.status === 'Ditolak' ? (
                          <span className="text-xs text-red-400 font-medium italic bg-red-50 px-2 py-1 rounded">Dibatalkan RT</span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic bg-gray-50 px-2 py-1 rounded">Menunggu Diproses</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {listPermintaan.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-12 text-center">
                        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm">Belum ada riwayat pengajuan surat.</p>
                      </td>
                    </tr>
                  )}
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
        <div className="print-container m-0 p-0 shadow-none animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-900 p-5 rounded-2xl print:hidden sticky top-4 z-50 shadow-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>
              <p className="text-white font-bold text-sm tracking-wide">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-600 transition-colors">
                Tutup Dokumen
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-100 p-4 sm:p-8 rounded-2xl print:bg-white print:p-0 flex justify-center">
            
            {/* KERTAS A4 - RESPONSIVE DI HP, KAKU SAAT PRINT/DESKTOP */}
            <div 
              className="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] print:shadow-none font-serif text-sm sm:text-[12pt] print:text-[12pt] leading-snug text-justify text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:h-[297mm] p-4 sm:p-[1.5cm_2cm] print:p-[1.5cm_2cm] box-border mx-auto"
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

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <button
                onClick={handleConfirm}
                className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                  alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                  alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                  'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                {alertModal.confirmText}
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