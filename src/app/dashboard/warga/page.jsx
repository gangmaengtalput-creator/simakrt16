"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DashboardWarga() {
  const router = useRouter();
  
  // STATE AUTENTIKASI & DATA DIRI
  const [wargaAktif, setWargaAktif] = useState(null);
  const [inputNik, setInputNik] = useState('');
  const [inputTanggalLahir, setInputTanggalLahir] = useState(''); 
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // STATE MODAL ERROR (Pengganti Alert Rejection)
  const [errorModal, setErrorModal] = useState({ open: false, message: '', type: 'WARNING' }); // type: 'FATAL' | 'WARNING'

  // STATE NAVIGASI & TAB
  const [activeTab, setActiveTab] = useState('surat'); 

  // STATE PERMINTAAN SURAT
  const [listPermintaan, setListPermintaan] = useState([]);
  const [formSurat, setFormSurat] = useState({ tujuan: '', keterangan: '' });
  const [cetakSurat, setCetakSurat] = useState(null); 

  // STATE USULAN
  const [listUsulan, setListUsulan] = useState([]);
  const [formUsulan, setFormUsulan] = useState({ 
    nama_usulan: '', 
    jenis_usulan: 'Pembangunan', 
    keterangan: '',
    panjang: '', lebar: '', tinggi: '', estimasi_harga: '' 
  });
  
  // STATE EDIT USULAN
  const [editModal, setEditModal] = useState({ open: false, data: null });

  // REF & STATE UNTUK FOTO INTERAKTIF
  const fileInputRef = useRef(null);
  const [fotos, setFotos] = useState([]);
  const [fotosPreview, setFotosPreview] = useState([]);

  const luasOtomatis = (formUsulan.panjang && formUsulan.lebar) ? (parseFloat(formUsulan.panjang) * parseFloat(formUsulan.lebar)) : 0;
  const luasOtomatisEdit = (editModal.data?.panjang && editModal.data?.lebar) ? (parseFloat(editModal.data.panjang) * parseFloat(editModal.data.lebar)) : 0;

  // ==========================================
  // FUNGSI UMUM & AUTENTIKASI
  // ==========================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Pastikan '/' adalah path landing page Anda
  };

  const handleErrorModalClose = async () => {
    if (errorModal.type === 'FATAL') {
      await handleLogout();
    } else {
      setErrorModal({ open: false, message: '', type: 'WARNING' });
    }
  };

  const verifikasiWarga = async (e) => {
    e.preventDefault();
    setIsLoadingAuth(true);

    try {
      // 1. Dapatkan sesi user yang sedang login (hanya bawa email & ID auth)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorModal({ open: true, message: "Sesi Anda tidak valid atau telah habis. Silakan login kembali.", type: 'FATAL' });
        setIsLoadingAuth(false);
        return;
      }

      // 2. MENCARI NIK DARI TABEL PROFILES BERDASARKAN ID AKUN LOGIN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nik')
        .eq('id', user.id) // Cocokkan dengan ID user auth
        .single();

      if (profileError || !profileData || !profileData.nik) {
        setErrorModal({ 
          open: true, 
          message: `INFO SISTEM: Akun Anda tidak memiliki data NIK di tabel profiles. Harap hubungi Admin.`, 
          type: 'FATAL' 
        });
        setIsLoadingAuth(false);
        return;
      }

      // 3. PEMBERSIHAN FORMAT INPUT & DATABASE
      const nikInputBersih = String(inputNik).trim();
      const nikLoginBersih = String(profileData.nik).trim();

      // 4. PENCOCOKAN KETAT (Mencegah pakai NIK warga lain)
      if (nikInputBersih !== nikLoginBersih) {
        setErrorModal({ 
          open: true, 
          message: `AKSES DITOLAK: Anda terdeteksi mencoba menggunakan NIK warga lain. (Akun ini terikat dengan NIK: ${nikLoginBersih}).`, 
          type: 'FATAL' 
        });
        setIsLoadingAuth(false);
        return;
      }

      // 5. Verifikasi di Database master_warga untuk mengecek TANGGAL LAHIR
      const { data: wargaData, error: wargaError } = await supabase
        .from('master_warga')
        .select('*')
        .eq('nik', nikInputBersih)
        .single(); 
      
      const tglLahirDB = wargaData?.tgl_lahir ? String(wargaData.tgl_lahir).split('T')[0] : null;

      // 6. Logika Penolakan Akhir
      if (wargaError || !wargaData) {
        setErrorModal({ open: true, message: "NIK tidak ditemukan dalam database warga RT kami.", type: 'FATAL' });
      } else if (tglLahirDB !== String(inputTanggalLahir).trim()) {
        setErrorModal({ open: true, message: "Masukkan tanggal lahir yang benar, ulangi login.", type: 'WARNING' });
      } else {
        // Semua Cocok! Lolos Verifikasi
        setWargaAktif(wargaData);
        fetchDataWarga(wargaData.nik);
      }
    } catch (err) {
      console.error(err);
      setErrorModal({ open: true, message: "Terjadi kesalahan sistem saat memverifikasi data.", type: 'FATAL' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const fetchDataWarga = async (nik) => {
    const { data: dataSurat } = await supabase.from('permintaan_surat').select('*').eq('nik_pemohon', nik).order('created_at', { ascending: false });
    if (dataSurat) setListPermintaan(dataSurat);

    const { data: dataUsulan } = await supabase.from('usulan_warga').select('*').eq('nik_pengusul', nik).order('created_at', { ascending: false });
    if (dataUsulan) setListUsulan(dataUsulan);
  };

  // ==========================================
  // FUNGSI SURAT PENGANTAR
  // ==========================================
  const submitPermintaanSurat = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const { error } = await supabase.from('permintaan_surat').insert([{
      nik_pemohon: wargaAktif.nik,
      nama_pemohon: wargaAktif.nama,
      tujuan: formSurat.tujuan,
      keterangan: formSurat.keterangan,
      status: 'Menunggu'
    }]);
    setIsProcessing(false);
    if (!error) {
      alert("Permintaan surat berhasil dikirim ke Ketua RT!");
      setFormSurat({ tujuan: '', keterangan: '' });
      fetchDataWarga(wargaAktif.nik);
    } else alert(error.message);
  };

  const aksiLihatSuratSelesai = async (idSuratKeterangan) => {
    const { data: suratData, error } = await supabase.from('surat_keterangan').select('*').eq('id', idSuratKeterangan).single();
    if (suratData && !error) {
      setCetakSurat({ 
        nomorSurat: suratData.nomor_surat, warga: wargaAktif, deskripsi: suratData.deskripsi, 
        tujuan: suratData.tujuan_surat, pbb: 'Lunas', 
        tanggal: new Date(suratData.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
      });
    } else alert("Terjadi kesalahan saat memuat dokumen surat.");
  };

  // ==========================================
  // FUNGSI USULAN WARGA & FOTO
  // ==========================================
  const handleFotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setFotos(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setFotosPreview(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFoto = (index) => {
    const newFotos = [...fotos]; newFotos.splice(index, 1); setFotos(newFotos);
    const newPreviews = [...fotosPreview]; newPreviews.splice(index, 1); setFotosPreview(newPreviews);
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.8;
          const compress = () => {
            canvas.toBlob((blob) => {
              if (blob.size / 1024 > 100 && quality > 0.1) { quality -= 0.1; compress(); } 
              else { resolve(new File([blob], file.name, { type: 'image/jpeg' })); }
            }, 'image/jpeg', quality);
          };
          compress();
        };
      };
    });
  };

  const submitUsulan = async (e) => {
    e.preventDefault();
    if (fotos.length === 0) return alert("Wajib melampirkan minimal 1 foto dokumentasi!");
    setIsProcessing(true);

    const uploadedUrls = [];
    
    for (const file of fotos) {
      const compressed = await compressImage(file);
      const fileName = `usulan_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error: uploadError } = await supabase.storage.from('usulan').upload(fileName, compressed);

      if (uploadError) {
        alert(`GAGAL UPLOAD FOTO!\nPesan Error Supabase: ${uploadError.message}`);
        setIsProcessing(false);
        return; 
      }

      if (data) {
        const { data: urlData } = supabase.storage.from('usulan').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from('usulan_warga').insert([{
      nik_pengusul: wargaAktif.nik,
      nama_pengusul: wargaAktif.nama,
      nama_usulan: formUsulan.nama_usulan, 
      jenis_usulan: formUsulan.jenis_usulan,
      keterangan: formUsulan.keterangan,
      foto_usulan: uploadedUrls,
      panjang: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.panjang) : null,
      lebar: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.lebar) : null,
      tinggi: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.tinggi) : null,
      luas: formUsulan.jenis_usulan === 'Pembangunan' ? luasOtomatis : null,
      estimasi_harga: formUsulan.jenis_usulan === 'Pembangunan' ? parseFloat(formUsulan.estimasi_harga) : null
    }]);

    setIsProcessing(false);
    if (!error) {
      alert("Usulan berhasil dikirim ke RT!");
      setFotos([]); setFotosPreview([]);
      setFormUsulan({ nama_usulan: '', jenis_usulan: 'Pembangunan', keterangan: '', panjang: '', lebar: '', tinggi: '', estimasi_harga: '' });
      fetchDataWarga(wargaAktif.nik);
      setActiveTab('usulan');
    } else {
      alert("Gagal menyimpan data usulan: " + error.message);
    }
  };

  const hapusUsulan = async (id) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan dan menghapus usulan ini?")) return;
    setIsProcessing(true);
    const { error } = await supabase.from('usulan_warga').delete().eq('id', id);
    setIsProcessing(false);
    if (!error) fetchDataWarga(wargaAktif.nik);
    else alert("Gagal menghapus: " + error.message);
  };

  const simpanEditUsulan = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const payload = {
      nama_usulan: editModal.data.nama_usulan,
      jenis_usulan: editModal.data.jenis_usulan,
      keterangan: editModal.data.keterangan,
      panjang: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.panjang) : null,
      lebar: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.lebar) : null,
      tinggi: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.tinggi) : null,
      luas: editModal.data.jenis_usulan === 'Pembangunan' ? luasOtomatisEdit : null,
      estimasi_harga: editModal.data.jenis_usulan === 'Pembangunan' ? parseFloat(editModal.data.estimasi_harga) : null
    };

    const { error } = await supabase.from('usulan_warga').update(payload).eq('id', editModal.data.id);
    setIsProcessing(false);
    
    if (!error) {
      setEditModal({ open: false, data: null });
      fetchDataWarga(wargaAktif.nik);
      alert("Usulan berhasil diperbarui!");
    } else alert("Gagal update: " + error.message);
  };

  const parseFotoUsulan = (fotoData) => {
    if (!fotoData) return [];
    if (Array.isArray(fotoData)) return fotoData;
    try {
      const parsed = JSON.parse(fotoData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return typeof fotoData === 'string' ? [fotoData] : [];
    }
  };

  // ==========================================
  // TAMPILAN: VERIFIKASI NIK
  // ==========================================
  if (!wargaAktif) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-blue-600">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Verifikasi Warga</h2>
            <p className="text-sm text-gray-500 mt-2">Pastikan NIK dan Tanggal Lahir sesuai dengan Kartu Keluarga.</p>
          </div>
          <form onSubmit={verifikasiWarga} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-left">Nomor Induk Kependudukan (NIK)</label>
              <input type="text" required value={inputNik} onChange={(e) => setInputNik(e.target.value)} placeholder="Masukkan 16 Digit NIK..." className="w-full border p-3 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-left">Tanggal Lahir</label>
              <input type="date" required value={inputTanggalLahir} onChange={(e) => setInputTanggalLahir(e.target.value)} className="w-full border p-3 rounded-lg text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={isLoadingAuth} className="w-full bg-blue-600 text-white font-bold py-3 mt-4 rounded-lg hover:bg-blue-700 transition-colors">
              {isLoadingAuth ? 'Mencocokkan Data...' : 'Akses Dasbor Warga'}
            </button>
          </form>
          <button onClick={handleLogout} className="w-full mt-4 text-red-500 font-medium text-sm hover:underline">Kembali ke Halaman Utama</button>
        </div>

        {/* MODAL ERROR VERIFIKASI (Pengganti Alert) */}
        {errorModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
              <div className={`p-6 text-white flex flex-col justify-center items-center ${errorModal.type === 'FATAL' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {errorModal.type === 'FATAL' ? (
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                ) : (
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
                <h3 className="text-xl font-bold">{errorModal.type === 'FATAL' ? 'Akses Ditolak!' : 'Verifikasi Gagal'}</h3>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-700 text-base mb-8">{errorModal.message}</p>
                <button
                  onClick={handleErrorModalClose}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-colors ${errorModal.type === 'FATAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                >
                  {errorModal.type === 'FATAL' ? 'Keluar' : 'Coba Lagi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // TAMPILAN: DASBOR WARGA UTAMA
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8 print:p-0 print:bg-white relative">
      
      {/* HEADER DASBOR */}
      <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-sm border-t-4 border-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
            {wargaAktif.nama.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Halo, {wargaAktif.nama}</h1>
            <p className="text-xs sm:text-sm text-gray-600">Panel Layanan Mandiri RT.16</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold text-sm">Keluar</button>
      </div>

      {/* NAVIGASI TAB */}
      {!cetakSurat && (
        <div className="max-w-5xl mx-auto mb-6 print:hidden">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button onClick={() => setActiveTab('surat')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'surat' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              📄 Permintaan Surat
            </button>
            <button onClick={() => setActiveTab('usulan')} className={`flex-1 py-3 text-sm font-bold rounded-md transition-all ${activeTab === 'usulan' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>
              💡 Usulan Warga
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAMPILAN TAB: PERMINTAAN SURAT */}
      {/* ========================================== */}
      {activeTab === 'surat' && !cetakSurat && (
        <div className="max-w-5xl mx-auto space-y-6">
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
                <button type="submit" disabled={isProcessing} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700">
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
                          <button onClick={() => aksiLihatSuratSelesai(item.surat_keterangan_id)} className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-blue-700 shadow-sm">
                            Lihat & Cetak PDF
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Menunggu Ketua RT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {listPermintaan.length === 0 && (
                    <tr><td colSpan="4" className="py-8 text-center text-gray-500">Anda belum pernah membuat permintaan surat.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAMPILAN TAB: USULAN WARGA */}
      {/* ========================================== */}
      {activeTab === 'usulan' && !cetakSurat && (
        <div className="max-w-5xl mx-auto space-y-6 print:hidden">
          
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Sampaikan Usulan / Aspirasi Warga</h2>
            <form onSubmit={submitUsulan} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nama / Judul Usulan:</label>
                <input required type="text" value={formUsulan.nama_usulan} onChange={(e) => setFormUsulan({...formUsulan, nama_usulan: e.target.value})} placeholder="Contoh: Perbaikan Jalan Berlubang di Blok A" className="w-full border p-3 rounded-lg focus:ring-green-500 font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Kategori Usulan:</label>
                <select value={formUsulan.jenis_usulan} onChange={(e) => setFormUsulan({...formUsulan, jenis_usulan: e.target.value})} className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-green-500 font-medium">
                  <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
                  <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {formUsulan.jenis_usulan === 'Pembangunan' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
                  <div className="sm:col-span-4"><h3 className="font-bold text-green-800 text-sm">Rincian Dimensi Bangunan (Wajib)</h3></div>
                  <div><label className="text-xs font-bold text-gray-600">Panjang (m)</label><input type="number" step="0.01" required value={formUsulan.panjang} onChange={e=>setFormUsulan({...formUsulan, panjang: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Lebar (m)</label><input type="number" step="0.01" required value={formUsulan.lebar} onChange={e=>setFormUsulan({...formUsulan, lebar: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Tinggi (m)</label><input type="number" step="0.01" required value={formUsulan.tinggi} onChange={e=>setFormUsulan({...formUsulan, tinggi: e.target.value})} className="w-full border p-2 rounded mt-1 focus:ring-green-500" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Luas (Otomatis)</label><div className="w-full bg-gray-200 border p-2 rounded mt-1 font-mono text-center">{luasOtomatis} m²</div></div>
                  <div className="sm:col-span-4"><label className="text-xs font-bold text-gray-600">Estimasi Kebutuhan Dana (Rp)</label><input type="number" required value={formUsulan.estimasi_harga} onChange={e=>setFormUsulan({...formUsulan, estimasi_harga: e.target.value})} className="w-full border p-2 rounded mt-1 font-mono focus:ring-green-500" placeholder="Contoh: 5000000 (tanpa titik/koma)" /></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Penjelasan / Latar Belakang Usulan:</label>
                <textarea required rows="4" value={formUsulan.keterangan} onChange={e=>setFormUsulan({...formUsulan, keterangan: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-green-500" placeholder="Mengapa hal ini sangat dibutuhkan warga? Berikan alasan rinci..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Dokumentasi Foto Lokasi <span className="text-red-500">*Wajib</span></label>
                <input type="file" multiple accept="image/*" onChange={handleFotoChange} ref={fileInputRef} className="hidden" />
                {fotosPreview.length === 0 ? (
                  <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-green-300 bg-green-50 rounded-xl p-8 text-center cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="font-bold text-green-800 text-sm sm:text-base">Klik di sini untuk upload foto</p>
                    <p className="text-xs text-gray-500 mt-1">Maksimal otomatis dikompres 100KB per foto.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex flex-wrap gap-4">
                      {fotosPreview.map((src, idx) => (
                        <div key={idx} className="relative group">
                          <img src={src} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg shadow-sm border border-gray-300" alt={`Preview ${idx}`} />
                          <button type="button" onClick={() => removeFoto(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-transform hover:scale-110">&times;</button>
                        </div>
                      ))}
                      <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center border-2 border-dashed border-green-400 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                        <span className="text-3xl text-green-500 font-light">+</span>
                        <span className="text-[10px] font-bold text-green-700 mt-1">Tambah Foto</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t"><button type="submit" disabled={isProcessing} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-lg hover:bg-green-700 shadow-lg text-lg">{isProcessing ? 'Memproses...' : 'Kirim Usulan ke RT'}</button></div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gray-800 p-4"><h3 className="font-bold text-white">Riwayat Usulan & Pantauan Saya</h3></div>
            <div className="p-4 space-y-4">
              {listUsulan.map(usulan => {
                const fotoArrayParsed = parseFotoUsulan(usulan.foto_usulan);
                const isMenunggu = usulan.status === 'Menunggu Tinjauan RT';

                return (
                <div key={usulan.id} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-green-500 flex flex-col lg:flex-row gap-6 relative">
                  
                  {isMenunggu && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button onClick={() => setEditModal({ open: true, data: { ...usulan } })} className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1 rounded text-xs font-bold shadow-sm">✎ Edit</button>
                      <button onClick={() => hapusUsulan(usulan.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold shadow-sm">🗑 Hapus</button>
                    </div>
                  )}

                  <div className="flex-1 space-y-3 mt-8 lg:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 pr-20">
                      <div>
                        <span className="text-xs bg-gray-200 text-gray-600 font-bold px-2 py-1 rounded">{new Date(usulan.created_at).toLocaleDateString('id-ID')}</span>
                        <h3 className="text-lg font-bold text-gray-800 mt-2">{usulan.nama_usulan || usulan.jenis_usulan}</h3>
                        <p className="text-xs text-green-700 font-bold mb-2">Kategori: {usulan.jenis_usulan}</p>
                      </div>
                    </div>
                    
                    <span className={`inline-block text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-center ${usulan.status === 'Telah Ditindaklanjuti' ? 'bg-green-100 text-green-700' : usulan.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      Status: {usulan.status}
                    </span>
                    
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{usulan.keterangan}</p>
                    
                    {usulan.jenis_usulan === 'Pembangunan' && (
                      <div className="text-xs bg-gray-50 p-2 rounded border font-mono text-gray-600">
                        Est. Harga: <strong>Rp {Number(usulan.estimasi_harga).toLocaleString('id-ID')}</strong> | Dimensi: {usulan.panjang}m x {usulan.lebar}m x {usulan.tinggi}m | Luas: {usulan.luas}m²
                      </div>
                    )}
                    
                    {usulan.catatan_rt && ( 
                      <div className="text-sm bg-blue-50 p-3 rounded border border-blue-100 text-blue-800 font-medium mt-2">
                        <strong>Komentar RT:</strong> {usulan.catatan_rt}
                      </div> 
                    )}
                  </div>

                  <div className="w-full lg:w-72 shrink-0 space-y-4 lg:border-l lg:pl-6 border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b border-gray-200 pb-1">Lampiran Foto Warga</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                        {fotoArrayParsed.length > 0 ? fotoArrayParsed.map((foto, idx) => (
                          <div key={idx} className="shrink-0 snap-center relative group flex flex-col items-center">
                             <img 
                                src={foto} 
                                onError={(e)=>{e.target.src="https://via.placeholder.com/150?text=Akses+Ditolak"}} 
                                className="w-16 h-16 object-cover rounded-md shadow-sm border border-gray-300" 
                                alt={`Usulan ${idx+1}`} 
                             />
                             <a href={foto} target="_blank" rel="noreferrer" className="text-[8px] text-blue-500 mt-1 underline max-w-[64px] truncate" title={foto}>Buka Link</a>
                          </div>
                        )) : <span className="text-xs text-gray-400">Tidak ada foto</span>}
                      </div>
                    </div>

                    {usulan.foto_tindak_lanjut && (
                      <div>
                        <p className="text-[10px] font-bold text-green-600 uppercase mb-2 border-b border-green-200 pb-1 flex items-center gap-1">✅ Hasil Tindak Lanjut RT</p>
                        <a href={usulan.foto_tindak_lanjut} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-md shadow-sm border-2 border-green-400">
                          <img src={usulan.foto_tindak_lanjut} onError={(e)=>{e.target.src="https://via.placeholder.com/300?text=Akses+Ditolak"}} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" alt="Tindak Lanjut" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )})}
              {listUsulan.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">Anda belum pernah membuat usulan warga.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL EDIT USULAN */}
      {/* ========================================== */}
      {editModal.open && editModal.data && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <form onSubmit={simpanEditUsulan} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-yellow-500 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Edit Usulan</h2>
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="text-xl font-bold">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-4">
                <strong>Catatan:</strong> Foto lampiran tidak dapat diubah setelah diunggah. Jika foto salah, harap Hapus usulan ini dan buat yang baru.
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Nama / Judul Usulan:</label>
                <input required type="text" value={editModal.data.nama_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, nama_usulan: e.target.value}})} className="w-full border p-2 rounded focus:ring-yellow-500" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Kategori Usulan:</label>
                <select value={editModal.data.jenis_usulan} onChange={(e) => setEditModal({...editModal, data: {...editModal.data, jenis_usulan: e.target.value}})} className="w-full border p-2 rounded bg-gray-50">
                  <option value="Pembangunan">Pembangunan / Infrastruktur Fisik</option>
                  <option value="Kegiatan Sosial">Kegiatan Sosial / Warga</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {editModal.data.jenis_usulan === 'Pembangunan' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border">
                  <div><label className="text-xs font-bold text-gray-600">Panjang (m)</label><input type="number" step="0.01" required value={editModal.data.panjang || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, panjang: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Lebar (m)</label><input type="number" step="0.01" required value={editModal.data.lebar || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, lebar: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Tinggi (m)</label><input type="number" step="0.01" required value={editModal.data.tinggi || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, tinggi: e.target.value}})} className="w-full border p-2 rounded mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Luas (Otomatis)</label><div className="w-full bg-gray-200 border p-2 rounded mt-1 font-mono text-center">{luasOtomatisEdit} m²</div></div>
                  <div className="sm:col-span-4"><label className="text-xs font-bold text-gray-600">Estimasi Kebutuhan Dana (Rp)</label><input type="number" required value={editModal.data.estimasi_harga || ''} onChange={e=>setEditModal({...editModal, data:{...editModal.data, estimasi_harga: e.target.value}})} className="w-full border p-2 rounded mt-1 font-mono" /></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1">Penjelasan / Keterangan:</label>
                <textarea required rows="4" value={editModal.data.keterangan} onChange={e=>setEditModal({...editModal, data:{...editModal.data, keterangan: e.target.value}})} className="w-full border p-2 rounded"></textarea>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setEditModal({open: false, data: null})} className="px-4 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-500 text-white rounded font-bold hover:bg-yellow-600">{isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* TAMPILAN PREVIEW & CETAK SURAT (PDF) */}
      {/* ========================================== */}
      {cetakSurat && (
        <div className="print:m-0 print:p-0 max-w-5xl mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-gray-800 p-4 rounded-lg print:hidden sticky top-4 z-50">
            <p className="text-white font-medium text-sm">Dokumen Siap Cetak (A4)</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setCetakSurat(null)} className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500">Tutup Dokumen</button>
              <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2 bg-blue-500 text-white rounded font-bold text-sm hover:bg-blue-400">Cetak PDF</button>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-white print:p-0 shadow-inner">
            <div className="bg-white mx-auto shadow-2xl print:shadow-none font-serif text-[12pt] leading-relaxed text-justify text-black" style={{ width: '210mm', minWidth: '210mm', minHeight: '297mm', padding: '2cm' }}>
              <div className="text-center mb-8">
                <h1 className="font-bold text-xl underline tracking-wide uppercase">Surat Keterangan</h1>
                <p>Nomor : {cetakSurat?.nomorSurat}</p>
              </div>

              <p className="mb-4">Yang bertanda tangan dibawah ini :</p>
              <table className="mb-6 ml-4">
                <tbody>
                  <tr><td className="w-48 align-top">Nama</td><td className="w-4 align-top">:</td><td className="font-bold">GUNTUR BAYU JANTORO</td></tr>
                  <tr><td className="align-top">Jabatan</td><td className="align-top">:</td><td>Ketua RT.16</td></tr>
                </tbody>
              </table>

              <p className="mb-4">Dengan ini menerangkan bahwa :</p>
              <table className="mb-6 ml-4">
                <tbody>
                  <tr><td className="w-48 align-top">Nama</td><td className="w-4 align-top">:</td><td className="font-bold">{cetakSurat?.warga?.nama || '-'}</td></tr>
                  <tr><td className="align-top">NIK</td><td className="align-top">:</td><td>{cetakSurat?.warga?.nik || '-'}</td></tr>
                  <tr><td className="align-top">Jenis Kelamin</td><td className="align-top">:</td><td>{cetakSurat?.warga?.jenis_kelamin?.charAt(0) + cetakSurat?.warga?.jenis_kelamin?.slice(1).toLowerCase()}</td></tr>
                  <tr><td className="align-top">Tempat/Tgl. Lahir</td><td className="align-top">:</td><td>{cetakSurat?.warga?.tempat_lahir || '-'} / {cetakSurat?.warga?.tgl_lahir || '-'}</td></tr>
                  <tr><td className="align-top">Bangsa/Agama</td><td className="align-top">:</td><td>Indonesia / {cetakSurat?.warga?.agama || '-'}</td></tr>
                  <tr><td className="align-top">Pekerjaan</td><td className="align-top">:</td><td>{cetakSurat?.warga?.pekerjaan || '-'}</td></tr>
                  <tr><td className="align-top">Alamat</td><td className="align-top">:</td><td>{cetakSurat?.warga?.alamat || '-'}<br/>RT.16 RW.04 Kelurahan Talangputri Kec. Plaju Kota Palembang</td></tr>
                  <tr><td className="align-top">Kartu Keluarga No</td><td className="align-top">:</td><td>{cetakSurat?.warga?.no_kk || '-'}</td></tr>
                </tbody>
              </table>

              <p className="mb-4 indent-8">Benar nama tersebut diatas adalah penduduk / warga Kelurahan Talangputri dan bertempat tinggal di RT.16 RW.04 Kelurahan Talangputri Kecamatan Plaju Kota Palembang dan benar yang bersangkutan di atas {cetakSurat?.deskripsi}</p>
              <p className="mb-4">Surat Keterangan ini diberikan untuk : <strong>{cetakSurat?.tujuan}</strong></p>
              <p className="mb-12">Demikian keterangan ini untuk dipergunakan seperlunya.</p>
              
              <div className="w-full mt-8">
                <div className="flex w-full mb-2">
                  <div className="w-1/2"></div>
                  <div className="w-1/2 text-center"><p>Palembang, {cetakSurat?.tanggal}</p></div>
                </div>
                <div className="flex w-full">
                  <div className="w-1/2 text-center"><p>Mengetahui,</p><p>Ketua RW.04</p></div>
                  <div className="w-1/2 text-center"><p className="invisible">Spacer</p><p>Ketua RT.16</p></div>
                </div>
                <div className="h-24 w-full"></div>
                <div className="flex w-full">
                  <div className="w-1/2 text-center"><p className="font-bold underline uppercase">Heriyansah</p></div>
                  <div className="w-1/2 text-center"><p className="font-bold underline uppercase">Guntur Bayu Jantoro</p></div>
                </div>
              </div>

              <div className="mt-16 text-sm">
                <p className="font-bold">Catatan :</p>
                <p>PBB Tahun {new Date().getFullYear()}</p>
                <p className="font-bold">{cetakSurat?.pbb}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}