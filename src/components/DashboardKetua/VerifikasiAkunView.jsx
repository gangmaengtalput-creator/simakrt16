// File: src/components/DashboardKetua/VerifikasiAkunView.jsx
import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export default function VerifikasiAkunView({ setActiveView, akunPending, fetchAkunPending }) {
  const supabase = getSupabaseClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fungsi untuk ACC (Terima) Akun
  const handleAcc = async (akun) => {
    if (!window.confirm(`Yakin ingin mengaktifkan akun ${akun.email}?`)) return;
    setIsProcessing(true);
    
    try {
      // 1. Update status di database menjadi aktif
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'aktif' })
        .eq('id', akun.id);

      if (error) throw error;

      // 2. 🚨 Kirim Notifikasi Email ke Warga (Berjalan di Background)
      try {
        fetch('/api/notify-acc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: akun.email, 
            nama: akun.nama // Mengirim nama agar email lebih personal
          })
        }).catch(err => console.error("Gagal kirim email ACC:", err));
      } catch (notifErr) {
        console.error("Gagal mengeksekusi API Notifikasi ACC:", notifErr);
      }

      alert("✅ Akun berhasil di-ACC dan warga sudah bisa login. Notifikasi email telah dikirim.");
      fetchAkunPending(); // Segarkan data tabel
    } catch (err) {
      console.error("Gagal ACC:", err);
      alert("Gagal mengaktifkan akun: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Fungsi untuk Tolak Akun
  const handleTolak = async (akun) => {
    if (!window.confirm(`Yakin ingin menolak pendaftaran akun ${akun.email}?`)) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'ditolak' })
        .eq('id', akun.id);

      if (error) throw error;
      alert("❌ Akun telah ditolak.");
      fetchAkunPending();
    } catch (err) {
      console.error("Gagal tolak:", err);
      alert("Gagal menolak akun: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:hidden animate-fade-in">
      <div className="flex justify-between items-center">
        <button onClick={() => setActiveView('menu')} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-4 py-2 rounded-lg">
          &larr; Kembali ke Menu Utama
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-yellow-500">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Verifikasi Pendaftaran Akun Baru</h2>
        <p className="text-sm text-gray-600 mb-6">Daftar warga yang melakukan registrasi dan menunggu persetujuan Ketua RT untuk bisa login.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b-2">
                <th className="py-3 px-4 font-bold">Email Pendaftar</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {akunPending.map((akun) => (
                <tr key={akun.id} className="hover:bg-yellow-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-800">{akun.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Menunggu ACC
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleAcc(akun)}
                        disabled={isProcessing}
                        className="bg-green-100 text-green-700 px-4 py-1.5 rounded font-bold hover:bg-green-200 transition shadow-sm"
                      >
                        ✓ ACC
                      </button>
                      <button 
                        onClick={() => handleTolak(akun)}
                        disabled={isProcessing}
                        className="bg-red-100 text-red-700 px-4 py-1.5 rounded font-bold hover:bg-red-200 transition shadow-sm"
                      >
                        ✗ Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {akunPending.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-500 italic">
                    Tidak ada pendaftaran akun baru yang menunggu verifikasi saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}