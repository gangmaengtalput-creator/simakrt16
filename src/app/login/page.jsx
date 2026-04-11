"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State untuk UI
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // 1. Cari email berdasarkan NIK
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('nik', nik)
      .single();

    if (profileError || !profile) {
      setErrorMsg("NIK tidak terdaftar. Silakan daftar terlebih dahulu.");
      setIsLoading(false);
      return;
    }

    // 2. Login ke Supabase Auth
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (error) {
      setErrorMsg("Password yang Anda masukkan salah.");
      setIsLoading(false);
    } else {
      // 3. Cari Role User
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      // 4. Tampilkan Modal Sukses & Loading
      setIsLoading(false);
      setShowSuccessModal(true);
      
      // Jeda 2 detik sebelum pindah halaman agar animasi terlihat
      setTimeout(() => {
        if (userProfile?.role === 'ketua_rt') {
          router.push('/dashboard/ketua');
        } else {
          router.push('/dashboard/warga');
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      
      {/* --- MODAL SUKSES & LOADING --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center transform transition-all scale-100 opacity-100">
            {/* Ikon Centang Hijau */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Login Berhasil!</h3>
            
            {/* Animasi Spinner */}
            <div className="flex items-center space-x-2 mt-4 text-gray-600">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Mengarahkan ke dasbor...</span>
            </div>
          </div>
        </div>
      )}
      {/* ----------------------------- */}

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Masuk Akun</h2>
            <p className="mt-2 text-sm text-gray-500">Silakan login untuk mengakses layanan RT</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700">Nomor Induk Kependudukan</label>
            <input 
              type="text" 
              placeholder="Masukkan NIK Anda" 
              value={nik} 
              onChange={(e) => setNik(e.target.value)} 
              required 
              className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mt-2">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <a href="/lupa-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">Lupa Password?</a>
            </div>
            <div className="relative mt-2">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Masukkan Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Tutup" : "Intip"}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm">
              <p>{errorMsg}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Login'}
          </button>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Warga baru? <a href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">Daftar sekarang</a>
          </p>
        </form>
      </div>
    </div>
  );
}