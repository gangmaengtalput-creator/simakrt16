"use client";
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function PenggalanganDanaView({ setActiveView, showModal }) {
  const supabase = getSupabaseClient();
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // State loading saat upload & simpan
  
  // State UI
  const [viewMode, setViewMode] = useState('list'); // 'list', 'formAcara', 'formDonatur'
  const [selectedAcaraId, setSelectedAcaraId] = useState(null);

  // Form Data Acara
  const [formData, setFormData] = useState({
    nama_acara: '', banner_url: '', ketua_panitia: '', tanggal_acara: '', deskripsi: ''
  });
  const [kebutuhan, setKebutuhan] = useState([{ nama_kebutuhan: '', estimasi_harga: 0 }]);
  
  // State Khusus File Foto
  const [fotoFile, setFotoFile] = useState(null);

  // Form Data Donatur
  const [donaturData, setDonaturData] = useState({
    nama_donatur: '', jenis_donasi: 'Uang', nominal_uang: 0, deskripsi_barang: ''
  });

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Ambil data penggalangan dana beserta total donasi dan kebutuhan
      const { data: acaraData, error } = await supabase
        .from('penggalangan_dana')
        .select(`
          *,
          kebutuhan_dana (estimasi_harga),
          donatur_penggalangan (nominal_uang)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(acaraData || []);
    } catch (err) {
      showModal("Gagal", "Tidak dapat mengambil data proposal.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLER ACARA & KEBUTUHAN ---
  const handleAddKebutuhan = () => setKebutuhan([...kebutuhan, { nama_kebutuhan: '', estimasi_harga: 0 }]);
  const handleKebutuhanChange = (index, field, value) => {
    const newKebutuhan = [...kebutuhan];
    newKebutuhan[index][field] = value;
    setKebutuhan(newKebutuhan);
  };
  const totalKebutuhan = kebutuhan.reduce((sum, item) => sum + Number(item.estimasi_harga || 0), 0);

  const handleSubmitAcara = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalBannerUrl = formData.banner_url;

      // 1. PROSES UPLOAD FOTO (Jika ada file yang dipilih)
      if (fotoFile) {
        // Buat nama file unik
        const fileExt = fotoFile.name.split('.').pop();
        const fileName = `banner_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        
        // Upload ke bucket bernama 'penggalangan'
        const { error: uploadError } = await supabase.storage
          .from('penggalangan')
          .upload(fileName, fotoFile);

        if (uploadError) {
          throw new Error("Gagal mengunggah foto. Pastikan bucket 'penggalangan' sudah dibuat dan diset ke Public.");
        }

        // Ambil URL Publik dari foto yang diupload
        const { data: publicUrlData } = supabase.storage
          .from('penggalangan')
          .getPublicUrl(fileName);

        finalBannerUrl = publicUrlData.publicUrl;
      }

      // 2. INSERT DATA KE TABEL PENGGALANGAN DANA
      const { data: acara, error: errorAcara } = await supabase
        .from('penggalangan_dana')
        .insert([{ ...formData, banner_url: finalBannerUrl }])
        .select()
        .single();
        
      if (errorAcara) throw errorAcara;

      // 3. INSERT DATA KEBUTUHAN DANA
      const kebutuhanToInsert = kebutuhan.map(k => ({
        penggalangan_id: acara.id,
        nama_kebutuhan: k.nama_kebutuhan,
        estimasi_harga: k.estimasi_harga
      }));
      
      const { error: errorKebutuhan } = await supabase.from('kebutuhan_dana').insert(kebutuhanToInsert);
      if (errorKebutuhan) throw errorKebutuhan;

      showModal('Berhasil', 'Proposal berhasil dibuat!', 'success');
      
      // Reset Form
      setFormData({ nama_acara: '', banner_url: '', ketua_panitia: '', tanggal_acara: '', deskripsi: '' });
      setKebutuhan([{ nama_kebutuhan: '', estimasi_harga: 0 }]);
      setFotoFile(null);
      
      setViewMode('list');
      fetchData();
    } catch (error) {
      showModal('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hapusAcara = async (id) => {
    if(!window.confirm("Yakin ingin menghapus acara ini? Semua data terkait (kebutuhan & donatur) akan terhapus.")) return;
    try {
      const { error } = await supabase.from('penggalangan_dana').delete().eq('id', id);
      if (error) throw error;
      showModal('Berhasil', 'Data berhasil dihapus.', 'success');
      fetchData();
    } catch (error) {
      showModal('Error', error.message, 'error');
    }
  };

  // --- HANDLER DONATUR ---
  const handleBukaFormDonatur = (id) => {
    setSelectedAcaraId(id);
    setDonaturData({ nama_donatur: '', jenis_donasi: 'Uang', nominal_uang: 0, deskripsi_barang: '' });
    setViewMode('formDonatur');
  };

  const handleSubmitDonatur = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('donatur_penggalangan').insert([{
        penggalangan_id: selectedAcaraId,
        ...donaturData
      }]);
      if (error) throw error;

      showModal('Berhasil', 'Donatur berhasil ditambahkan!', 'success');
      setViewMode('list');
      fetchData();
    } catch (error) {
      showModal('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-800">Manajemen Penggalangan Dana</h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveView('menu')} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 font-medium transition">
            Kembali
          </button>
          {viewMode === 'list' && (
            <button onClick={() => setViewMode('formAcara')} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-bold transition shadow-md shadow-blue-200">
              + Buat Proposal
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-center text-gray-500 py-10 animate-pulse">Memuat data...</p>}

      {/* VIEW: LIST PROPOSAL */}
      {!isLoading && viewMode === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b-2 border-gray-200">
                <th className="p-4 font-bold">Nama Acara</th>
                <th className="p-4 font-bold">Tanggal</th>
                <th className="p-4 font-bold">Progres Dana</th>
                <th className="p-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-500">Belum ada proposal penggalangan dana.</td></tr>
              ) : (
                proposals.map((item) => {
                  const req = item.kebutuhan_dana.reduce((sum, k) => sum + Number(k.estimasi_harga), 0);
                  const terkumpul = item.donatur_penggalangan.reduce((sum, d) => sum + Number(d.nominal_uang), 0);
                  const persentase = req === 0 ? 0 : Math.min((terkumpul / req) * 100, 100);

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-800">{item.nama_acara}</td>
                      <td className="p-4 text-sm text-gray-600">{item.tanggal_acara}</td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-gray-700 mb-1">Rp {terkumpul.toLocaleString('id-ID')} / Rp {req.toLocaleString('id-ID')}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${persentase}%` }}></div>
                        </div>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button onClick={() => handleBukaFormDonatur(item.id)} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-200">+ Donatur</button>
                        <button onClick={() => hapusAcara(item.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-200">Hapus</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: FORM ACARA BARU */}
      {viewMode === 'formAcara' && (
        <form onSubmit={handleSubmitAcara} className="space-y-5 bg-gray-50 p-6 rounded-xl border border-gray-100 relative">
          
          {/* OVERLAY LOADING SAAT UPLOAD */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
              <p className="font-bold text-blue-800">Menyimpan & Mengunggah Data...</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Acara</label>
              <input type="text" required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500" value={formData.nama_acara} onChange={e => setFormData({...formData, nama_acara: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Ketua Panitia</label>
              <input type="text" required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500" value={formData.ketua_panitia} onChange={e => setFormData({...formData, ketua_panitia: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Acara</label>
              <input type="date" required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500" value={formData.tanggal_acara} onChange={e => setFormData({...formData, tanggal_acara: e.target.value})} />
            </div>
            
            {/* INPUT FILE UPLOAD DI SINI */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Foto / Banner (Opsional)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  onChange={e => setFotoFile(e.target.files[0])} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4">
            <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Daftar Kebutuhan Dana</h3>
            {kebutuhan.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 mb-3">
                <input type="text" placeholder="Contoh: Pembelian Kursi" required className="flex-1 p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500" value={item.nama_kebutuhan} onChange={e => handleKebutuhanChange(index, 'nama_kebutuhan', e.target.value)} />
                <input type="number" placeholder="Harga (Rp)" required className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500" value={item.estimasi_harga} onChange={e => handleKebutuhanChange(index, 'estimasi_harga', e.target.value)} />
              </div>
            ))}
            <div className="flex justify-between items-center mt-3">
              <button type="button" onClick={handleAddKebutuhan} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">+ Tambah Item</button>
              <div className="font-black text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">Total: Rp {totalKebutuhan.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" disabled={isSubmitting} onClick={() => setViewMode('list')} className="w-1/3 bg-gray-200 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Proposal'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW: FORM TAMBAH DONATUR */}
      {viewMode === 'formDonatur' && (
        <form onSubmit={handleSubmitDonatur} className="max-w-md mx-auto space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100 relative">
          
          {/* OVERLAY LOADING */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Tambah Sponsor / Donatur</h3>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nama Donatur / Hamba Allah</label>
            <input type="text" required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-green-500" value={donaturData.nama_donatur} onChange={e => setDonaturData({...donaturData, nama_donatur: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Donasi</label>
            <select className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-green-500" value={donaturData.jenis_donasi} onChange={e => setDonaturData({...donaturData, jenis_donasi: e.target.value})}>
              <option value="Uang">Uang Tunai / Transfer</option>
              <option value="Barang">Sumbangan Barang</option>
            </select>
          </div>
          
          {donaturData.jenis_donasi === 'Uang' ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nominal (Rp)</label>
              <input type="number" required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-green-500" value={donaturData.nominal_uang} onChange={e => setDonaturData({...donaturData, nominal_uang: e.target.value})} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi Barang</label>
              <textarea required className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-green-500" placeholder="Contoh: 10 Dus Air Mineral" value={donaturData.deskripsi_barang} onChange={e => setDonaturData({...donaturData, deskripsi_barang: e.target.value})}></textarea>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" disabled={isSubmitting} onClick={() => setViewMode('list')} className="w-1/2 bg-gray-200 text-gray-700 p-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-300">Batal</button>
            <button type="submit" disabled={isSubmitting} className="w-1/2 bg-green-500 text-white p-3 rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-200 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}