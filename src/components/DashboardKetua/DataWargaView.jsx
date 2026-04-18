import React, { useState, useMemo, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

// --- Konstanta Label Etnis (Sama dengan Laporan Triwulan) ---
const arrEtnis = ['Aceh','Batak','Nias','Jawa','Banten','Cirebon','Betawi','Sunda','Bali','Ambon','Flores','Papua','Samawa','Melayu/Palembang','Minangkabau','Afrika','Australia','China','Amerika','Eropa','Arab','Lainnya'];

export default function DataWargaView({ setActiveView, dataWarga, fetchWarga }) {

  const supabase = getSupabaseClient();
  // ==========================================
  // 1. STATE LOKAL KHUSUS WARGA
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [tabWarga, setTabWarga] = useState('aktif'); 
  const [ageFilter, setAgeFilter] = useState('all');
  
  // State Modals & Form
  const [showModal, setShowModal] = useState({ add: false, edit: false, delete: false, view: false });
  const [formData, setFormData] = useState({});
  const [deleteReason, setDeleteReason] = useState('');
  const [selectedWarga, setSelectedWarga] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State Khusus Dropdown Etnis
  const [showEtnisLainnya, setShowEtnisLainnya] = useState(false);

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State Data Profiles (Untuk mengambil No. HP)
  const [profilesMap, setProfilesMap] = useState({});

  // ==========================================
  // 2. STATE MODAL ALERT PROFESIONAL
  // ==========================================
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' // 'success', 'error', 'warning', 'info'
  });

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertModal({ ...alertModal, isOpen: false });
  };

  // ==========================================
  // 3. FETCH PROFILES UNTUK NO HP
  // ==========================================
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('nik, no_hp');
      if (data && !error) {
        const pMap = {};
        data.forEach(p => {
          if (p.nik && p.no_hp) pMap[p.nik] = p.no_hp;
        });
        setProfilesMap(pMap);
      }
    };
    fetchProfiles();
  }, [supabase]);

  // ==========================================
  // 4. LOGIKA STATISTIK DEMOGRAFI
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

  // ==========================================
  // 5. LOGIKA FILTER, PENGURUTAN HIERARKI & PAGINATION
  // ==========================================
  const dataTerproses = useMemo(() => {
    const bobotStatus = {
      'KEPALA KELUARGA': 1, 'SUAMI': 2, 'ISTRI': 3, 'ANAK': 4,
      'MENANTU': 5, 'CUCU': 6, 'ORANG TUA': 7, 'MERTUA': 8,
      'FAMILI LAIN': 9, 'PEMBANTU': 10
    };
    const getBobot = (status) => bobotStatus[status?.toUpperCase()] || 99;

    let filtered = dataWarga.filter(w => {
      if (!w) return false;
      const isMatchTab = tabWarga === 'aktif' ? w.status_warga !== 'mantan' : w.status_warga === 'mantan';
      
      const query = searchQuery.toLowerCase().trim();
      const safeNama = w.nama ? String(w.nama).toLowerCase() : ''; 
      const safeNik = w.nik ? String(w.nik).toLowerCase() : '';
      const safeKk = w.no_kk ? String(w.no_kk).toLowerCase() : '';
      const isMatchSearch = safeNama.includes(query) || safeNik.includes(query) || safeKk.includes(query);
      
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

    filtered.sort((a, b) => {
      const kkA = a.no_kk ? String(a.no_kk) : '';
      const kkB = b.no_kk ? String(b.no_kk) : '';
      
      if (kkA !== kkB) return kkA.localeCompare(kkB);
      return getBobot(a.status_kk) - getBobot(b.status_kk);
    });

    return filtered;
  }, [dataWarga, tabWarga, searchQuery, ageFilter]);

  const totalPages = Math.ceil(dataTerproses.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const dataHalamanIni = dataTerproses.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, tabWarga, ageFilter]);

  // ==========================================
  // 6. FUNGSI CRUD WARGA (UPDATED WITH CUSTOM ALERTS)
  // ==========================================
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEtnisChange = (e) => {
    if (e.target.value === 'Lainnya') {
      setShowEtnisLainnya(true);
      setFormData({ ...formData, etnis: '' });
    } else {
      setShowEtnisLainnya(false);
      setFormData({ ...formData, etnis: e.target.value });
    }
  };

  const saveAdd = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').insert([{ ...formData, status_warga: 'aktif' }]);
    setIsProcessing(false);
    
    if (!error) { 
      setShowModal({ ...showModal, add: false }); 
      fetchWarga(); 
      showAlert("Berhasil", "Data warga baru telah berhasil ditambahkan.", "success");
    } else {
      showAlert("Gagal Menyimpan", error.message, "error");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update(formData).eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    
    if (!error) { 
      setShowModal({ ...showModal, edit: false }); 
      fetchWarga(); 
      showAlert("Berhasil", "Perubahan data warga berhasil disimpan.", "success");
    } else {
      showAlert("Gagal Memperbarui", error.message, "error");
    }
  };

  const saveDelete = async (e) => {
    e.preventDefault(); 
    if (!deleteReason) {
      showAlert("Perhatian", "Alasan mutasi atau pindah wajib diisi!", "warning");
      return; 
    }
    
    setIsProcessing(true);
    const { error } = await supabase.from('master_warga').update({ status_warga: 'mantan', alasan_hapus: deleteReason, is_registered: false }).eq('nik', selectedWarga?.nik);
    setIsProcessing(false);
    
    if (!error) { 
      setShowModal({ ...showModal, delete: false }); 
      setDeleteReason(''); 
      fetchWarga(); 
      showAlert("Mutasi Berhasil", "Warga telah dipindahkan ke daftar Mantan Warga.", "success");
    } else {
      showAlert("Gagal Memutasi", error.message, "error");
    }
  };

  const openView = (warga) => { setSelectedWarga(warga); setShowModal({ ...showModal, view: true }); };
  const openDelete = (warga) => { setSelectedWarga(warga); setDeleteReason(''); setShowModal({ ...showModal, delete: true }); };

  const openAdd = () => { 
    setFormData({}); 
    setShowEtnisLainnya(false); 
    setShowModal({ ...showModal, add: true }); 
  };

  const openEdit = (warga) => { 
    setSelectedWarga(warga); 
    const existingHp = warga.no_hp || profilesMap[warga.nik] || '';
    setFormData({ ...warga, no_hp: existingHp }); 
    setShowEtnisLainnya(warga.etnis && !arrEtnis.slice(0, -1).includes(warga.etnis));
    setShowModal({ ...showModal, edit: true }); 
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg transition hover:bg-blue-100">&larr; Kembali ke Menu Utama</button>
        <button onClick={openAdd} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 w-full sm:w-auto transition-transform active:scale-95">+ Tambah Data Warga</button>
      </div>

      {/* STATISTIK KARTU */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"><p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Warga Aktif</p><h3 className="text-4xl font-black text-blue-700">{stats.total}</h3></div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"><p className="text-xs text-gray-400 font-bold uppercase mb-1">Kepala Keluarga</p><h3 className="text-4xl font-black text-indigo-700">{stats.kk}</h3></div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"><p className="text-xs text-gray-400 font-bold uppercase mb-1">Laki-laki</p><h3 className="text-4xl font-black text-teal-600">{stats.l}</h3></div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"><p className="text-xs text-gray-400 font-bold uppercase mb-1">Perempuan</p><h3 className="text-4xl font-black text-pink-600">{stats.p}</h3></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div onClick={() => setAgeFilter(ageFilter === '0_5' ? 'all' : '0_5')} className={`p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '0_5' ? 'bg-orange-50 ring-2 ring-orange-400 border-l-orange-500' : 'bg-white hover:bg-orange-50 border-l-orange-200'}`}>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Balita (0-5 th)</p><h3 className="text-2xl font-black text-orange-600">{stats.u0_5}</h3>
          </div>
          <div onClick={() => setAgeFilter(ageFilter === '6_10' ? 'all' : '6_10')} className={`p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '6_10' ? 'bg-yellow-50 ring-2 ring-yellow-400 border-l-yellow-500' : 'bg-white hover:bg-yellow-50 border-l-yellow-200'}`}>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Anak (6-10 th)</p><h3 className="text-2xl font-black text-yellow-600">{stats.u6_10}</h3>
          </div>
          <div onClick={() => setAgeFilter(ageFilter === '11_17' ? 'all' : '11_17')} className={`p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '11_17' ? 'bg-green-50 ring-2 ring-green-400 border-l-green-500' : 'bg-white hover:bg-green-50 border-l-green-200'}`}>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Remaja (11-17 th)</p><h3 className="text-2xl font-black text-green-600">{stats.u11_17}</h3>
          </div>
          <div onClick={() => setAgeFilter(ageFilter === '18_60' ? 'all' : '18_60')} className={`p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '18_60' ? 'bg-blue-50 ring-2 ring-blue-400 border-l-blue-500' : 'bg-white hover:bg-blue-50 border-l-blue-200'}`}>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Dewasa (18-60 th)</p><h3 className="text-2xl font-black text-blue-600">{stats.u18_60}</h3>
          </div>
          <div onClick={() => setAgeFilter(ageFilter === '60plus' ? 'all' : '60plus')} className={`p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer transition-all hover:-translate-y-1 ${ageFilter === '60plus' ? 'bg-purple-50 ring-2 ring-purple-400 border-l-purple-500' : 'bg-white hover:bg-purple-50 border-l-purple-200'}`}>
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Lansia (&gt;60 th)</p><h3 className="text-2xl font-black text-purple-600">{stats.u60plus}</h3>
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH & PAGINATION KONTROL */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 w-full lg:w-auto p-1 bg-gray-100 rounded-xl">
          <button onClick={() => setTabWarga('aktif')} className={`px-5 py-2 rounded-lg text-sm font-bold flex-1 lg:flex-none transition-all ${tabWarga === 'aktif' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Warga Aktif</button>
          <button onClick={() => setTabWarga('mantan')} className={`px-5 py-2 rounded-lg text-sm font-bold flex-1 lg:flex-none transition-all ${tabWarga === 'mantan' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Mantan Warga</button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder="Cari NIK, NAMA..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full border-gray-200 pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2 text-sm w-full sm:w-auto bg-gray-50 border border-gray-200 px-3 py-1 rounded-xl">
            <span className="font-semibold text-gray-500 hidden sm:inline">Tampil:</span>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-transparent font-bold text-gray-700 py-1.5 focus:outline-none w-full sm:w-auto">
              <option value={10}>10 Baris</option><option value={20}>20 Baris</option><option value={50}>50 Baris</option><option value={100}>100 Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL DATA WARGA */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="py-4 px-5 font-bold">NIK / No. KK</th>
                <th className="py-4 px-5 font-bold">Nama Lengkap</th>
                <th className="py-4 px-5 font-bold text-center">L/P</th>
                <th className="py-4 px-5 font-bold">Umur</th>
                <th className="py-4 px-5 font-bold">No. HP</th>
                <th className="py-4 px-5 font-bold">Pekerjaan</th>
                <th className="py-4 px-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataHalamanIni.map((warga, index) => {
                const isNewKK = index > 0 && String(warga.no_kk) !== String(dataHalamanIni[index - 1].no_kk);
                const displayHp = warga.no_hp || profilesMap[warga.nik] || '-';

                return (
                  <tr key={warga.id || warga.nik} className={`hover:bg-blue-50/50 transition-colors ${isNewKK ? 'border-t-[3px] border-t-gray-200/60' : ''}`}>
                    <td className="py-3 px-5">
                      <div className="font-black text-gray-800">{warga.nik}</div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">KK: {warga.no_kk}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-bold text-blue-800 uppercase">{warga.nama}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold tracking-widest text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full uppercase border border-gray-200">
                        {warga.status_kk}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-bold text-gray-600 text-center">
                      <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs ${warga.jenis_kelamin?.toUpperCase().startsWith('L') ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        {warga.jenis_kelamin?.toUpperCase().startsWith('L') ? 'L' : 'P'}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-semibold text-gray-700">
                      {calculateAge(warga.tgl_lahir)} <span className="text-gray-400 text-xs font-normal">Thn</span>
                    </td>
                    <td className="py-3 px-5 font-mono text-gray-600 text-xs">
                      {displayHp}
                    </td>
                    <td className="py-3 px-5 text-gray-500 text-xs uppercase font-medium">
                      {warga.pekerjaan || '-'}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openView(warga)} className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">View</button>
                        {tabWarga === 'aktif' && (
                          <>
                            <button onClick={() => openEdit(warga)} className="bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">Edit</button>
                            <button onClick={() => openDelete(warga)} className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">Mutasi</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {dataHalamanIni.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <p className="text-gray-500 font-medium">Data warga tidak ditemukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* KONTROL PAGINATION */}
        {totalPages > 1 && (
          <div className="bg-gray-50/50 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500">
              Menampilkan <span className="font-bold text-gray-800">{startIndex + 1}</span> - <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, dataTerproses.length)}</span> dari <span className="font-bold text-gray-800">{dataTerproses.length}</span> warga
            </span>
            
            <div className="flex gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all shadow-sm"
              >
                &larr; Prev
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1)
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && <span className="px-2 py-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                        currentPage === page ? 'bg-blue-600 text-white border-transparent' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
              ))}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all shadow-sm"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL VIEW DETAIL WARGA                      */}
      {/* ========================================== */}
      {showModal.view && selectedWarga && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
            {/* Header Profil */}
            <div className={`p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left text-white relative overflow-hidden ${selectedWarga.status_warga === 'aktif' ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-10 w-32 h-32 bg-black opacity-10 rounded-full -mb-10"></div>
              
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-5xl font-black shadow-xl border border-white/30 shrink-0 z-10 rotate-3">
                {selectedWarga.nama?.charAt(0).toUpperCase()}
              </div>
              <div className="z-10">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{selectedWarga.nama}</h2>
                <div className="flex items-center gap-3 mt-2 justify-center sm:justify-start">
                  <span className="text-sm bg-black/20 px-3 py-1 rounded-lg font-mono tracking-wider backdrop-blur-sm border border-white/10">NIK: {selectedWarga.nik}</span>
                  {selectedWarga.status_warga === 'mantan' && <span className="text-xs bg-red-500/90 text-white px-2 py-1 rounded-lg font-bold shadow-sm uppercase tracking-widest border border-red-400">Mantan Warga</span>}
                </div>
              </div>
            </div>

            {/* Detail Profil Lengkap */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4 border-b pb-3">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                    <h3 className="text-xs font-black text-gray-500 tracking-widest">IDENTITAS KELUARGA</h3>
                  </div>
                  <div className="space-y-4">
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">No. Kartu Keluarga</p><p className="font-black text-indigo-900 text-lg">{selectedWarga.no_kk || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Status dalam Keluarga</p><p className="font-bold text-gray-700 bg-gray-100 inline-block px-3 py-1 rounded-lg text-sm">{selectedWarga.status_kk || '-'}</p></div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4 border-b pb-3">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <h3 className="text-xs font-black text-gray-500 tracking-widest">DATA PERSONAL</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-sm">
                    <div className="col-span-2"><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Tempat, Tanggal Lahir</p><p className="font-bold text-gray-800">{selectedWarga.tempat_lahir || '-'}, {selectedWarga.tgl_lahir ? new Date(selectedWarga.tgl_lahir).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Usia</p><p className="font-black text-blue-600">{calculateAge(selectedWarga.tgl_lahir)} <span className="font-medium text-xs">Tahun</span></p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Jenis Kelamin</p><p className="font-bold text-gray-800">{selectedWarga.jenis_kelamin || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Agama</p><p className="font-bold text-gray-800">{selectedWarga.agama || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Etnis / Suku</p><p className="font-bold text-gray-800">{selectedWarga.etnis || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Pendidikan</p><p className="font-bold text-gray-800">{selectedWarga.pendidikan || '-'}</p></div>
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">No. Handphone</p><p className="font-bold text-gray-800 font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedWarga.no_hp || profilesMap[selectedWarga.nik] || '-'}</p></div>
                    <div className="col-span-2"><p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Pekerjaan</p><p className="font-bold text-gray-800">{selectedWarga.pekerjaan || '-'}</p></div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-3 border-b pb-3">
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <h3 className="text-xs font-black text-gray-500 tracking-widest">ALAMAT LENGKAP</h3>
                  </div>
                  <p className="font-medium text-gray-700 text-sm leading-relaxed">{selectedWarga.alamat || '-'}</p>
                </div>

                {selectedWarga.status_warga === 'mantan' && selectedWarga.alasan_hapus && (
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-200 sm:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h3 className="text-xs font-black text-red-600 mb-2 tracking-widest">ALASAN MUTASI / PINDAH</h3>
                    <p className="font-bold text-red-800 text-base italic relative z-10">"{selectedWarga.alasan_hapus}"</p>
                  </div>
                )}

              </div>
            </div>

            <div className="bg-white p-5 border-t text-right shadow-sm z-10">
              <button onClick={() => setShowModal({...showModal, view: false})} className="w-full sm:w-auto px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95">Tutup Profil</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD */}
      {showModal.add && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"> 
          <form onSubmit={saveAdd} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"> 
            <div className="bg-blue-600 p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>
              <h3 className="text-xl font-black text-white">Tambah Warga Baru</h3>
            </div> 
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div><label className="font-bold text-gray-700 block mb-1.5">No. KK <span className="text-red-500">*</span></label><input required name="no_kk" value={formData?.no_kk || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">NIK <span className="text-red-500">*</span></label><input required name="nik" value={formData?.nik || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label><input required name="nama" value={formData?.nama || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                    <select required name="jenis_kelamin" value={formData?.jenis_kelamin || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                      <option value="">Pilih...</option><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Agama <span className="text-red-500">*</span></label><input required name="agama" value={formData?.agama || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  
                  {/* KONTROL ETNIS */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">Etnis / Suku <span className="text-red-500">*</span></label>
                    <select 
                      value={showEtnisLainnya ? 'Lainnya' : (formData?.etnis || '')} 
                      onChange={handleEtnisChange}
                      className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Pilih Etnis...</option>
                      {arrEtnis.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {showEtnisLainnya && (
                      <input type="text" name="etnis" placeholder="Ketik nama etnis..." value={formData?.etnis || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all mt-3" required />
                    )}
                  </div>
                  
                  {/* NO HP */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">No. Handphone <span className="text-gray-400 font-normal">(Opsional)</span></label>
                    <input type="tel" name="no_hp" value={formData?.no_hp || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Contoh: 08123456789" />
                  </div>

                  <div><label className="font-bold text-gray-700 block mb-1.5">Tempat Lahir <span className="text-red-500">*</span></label><input required name="tempat_lahir" value={formData?.tempat_lahir || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Tanggal Lahir <span className="text-red-500">*</span></label><input required type="date" name="tgl_lahir" value={formData?.tgl_lahir || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  
                  <div><label className="font-bold text-gray-700 block mb-1.5">Status KK <span className="text-red-500">*</span></label><input required name="status_kk" placeholder="Contoh: KEPALA KELUARGA" value={formData?.status_kk || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Pendidikan <span className="text-red-500">*</span></label><input required name="pendidikan" value={formData?.pendidikan || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Pekerjaan</label><input name="pekerjaan" value={formData?.pekerjaan || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div>
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Alamat Lengkap <span className="text-red-500">*</span></label><textarea required name="alamat" value={formData?.alamat || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" rows="3"></textarea></div>
                </div>
              </div>
            </div> 
            
            <div className="bg-white p-5 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, add: false})} className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">Batal</button>
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">{isProcessing ? 'Menyimpan...' : 'Simpan Data'}</button>
            </div> 
          </form> 
        </div> 
      )}

      {/* MODAL EDIT */}
      {showModal.edit && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"> 
          <form onSubmit={saveEdit} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"> 
            <div className="bg-amber-500 p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></div>
              <h3 className="text-xl font-black text-white">Edit Data Warga</h3>
            </div> 
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div><label className="font-bold text-gray-700 block mb-1.5">No. KK <span className="text-red-500">*</span></label><input required name="no_kk" value={formData?.no_kk || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-500 block mb-1.5">NIK (Tidak bisa diubah)</label><input required name="nik" value={formData?.nik || ''} onChange={handleInputChange} disabled className="w-full border border-gray-200 p-2.5 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed" /></div>
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label><input required name="nama" value={formData?.nama || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                    <select required name="jenis_kelamin" value={formData?.jenis_kelamin || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all">
                      <option value="">Pilih...</option><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Agama <span className="text-red-500">*</span></label><input required name="agama" value={formData?.agama || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  
                  {/* KONTROL ETNIS */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">Etnis / Suku <span className="text-red-500">*</span></label>
                    <select 
                      value={showEtnisLainnya ? 'Lainnya' : (formData?.etnis || '')} 
                      onChange={handleEtnisChange}
                      className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      required
                    >
                      <option value="">Pilih Etnis...</option>
                      {arrEtnis.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {showEtnisLainnya && (
                      <input type="text" name="etnis" placeholder="Ketik nama etnis..." value={formData?.etnis || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all mt-3" required />
                    )}
                  </div>
                  
                  {/* NO HP */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1.5">No. Handphone <span className="text-gray-400 font-normal">(Opsional)</span></label>
                    <input type="tel" name="no_hp" value={formData?.no_hp || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="Contoh: 08123456789" />
                  </div>

                  <div><label className="font-bold text-gray-700 block mb-1.5">Tempat Lahir <span className="text-red-500">*</span></label><input required name="tempat_lahir" value={formData?.tempat_lahir || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Tanggal Lahir <span className="text-red-500">*</span></label><input required type="date" name="tgl_lahir" value={formData?.tgl_lahir || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  
                  <div><label className="font-bold text-gray-700 block mb-1.5">Status KK <span className="text-red-500">*</span></label><input required name="status_kk" placeholder="Contoh: KEPALA KELUARGA" value={formData?.status_kk || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  <div><label className="font-bold text-gray-700 block mb-1.5">Pendidikan <span className="text-red-500">*</span></label><input required name="pendidikan" value={formData?.pendidikan || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Pekerjaan</label><input name="pekerjaan" value={formData?.pekerjaan || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" /></div>
                  <div className="col-span-1 sm:col-span-2"><label className="font-bold text-gray-700 block mb-1.5">Alamat Lengkap <span className="text-red-500">*</span></label><textarea required name="alamat" value={formData?.alamat || ''} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all" rows="3"></textarea></div>
                </div>
              </div>
            </div> 

            <div className="bg-white p-5 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, edit: false})} className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">Batal</button>
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">{isProcessing ? 'Memperbarui...' : 'Update Data'}</button>
            </div>
          </form> 
        </div> 
      )}

      {/* MODAL DELETE / MUTASI */}
      {showModal.delete && ( 
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"> 
          <form onSubmit={saveDelete} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"> 
            <div className="bg-red-600 p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>
              <h3 className="text-xl font-black text-white">Mutasi / Hapus Warga</h3>
            </div> 
            
            <div className="p-8">
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>Anda akan mengubah status <strong className="font-black">{selectedWarga?.nama}</strong> menjadi <strong>Mantan Warga</strong>. Data ini tidak akan terhapus permanen dari database.</p>
              </div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Alasan Mutasi/Pindah <span className="text-red-500">*</span></label>
              <textarea required rows="3" placeholder="Contoh: Pindah domisili ke luar kota..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"></textarea>
            </div> 
            
            <div className="bg-gray-50 p-5 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
              <button type="button" onClick={() => setShowModal({...showModal, delete: false})} className="w-full sm:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-sm transition-all">Batal</button>
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">Pindahkan ke Mantan Warga</button>
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
              
              {/* Icon Container based on Type */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-sm shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-sm shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-sm shadow-green-100' :
                'bg-blue-50 text-blue-500 shadow-sm shadow-blue-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <button
                onClick={closeAlert}
                className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                  alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                  alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                  'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}