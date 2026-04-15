// File: src/components/DashboardKetua/DataWargaView.jsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DataWargaView({ setActiveView, dataWarga, fetchWarga }) {
  // ==========================================
  // 1. STATE LOKAL KHUSUS WARGA
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [tabWarga, setTabWarga] = useState('aktif'); 
  const [ageFilter, setAgeFilter] = useState('all');
  const [showModal, setShowModal] = useState({ add: false, edit: false, delete: false, view: false });
  const [formData, setFormData] = useState({});
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedWarga, setSelectedWarga] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ==========================================
  // 2. LOGIKA & STATISTIK WARGA
  // ==========================================
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
  // 3. FUNGSI CRUD WARGA
  // ==========================================
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const saveAdd = async (e) => {
    e.preventDefault(); setIsProcessing(true);
    const { error } = await supabase.from('master_warga').insert([{ ...formData, status_warga: 'aktif' }]);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, add: false }); fetchWarga(); } else alert(error.message);
  };

  const saveEdit = async (e) => {
    e.preventDefault(); setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update(formData).eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, edit: false }); fetchWarga(); } else alert(error.message);
  };

  const saveDelete = async (e) => {
    e.preventDefault(); 
    if (!deleteReason) return alert("Alasan wajib diisi!"); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ status_warga: 'mantan', alasan_hapus: deleteReason, is_registered: false }).eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    if (!error) { setShowModal({ ...showModal, delete: false }); setDeleteReason(''); fetchWarga(); } else alert(error.message);
  };

  const openView = (warga) => { setSelectedWarga(warga); setShowModal({ ...showModal, view: true }); };
  const openEdit = (warga) => { setSelectedWarga(warga); setFormData(warga); setShowModal({ ...showModal, edit: true }); };
  const openDelete = (warga) => { setSelectedWarga(warga); setDeleteReason(''); setShowModal({ ...showModal, delete: true }); };

  // KOMPONEN FORM INPUT
  const FormInputs = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1 text-sm">
      <div><label className="font-semibold">No. KK</label><input required name="no_kk" value={formData?.no_kk || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">NIK</label><input required name="nik" value={formData?.nik || ''} onChange={handleInputChange} disabled={showModal.edit} className="w-full border p-2 rounded bg-gray-50" /></div>
      <div className="col-span-1 sm:col-span-2"><label className="font-semibold">Nama Lengkap</label><input required name="nama" value={formData?.nama || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">Jenis Kelamin</label>
        <select required name="jenis_kelamin" value={formData?.jenis_kelamin || ''} onChange={handleInputChange} className="w-full border p-2 rounded">
          <option value="">Pilih...</option><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option>
        </select>
      </div>
      <div><label className="font-semibold">Agama</label><input required name="agama" value={formData?.agama || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">Tempat Lahir</label><input required name="tempat_lahir" value={formData?.tempat_lahir || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">Tanggal Lahir</label><input required type="date" name="tgl_lahir" value={formData?.tgl_lahir || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">Status KK</label><input required name="status_kk" placeholder="Contoh: KEPALA KELUARGA" value={formData?.status_kk || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div><label className="font-semibold">Pendidikan</label><input required name="pendidikan" value={formData?.pendidikan || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div className="col-span-1 sm:col-span-2"><label className="font-semibold">Pekerjaan</label><input name="pekerjaan" value={formData?.pekerjaan || ''} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
      <div className="col-span-1 sm:col-span-2"><label className="font-semibold">Alamat Lengkap</label><textarea required name="alamat" value={formData?.alamat || ''} onChange={handleInputChange} className="w-full border p-2 rounded" rows="2"></textarea></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden">
      {/* HEADER TULISAN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">&larr; Kembali ke Menu Utama</button>
        <button onClick={() => { setFormData({}); setShowModal({...showModal, add: true}); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 w-full sm:w-auto">+ Tambah Warga</button>
      </div>

      {/* ========================================== */}
      {/* STATISTIK KARTU UTAMA & UMUR                 */}
      {/* ========================================== */}
      <div className="space-y-4">
        {/* Kartu Demografi Umum */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><p className="text-xs text-gray-500 font-bold uppercase">Total Warga Aktif</p><h3 className="text-3xl font-black text-blue-700">{stats.total}</h3></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><p className="text-xs text-gray-500 font-bold uppercase">Kepala Keluarga</p><h3 className="text-3xl font-black text-indigo-700">{stats.kk}</h3></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><p className="text-xs text-gray-500 font-bold uppercase">Laki-laki</p><h3 className="text-3xl font-black text-teal-600">{stats.l}</h3></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><p className="text-xs text-gray-500 font-bold uppercase">Perempuan</p><h3 className="text-3xl font-black text-pink-600">{stats.p}</h3></div>
        </div>

        {/* Kartu Kategori Umur (Bisa Diklik & Berubah Warna Saat Aktif) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div 
            onClick={() => setAgeFilter(ageFilter === '0_5' ? 'all' : '0_5')}
            className={`p-3 rounded-xl shadow-sm border-l-4 border-l-orange-500 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '0_5' ? 'bg-orange-50 ring-2 ring-orange-400' : 'bg-white hover:bg-orange-50'}`}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase">Balita (0-5 th)</p>
            <h3 className="text-xl font-black text-orange-600">{stats.u0_5}</h3>
          </div>
          <div 
            onClick={() => setAgeFilter(ageFilter === '6_10' ? 'all' : '6_10')}
            className={`p-3 rounded-xl shadow-sm border-l-4 border-l-yellow-500 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '6_10' ? 'bg-yellow-50 ring-2 ring-yellow-400' : 'bg-white hover:bg-yellow-50'}`}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase">Anak (6-10 th)</p>
            <h3 className="text-xl font-black text-yellow-600">{stats.u6_10}</h3>
          </div>
          <div 
            onClick={() => setAgeFilter(ageFilter === '11_17' ? 'all' : '11_17')}
            className={`p-3 rounded-xl shadow-sm border-l-4 border-l-green-500 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '11_17' ? 'bg-green-50 ring-2 ring-green-400' : 'bg-white hover:bg-green-50'}`}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase">Remaja (11-17 th)</p>
            <h3 className="text-xl font-black text-green-600">{stats.u11_17}</h3>
          </div>
          <div 
            onClick={() => setAgeFilter(ageFilter === '18_60' ? 'all' : '18_60')}
            className={`p-3 rounded-xl shadow-sm border-l-4 border-l-blue-500 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '18_60' ? 'bg-blue-50 ring-2 ring-blue-400' : 'bg-white hover:bg-blue-50'}`}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase">Dewasa (18-60 th)</p>
            <h3 className="text-xl font-black text-blue-600">{stats.u18_60}</h3>
          </div>
          <div 
            onClick={() => setAgeFilter(ageFilter === '60plus' ? 'all' : '60plus')}
            className={`p-3 rounded-xl shadow-sm border-l-4 border-l-purple-500 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '60plus' ? 'bg-purple-50 ring-2 ring-purple-400' : 'bg-white hover:bg-purple-50'}`}
          >
            <p className="text-[10px] text-gray-500 font-bold uppercase">Lansia (&gt;60 th)</p>
            <h3 className="text-xl font-black text-purple-600">{stats.u60plus}</h3>
          </div>
        </div>
      </div>

      {/* KONTROL FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => setTabWarga('aktif')} className={`px-4 py-2 rounded-lg text-sm font-bold flex-1 lg:flex-none ${tabWarga === 'aktif' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Warga Aktif</button>
          <button onClick={() => setTabWarga('mantan')} className={`px-4 py-2 rounded-lg text-sm font-bold flex-1 lg:flex-none ${tabWarga === 'mantan' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Mantan Warga</button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {/* Dropdown tetap ada, jika kartu di klik, ini akan otomatis sinkron */}
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="border p-2 rounded-lg bg-gray-50 text-sm focus:ring-blue-500">
            <option value="all">Semua Kategori Umur</option><option value="0_5">Balita (0-5 th)</option><option value="6_10">Anak (6-10 th)</option><option value="11_17">Remaja (11-17 th)</option><option value="18_60">Dewasa (18-60 th)</option><option value="60plus">Lansia (&gt;60 th)</option>
          </select>
          <input type="text" placeholder="Cari NAMA atau NIK..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded-lg bg-gray-50 text-sm w-full sm:w-64 focus:ring-blue-500" />
        </div>
      </div>

      {/* TABEL WARGA */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b-2">
                <th className="p-3">NIK / No. KK</th>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3 text-center">L/P</th>
                <th className="p-3">Umur</th>
                <th className="p-3">Pekerjaan</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredWarga.map((w, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition">
                  <td className="p-3"><p className="font-bold text-blue-700">{w.nik}</p><p className="text-[10px] text-gray-500">KK: {w.no_kk}</p></td>
                  <td className="p-3"><p className="font-bold text-gray-800">{w.nama}</p><p className="text-[10px] bg-gray-200 text-gray-600 font-bold inline-block px-1.5 py-0.5 rounded mt-0.5">{w.status_kk}</p></td>
                  <td className="p-3 font-medium text-center">{w.jenis_kelamin === 'LAKI-LAKI' ? 'L' : 'P'}</td>
                  <td className="p-3 font-bold text-gray-600">{calculateAge(w.tgl_lahir)} Thn</td>
                  <td className="p-3 text-xs text-gray-600">{w.pekerjaan || '-'}</td>
                  <td className="p-3 text-center space-x-1 whitespace-nowrap">
                    <button onClick={() => openView(w)} className="bg-blue-100 text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200">View</button>
                    {tabWarga === 'aktif' && (
                      <>
                        <button onClick={() => openEdit(w)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-200">Edit</button>
                        <button onClick={() => openDelete(w)} className="bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-200">Mutasi</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredWarga.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Data warga tidak ditemukan berdasarkan filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* SEMUA MODAL BAWAAN WARGA                     */}
      {/* ========================================== */}
      
      {/* MODAL VIEW */}
      {showModal.view && selectedWarga && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Profil */}
            <div className={`p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left text-white ${selectedWarga.status_warga === 'aktif' ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-gray-600 to-gray-800'}`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold shadow-inner border-2 border-white/30 shrink-0">
                {selectedWarga.nama?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold">{selectedWarga.nama}</h2>
                <p className="text-sm opacity-90 mt-1 font-mono tracking-wide">NIK: {selectedWarga.nik}</p>
                {selectedWarga.status_warga === 'mantan' && <p className="text-xs bg-red-500 inline-block px-2 py-0.5 rounded mt-2 font-bold shadow-sm">MANTAN WARGA</p>}
              </div>
            </div>

            {/* Detail Profil Lengkap */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-black text-gray-400 mb-4 border-b pb-2 tracking-wider">IDENTITAS KEPENDUDUKAN</h3>
                  <div className="space-y-4 text-sm">
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">No. Kartu Keluarga</p><p className="font-bold text-gray-800 text-base">{selectedWarga.no_kk || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Status dalam Keluarga</p><p className="font-bold text-gray-800">{selectedWarga.status_kk || '-'}</p></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-black text-gray-400 mb-4 border-b pb-2 tracking-wider">DATA PERSONAL</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div className="col-span-2"><p className="text-[10px] text-gray-500 uppercase font-bold">Tempat, Tanggal Lahir</p><p className="font-bold text-gray-800">{selectedWarga.tempat_lahir || '-'}, {selectedWarga.tgl_lahir ? new Date(selectedWarga.tgl_lahir).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Usia</p><p className="font-bold text-blue-600">{calculateAge(selectedWarga.tgl_lahir)} Tahun</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Jenis Kelamin</p><p className="font-bold text-gray-800">{selectedWarga.jenis_kelamin || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Agama</p><p className="font-bold text-gray-800">{selectedWarga.agama || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase font-bold">Pendidikan</p><p className="font-bold text-gray-800">{selectedWarga.pendidikan || '-'}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-gray-500 uppercase font-bold">Pekerjaan</p><p className="font-bold text-gray-800">{selectedWarga.pekerjaan || '-'}</p></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 sm:col-span-2">
                  <h3 className="text-xs font-black text-gray-400 mb-3 border-b pb-2 tracking-wider">ALAMAT LENGKAP</h3>
                  <p className="font-medium text-gray-700 text-sm leading-relaxed">{selectedWarga.alamat || '-'}</p>
                </div>

                {selectedWarga.status_warga === 'mantan' && selectedWarga.alasan_hapus && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 sm:col-span-2">
                    <h3 className="text-xs font-black text-red-500 mb-2 tracking-wider">ALASAN MUTASI / PINDAH</h3>
                    <p className="font-bold text-red-700 text-sm italic">"{selectedWarga.alasan_hapus}"</p>
                  </div>
                )}

              </div>
            </div>

            <div className="bg-white p-4 border-t text-right shadow-sm z-10">
              <button onClick={() => setShowModal({...showModal, view: false})} className="px-8 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-300 transition">Tutup Profil</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD */}
      {showModal.add && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"> 
          <form onSubmit={saveAdd} className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"> 
            <div className="bg-blue-600 p-4"><h3 className="text-lg font-bold text-white">Tambah Warga Baru</h3></div> 
            <div className="p-6 overflow-y-auto"><FormInputs /></div> 
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, add: false})} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">{isProcessing ? 'Menyimpan...' : 'Simpan Data'}</button>
            </div> 
          </form> 
        </div> 
      )}

      {/* MODAL EDIT */}
      {showModal.edit && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"> 
          <form onSubmit={saveEdit} className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"> 
            <div className="bg-yellow-500 p-4"><h3 className="text-lg font-bold text-white">Edit Data Warga</h3></div> 
            <div className="p-6 overflow-y-auto"><FormInputs /></div> 
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, edit: false})} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold text-sm">{isProcessing ? 'Memperbarui...' : 'Update Data'}</button>
            </div>
          </form> 
        </div> 
      )}

      {/* MODAL DELETE */}
      {showModal.delete && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"> 
          <form onSubmit={saveDelete} className="bg-white rounded-lg shadow-xl w-full max-w-md"> 
            <div className="bg-red-600 p-4"><h3 className="text-lg font-bold text-white">Mutasi / Hapus Warga</h3></div> 
            <div className="p-6">
              <label className="block text-sm font-bold text-red-600 mb-2">Alasan Mutasi/Pindah:</label>
              <textarea required rows="3" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full border p-2 rounded focus:ring-red-500"></textarea>
            </div> 
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, delete: false})} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm">Batal</button>
              <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm">Pindahkan ke Mantan Warga</button>
            </div> 
          </form> 
        </div> 
      )}

    </div>
  );
}