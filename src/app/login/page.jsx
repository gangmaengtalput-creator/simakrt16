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
        console.error("DETAIL ERROR ROLE SUPABASE:", roleError); 
        throw new Error(`Supabase Error: ${roleError.message}`); 
      }

      setIsLoading(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        // 1. Hapus sisa cookie auto-logout agar tidak menjebak Middleware
        document.cookie = "last_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // 2. Gunakan Hard Redirect alih-alih router.push
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
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION MEWAH */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* MODAL SUCCESS LOGIN */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 max-w-sm w-full mx-4 border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/40 rotate-3">
              <svg className="w-10 h-10 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Akses Diberikan!</h3>
            <div className="flex items-center space-x-3 mt-4 text-gray-600 font-medium bg-gray-50 px-4 py-2 rounded-xl">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Mengarahkan ke dasbor...</span>
            </div>
          </div>
        </div>
      )}

      {/* KARTU FORM LOGIN ELEGANT */}
      <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[440px] border border-white/50 relative z-10">
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 rotate-3">
              <svg className="w-8 h-8 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Selamat Datang</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">Masuk untuk mengakses portal SIMAK RT</p>
          </div>
          
          <div className="space-y-5">
            {/* INPUT NIK */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nomor Induk Kependudukan</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                </div>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  pattern="[0-9]*"     
                  placeholder="16 Digit NIK" 
                  value={nik} 
                  onChange={handleNikChange} 
                  required 
                  maxLength={16}
                  autoComplete="off"
                  disabled={isLocked || isLoading}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:opacity-60 transition-all"
                />
              </div>
              {nik.length > 0 && nik.length < 16 && (
                <p className="mt-1.5 text-[10px] text-amber-500 font-bold tracking-wide uppercase">
                  {nik.length} dari 16 digit dimasukkan
                </p>
              )}
            </div>
            
            {/* INPUT PASSWORD */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Kata Sandi</label>
                <a href="/lupa-password" className="text-xs font-bold text-blue-600 hover:text-indigo-600 transition-colors">Lupa Sandi?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Masukkan Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLocked || isLoading}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:opacity-60 transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked || isLoading}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.391 5.302 9.26 1 15.75 1c3.24 0 6.21 1.05 8.64 2.822a1.012 1.012 0 010 .644C20.609 18.698 14.74 23 9.25 23c-3.24 0-6.21-1.05-8.64-2.822z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ALERT MESSAGES */}
          {errorMsg && (
            <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in duration-300 border ${
              isLocked || errorMsg.includes('diverifikasi') 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <div>
                  <p>{errorMsg}</p>
                  {isLocked && <p className="mt-1.5 font-bold">Coba lagi dalam <span className="text-red-600 text-lg">{lockdownTimer}</span> detik.</p>}
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            disabled={isLoading || isLocked}
            className={`w-full py-4 px-4 rounded-xl shadow-[0_8px_20px_rgb(59,130,246,0.2)] text-base font-black text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
              isLoading || isLocked ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-[0_8px_25px_rgb(59,130,246,0.4)]'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memproses...
              </>
            ) : isLocked ? 'Terkunci Sementara' : 'Masuk Portal'}
          </button>
          
          <p className="text-center text-sm text-gray-500 mt-6 font-medium">
            belum punya akun? <a href="/register" className="font-bold text-blue-600 hover:text-indigo-600 transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-blue-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">Daftar sekarang</a>
          </p>
        </form>
      </div>

      <div className="absolute bottom-6 text-center text-xs text-gray-500/50 font-medium">
        &copy; {new Date().getFullYear()} SIMAK RT. Hak Cipta Dilindungi.
      </div>
    </div>
  );
}