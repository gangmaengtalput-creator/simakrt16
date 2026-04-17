// File: src/app/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Sesuaikan jalurnya jika berbeda
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State untuk UI & Keamanan
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // State untuk Proteksi Brute-Force
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownTimer, setLockdownTimer] = useState(0);

  // Cek localStorage saat komponen dimuat (Mencegah bypass dengan refresh)
  useEffect(() => {
    const checkLockout = () => {
      const lockUntil = localStorage.getItem('lockUntil');
      const savedAttempts = localStorage.getItem('failedAttempts');
      
      if (savedAttempts) setFailedAttempts(parseInt(savedAttempts));

      if (lockUntil) {
        const timeRemaining = Math.ceil((parseInt(lockUntil) - Date.now()) / 1000);
        if (timeRemaining > 0) {
          setIsLocked(true);
          setLockdownTimer(timeRemaining);
          setErrorMsg(`Terlalu banyak percobaan gagal. Silakan tunggu.`);
        } else {
          // Waktu lockout habis, bersihkan storage
          resetLockout();
        }
      }
    };
    checkLockout();
  }, []);

  // Timer untuk hitung mundur
  useEffect(() => {
    let timer;
    if (isLocked && lockdownTimer > 0) {
      timer = setInterval(() => setLockdownTimer((prev) => prev - 1), 1000);
    } else if (isLocked && lockdownTimer === 0) {
      resetLockout();
    }
    return () => clearInterval(timer);
  }, [isLocked, lockdownTimer]);

  const resetLockout = () => {
    setIsLocked(false);
    setFailedAttempts(0);
    setErrorMsg('');
    localStorage.removeItem('lockUntil');
    localStorage.removeItem('failedAttempts');
  };

  // Handler untuk input NIK (Hanya Angka & Maks 16 Digit)
  const handleNikChange = (e) => {
    // Menghapus semua karakter selain angka 0-9
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 16) {
      setNik(onlyNumbers);
    }
  };

  // Fungsi untuk mencatat kegagalan login
  const handleFailedLogin = (message) => {
    setErrorMsg(message);
    setIsLoading(false);
    
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    localStorage.setItem('failedAttempts', newAttempts.toString());
    
    if (newAttempts >= 3) {
      const lockDuration = 30; // Kunci selama 30 detik
      const lockEndTime = Date.now() + (lockDuration * 1000);
      
      localStorage.setItem('lockUntil', lockEndTime.toString());
      setIsLocked(true);
      setLockdownTimer(lockDuration);
      setErrorMsg(`Terlalu banyak percobaan gagal. Silakan tunggu ${lockDuration} detik.`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLocked) return;

    // 1. Validasi Panjang NIK
    if (nik.length !== 16) {
      setErrorMsg(`NIK harus tepat 16 digit angka (Saat ini: ${nik.length} digit).`);
      return;
    }
    
    // Validasi input password untuk mencegah payload panjang/berbahaya
    if (password.trim() === '' || password.length > 100) {
      setErrorMsg("NIK atau Password yang Anda masukkan salah."); 
      return;
    }

    setIsLoading(true);

    try {
      // 2. Cari email berdasarkan NIK
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('nik', nik)
        .single();

      if (profileError || !profile) {
        // Keamanan: Gunakan pesan error ambigu
        handleFailedLogin("NIK atau Password yang Anda masukkan salah.");
        return;
      }

      // 3. Login ke Supabase Auth
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (error) {
        // Keamanan: Gunakan pesan error ambigu
        handleFailedLogin("NIK atau Password yang Anda masukkan salah.");
        return;
      }

      // Reset failed attempts jika login berhasil
      resetLockout();

      // 4. Cari Role User
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      // 5. Tampilkan Modal Sukses & Loading
      setIsLoading(false);
      setShowSuccessModal(true);
      
      // Jeda 2 detik sebelum pindah halaman agar animasi terlihat
      setTimeout(() => {
        router.refresh(); 
        if (userProfile?.role === 'ketua_rt') {
          router.push('/dashboard/ketua');
        } else {
          router.push('/dashboard/warga');
        }
      }, 2000);

    } catch (err) {
      console.error("Login Error:", err);
      setErrorMsg("Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.");
      setIsLoading(false);
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
            <label className="block text-sm font-semibold text-gray-700">Nomor Induk Kependudukan (NIK)</label>
            <input 
              type="text" 
              placeholder="Masukkan 16 Digit NIK" 
              value={nik} 
              onChange={handleNikChange} 
              required 
              maxLength={16}
              autoComplete="off"
              disabled={isLocked}
              className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100"
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
                disabled={isLocked}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12 disabled:bg-gray-100" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 focus:outline-none transition-colors disabled:opacity-50"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Menampilkan Error atau Peringatan Lockout */}
          {errorMsg && (
            <div className={`p-3 border-l-4 rounded text-sm ${isLocked ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
              <p className="font-medium">{errorMsg}</p>
              {isLocked && <p className="mt-1">Coba lagi dalam <strong>{lockdownTimer}</strong> detik.</p>}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || isLocked}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
              isLoading || isLocked 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isLocked ? 'Terkunci sementara' : 'Login'}
          </button>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Warga RT 16, tapi belum punya akun buat login? <a href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">Daftar sekarang</a>
          </p>
        </form>
      </div>
    </div>
  );
}