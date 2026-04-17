// File: src/components/DashboardKetua/BuatSuratView.jsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BuatSuratView({
  activeView,
  setActiveView,
  dataWarga,
  riwayatSurat,
  fetchRiwayatSurat,
  suratNIK, setSuratNIK,
  wargaSurat, setWargaSurat,
  suratFormData, setSuratFormData,
  cetakSurat, setCetakSurat,
  permintaanAktifId, setPermintaanAktifId,
  fetchPermintaanMasuk
}) {
  // ==========================================
  // STATE LOKAL
  // ==========================================
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showSuratModal, setShowSuratModal] = useState({ edit: false, delete: false });
  const [editSuratData, setEditSuratData] = useState({});

  // ==========================================
  // FUNGSI LOGIKA SURAT
  // ==========================================
  const cariWargaSurat = async (e) => {
    e.preventDefault(); 
    setIsLoading(true); 
    setWargaSurat(null);
    const { data, error } = await supabase.from('master_warga').select('*').eq('nik', suratNIK).single();
    if (error || !data) alert("NIK tidak ditemukan di database warga!"); 
    else setWargaSurat(data);
    setIsLoading(false);
  };

  const handleSuratChange = (e) => setSuratFormData({ ...suratFormData, [e.target.name]: e.target.value });

  const tolakDariGenerator = async (e) => {
    e.preventDefault();
    const alasan = prompt("Masukkan alasan penolakan surat ini:");
    if (!alasan) return;
    
    setIsProcessing(true);
    await supabase.from('permintaan_surat').update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` }).eq('id', permintaanAktifId);
    setIsProcessing(false);
    
    setPermintaanAktifId(null);
    setCetakSurat(null);
    fetchPermintaanMasuk(); 
  };

  const buatSuratBaru = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);

    const date = new Date(); 
    const year = date.getFullYear(); 
    const month = date.getMonth(); 
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]; 
    const romanMonth = romanMonths[month];

    const { data: lastSurat } = await supabase.from('surat_keterangan').select('nomor_urut').eq('tahun', year).order('nomor_urut', { ascending: false }).limit(1);
    
    let nextUrut = 1; 
    if (lastSurat && lastSurat.length > 0) nextUrut = lastSurat[0].nomor_urut + 1;
    
    const formattedUrut = String(nextUrut).padStart(3, '0'); 
    const nomorSuratBaru = `${formattedUrut}/RT.16/RW.04/${romanMonth}/${year}`;

    const { data: newSuratData, error } = await supabase.from('surat_keterangan').insert([{ 
      nomor_urut: nextUrut, 
      nomor_surat: nomorSuratBaru, 
      nik_warga: wargaSurat?.nik, 
      deskripsi: suratFormData.deskripsi, 
      tujuan_surat: suratFormData.tujuan_surat, 
      tahun: year 
    }]).select().single();

    if (!error && newSuratData) { 
      if (permintaanAktifId) {
        const { error: updateError } = await supabase.from('permintaan_surat').update({
          status: 'Selesai',
          surat_keterangan_id: newSuratData.id
        }).eq('id', permintaanAktifId);
        
        if (updateError) {
          alert("Surat dibuat, tapi gagal memperbarui status permintaan: " + updateError.message);
        } else {
          fetchPermintaanMasuk(); 
        }
      }

      fetchRiwayatSurat(); 
      setCetakSurat({ 
        nomorSurat: nomorSuratBaru, 
        warga: wargaSurat, 
        deskripsi: suratFormData.deskripsi, 
        tujuan: suratFormData.tujuan_surat, 
        pbb: suratFormData.pbb, 
        tanggal: date.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
      }); 
    } else {
      alert("Gagal membuat nomor surat: " + error?.message);
    }
    setIsProcessing(false);
  };

  const aksiLihatSurat = async (surat) => {
    let wargaInfo = dataWarga.find(w => String(w?.nik) === String(surat?.nik_warga));
    if (!wargaInfo) {
      const { data } = await supabase.from('master_warga').select('*').eq('nik', surat?.nik_warga).single();
      if (data) wargaInfo = data;
    }
    if (!wargaInfo) return alert("Gagal! Data warga pemohon ini sudah terhapus dari database.");
    
    setCetakSurat({ 
      nomorSurat: surat?.nomor_surat, 
      warga: wargaInfo, 
      deskripsi: surat?.deskripsi, 
      tujuan: surat?.tujuan_surat, 
      pbb: 'Lunas', 
      tanggal: new Date(surat?.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
    });
  };

  const aksiEditSurat = (surat) => { 
    setSelectedSurat(surat); 
    setEditSuratData({ deskripsi: surat?.deskripsi, tujuan_surat: surat?.tujuan_surat }); 
    setShowSuratModal({ ...showSuratModal, edit: true }); 
  };

  const simpanEditSurat = async (e) => { 
    e.preventDefault(); setIsProcessing(true); 
    const { error } = await supabase.from('surat_keterangan').update(editSuratData).eq('id', selectedSurat?.id); 
    setIsProcessing(false); 
    if (!error) { setShowSuratModal({ ...showSuratModal, edit: false }); fetchRiwayatSurat(); } 
    else alert(error.message); 
  };

  const aksiHapusSurat = (surat) => { 
    setSelectedSurat(surat); setShowSuratModal({ ...showSuratModal, delete: true }); 
  };

  const simpanHapusSurat = async (e) => { 
    e.preventDefault(); setIsProcessing(true); 
    const { error } = await supabase.from('surat_keterangan').delete().eq('id', selectedSurat?.id); 
    setIsProcessing(false); 
    if (!error) { setShowSuratModal({ ...showSuratModal, delete: false }); fetchRiwayatSurat(); } 
    else alert(error.message); 
  };

  // ==========================================
  // TAMPILAN UI
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto print:font-serif">
      <div className="mb-4 print:hidden flex gap-2 sticky top-4 z-50">
        <button onClick={() => { 
          if (permintaanAktifId) {
            setActiveView('permintaan_masuk');
            setPermintaanAktifId(null);
          } else {
            setActiveView('menu');
          }
          setCetakSurat(null); 
        }} className="text-xs sm:text-sm text-green-700 font-bold hover:underline bg-green-100 px-4 py-2 rounded-lg">
          &larr; {permintaanAktifId ? 'Batal & Kembali ke Kotak Masuk' : 'Kembali ke Menu Utama'}
        </button>
      </div>

      {!cetakSurat && (
        <>
          {/* Form Generator Surat */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden mb-8 border-2 border-green-500">
            <div className="bg-green-600 p-4 flex justify-between items-center break-inside-avoid">
              <h2 className="text-lg sm:text-xl font-bold text-white">Generator Surat Keterangan</h2>
              {permintaanAktifId && <span className="bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">Mode Memproses Permintaan</span>}
            </div>
            <div className="p-4 sm:p-6">
              
              {!permintaanAktifId && (
                <form onSubmit={cariWargaSurat} className="flex flex-col sm:flex-row gap-2 mb-8 bg-gray-50 p-4 rounded-lg border">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">Cari NIK Pemohon:</label>
                    <input type="text" required value={suratNIK} onChange={(e) => setSuratNIK(e.target.value)} placeholder="Masukkan NIK persis sesuai database..." className="w-full border p-2.5 rounded-lg focus:ring-green-500" />
                  </div>
                  <button type="submit" disabled={isLoading} className="mt-2 sm:mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700">
                    {isLoading ? 'Mencari...' : 'Cari Data'}
                  </button>
                </form>
              )}

              {wargaSurat && (
                <form onSubmit={buatSuratBaru} className="space-y-4 sm:space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-2 border-b border-blue-200 pb-2 text-sm">Identitas Pemohon (Otomatis)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs sm:text-sm">
                      <div className="text-gray-500">Nama: <span className="font-bold text-gray-800">{wargaSurat?.nama || '-'}</span></div>
                      <div className="text-gray-500">NIK: <span className="font-bold text-gray-800">{wargaSurat?.nik || '-'}</span></div>
                      <div className="text-gray-500">TTL: <span className="font-bold text-gray-800">{wargaSurat?.tempat_lahir || '-'}, {wargaSurat?.tgl_lahir || '-'}</span></div>
                      <div className="text-gray-500">Pekerjaan: <span className="font-bold text-gray-800">{wargaSurat?.pekerjaan || '-'}</span></div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">Deskripsi Keterangan (Isi dari surat):</label>
                      <textarea name="deskripsi" required value={suratFormData.deskripsi} onChange={handleSuratChange} rows="3" className="w-full border p-3 rounded-lg bg-yellow-50 focus:bg-white"></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">Tujuan Surat:</label>
                        <input type="text" name="tujuan_surat" required value={suratFormData.tujuan_surat} onChange={handleSuratChange} className="w-full border p-2.5 rounded-lg bg-yellow-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">Status PBB Tahun Ini:</label>
                        <select name="pbb" value={suratFormData.pbb} onChange={handleSuratChange} className="w-full border p-2.5 rounded-lg">
                          <option value="Lunas">Lunas</option>
                          <option value="Belum Lunas">Belum Lunas</option>
                          <option value="Tidak Terbit">Tidak Terbit</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex flex-col sm:flex-row justify-end gap-2">
                    {permintaanAktifId && (
                      <button type="button" onClick={tolakDariGenerator} disabled={isProcessing} className="w-full sm:w-auto bg-red-100 text-red-700 px-6 py-3 rounded-lg font-bold hover:bg-red-200 border border-red-200">
                        Tolak Permintaan Ini
                      </button>
                    )}
                    <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-green-700">
                      {isProcessing ? 'Memproses...' : (permintaanAktifId ? 'Simpan & Selesaikan Permintaan' : 'Simpan & Lihat Surat Cetak')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Tabel Riwayat Arsip Surat */}
          {!permintaanAktifId && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden print:hidden">
              <div className="bg-gray-800 p-4 flex justify-between items-center break-inside-avoid">
                <h2 className="text-lg font-bold text-white">Arsip / Riwayat Surat</h2>
              </div>
              <div className="overflow-x-auto p-4 max-w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                      <th className="py-2 px-3">Tgl Dibuat</th>
                      <th className="py-2 px-3">Nomor Surat</th>
                      <th className="py-2 px-3">Pemohon</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y">
                    {riwayatSurat.map((surat) => {
                      if (!surat) return null;
                      const wargaObj = dataWarga.find(w => String(w?.nik) === String(surat?.nik_warga));
                      const namaPemohon = wargaObj ? wargaObj.nama : 'Memuat data...';
                      return (
                        <tr key={surat.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-600">{new Date(surat.created_at).toLocaleDateString('id-ID')}</td>
                          <td className="py-2 px-3 font-bold text-blue-700">{surat.nomor_surat}</td>
                          <td className="py-2 px-3">{namaPemohon}</td>
                          <td className="py-2 px-3 flex justify-center gap-1 action-buttons">
                            <button onClick={() => aksiLihatSurat(surat)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200">Cetak</button>
                            <button onClick={() => aksiEditSurat(surat)} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold hover:bg-yellow-200">Edit</button>
                            <button onClick={() => aksiHapusSurat(surat)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold hover:bg-red-200">Hapus</button>
                          </td>
                        </tr>
                      );
                    })}
                    {riwayatSurat.length === 0 && (
                      <tr><td colSpan="4" className="py-8 text-center text-gray-500">Belum ada riwayat surat.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* PRINT PREVIEW SURAT FORMAT RESMI KELURAHAN */}
      {cetakSurat && (
        <div className="print-container m-0 p-0 shadow-none">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-gray-800 p-4 rounded-lg print:hidden sticky top-4 z-50">
            <p className="text-white font-medium text-sm">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => { 
                setCetakSurat(null); 
                if (permintaanAktifId) {
                  setActiveView('permintaan_masuk');
                  setPermintaanAktifId(null);
                } else if (activeView === 'permintaan_masuk') {
                  setActiveView('menu');
                }
              }} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500">
                {permintaanAktifId ? 'Tutup & Kembali ke Kotak Masuk' : 'Tutup Dokumen'}
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-400">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-transparent print:p-0 flex justify-center">
            
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
              <div className="w-full mt-4 break-inside-avoid leading-normal flex relative z-10 text-[10pt] sm:text-[12pt] print:text-[12pt]">
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

      {/* MODAL EDIT & HAPUS */}
      {showSuratModal.edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden">
          <form onSubmit={simpanEditSurat} className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-yellow-500 p-4 break-inside-avoid"><h3 className="text-lg font-bold text-white">Edit Arsip Surat: {selectedSurat?.nomor_surat}</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi Surat:</label>
                <textarea required value={editSuratData?.deskripsi || ''} onChange={(e) => setEditSuratData({...editSuratData, deskripsi: e.target.value})} rows="4" className="w-full border p-2 rounded focus:ring-yellow-500 bg-yellow-50"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tujuan Surat:</label>
                <input required type="text" value={editSuratData?.tujuan_surat || ''} onChange={(e) => setEditSuratData({...editSuratData, tujuan_surat: e.target.value})} className="w-full border p-2 rounded focus:ring-yellow-500 bg-yellow-50" />
              </div>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowSuratModal({...showSuratModal, edit: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded text-sm font-medium hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold text-sm hover:bg-yellow-700">{isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}

      {showSuratModal.delete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden animate-fade-in">
          <form onSubmit={simpanHapusSurat} className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-red-600 p-4 break-inside-avoid"><h3 className="text-lg font-bold text-white">Hapus Arsip Surat</h3></div>
            <div className="p-6">
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">Anda yakin ingin menghapus permanen riwayat surat nomor <strong>{selectedSurat?.nomor_surat}</strong>?</p>
              <p className="text-xs text-red-700 bg-red-50 p-3 rounded border border-red-100 leading-normal">Peringatan: Tindakan ini tidak akan mereset nomor urut surat, namun catatan ini akan hilang selamanya dari arsip di database.</p>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowSuratModal({...showSuratModal, delete: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded text-sm font-medium hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700">{isProcessing ? 'Memproses...' : 'Hapus Permanen'}</button>
            </div>
          </form>
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
        .animate-fade-in { animation: fadeInBuat 0.3s ease-in-out; }
        @keyframes fadeInBuat {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}