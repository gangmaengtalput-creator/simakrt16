"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DashboardKetua() {
  const router = useRouter();
  
  // ==========================================
  // STATE APLIKASI
  // ==========================================
  const [activeView, setActiveView] = useState('menu'); 
  const [dataWarga, setDataWarga] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State Warga
  const [searchQuery, setSearchQuery] = useState('');
  const [tabWarga, setTabWarga] = useState('aktif'); 
  const [ageFilter, setAgeFilter] = useState('all');
  const [showModal, setShowModal] = useState({ add: false, edit: false, delete: false, view: false });
  const [formData, setFormData] = useState({});
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedWarga, setSelectedWarga] = useState(null);

  // State Surat
  const [suratNIK, setSuratNIK] = useState('');
  const [wargaSurat, setWargaSurat] = useState(null);
  const [suratFormData, setSuratFormData] = useState({
    deskripsi: 'berkelakuan baik dan belum pernah tersangkut perkara pidana maupun perdata.',
    tujuan_surat: 'Melamar Pekerjaan',
    pbb: 'Lunas'
  });
  const [cetakSurat, setCetakSurat] = useState(null);
  
  // State Riwayat Surat
  const [riwayatSurat, setRiwayatSurat] = useState([]);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [showSuratModal, setShowSuratModal] = useState({ edit: false, delete: false });
  const [editSuratData, setEditSuratData] = useState({});

  // STATE PERMINTAAN MASUK
  const [permintaanMasuk, setPermintaanMasuk] = useState([]);
  const [permintaanAktifId, setPermintaanAktifId] = useState(null);

  // ==========================================
  // STATE USULAN WARGA (BARU)
  // ==========================================
  const [usulanMasuk, setUsulanMasuk] = useState([]);
  const [showUsulanModal, setShowUsulanModal] = useState(false);
  const [selectedUsulan, setSelectedUsulan] = useState(null);
  const [tindakLanjutData, setTindakLanjutData] = useState({ status: '', catatan_rt: '' });
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState(null);

  // ==========================================
  // FUNGSI UTAMA
  // ==========================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // Kembali ke Landing Page
  };

  const fetchWarga = async () => {
    setIsLoading(true); 
    setActiveView('data_warga');
    const { data, error } = await supabase.from('master_warga').select('*').order('nama', { ascending: true });
    if (!error && data) setDataWarga(data);
    setIsLoading(false);
  };

  const fetchRiwayatSurat = async () => {
    if (dataWarga.length === 0) { 
      const { data } = await supabase.from('master_warga').select('*'); 
      if (data) setDataWarga(data); 
    }
    const { data: suratData } = await supabase.from('surat_keterangan').select('*').order('created_at', { ascending: false });
    if (suratData) setRiwayatSurat(suratData);
  };

  const fetchPermintaanMasuk = async () => {
    setActiveView('permintaan_masuk');
    const { data } = await supabase.from('permintaan_surat').select('*').order('created_at', { ascending: false });
    if (data) setPermintaanMasuk(data);
  };

  // FUNGSI FETCH USULAN (BARU)
  const fetchUsulan = async () => {
    setActiveView('manajemen_usulan');
    const { data } = await supabase.from('usulan_warga').select('*').order('created_at', { ascending: false });
    if (data) setUsulanMasuk(data);
  };

  // KOMPRESOR FOTO (MAX 100KB)
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

  // FUNGSI UPDATE USULAN (BARU)
  const simpanTindakLanjut = async (e) => {
    e.preventDefault(); setIsProcessing(true);
    let fotoUrl = selectedUsulan?.foto_tindak_lanjut || null;

    if (fotoTindakLanjut) {
      const compressedFile = await compressImage(fotoTindakLanjut);
      const fileName = `tindaklanjut_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('usulan').upload(fileName, compressedFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('usulan').getPublicUrl(fileName);
        fotoUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from('usulan_warga').update({
      status: tindakLanjutData.status, catatan_rt: tindakLanjutData.catatan_rt, foto_tindak_lanjut: fotoUrl
    }).eq('id', selectedUsulan.id);

    setIsProcessing(false);
    if (!error) { setShowUsulanModal(false); fetchUsulan(); } else alert("Gagal update: " + error.message);
  };

  const calculateAge = (dob) => {
    if (!dob) return 0;
    const birthDate = new Date(dob); 
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const stats = useMemo(() => {
    const aktif = dataWarga.filter(w => w && w.status_warga !== 'mantan');
    const unikKK = new Set(aktif.map(w => w?.no_kk).filter(Boolean)); 
    let l = 0, p = 0, u0_5 = 0, u6_10 = 0, u11_17 = 0, u18_60 = 0, u60plus = 0;
    
    aktif.forEach(w => {
      if (w?.jenis_kelamin?.toUpperCase().startsWith('L')) l++;
      if (w?.jenis_kelamin?.toUpperCase().startsWith('P')) p++;
      
      const age = calculateAge(w?.tgl_lahir);
      if (age >= 0 && age <= 5) u0_5++; 
      else if (age >= 6 && age <= 10) u6_10++; 
      else if (age >= 11 && age <= 17) u11_17++; 
      else if (age >= 18 && age <= 60) u18_60++; 
      else if (age > 60) u60plus++;
    });
    return { total: aktif.length, kk: unikKK.size, l, p, u0_5, u6_10, u11_17, u18_60, u60plus };
  }, [dataWarga]);

  const filteredWarga = dataWarga.filter(w => {
    if (!w) return false;
    const isMatchTab = tabWarga === 'aktif' ? w.status_warga !== 'mantan' : w.status_warga === 'mantan';
    const query = searchQuery.toLowerCase().trim();
    const safeNama = w.nama ? String(w.nama).toLowerCase() : ''; 
    const safeNik = w.nik ? String(w.nik).toLowerCase() : '';
    const isMatchSearch = safeNama.includes(query) || safeNik.includes(query);
    
    let isMatchAge = true;
    if (ageFilter !== 'all') {
      const age = calculateAge(w?.tgl_lahir);
      if (ageFilter === '0_5') isMatchAge = age >= 0 && age <= 5; 
      else if (ageFilter === '6_10') isMatchAge = age >= 6 && age <= 10; 
      else if (ageFilter === '11_17') isMatchAge = age >= 11 && age <= 17; 
      else if (ageFilter === '18_60') isMatchAge = age >= 18 && age <= 60; 
      else if (ageFilter === '60plus') isMatchAge = age > 60;
    }
    return isMatchTab && isMatchSearch && isMatchAge;
  });

  // ==========================================
  // FUNGSI CRUD WARGA
  // ==========================================
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const saveAdd = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').insert([{ ...formData, status_warga: 'aktif' }]);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, add: false }); fetchWarga(); } 
    else alert(error.message);
  };

  const saveEdit = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update(formData).eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, edit: false }); fetchWarga(); } 
    else alert(error.message);
  };

  const saveDelete = async (e) => {
    e.preventDefault(); 
    if (!deleteReason) return alert("Alasan wajib diisi!"); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga')
      .update({ status_warga: 'mantan', alasan_hapus: deleteReason, is_registered: false })
      .eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, delete: false }); setDeleteReason(''); fetchWarga(); } 
    else alert(error.message);
  };

  const openView = (warga) => { setSelectedWarga(warga); setShowModal({ ...showModal, view: true }); };
  const openEdit = (warga) => { setSelectedWarga(warga); setFormData(warga); setShowModal({ ...showModal, edit: true }); };
  const openDelete = (warga) => { setSelectedWarga(warga); setDeleteReason(''); setShowModal({ ...showModal, delete: true }); };

  // RESPONSIVE FORM WARGA
  const FormInputs = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
      <div>
        <label className="text-sm font-semibold">No. KK</label>
        <input required name="no_kk" value={formData?.no_kk || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">NIK</label>
        <input required name="nik" value={formData?.nik || ''} onChange={handleInputChange} disabled={showModal.edit} className="w-full border p-2 rounded bg-gray-50" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <label className="text-sm font-semibold">Nama Lengkap</label>
        <input required name="nama" value={formData?.nama || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">Jenis Kelamin</label>
        <select required name="jenis_kelamin" value={formData?.jenis_kelamin || ''} onChange={handleInputChange} className="w-full border p-2 rounded">
          <option value="">Pilih...</option>
          <option value="LAKI-LAKI">Laki-laki</option>
          <option value="PEREMPUAN">Perempuan</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold">Agama</label>
        <input required name="agama" value={formData?.agama || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">Tempat Lahir</label>
        <input required name="tempat_lahir" value={formData?.tempat_lahir || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">Tanggal Lahir</label>
        <input required type="date" name="tgl_lahir" value={formData?.tgl_lahir || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">Status KK</label>
        <input required name="status_kk" placeholder="Contoh: KEPALA KELUARGA" value={formData?.status_kk || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="text-sm font-semibold">Pendidikan</label>
        <input required name="pendidikan" value={formData?.pendidikan || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <label className="text-sm font-semibold">Pekerjaan</label>
        <input name="pekerjaan" value={formData?.pekerjaan || ''} onChange={handleInputChange} className="w-full border p-2 rounded" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <label className="text-sm font-semibold">Alamat Lengkap</label>
        <textarea required name="alamat" value={formData?.alamat || ''} onChange={handleInputChange} className="w-full border p-2 rounded" rows="2"></textarea>
      </div>
    </div>
  );

  // ==========================================
  // FUNGSI SURAT KETERANGAN
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

  // FUNGSI KLIK DARI KOTAK MASUK PERMINTAAN
  const prosesPermintaanWarga = async (permintaan) => {
    setIsLoading(true);
    const { data: wargaInfo } = await supabase.from('master_warga').select('*').eq('nik', permintaan.nik_pemohon).single();
    
    if (!wargaInfo) {
      alert("Error: Data warga pemohon tidak ditemukan di master database.");
      setIsLoading(false); return;
    }

    setWargaSurat(wargaInfo);
    setSuratFormData({
      deskripsi: permintaan.keterangan,
      tujuan_surat: permintaan.tujuan,
      pbb: 'Lunas'
    });
    setPermintaanAktifId(permintaan.id);
    setActiveView('buat_surat');
    setIsLoading(false);
  };

  const tolakPermintaan = async (id) => {
    const alasan = prompt("Masukkan alasan penolakan:");
    if (!alasan) return;
    await supabase.from('permintaan_surat').update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` }).eq('id', id);
    fetchPermintaanMasuk();
  };

  const tolakDariGenerator = async (e) => {
    e.preventDefault();
    const alasan = prompt("Masukkan alasan penolakan surat ini:");
    if (!alasan) return;
    
    setIsProcessing(true);
    await supabase.from('permintaan_surat').update({ status: 'Ditolak', keterangan: `Ditolak: ${alasan}` }).eq('id', permintaanAktifId);
    setIsProcessing(false);
    
    setPermintaanAktifId(null);
    setCetakSurat(null);
    fetchPermintaanMasuk(); // Otomatis kembali ke Inbox
  };

  const hapusLogPermintaan = async (id) => {
    if(!confirm("Hapus catatan ini dari daftar Kotak Masuk? (Tenang, arsip surat asli tidak akan terhapus)")) return;
    await supabase.from('permintaan_surat').delete().eq('id', id);
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

    if (!wargaInfo) return alert("Gagal! Data warga pemohon ini sudah benar-benar terhapus dari database.");
    
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
    e.preventDefault(); 
    setIsProcessing(true); 
    const { error } = await supabase.from('surat_keterangan').update(editSuratData).eq('id', selectedSurat?.id); 
    setIsProcessing(false); 
    if (!error) { setShowSuratModal({ ...showSuratModal, edit: false }); fetchRiwayatSurat(); } 
    else alert(error.message); 
  };

  const aksiHapusSurat = (surat) => { 
    setSelectedSurat(surat); 
    setShowSuratModal({ ...showSuratModal, delete: true }); 
  };

  const simpanHapusSurat = async (e) => { 
    e.preventDefault(); 
    setIsProcessing(true); 
    const { error } = await supabase.from('surat_keterangan').delete().eq('id', selectedSurat?.id); 
    setIsProcessing(false); 
    if (!error) { setShowSuratModal({ ...showSuratModal, delete: false }); fetchRiwayatSurat(); } 
    else alert(error.message); 
  };


  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-8 print:p-0 print:bg-white">
      
      {/* ========================================== */}
      {/* HEADER & MENU UTAMA */}
      {/* ========================================== */}
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-sm border-t-4 border-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Panel Ketua RT</h1>
          <p className="text-xs sm:text-sm text-gray-600">Sistem Informasi Manajemen Kependudukan</p>
        </div>
        <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold">
          Keluar
        </button>
      </div>

      {activeView === 'menu' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print:hidden">
          <div onClick={fetchWarga} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-blue-500 cursor-pointer hover:bg-blue-50 transition-all">
            <h3 className="font-extrabold text-lg sm:text-xl text-blue-800">1. Data Warga &rarr;</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Kelola database kependudukan, lihat statistik usia warga, dan mutasi data.</p>
          </div>
          <div onClick={fetchPermintaanMasuk} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-orange-500 cursor-pointer hover:bg-orange-50 transition-all">
            <h3 className="font-extrabold text-lg sm:text-xl text-orange-800">2. Kotak Masuk Surat &rarr;</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Lihat dan proses permohonan surat dari dasbor warga.</p>
          </div>
          <div onClick={() => { setActiveView('buat_surat'); setCetakSurat(null); setWargaSurat(null); setSuratNIK(''); setPermintaanAktifId(null); fetchRiwayatSurat(); }} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-green-500 cursor-pointer hover:bg-green-50 transition-all">
            <h3 className="font-extrabold text-lg sm:text-xl text-green-800">3. Buat Surat Manual &rarr;</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Buat nomor surat otomatis dan cetak surat pengantar resmi format kelurahan.</p>
          </div>
          <div onClick={fetchUsulan} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 sm:border-l-8 border-purple-500 cursor-pointer hover:bg-purple-50 transition-all">
            <h3 className="font-extrabold text-lg sm:text-xl text-purple-800">4. Manajemen Usulan &rarr;</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Tinjau usulan warga, update status Musrenbang, & foto tindak lanjut.</p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAMPILAN: MANAJEMEN USULAN (BARU) */}
      {/* ========================================== */}
      {activeView === 'manajemen_usulan' && (
        <div className="max-w-7xl mx-auto space-y-4 print:hidden">
          <button onClick={() => setActiveView('menu')} className="text-sm text-purple-700 font-bold hover:underline bg-purple-100 px-4 py-2 rounded-lg">
            &larr; Kembali ke Menu Utama
          </button>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-purple-600 p-4">
              <h2 className="text-lg font-bold text-white">Manajemen Usulan Warga</h2>
            </div>
            <div className="overflow-x-auto p-4 max-w-full">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                    <th className="p-3">Tgl Usul</th>
                    <th className="p-3">Pengusul</th>
                    <th className="p-3">Jenis & Keterangan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y">
                  {usulanMasuk.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 align-top">
                      <td className="p-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="p-3 font-bold">
                        {item.nama_pengusul}<br/>
                        <span className="font-normal text-xs text-gray-500">{item.nik_pengusul}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-purple-700">{item.jenis_usulan}</span>
                        {item.jenis_usulan === 'Pembangunan' && (
                           <div className="text-xs bg-purple-50 p-2 rounded mt-1 border border-purple-100 font-mono text-purple-800">
                             Dimensi: {item.panjang}m x {item.lebar}m x {item.tinggi}m | Luas: {item.luas}m²<br/>
                             Est. Harga: Rp {Number(item.estimasi_harga).toLocaleString('id-ID')}
                           </div>
                        )}
                        <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{item.keterangan}</p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {item.foto_usulan?.map((foto, idx) => ( 
                            <a key={idx} href={foto} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">
                              Lihat Foto {idx+1}
                            </a> 
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Telah Ditindaklanjuti' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-center align-middle">
                        <button onClick={() => { 
                          setSelectedUsulan(item); 
                          setTindakLanjutData({ status: item.status, catatan_rt: item.catatan_rt || '' }); 
                          setFotoTindakLanjut(null); 
                          setShowUsulanModal(true); 
                        }} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded font-bold text-xs hover:bg-purple-200 w-full">
                          Update Status /<br/>Tindak Lanjut
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usulanMasuk.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">Belum ada usulan masuk dari warga.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: KOTAK MASUK PERMINTAAN WARGA (SURAT) */}
      {/* ========================================== */}
      {activeView === 'permintaan_masuk' && (
        <div className="max-w-7xl mx-auto space-y-4 print:hidden">
          <button onClick={() => setActiveView('menu')} className="text-sm text-orange-700 font-bold hover:underline bg-orange-100 px-4 py-2 rounded-lg">
            &larr; Kembali ke Menu Utama
          </button>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-orange-500 p-4">
              <h2 className="text-lg font-bold text-white">Kotak Masuk Permintaan Surat Warga</h2>
            </div>
            <div className="overflow-x-auto p-4 max-w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm border-b-2">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Pemohon</th>
                    <th className="py-2 px-3">Tujuan & Keterangan</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y">
                  {permintaanMasuk.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-3 font-bold text-gray-800">
                        {item.nama_pemohon}<br/>
                        <span className="text-xs text-gray-500 font-normal">{item.nik_pemohon}</span>
                      </td>
                      <td className="py-3 px-3">
                        <strong>{item.tujuan}</strong><br/>
                        <span className="text-xs text-gray-500 whitespace-normal block w-64">{item.keterangan}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Selesai' ? 'bg-green-100 text-green-700' : item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 flex justify-center gap-2 items-center h-full">
                        {item.status === 'Menunggu' && (
                          <>
                            <button onClick={() => prosesPermintaanWarga(item)} disabled={isLoading} className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-blue-700 shadow-sm">
                              Proses Buat Surat
                            </button>
                            <button onClick={() => tolakPermintaan(item.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded font-bold text-xs hover:bg-red-200">
                              Tolak
                            </button>
                          </>
                        )}
                        {item.status === 'Selesai' && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Selesai Diproses</span>
                            <button onClick={() => hapusLogPermintaan(item.id)} className="text-[10px] text-gray-400 hover:text-red-500 underline">Bersihkan Log</button>
                          </div>
                        )}
                        {item.status === 'Ditolak' && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-red-600 font-bold">Ditolak</span>
                            <button onClick={() => hapusLogPermintaan(item.id)} className="text-[10px] text-gray-400 hover:text-red-500 underline">Bersihkan Log</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {permintaanMasuk.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-500">Belum ada permintaan masuk dari warga.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: BUAT SURAT KETERANGAN */}
      {/* ========================================== */}
      {activeView === 'buat_surat' && (
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 print:hidden flex gap-2">
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
                <div className="bg-green-600 p-4 flex justify-between items-center">
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
                  <div className="bg-gray-800 p-4 flex justify-between items-center">
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
                              <td className="py-2 px-3 flex justify-center gap-1">
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

          {/* PRINT PREVIEW SURAT */}
          {cetakSurat && (
            <div className="print:m-0 print:p-0">
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

              <div className="w-full overflow-x-auto bg-gray-200 p-2 sm:p-4 rounded-xl print:bg-white print:p-0">
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
      )}

      {/* ========================================== */}
      {/* VIEW: DATA WARGA */}
      {/* ========================================== */}
      {activeView === 'data_warga' && (
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 print:hidden">
          <button onClick={() => setActiveView('menu')} className="text-xs sm:text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">
            &larr; Kembali ke Menu Utama
          </button>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-blue-500"><p className="text-xs sm:text-sm text-gray-500 font-bold">Total Warga</p><p className="text-xl sm:text-3xl font-extrabold text-gray-800">{stats.total}</p></div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-indigo-500"><p className="text-xs sm:text-sm text-gray-500 font-bold">Kepala Keluarga</p><p className="text-xl sm:text-3xl font-extrabold text-gray-800">{stats.kk}</p></div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500"><p className="text-xs sm:text-sm text-gray-500 font-bold">Laki-laki</p><p className="text-xl sm:text-3xl font-extrabold text-gray-800">{stats.l}</p></div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-pink-500"><p className="text-xs sm:text-sm text-gray-500 font-bold">Perempuan</p><p className="text-xl sm:text-3xl font-extrabold text-gray-800">{stats.p}</p></div>
          </div>
          
          <div className="overflow-x-auto pb-2">
            <div className="flex md:grid grid-cols-5 gap-2 sm:gap-4 min-w-[500px] md:min-w-0">
              <div onClick={() => setAgeFilter(ageFilter === '0_5' ? 'all' : '0_5')} className={`flex-1 p-2 sm:p-3 rounded shadow text-center cursor-pointer border-b-4 border-teal-400 ${ageFilter === '0_5' ? 'bg-teal-50 ring-2' : 'bg-white'}`}><p className="text-[10px] sm:text-xs text-gray-500">Balita 0-5</p><p className="text-sm sm:text-xl font-bold text-gray-800">{stats.u0_5}</p></div>
              <div onClick={() => setAgeFilter(ageFilter === '6_10' ? 'all' : '6_10')} className={`flex-1 p-2 sm:p-3 rounded shadow text-center cursor-pointer border-b-4 border-yellow-400 ${ageFilter === '6_10' ? 'bg-yellow-50 ring-2' : 'bg-white'}`}><p className="text-[10px] sm:text-xs text-gray-500">Anak 6-10</p><p className="text-sm sm:text-xl font-bold text-gray-800">{stats.u6_10}</p></div>
              <div onClick={() => setAgeFilter(ageFilter === '11_17' ? 'all' : '11_17')} className={`flex-1 p-2 sm:p-3 rounded shadow text-center cursor-pointer border-b-4 border-purple-400 ${ageFilter === '11_17' ? 'bg-purple-50 ring-2' : 'bg-white'}`}><p className="text-[10px] sm:text-xs text-gray-500">Remaja 11-17</p><p className="text-sm sm:text-xl font-bold text-gray-800">{stats.u11_17}</p></div>
              <div onClick={() => setAgeFilter(ageFilter === '18_60' ? 'all' : '18_60')} className={`flex-1 p-2 sm:p-3 rounded shadow text-center cursor-pointer border-b-4 border-blue-400 ${ageFilter === '18_60' ? 'bg-blue-50 ring-2' : 'bg-white'}`}><p className="text-[10px] sm:text-xs text-gray-500">Dewasa 18-60</p><p className="text-sm sm:text-xl font-bold text-gray-800">{stats.u18_60}</p></div>
              <div onClick={() => setAgeFilter(ageFilter === '60plus' ? 'all' : '60plus')} className={`flex-1 p-2 sm:p-3 rounded shadow text-center cursor-pointer border-b-4 border-gray-400 ${ageFilter === '60plus' ? 'bg-gray-200 ring-2' : 'bg-white'}`}><p className="text-[10px] sm:text-xs text-gray-500">Lansia 60+</p><p className="text-sm sm:text-xl font-bold text-gray-800">{stats.u60plus}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-3 sm:p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex w-full md:w-auto space-x-2 bg-gray-200 p-1 rounded-lg">
                <button onClick={() => setTabWarga('aktif')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs sm:text-sm font-bold ${tabWarga === 'aktif' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Warga Aktif</button>
                <button onClick={() => setTabWarga('mantan')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs sm:text-sm font-bold ${tabWarga === 'mantan' ? 'bg-white shadow text-red-600' : 'text-gray-600'}`}>Mantan Warga</button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                {ageFilter !== 'all' && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center justify-between">
                    Filter Umur Aktif 
                    <button onClick={() => setAgeFilter('all')} className="ml-2 bg-white rounded-full w-4 h-4 text-center leading-none text-red-500">&times;</button>
                  </span> 
                )}
                <input type="text" placeholder="Cari Nama/NIK..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-full md:w-48 focus:ring-blue-500" />
                {tabWarga === 'aktif' && (
                  <button onClick={() => { setFormData({}); setShowModal({ ...showModal, add: true }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                    + Tambah
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto p-2 sm:p-4 max-w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                <thead>
                  <tr className="bg-blue-50 text-blue-900 text-xs sm:text-sm border-b-2">
                    <th className="py-2 px-2">No</th>
                    <th className="py-2 px-2">Nama</th>
                    <th className="py-2 px-2">NIK</th>
                    <th className="py-2 px-2">Umur</th>
                    {tabWarga === 'mantan' && <th className="py-2 px-2 text-red-600">Alasan</th>}
                    <th className="py-2 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm divide-y">
                  {filteredWarga.map((warga, index) => {
                    if (!warga) return null; 
                    return (
                      <tr key={warga.nik || index} className="hover:bg-gray-50">
                        <td className="py-2 px-2">{index + 1}</td>
                        <td className="py-2 px-2 font-semibold">{warga.nama}</td>
                        <td className="py-2 px-2 text-gray-600">{warga.nik}</td>
                        <td className="py-2 px-2 text-gray-600">{calculateAge(warga.tgl_lahir)} thn</td>
                        {tabWarga === 'mantan' && (<td className="py-2 px-2 text-red-600 whitespace-normal min-w-[150px]">{warga.alasan_hapus}</td>)}
                        <td className="py-2 px-2 flex justify-center gap-1">
                          <button onClick={() => openView(warga)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium hover:bg-blue-200">Lihat</button>
                          {tabWarga === 'aktif' && ( 
                            <>
                              <button onClick={() => openEdit(warga)} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium hover:bg-yellow-200">Edit</button> 
                              <button onClick={() => openDelete(warga)} className="bg-red-100 text-red-700 px-2 py-1 rounded font-medium hover:bg-red-200">Hapus</button>
                            </> 
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWarga.length === 0 && (
                    <tr><td colSpan="6" className="py-8 text-center text-gray-500">Data tidak ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="mt-3 text-xs sm:text-sm text-gray-500 font-medium ml-2">Menampilkan {filteredWarga.length} baris data.</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SEMUA MODAL */}
      {/* ========================================== */}

      {/* MODAL TINDAK LANJUT USULAN (BARU) */}
      {showUsulanModal && selectedUsulan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4 print:hidden">
          <form onSubmit={simpanTindakLanjut} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-purple-600 text-white"><h2 className="text-lg font-bold">Update Tindak Lanjut Usulan</h2></div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Ubah Status Usulan:</label>
                <select required value={tindakLanjutData.status} onChange={(e) => setTindakLanjutData({...tindakLanjutData, status: e.target.value})} className="w-full border p-2 rounded focus:ring-purple-500">
                  <option value="Menunggu Tinjauan RT">Menunggu Tinjauan RT</option>
                  <option value="On Proses Pengajuan Musrenbang">On Proses Pengajuan Musrenbang</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Telah Ditindaklanjuti">Telah Ditindaklanjuti</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Catatan / Keterangan RT:</label>
                <textarea rows="3" value={tindakLanjutData.catatan_rt} onChange={(e) => setTindakLanjutData({...tindakLanjutData, catatan_rt: e.target.value})} className="w-full border p-2 rounded focus:ring-purple-500" placeholder="Opsional..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Upload Foto Tindak Lanjut (Wajib jika selesai):</label>
                <input type="file" accept="image/*" onChange={(e) => setFotoTindakLanjut(e.target.files[0])} className="w-full border p-2 rounded text-sm" />
                <p className="text-[10px] text-gray-500 mt-1">Foto otomatis dikompres max 100kb.</p>
                {selectedUsulan.foto_tindak_lanjut && !fotoTindakLanjut && ( <div className="mt-2"><span className="text-xs text-green-600 font-bold">Sudah ada foto tersimpan.</span></div> )}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setShowUsulanModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-purple-600 text-white rounded font-bold">{isProcessing ? 'Menyimpan...' : 'Simpan Update'}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: View Profil Warga */}
      {showModal.view && selectedWarga && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-2 sm:p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className={`p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left ${selectedWarga.status_warga === 'aktif' ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-gray-600 to-gray-800'}`}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-inner border-2 shrink-0">
                {selectedWarga.nama?.charAt(0).toUpperCase()}
              </div>
              <div className="text-white">
                <h2 className="text-xl sm:text-3xl font-extrabold">{selectedWarga.nama}</h2>
                <p className="text-blue-100 text-sm sm:text-base mt-1">NIK: {selectedWarga.nik}</p>
              </div>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <h3 className="text-[10px] sm:text-xs font-black text-gray-400 mb-2">IDENTITAS KEPENDUDUKAN</h3>
                  <div className="space-y-2 text-sm">
                    <div><p className="text-[10px] text-gray-500 uppercase">No. Kartu Keluarga</p><p className="font-bold text-gray-800">{selectedWarga.no_kk || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase">Nama Lengkap</p><p className="font-bold text-gray-800">{selectedWarga.nama || '-'}</p></div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <h3 className="text-[10px] sm:text-xs font-black text-gray-400 mb-2">DATA PERSONAL</h3>
                  <div className="space-y-2 text-sm">
                    <div><p className="text-[10px] text-gray-500 uppercase">Tempat, Tanggal Lahir</p><p className="font-bold text-gray-800">{selectedWarga.tempat_lahir || '-'}, {selectedWarga.tgl_lahir || '-'}</p></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-[10px] text-gray-500 uppercase">Usia</p><p className="font-bold text-gray-800">{calculateAge(selectedWarga.tgl_lahir)} Tahun</p></div>
                      <div><p className="text-[10px] text-gray-500 uppercase">Pekerjaan</p><p className="font-bold text-gray-800">{selectedWarga.pekerjaan || '-'}</p></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border sm:col-span-2">
                  <h3 className="text-[10px] sm:text-xs font-black text-gray-400 mb-2">DETAIL TAMBAHAN</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><p className="text-[10px] text-gray-500 uppercase">Status KK</p><p className="font-bold text-gray-800">{selectedWarga.status_kk || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase">Pendidikan</p><p className="font-bold text-gray-800">{selectedWarga.pendidikan || '-'}</p></div>
                    <div className="sm:col-span-2"><p className="text-[10px] text-gray-500 uppercase">Alamat Lengkap</p><p className="font-bold text-gray-800">{selectedWarga.alamat || '-'}</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 border-t text-right">
              <button onClick={() => setShowModal({...showModal, view: false})} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-300">Tutup Profil</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Warga */}
      {showModal.add && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 print:hidden"> 
          <form onSubmit={saveAdd} className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]"> 
            <div className="bg-blue-600 p-3 sm:p-4"><h3 className="text-base sm:text-lg font-bold text-white">Tambah Warga Baru</h3></div> 
            <div className="p-4 sm:p-6 overflow-y-auto flex-1"><FormInputs /></div> 
            <div className="bg-gray-50 p-3 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, add: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded text-sm hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700">{isProcessing ? 'Menyimpan...' : 'Simpan Data'}</button>
            </div> 
          </form> 
        </div> 
      )}

      {/* MODAL: Edit Warga */}
      {showModal.edit && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 print:hidden"> 
          <form onSubmit={saveEdit} className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]"> 
            <div className="bg-yellow-500 p-3 sm:p-4"><h3 className="text-base sm:text-lg font-bold text-white">Edit Data: {selectedWarga?.nama}</h3></div> 
            <div className="p-4 sm:p-6 overflow-y-auto flex-1"><FormInputs /></div> 
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, edit: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold">{isProcessing ? 'Memperbarui...' : 'Update Data'}</button>
            </div>
          </form> 
        </div> 
      )}

      {/* MODAL: Hapus / Mutasi Warga */}
      {showModal.delete && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden"> 
          <form onSubmit={saveDelete} className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"> 
            <div className="bg-red-600 p-4"><h3 className="text-lg font-bold text-white">Mutasi / Hapus Warga</h3></div> 
            <div className="p-6">
              <label className="block text-sm font-bold text-red-600 mb-2">Alasan Mutasi:</label>
              <textarea required rows="3" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full border p-2 rounded focus:ring-red-500"></textarea>
            </div> 
            <div className="bg-gray-50 p-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal({...showModal, delete: false})} className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Hapus & Pindahkan</button>
            </div> 
          </form> 
        </div> 
      )}

      {/* MODAL: Edit Surat Arsip */}
      {showSuratModal.edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden">
          <form onSubmit={simpanEditSurat} className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-yellow-500 p-4"><h3 className="text-lg font-bold text-white">Edit Arsip Surat: {selectedSurat?.nomor_surat}</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi Surat:</label>
                <textarea required value={editSuratData?.deskripsi || ''} onChange={(e) => setEditSuratData({...editSuratData, deskripsi: e.target.value})} rows="4" className="w-full border p-2 rounded focus:ring-yellow-500"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tujuan Surat:</label>
                <input required type="text" value={editSuratData?.tujuan_surat || ''} onChange={(e) => setEditSuratData({...editSuratData, tujuan_surat: e.target.value})} className="w-full border p-2 rounded focus:ring-yellow-500" />
              </div>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowSuratModal({...showSuratModal, edit: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded text-sm hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold text-sm hover:bg-yellow-700">{isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Hapus Surat Arsip */}
      {showSuratModal.delete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 print:hidden">
          <form onSubmit={simpanHapusSurat} className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 p-4"><h3 className="text-lg font-bold text-white">Hapus Arsip Surat</h3></div>
            <div className="p-6">
              <p className="text-gray-700 mb-4 text-sm">Anda yakin ingin menghapus permanen riwayat surat nomor <strong>{selectedSurat?.nomor_surat}</strong>?</p>
              <p className="text-xs text-red-500 bg-red-50 p-3 rounded border border-red-100">Peringatan: Tindakan ini tidak akan mereset nomor urut surat, namun catatan ini akan hilang selamanya dari arsip.</p>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowSuratModal({...showSuratModal, delete: false})} className="px-4 py-2 text-gray-600 bg-gray-200 rounded text-sm hover:bg-gray-300">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700">{isProcessing ? 'Memproses...' : 'Hapus Permanen'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}