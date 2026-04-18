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
  
  // State Edit Surat Khusus (Karena butuh input form ganda)
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showSuratModal, setShowSuratModal] = useState({ edit: false });
  const [editSuratData, setEditSuratData] = useState({});

  // ==========================================
  // STATE MODAL GLOBAL PROFESIONAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info', // 'success', 'error', 'warning', 'info', 'confirm', 'prompt'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const [promptInput, setPromptInput] = useState('');
  const [promptError, setPromptError] = useState('');

  const showModal = (config) => {
    setPromptInput('');
    setPromptError('');
    setAlertModal({ ...alertModal, ...config, isOpen: true });
  };

  const closeModal = () => setAlertModal({ ...alertModal, isOpen: false });

  const handleConfirm = () => {
    if (alertModal.type === 'prompt') {
      if (!promptInput.trim()) {
        setPromptError('Alasan penolakan tidak boleh kosong!');
        return;
      }
      if (alertModal.onConfirm) alertModal.onConfirm(promptInput);
    } else {
      if (alertModal.onConfirm) alertModal.onConfirm();
    }
  };

  // ==========================================
  // FUNGSI LOGIKA PEMBUATAN SURAT
  // ==========================================
  const cariWargaSurat = async (e) => {
    e.preventDefault(); 
    setIsLoading(true); 
    setWargaSurat(null);
    const { data, error } = await supabase.from('master_warga').select('*').eq('nik', suratNIK).single();
    
    if (error || !data) {
      showModal({ type: 'warning', title: 'Data Tidak Ditemukan', message: 'NIK tersebut tidak terdaftar di dalam database master warga.', confirmText: 'Tutup', onConfirm: closeModal });
    } else {
      setWargaSurat(data);
    }
    setIsLoading(false);
  };

  const handleSuratChange = (e) => setSuratFormData({ ...suratFormData, [e.target.name]: e.target.value });

  const tolakDariGenerator = (e) => {
    e.preventDefault();
    showModal({
      type: 'prompt',
      title: 'Tolak Permintaan Surat',
      message: 'Berikan alasan mengapa Anda menolak pengajuan surat ini:',
      confirmText: 'Tolak Permintaan',
      cancelText: 'Batal',
      onConfirm: async (alasan) => {
        setIsProcessing(true);
        closeModal();
        
        await supabase.from('permintaan_surat').update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` }).eq('id', permintaanAktifId);
        
        setIsProcessing(false);
        setPermintaanAktifId(null);
        setCetakSurat(null);
        fetchPermintaanMasuk(); 
        
        showModal({ type: 'success', title: 'Permintaan Ditolak', message: 'Permintaan surat warga tersebut berhasil ditolak.', confirmText: 'OK', onConfirm: () => {
          closeModal();
          setActiveView('permintaan_masuk');
        }});
      }
    });
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
      
      showModal({ type: 'success', title: 'Berhasil', message: 'Surat Keterangan berhasil dibuat dan siap untuk dicetak.', confirmText: 'Lihat Surat', onConfirm: closeModal });
    } else {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: `Gagal membuat nomor surat: ${error?.message}`, confirmText: 'Tutup', onConfirm: closeModal });
    }
    setIsProcessing(false);
  };

  const aksiLihatSurat = async (surat) => {
    let wargaInfo = dataWarga.find(w => String(w?.nik) === String(surat?.nik_warga));
    if (!wargaInfo) {
      const { data } = await supabase.from('master_warga').select('*').eq('nik', surat?.nik_warga).single();
      if (data) wargaInfo = data;
    }
    if (!wargaInfo) {
      showModal({ type: 'warning', title: 'Data Terhapus', message: 'Gagal memuat pratinjau. Data pemohon ini sudah terhapus dari database master.', confirmText: 'Mengerti', onConfirm: closeModal });
      return;
    }
    
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
    setShowSuratModal({ edit: true }); 
  };

  const simpanEditSurat = async (e) => { 
    e.preventDefault(); setIsProcessing(true); 
    const { error } = await supabase.from('surat_keterangan').update(editSuratData).eq('id', selectedSurat?.id); 
    setIsProcessing(false); 
    if (!error) { 
      setShowSuratModal({ edit: false }); 
      fetchRiwayatSurat(); 
      showModal({ type: 'success', title: 'Berhasil', message: 'Arsip surat berhasil diperbarui.', confirmText: 'OK', onConfirm: closeModal });
    } 
    else {
      showModal({ type: 'error', title: 'Gagal Edit', message: error.message, confirmText: 'Tutup', onConfirm: closeModal });
    }
  };

  const aksiHapusSurat = (surat) => { 
    showModal({
      type: 'confirm',
      title: 'Hapus Arsip Surat?',
      message: `Anda yakin ingin menghapus permanen riwayat surat nomor ${surat.nomor_surat}? (Tindakan ini tidak akan mereset nomor urut)`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        setIsProcessing(true);
        closeModal();
        const { error } = await supabase.from('surat_keterangan').delete().eq('id', surat.id);
        setIsProcessing(false);
        if (!error) {
          fetchRiwayatSurat();
          showModal({ type: 'success', title: 'Dihapus', message: 'Arsip surat berhasil dihapus dari database.', confirmText: 'OK', onConfirm: closeModal });
        } else {
          showModal({ type: 'error', title: 'Gagal Hapus', message: error.message, confirmText: 'Tutup', onConfirm: closeModal });
        }
      }
    });
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
        }} className="text-xs sm:text-sm text-blue-700 font-bold hover:underline bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-100 flex items-center gap-2 transition hover:bg-blue-100 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          {permintaanAktifId ? 'Batal & Kembali ke Kotak Masuk' : 'Kembali ke Menu Utama'}
        </button>
      </div>

      {!cetakSurat && (
        <>
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden print:hidden mb-8 border border-gray-100">
            <div className="bg-gradient-to-r from-teal-500 to-green-600 p-5 flex justify-between items-center break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg shadow-inner">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-black tracking-wide">Generator Surat Keterangan</h2>
              </div>
              {permintaanAktifId && <span className="bg-white/20 text-white border border-white/40 text-[11px] font-bold px-3 py-1.5 rounded-lg animate-pulse tracking-widest shadow-sm">MEMPROSES PENGAJUAN WARGA</span>}
            </div>
            
            <div className="p-5 sm:p-7 bg-gray-50/50">
              
              {!permintaanAktifId && (
                <form onSubmit={cariWargaSurat} className="flex flex-col sm:flex-row gap-3 mb-8 bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Cari NIK Pemohon:</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      <input type="text" required value={suratNIK} onChange={(e) => setSuratNIK(e.target.value)} placeholder="Masukkan NIK persis sesuai database..." className="w-full border border-gray-200 pl-10 pr-4 py-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="mt-1 sm:mt-7 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
                    {isLoading ? 'Mencari...' : 'Cari Data'}
                  </button>
                </form>
              )}

              {wargaSurat && (
                <form onSubmit={buatSuratBaru} className="space-y-5 sm:space-y-6">
                  <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <h3 className="font-black text-blue-800 mb-3 border-b border-blue-200/50 pb-2 text-xs tracking-widest relative z-10">IDENTITAS PEMOHON (OTOMATIS)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-xs sm:text-sm relative z-10">
                      <div className="text-gray-500 font-medium">Nama Lengkap:<br/><span className="font-black text-gray-800 text-base">{wargaSurat?.nama || '-'}</span></div>
                      <div className="text-gray-500 font-medium">NIK Kependudukan:<br/><span className="font-black text-gray-800 text-base">{wargaSurat?.nik || '-'}</span></div>
                      <div className="text-gray-500 font-medium">Tempat, Tanggal Lahir:<br/><span className="font-bold text-gray-800">{wargaSurat?.tempat_lahir || '-'}, {formatTglLahirLayar(wargaSurat?.tgl_lahir)}</span></div>
                      <div className="text-gray-500 font-medium">Pekerjaan:<br/><span className="font-bold text-gray-800">{wargaSurat?.pekerjaan || '-'}</span></div>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Deskripsi Keterangan (Isi dari surat) <span className="text-red-500">*</span></label>
                      <textarea name="deskripsi" required value={suratFormData.deskripsi} onChange={handleSuratChange} rows="3" className="w-full border border-gray-200 p-3.5 rounded-xl bg-green-50/50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Tujuan Surat <span className="text-red-500">*</span></label>
                        <input type="text" name="tujuan_surat" required value={suratFormData.tujuan_surat} onChange={handleSuratChange} className="w-full border border-gray-200 p-3 rounded-xl bg-green-50/50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Status PBB Tahun Ini <span className="text-red-500">*</span></label>
                        <select name="pbb" value={suratFormData.pbb} onChange={handleSuratChange} className="w-full border border-gray-200 p-3 rounded-xl bg-green-50/50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium text-gray-700">
                          <option value="Lunas">Lunas</option>
                          <option value="Belum Lunas">Belum Lunas</option>
                          <option value="Tidak Terbit">Tidak Terbit</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex flex-col sm:flex-row justify-end gap-3 mt-4">
                    {permintaanAktifId && (
                      <button type="button" onClick={tolakDariGenerator} disabled={isProcessing} className="w-full sm:w-auto bg-white text-red-600 px-6 py-3.5 rounded-xl font-bold hover:bg-red-50 hover:text-red-700 border-2 border-red-100 transition-all active:scale-95">
                        Tolak Permintaan Ini
                      </button>
                    )}
                    <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-green-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95 flex justify-center items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      {isProcessing ? 'Memproses...' : (permintaanAktifId ? 'Simpan & Selesaikan Permintaan' : 'Simpan & Lihat Surat Cetak')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {!permintaanAktifId && (
            <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden print:hidden">
              <div className="bg-gray-800 p-5 flex justify-between items-center break-inside-avoid">
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                  Arsip / Riwayat Surat
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-5 font-bold">Tgl Dibuat</th>
                      <th className="py-4 px-5 font-bold">Nomor Surat</th>
                      <th className="py-4 px-5 font-bold">Pemohon</th>
                      <th className="py-4 px-5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {riwayatSurat.map((surat) => {
                      if (!surat) return null;
                      const wargaObj = dataWarga.find(w => String(w?.nik) === String(surat?.nik_warga));
                      const namaPemohon = wargaObj ? wargaObj.nama : 'Memuat data...';
                      return (
                        <tr key={surat.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-4 px-5 text-gray-500 font-medium">{new Date(surat.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                          <td className="py-4 px-5 font-bold text-blue-700">{surat.nomor_surat}</td>
                          <td className="py-4 px-5 font-bold text-gray-800">{namaPemohon}</td>
                          <td className="py-4 px-5">
                            <div className="flex justify-center items-center gap-2">
                              <button onClick={() => aksiLihatSurat(surat)} className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">Cetak</button>
                              <button onClick={() => aksiEditSurat(surat)} className="bg-teal-50 hover:bg-teal-500 text-teal-700 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">Edit</button>
                              <button onClick={() => aksiHapusSurat(surat)} className="text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg text-xs font-bold transition-all">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {riwayatSurat.length === 0 && (
                      <tr><td colSpan="4" className="py-12 text-center text-gray-400 font-medium">Belum ada riwayat surat yang dicetak.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* TAMPILAN PRATINJAU DOKUMEN CETAK             */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print-container m-0 p-0 shadow-none animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-900 p-5 rounded-2xl print:hidden sticky top-4 z-50 shadow-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg></div>
              <p className="text-white font-bold text-sm tracking-wide">Pratinjau Surat Siap Cetak (Kertas A4)</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => { 
                setCetakSurat(null); 
                if (permintaanAktifId) {
                  setActiveView('permintaan_masuk');
                  setPermintaanAktifId(null);
                } else if (activeView === 'permintaan_masuk') {
                  setActiveView('menu');
                }
              }} className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-600 transition-colors">
                {permintaanAktifId ? 'Tutup & Ke Kotak Masuk' : 'Tutup Dokumen'}
              </button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                Cetak Sekarang
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-hidden sm:overflow-x-auto bg-gray-100 p-4 sm:p-8 rounded-2xl print:bg-transparent print:p-0 flex justify-center">
            <div 
              className="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] print:shadow-none font-serif text-black relative w-full sm:w-[210mm] print:w-[210mm] h-auto sm:min-h-[297mm] print:min-h-[297mm] box-border mx-auto"
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

      {/* ========================================== */}
      {/* MODAL EDIT ARSIP SURAT KHUSUS              */}
      {/* ========================================== */}
      {showSuratModal.edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <form onSubmit={simpanEditSurat} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-teal-500 to-green-600 p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white leading-tight">Edit Arsip Surat</h3>
                <p className="text-green-100 text-[11px] font-mono mt-0.5">{selectedSurat?.nomor_surat}</p>
              </div>
            </div>
            <div className="p-7 space-y-5 bg-gray-50/50">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Keterangan Surat:</label>
                <textarea required value={editSuratData?.deskripsi || ''} onChange={(e) => setEditSuratData({...editSuratData, deskripsi: e.target.value})} rows="4" className="w-full border border-gray-200 p-3.5 rounded-xl bg-green-50/50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tujuan Surat:</label>
                <input required type="text" value={editSuratData?.tujuan_surat || ''} onChange={(e) => setEditSuratData({...editSuratData, tujuan_surat: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-green-50/50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
              </div>
            </div>
            <div className="bg-white p-5 flex justify-end gap-3 border-t">
              <button type="button" onClick={() => setShowSuratModal({ edit: false })} className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 shadow-md shadow-green-200 transition-all active:scale-95">{isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL GLOBAL ALERT PROFESIONAL             */}
      {/* ========================================== */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              
              {/* ICON RENDERER (Nuansa Biru & Hijau untuk non-destructive action) */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                (alertModal.type === 'warning' || alertModal.type === 'confirm' || alertModal.type === 'prompt') ? 'bg-blue-50 text-blue-500 shadow-blue-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-teal-50 text-teal-500 shadow-teal-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {(alertModal.type === 'warning' || alertModal.type === 'confirm' || alertModal.type === 'prompt') && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-6 px-2">{alertModal.message}</p>
              
              {/* PROMPT INPUT */}
              {alertModal.type === 'prompt' && (
                <div className="w-full text-left mb-6">
                  <textarea 
                    autoFocus
                    rows="3"
                    className={`w-full p-3.5 rounded-xl border ${promptError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-blue-200 bg-blue-50/50 focus:ring-blue-500'} focus:bg-white focus:outline-none focus:ring-2 transition-all text-sm`}
                    placeholder="Ketikkan alasan disini..."
                    value={promptInput}
                    onChange={(e) => {
                      setPromptInput(e.target.value);
                      if (promptError) setPromptError(''); 
                    }}
                  ></textarea>
                  {promptError && <p className="text-xs text-red-500 font-bold mt-1.5 animate-pulse">{promptError}</p>}
                </div>
              )}
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    alertModal.type === 'error' ? 'bg-red-500 shadow-red-200' :
                    (alertModal.type === 'confirm' && alertModal.confirmText.includes('Hapus')) ? 'bg-red-600 shadow-red-200' :
                    (alertModal.type === 'confirm' || alertModal.type === 'prompt') ? 'bg-blue-600 shadow-blue-200' :
                    alertModal.type === 'success' ? 'bg-green-500 shadow-green-200' :
                    'bg-teal-600 shadow-teal-200'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : alertModal.confirmText}
                </button>
                
                {(alertModal.type === 'confirm' || alertModal.type === 'prompt') && (
                  <button
                    onClick={closeModal}
                    disabled={isProcessing}
                    className="w-full py-4 px-6 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50"
                  >
                    {alertModal.cancelText}
                  </button>
                )}
              </div>
            </div>
          </div>
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
      `}} />
    </div>
  );
}