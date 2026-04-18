// File: src/components/DashboardKetua/BuatSuratView.jsx
import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

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
  const supabase = getSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showSuratModal, setShowSuratModal] = useState({ edit: false, delete: false });
  const [editSuratData, setEditSuratData] = useState({});

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
        await supabase.from('permintaan_surat').update({
          status: 'Selesai',
          surat_keterangan_id: newSuratData.id
        }).eq('id', permintaanAktifId);
        
        fetchPermintaanMasuk(); 

        try {
          const { data: profile } = await supabase.from('profiles').select('email').eq('nik', wargaSurat?.nik).single();

          if (profile?.email) {
            const baseUrl = window.location.origin;
            const logoUrl = `${baseUrl}/logo-palembang.png`;
            const ttdUrl = `${baseUrl}/ttd-guntur.png`;

            const formatTglLahir = (tgl) => {
              if (!tgl) return '-';
              const [y, m, d] = tgl.split('-');
              return `${d}/${m}/${y}`;
            };

            const tglLahirIndo = formatTglLahir(wargaSurat?.tgl_lahir);
            const pbbTahun = date.getFullYear();

            // MURNI TIDAK DIUBAH (HANYA EFEK MENGGORES DI TTD)
            const htmlDokumenSurat = `
              <!DOCTYPE html>
              <html lang="id">
              <head>
                <meta charset="UTF-8">
                <style>
                  @page { size: A4 portrait; margin: 1.5cm 2cm; }
                </style>
              </head>
              <body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.2; color: black; margin: 0; padding: 0;">
                
                <table width="100%" style="width: 100%; border-bottom: 3px solid black; margin-bottom: 15px; border-collapse: collapse;">
                  <tr>
                    <td width="15%" align="left" style="width: 15%; text-align: left; vertical-align: middle; padding-bottom: 5px;">
                      <img src="${logoUrl}" style="width: 80px; height: auto;" alt="Logo" onerror="this.style.display='none'">
                    </td>
                    <td width="70%" align="center" style="width: 70%; text-align: center; vertical-align: middle; padding-bottom: 5px; white-space: nowrap;">
                      <h2 style="margin: 0; font-size: 13.5pt; font-weight: bold; text-transform: uppercase; text-align: center;">PEMERINTAH KOTA PALEMBANG</h2>
                      <h2 style="margin: 0; font-size: 13.5pt; font-weight: bold; text-transform: uppercase; text-align: center;">KELURAHAN TALANGPUTRI KECAMATAN PLAJU</h2>
                      <h1 style="margin: 2px 0; font-size: 15pt; font-weight: bold; text-transform: uppercase; text-align: center;">KETUA RT.16 RW.04</h1>
                      <p style="margin: 0; font-size: 10.5pt; text-align: center;">Jl. Kapten Robani Kadir RT.16 RW.04 Kode Pos : 30267</p>
                    </td>
                    <td width="15%" style="width: 15%; padding-bottom: 5px;"></td>
                  </tr>
                </table>

                <div align="center" style="text-align: center; margin-bottom: 15px;">
                  <p align="center" style="font-size: 12pt; font-weight: bold; text-decoration: underline; margin: 0; text-align: center;">SURAT KETERANGAN</p>
                  <p align="center" style="font-size: 12pt; margin: 2px 0 0 0; text-align: center;">Nomor : ${nomorSuratBaru}</p>
                </div>

                <p style="margin: 0 0 8px 0; text-align: justify;">Yang bertanda tangan dibawah ini : </p>
                <table width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed;">
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Nama</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;<b>GUNTUR BAYU JANTORO</b></td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Jabatan</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;Ketua RT.16</td>
                  </tr>
                </table>

                <p style="margin: 0 0 8px 0; text-align: justify;">Dengan ini menerangkan bahwa : </p>
                <table width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed;">
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Nama</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top; text-transform: uppercase;">&nbsp;&nbsp;${wargaSurat?.nama || '-'}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">NIK</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;${wargaSurat?.nik || '-'}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Jenis Kelamin</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;${(wargaSurat?.jenis_kelamin || '').toLowerCase().startsWith('l') ? 'Laki-laki' : 'Perempuan'}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Tempat/Tgl. Lahir</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;${wargaSurat?.tempat_lahir || '-'} / ${tglLahirIndo}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Bangsa/Agama</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;Indonesia / ${wargaSurat?.agama || '-'}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Pekerjaan</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top; text-transform: capitalize;">&nbsp;&nbsp;${wargaSurat?.pekerjaan || '-'}</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Alamat</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;${wargaSurat?.alamat || '-'}<br>&nbsp;&nbsp;RT.16 RW.04 Kelurahan Talangputri Kec. Plaju Kota Palembang</td>
                  </tr>
                  <tr>
                    <td width="170" style="width: 170px; padding: 1.5px 0; vertical-align: top;">Kartu Keluarga No</td>
                    <td width="20" align="center" style="width: 20px; text-align: center; padding: 1.5px 0; vertical-align: top;">:</td>
                    <td style="padding: 1.5px 0; vertical-align: top;">&nbsp;&nbsp;${wargaSurat?.no_kk || '-'}</td>
                  </tr>
                </table>

                <p style="margin: 0 0 8px 0; text-align: justify;">Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas ${suratFormData.deskripsi}</p>
                
                <p style="margin: 0 0 8px 0; text-align: left;">Surat Keterangan ini diberikan untuk : ${suratFormData.tujuan_surat}</p>
                
                <p style="margin: 0 0 8px 0; text-align: justify;">Demikian keterangan ini untuk dipergunakan seperlunya.</p>

                <table width="100%" style="width: 100%; margin-top: 15px; border-collapse: collapse; page-break-inside: avoid;">
                  <tr>
                    <td width="50%" style="width: 50%;"></td>
                    <td width="50%" align="center" style="width: 50%; text-align: center;">Palembang, ${date.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td>
                  </tr>
                  <tr>
                    <td align="center" style="text-align: center;"><br>Mengetahui,<br>Ketua RW.04</td>
                    <td align="center" style="text-align: center;"><br><br>Ketua RT.16</td>
                  </tr>
                  <tr>
                    <td align="center" style="height: 95px; text-align: center; vertical-align: bottom;">
                      <span style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">HERIYANSAH</span>
                    </td>
                    <td align="center" style="height: 95px; position: relative; text-align: center; vertical-align: bottom;">
                      <img src="${ttdUrl}" style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); width: 150px; z-index: 10; mix-blend-mode: multiply;" alt="TTD" onerror="this.style.display='none'">
                      <span style="font-weight: bold; text-decoration: underline; text-transform: uppercase; position: relative; z-index: 1;">GUNTUR BAYU JANTORO</span>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 15px;">
                  <p style="margin: 0;">Catatan : </p>
                  <p style="margin: 0;">PBB Tahun ${pbbTahun}</p>
                  <p style="margin: 0;">${suratFormData.pbb || 'Lunas/Belum Lunas/Tidak Terbit'}</p>
                </div>

              </body>
              </html>
            `;

            fetch('/api/notify-warga', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emailTujuan: profile.email,
                nama: wargaSurat?.nama,
                status: 'Selesai',
                nomorSurat: nomorSuratBaru,
                tujuan: suratFormData.tujuan_surat,
                htmlSurat: htmlDokumenSurat 
              })
            }).catch(err => console.error("Gagal kirim notifikasi PDF:", err));
          }
        } catch (err) {
          console.error("Error proses notifikasi:", err);
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

  const formatTglLahirLayar = (tgl) => {
    if (!tgl) return '-';
    const [y, m, d] = tgl.split('-');
    return `${d}/${m}/${y}`;
  };

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
                      <div className="text-gray-500">TTL: <span className="font-bold text-gray-800">{wargaSurat?.tempat_lahir || '-'}, {formatTglLahirLayar(wargaSurat?.tgl_lahir)}</span></div>
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
            
            <div 
              className="bg-white shadow-2xl print:shadow-none font-serif text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:min-h-[297mm] box-border mx-auto"
              style={{ padding: '1.5cm 2cm', fontSize: '12pt', lineHeight: '1.2' }}
            >
              
              <table width="100%" style={{ width: '100%', borderBottom: '3px solid black', marginBottom: '15px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td width="15%" align="left" style={{ width: '15%', textAlign: 'left', verticalAlign: 'middle', paddingBottom: '5px' }}>
                      <img src="/logo-palembang.png" style={{ width: '80px', height: 'auto' }} alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    </td>
                    <td width="70%" align="center" style={{ width: '70%', textAlign: 'center', verticalAlign: 'middle', paddingBottom: '5px', whiteSpace: 'nowrap' }}>
                      <h2 style={{ margin: 0, fontSize: '13.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>PEMERINTAH KOTA PALEMBANG</h2>
                      <h2 style={{ margin: 0, fontSize: '13.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>KELURAHAN TALANGPUTRI KECAMATAN PLAJU</h2>
                      <h1 style={{ margin: '2px 0', fontSize: '15pt', fontWeight: 'bold', textTransform: 'uppercase' }}>KETUA RT.16 RW.04</h1>
                      <p style={{ margin: 0, fontSize: '10.5pt' }}>Jl. Kapten Robani Kadir RT.16 RW.04 Kode Pos : 30267</p>
                    </td>
                    <td width="15%" style={{ width: '15%', paddingBottom: '5px' }}></td>
                  </tr>
                </tbody>
              </table>

              <div align="center" style={{ textAlign: 'center', marginBottom: '15px' }}>
                <p style={{ fontSize: '12pt', fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>SURAT KETERANGAN</p>
                <p style={{ fontSize: '12pt', margin: '2px 0 0 0' }}>Nomor : {cetakSurat?.nomorSurat}</p>
              </div>

              <p style={{ margin: '0 0 8px 0', textAlign: 'justify' }}>Yang bertanda tangan dibawah ini :</p>
              
              <table width="100%" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Nama</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;<b>GUNTUR BAYU JANTORO</b></td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Jabatan</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;Ketua RT.16</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ margin: '0 0 8px 0', textAlign: 'justify' }}>Dengan ini menerangkan bahwa :</p>
              
              <table width="100%" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Nama</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top', textTransform: 'uppercase' }}>&nbsp;&nbsp;{cetakSurat?.warga?.nama || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>NIK</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;{cetakSurat?.warga?.nik || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Jenis Kelamin</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;{(cetakSurat?.warga?.jenis_kelamin || '').toLowerCase().startsWith('l') ? 'Laki-laki' : 'Perempuan'}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Tempat/Tgl. Lahir</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;{cetakSurat?.warga?.tempat_lahir || '-'} / {formatTglLahirLayar(cetakSurat?.warga?.tgl_lahir)}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Bangsa/Agama</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;Indonesia / {cetakSurat?.warga?.agama || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Pekerjaan</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top', textTransform: 'capitalize' }}>&nbsp;&nbsp;{cetakSurat?.warga?.pekerjaan || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Alamat</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;{cetakSurat?.warga?.alamat || '-'}<br/>&nbsp;&nbsp;RT.16 RW.04 Kelurahan Talangputri Kec. Plaju Kota Palembang</td>
                  </tr>
                  <tr>
                    <td style={{ width: '170px', padding: '1.5px 0', verticalAlign: 'top' }}>Kartu Keluarga No</td>
                    <td style={{ width: '20px', textAlign: 'center', padding: '1.5px 0', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '1.5px 0', verticalAlign: 'top' }}>&nbsp;&nbsp;{cetakSurat?.warga?.no_kk || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ margin: '0 0 8px 0', textAlign: 'justify' }}>Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas {cetakSurat?.deskripsi}</p>
              
              <p style={{ margin: '0 0 8px 0', textAlign: 'left' }}>Surat Keterangan ini diberikan untuk : {cetakSurat?.tujuan}</p>
              <p style={{ margin: '0 0 8px 0', textAlign: 'justify' }}>Demikian keterangan ini untuk dipergunakan seperlunya.</p>
              
              <table width="100%" style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse', pageBreakInside: 'avoid' }}>
                <tbody>
                  <tr>
                    <td width="50%" style={{ width: '50%' }}></td>
                    <td width="50%" align="center" style={{ width: '50%', textAlign: 'center' }}>Palembang, {cetakSurat?.tanggal}</td>
                  </tr>
                  <tr>
                    <td align="center" style={{ textAlign: 'center' }}><br/>Mengetahui,<br/>Ketua RW.04</td>
                    <td align="center" style={{ textAlign: 'center' }}><br/><br/>Ketua RT.16</td>
                  </tr>
                  <tr>
                    <td align="center" style={{ height: '95px', textAlign: 'center', verticalAlign: 'bottom' }}>
                      <span style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>HERIYANSAH</span>
                    </td>
                    <td align="center" style={{ height: '95px', position: 'relative', textAlign: 'center', verticalAlign: 'bottom' }}>
                      {/* EFEK TTD MENGGORES: bottom diturunkan menjadi -15px, zIndex diubah ke 10 */}
                      <img src="/ttd-guntur.png" style={{ position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)', width: '150px', zIndex: 10, mixBlendMode: 'multiply' }} alt="TTD" onError={(e) => { e.target.style.display = 'none'; }} />
                      <span style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>GUNTUR BAYU JANTORO</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '15px' }}>
                <p style={{ margin: 0 }}>Catatan :</p>
                <p style={{ margin: 0 }}>PBB Tahun {new Date().getFullYear()}</p>
                <p style={{ margin: 0 }}>{cetakSurat?.pbb || 'Lunas/Belum Lunas/Tidak Terbit'}</p>
              </div>

            </div>
          </div>
        </div>
      )}

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
        .animate-fade-in { animation: fadeInBuat 0.3s ease-in-out; }
        @keyframes fadeInBuat {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}