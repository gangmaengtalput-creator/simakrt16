// File: src/app/login/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient'; 
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownTimer, setLockdownTimer] = useState(0);

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
          resetLockout();
        }
      }
    };
    checkLockout();
  }, []);

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

  const handleNikChange = (e) => {
    // Memastikan hanya angka yang bisa masuk (mencegah huruf/symbol/syntax)
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    
    // Validasi maksimal 16 digit
    if (onlyNumbers.length <= 16) {
      setNik(onlyNumbers);
      
      // Hapus pesan error jika user sedang mengetik untuk memperbaiki panjang NIK
      if (errorMsg.includes("16 digit")) {
        setErrorMsg('');
      }
    }
  };

  const handleFailedLogin = (message) => {
    setErrorMsg(message);
    setIsLoading(false);
    
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    localStorage.setItem('failedAttempts', newAttempts.toString());
    
    if (newAttempts >= 3) {
      const lockDuration = 30; 
      const lockEndTime = Date.now() + (lockDuration * 1000);
      
      localStorage.setItem('lockUntil', lockEndTime.toString());
      setIsLocked(true);
      setLockdownTimer(lockDuration);
      setErrorMsg(`Terlalu banyak percobaan. Silakan tunggu ${lockDuration} detik.`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isLocked) return;

    // Validasi pemberitahuan jika kurang dari 16 digit
    if (nik.length < 16) {
      setErrorMsg(`NIK tidak valid. Harus tepat 16 digit (Anda baru memasukkan ${nik.length} digit).`);
      return;
    }
    
    if (password.trim() === '') {
      setErrorMsg("Password tidak boleh kosong."); 
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase) throw new Error("Koneksi ke database gagal.");

      const { data: profileData, error: profileError } = await supabase
        .rpc('get_login_info_by_nik', { input_nik: nik });

      if (profileError || !profileData || profileData.length === 0) {
        handleFailedLogin("NIK Anda belum terdaftar di sistem kami.");
        return;
      }

      const profile = profileData[0];

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (authError) {
        handleFailedLogin("Password yang Anda masukkan salah.");
        return;
      }

      if (profile.status === 'pending') {
        await supabase.auth.signOut(); 
        setErrorMsg("Akun Anda sedang diverifikasi oleh Ketua RT. Harap bersabar.");
        setIsLoading(false);
        return;
      }

      resetLockout();

      const { data: userProfile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (roleError) {
        // Ini akan mencetak error aslinya ke terminal / console browser Anda
        console.error("DETAIL ERROR ROLE SUPABASE:", roleError); 
        
        // Menampilkan pesan error asli ke layar agar Anda bisa membacanya
        throw new Error(`Supabase Error: ${roleError.message}`); 
      }

      setIsLoading(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        // 1. Hapus sisa cookie auto-logout agar tidak menjebak Middleware
        document.cookie = "last_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // 2. Gunakan Hard Redirect alih-alih router.push
        // Ini memastikan state halaman benar-benar di-reset dan tidak nyangkut
        if (userProfile?.role === 'ketua_rt') {
          window.location.href = '/dashboard/ketua';
        } else {
          window.location.href = '/dashboard/warga';
        }
      }, 2000);

    } catch (err) {
      setErrorMsg(`Error: ${err.message || "Gagal menghubungi server."}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Login Berhasil!</h3>
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
              inputMode="numeric" // Memaksa keyboard angka muncul di mobile
              pattern="[0-9]*"     // Mendukung pemaksaan keyboard angka di iOS
              placeholder="Masukkan 16 Digit NIK" 
              value={nik} 
              onChange={handleNikChange} 
              required 
              maxLength={16}
              autoComplete="off"
              disabled={isLocked || isLoading}
              className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
            />
            {/* Feedback visual instan jika NIK belum lengkap saat diketik */}
            {nik.length > 0 && nik.length < 16 && (
              <p className="mt-1 text-[10px] text-orange-500 font-medium italic">
                {nik.length} dari 16 digit dimasukkan
              </p>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center mt-2">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <a href="/lupa-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">Lupa Password?</a>
            </div>
            <div className="relative mt-2">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Masukkan Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={isLocked || isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12 disabled:bg-gray-100 transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked || isLoading}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.391 5.302 9.26 1 15.75 1c3.24 0 6.21 1.05 8.64 2.822a1.012 1.012 0 010 .644C20.609 18.698 14.74 23 9.25 23c-3.24 0-6.21-1.05-8.64-2.822z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className={`p-3 border-l-4 rounded text-sm ${isLocked || errorMsg.includes('diverifikasi') ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
              <p className="font-medium">{errorMsg}</p>
              {isLocked && <p className="mt-1">Coba lagi dalam <strong>{lockdownTimer}</strong> detik.</p>}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || isLocked}
            className={`w-full py-3 px-4 rounded-lg shadow-sm text-sm font-bold text-white transition-colors ${
              isLoading || isLocked ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Sedang Memproses...' : isLocked ? 'Terkunci sementara' : 'Login'}
          </button>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Belum punya akun? <a href="/register" className="font-semibold text-blue-600 hover:text-blue-500">Daftar sekarang</a>
          </p>
        </form>
      </div>
    </div>
  );
}