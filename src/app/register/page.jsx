"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [nik, setNik] = useState('');
  const [formData, setFormData] = useState({
    nama: '', tanggal_lahir: '', no_hp: '', email: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // TAMBAHAN STATE UNTUK MODAL:
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Tahap 1: Cek NIK
  const handleCheckNIK = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // Cek di tabel referensi RT
    const { data: masterData, error } = await supabase
      .from('master_warga')
      .select('is_registered')
      .eq('nik', nik)
      .single();

    setIsLoading(false);

    if (error || !masterData) {
      setErrorMsg("NIK tidak ditemukan. Anda bukan warga RT ini.");
      return;
    }

    if (masterData.is_registered) {
      setErrorMsg("NIK ini sudah memiliki akun. Silakan menuju halaman Login.");
      return;
    }

    if (error) {
       alert("Error dari Supabase: " + error.message);
    }

    // Lolos pengecekan, lanjut ke form pengisian data
    setStep(2);
  };

  // Tahap 2: Submit Pendaftaran
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // 1. Daftarkan ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      setIsLoading(false);
      return;
    }

    // 2. Simpan data detail ke tabel profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          nik: nik,
          nama: formData.nama,
          tanggal_lahir: formData.tanggal_lahir,
          no_hp: formData.no_hp,
          email: formData.email
        }
      ]);

    if (profileError) {
      setErrorMsg("Gagal menyimpan profil: " + profileError.message);
      setIsLoading(false);
      return;
    }

    // 3. Update status master_warga
    await supabase.from('master_warga').update({ is_registered: true }).eq('nik', nik);

    setIsLoading(false);
    
    // TAMPILKAN MODAL BUKAN ALERT
    setShowSuccessModal(true);
    setTimeout(() => {
      router.push('/login');
    }, 2500); // Jeda 2.5 detik lalu ke halaman login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative">
      
      {/* MODAL SUKSES DAFTAR */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center transform transition-all scale-100 opacity-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Pendaftaran Berhasil!</h3>
            <p className="text-gray-600 mb-4">Akun warga Anda telah berhasil dibuat.</p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Mengarahkan ke halaman login...</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {step === 1 ? (
          <form onSubmit={handleCheckNIK} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Daftar Akun Warga RT</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor Induk Kependudukan (NIK)</label>
              <input 
                type="text" 
                placeholder="Masukkan 16 digit NIK" 
                value={nik} 
                onChange={(e) => setNik(e.target.value)} 
                required 
                className="mt-1 w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? 'Mengecek...' : 'Cek NIK'}
            </button>
            <p className="text-center text-sm mt-4">
              Sudah punya akun? <a href="/login" className="text-blue-600 hover:underline">Login di sini</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Lengkapi Data Diri</h2>
            
            <input 
              type="text" 
              value={nik} 
              disabled 
              className="w-full px-4 py-2 border rounded-md bg-gray-100 cursor-not-allowed" 
            />
            
            <input 
              type="text" 
              placeholder="Nama Lengkap" 
              onChange={(e) => setFormData({...formData, nama: e.target.value})} 
              required 
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500"
            />
            
            <input 
              type="date" 
              onChange={(e) => setFormData({...formData, tanggal_lahir: e.target.value})} 
              required 
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500"
            />
            
            <input 
              type="tel" 
              placeholder="No Handphone Aktif" 
              onChange={(e) => setFormData({...formData, no_hp: e.target.value})} 
              required 
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500"
            />
            
            <input 
              type="email" 
              placeholder="Alamat Email Aktif" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500"
            />
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Buat Password" 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required 
                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Tutup" : "Intip"}
              </button>
            </div>

            {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}