import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function ManajemenUsulanView({ 
  setActiveView, 
  usulanMasuk, 
  fetchUsulan 
}) {
  const supabase = getSupabaseClient();
  
  // ==========================================
  // STATE LOKAL (Manajemen Usulan)
  // ==========================================
  const [showUsulanModal, setShowUsulanModal] = useState(false);
  const [selectedUsulan, setSelectedUsulan] = useState(null);
  const [tindakLanjutData, setTindakLanjutData] = useState({ status: '', catatan_rt: '' });
  const [fotoTindakLanjut, setFotoTindakLanjut] = useState(null);
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

  const showModal = (config) => {
    setAlertModal({ ...alertModal, ...config, isOpen: true });
  };

  const closeModal = () => {
    if (alertModal.onConfirm) alertModal.onConfirm();
    setAlertModal({ ...alertModal, isOpen: false, onConfirm: null });
  };

  // ==========================================
  // FUNGSI KOMPRES FOTO (Khusus Usulan)
  // ==========================================
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

  // ==========================================
  // FUNGSI UPDATE STATUS USULAN
  // ==========================================
  const simpanTindakLanjut = async (e) => {
    e.preventDefault(); 
    setIsProcessing(true);
    let fotoUrl = selectedUsulan?.foto_tindak_lanjut || null;

    try {
      if (fotoTindakLanjut) {
        const compressedFile = await compressImage(fotoTindakLanjut);
        const fileName = `tindaklanjut_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('usulan').upload(fileName, compressedFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('usulan').getPublicUrl(fileName);
          fotoUrl = data.publicUrl;
        } else {
            throw uploadError;
        }
      }

      const { error } = await supabase.from('usulan_warga').update({
        status: tindakLanjutData.status, 
        catatan_rt: tindakLanjutData.catatan_rt, 
        foto_tindak_lanjut: fotoUrl
      }).eq('id', selectedUsulan.id);

      if (error) throw error;
      
      setShowUsulanModal(false); 
      fetchUsulan(); 
      
      // Tampilkan Modal Sukses
      showModal({ 
        type: 'success', 
        title: 'Berhasil Diperbarui', 
        message: 'Status dan tindak lanjut usulan warga telah berhasil disimpan ke database.', 
        confirmText: 'OK' 
      });
      
    } catch (error) {
      // Tampilkan Modal Error
      showModal({ 
        type: 'error', 
        title: 'Gagal Memperbarui', 
        message: `Terjadi kesalahan saat menyimpan data: ${error.message}`, 
        confirmText: 'Tutup' 
      });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden relative">
      
      {/* HEADER ACTION */}
      <div className="flex justify-start">
        <button onClick={() => setActiveView('menu')} className="text-sm text-purple-700 font-bold hover:underline bg-purple-50 hover:bg-purple-100 transition-colors px-5 py-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Menu Utama
        </button>
      </div>
      
      {/* KOTAK MASUK USULAN CONTAINER */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
        
        {/* HEADER GRADIENT UNGU */}
        <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-5 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Manajemen Usulan Warga</h2>
            <p className="text-purple-100 text-xs font-medium mt-0.5">Tinjau, evaluasi, dan kelola aspirasi pembangunan dari warga.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="py-4 px-5 font-bold">Tgl Usul</th>
                <th className="py-4 px-5 font-bold">Pengusul</th>
                <th className="py-4 px-5 font-bold">Jenis & Keterangan</th>
                <th className="py-4 px-5 font-bold text-center">Status</th>
                <th className="py-4 px-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {usulanMasuk.map(item => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors align-top group">
                  <td className="py-4 px-5 text-gray-500 font-medium whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <div className="font-bold text-gray-800">{item.nama_pengusul}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 py-0.5 rounded">NIK: {item.nik_pengusul}</div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-black tracking-wide text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{item.jenis_usulan}</span>
                    
                    {item.jenis_usulan === 'Pembangunan' && (
                       <div className="text-[11px] bg-gray-50 p-2.5 rounded-lg mt-2 border border-gray-200 font-mono text-gray-700 shadow-sm">
                         <span className="text-purple-600 font-bold">Dimensi:</span> {item.panjang}m x {item.lebar}m x {item.tinggi}m | <span className="text-purple-600 font-bold">Luas:</span> {item.luas}m²<br/>
                         <span className="text-green-600 font-bold">Est. Harga:</span> Rp {Number(item.estimasi_harga).toLocaleString('id-ID')}
                       </div>
                    )}
                    
                    <p className="mt-2.5 text-gray-600 text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-purple-200 pl-2.5">{item.keterangan}</p>
                    
                    {item.foto_usulan && item.foto_usulan.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {item.foto_usulan.map((foto, idx) => ( 
                          <a key={idx} href={foto} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-gray-50 hover:text-purple-600 transition-colors shadow-sm">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Foto {idx+1}
                          </a> 
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-5 text-center align-middle whitespace-nowrap">
                    <span className={`inline-flex text-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                      item.status === 'Telah Ditindaklanjuti' ? 'bg-green-50 text-green-700 border-green-200' : 
                      item.status === 'Disetujui' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      item.status === 'Ditolak' ? 'bg-red-50 text-red-700 border-red-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center align-middle">
                    <button onClick={() => { 
                      setSelectedUsulan(item); 
                      setTindakLanjutData({ status: item.status, catatan_rt: item.catatan_rt || '' }); 
                      setFotoTindakLanjut(null); 
                      setShowUsulanModal(true); 
                    }} className="bg-purple-100 hover:bg-purple-600 text-purple-700 hover:text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 w-full whitespace-nowrap">
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
              {usulanMasuk.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100">
                      <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <p className="text-gray-600 font-semibold text-base">Belum ada usulan masuk dari warga.</p>
                    <p className="text-sm text-gray-400 mt-1">Aspirasi warga akan otomatis muncul di tabel ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL TINDAK LANJUT USULAN                   */}
      {/* ========================================== */}
      {showUsulanModal && selectedUsulan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <form onSubmit={simpanTindakLanjut} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </div>
              <h2 className="text-xl font-black">Update Tindak Lanjut</h2>
            </div>
            
            <div className="p-7 overflow-y-auto space-y-5 bg-gray-50/50 flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ubah Status Usulan <span className="text-red-500">*</span></label>
                <select required value={tindakLanjutData.status} onChange={(e) => setTindakLanjutData({...tindakLanjutData, status: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-purple-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-gray-700">
                  <option value="Menunggu Tinjauan RT">Menunggu Tinjauan RT</option>
                  <option value="On Proses Pengajuan Musrenbang">On Proses Pengajuan Musrenbang</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                  <option value="Telah Ditindaklanjuti">Telah Ditindaklanjuti</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Catatan / Keterangan RT</label>
                <textarea rows="3" value={tindakLanjutData.catatan_rt} onChange={(e) => setTindakLanjutData({...tindakLanjutData, catatan_rt: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-purple-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="Tambahkan catatan opsional jika diperlukan..."></textarea>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 mb-2">Upload Foto Tindak Lanjut <span className="text-gray-400 font-normal">(Opsional)</span></label>
                <input type="file" accept="image/*" onChange={(e) => setFotoTindakLanjut(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-all cursor-pointer" />
                <p className="text-[11px] text-gray-400 mt-2 font-medium">Foto akan otomatis dikompres max 100kb untuk menghemat penyimpanan.</p>
                {selectedUsulan.foto_tindak_lanjut && !fotoTindakLanjut && ( 
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span className="text-xs text-green-700 font-bold">Sudah ada foto tersimpan.</span>
                  </div> 
                )}
              </div>
            </div>
            
            <div className="p-5 border-t bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
              <button type="button" onClick={() => setShowUsulanModal(false)} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95 text-sm">Batal</button>
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-95 text-sm flex justify-center items-center gap-2">
                {isProcessing && <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isProcessing ? 'Menyimpan...' : 'Simpan Update'}
              </button>
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
              
              {/* ICON RENDERER */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 ${
                alertModal.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-100' :
                alertModal.type === 'warning' ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
                alertModal.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-100' :
                'bg-purple-50 text-purple-600 shadow-purple-100'
              }`}>
                {alertModal.type === 'error' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>}
                {alertModal.type === 'warning' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
                {alertModal.type === 'success' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                {alertModal.type === 'info' && <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">{alertModal.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-8 px-2">{alertModal.message}</p>
              
              <button
                onClick={closeModal}
                className={`w-full py-4 px-6 rounded-2xl text-white font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                  alertModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                  alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                  'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                }`}
              >
                {alertModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}