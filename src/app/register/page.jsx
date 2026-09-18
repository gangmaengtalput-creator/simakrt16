"use client";

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [step, setStep] = useState(1);
  const [nik, setNik] = useState('');
  const [formData, setFormData] = useState({
    nama: '', tanggal_lahir: '', no_hp: '', email: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ==========================================
  // STATE KEAMANAN: Proteksi Anti-Enumerasi NIK
  // ==========================================
  const [failedChecks, setFailedChecks] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownTimer, setLockdownTimer] = useState(0);

  useEffect(() => {
    const lockedUntil = localStorage.getItem('register_lockout_time');
    const savedAttempts = localStorage.getItem('register_failed_checks');
    
    if (savedAttempts) setFailedChecks(parseInt(savedAttempts));

    if (lockedUntil) {
      const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setIsLocked(true);
        setLockdownTimer(remainingTime);
      } else {
        localStorage.removeItem('register_lockout_time');
        localStorage.removeItem('register_failed_checks');
        setFailedChecks(0);
      }
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isLocked && lockdownTimer > 0) {
      timer = setInterval(() => setLockdownTimer((prev) => prev - 1), 1000);
    } else if (isLocked && lockdownTimer === 0) {
      setIsLocked(false);
      setFailedChecks(0);
      setErrorMsg('');
      localStorage.removeItem('register_lockout_time');
      localStorage.removeItem('register_failed_checks');
    }
    return () => clearInterval(timer);
  }, [isLocked, lockdownTimer]);

  const handleNikChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 16) setNik(onlyNumbers);
  };

  const handlePhoneChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, no_hp: onlyNumbers });
  };

  const handleFailedNikCheck = (msg) => {
    const newAttempts = failedChecks + 1;
    setFailedChecks(newAttempts);
    localStorage.setItem('register_failed_checks', newAttempts.toString());

    if (newAttempts >= 5) {
      setIsLocked(true);
      setLockdownTimer(60);
      localStorage.setItem('register_lockout_time', (Date.now() + 60000).toString());
      setErrorMsg("Terlalu banyak percobaan pencarian. Silakan tunggu 60 detik.");
    } else {
      setErrorMsg(msg);
    }
    setIsLoading(false);
  };

  // ==========================================
  // TAHAP 1: CEK NIK & AMBIL DATA DIRI WARGA
  // ==========================================
  const handleCheckNIK = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setErrorMsg('');

    if (nik.length !== 16) {
      setErrorMsg("NIK harus terdiri dari tepat 16 digit angka.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: masterData, error } = await supabase
        .from('master_warga')
        .select('is_registered, nama, tgl_lahir')
        .eq('nik', nik)
        .single();

      if (error || !masterData) {
        handleFailedNikCheck("NIK tidak ditemukan. Anda bukan warga RT kami.");
        return;
      }

      if (masterData.is_registered) {
        setErrorMsg("NIK ini sudah memiliki akun. Silakan menuju halaman Login.");
        setIsLoading(false);
        return;
      }

      setFailedChecks(0);
      localStorage.removeItem('register_failed_checks');

      setFormData({
        ...formData,
        nama: masterData.nama || '',
        tanggal_lahir: masterData.tgl_lahir ? String(masterData.tgl_lahir).split('T')[0] : ''
      });
      setStep(2);
      setIsLoading(false);

    } catch (err) {
      setErrorMsg("Terjadi kesalahan pada server. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  // ==========================================
  // TAHAP 2: PROSES PENDAFTARAN & NOTIFIKASI
  // ==========================================
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 8) {
      setErrorMsg("Password terlalu lemah. Gunakan minimal 8 karakter demi keamanan.");
      return;
    }
    if (formData.no_hp.length < 9) {
      setErrorMsg("Nomor HP tidak valid. Harap periksa kembali.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Buat User di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
           throw new Error("Email ini sudah digunakan. Silakan gunakan email lain.");
        }
        throw authError;
      }

      // 2. Simpan Kelengkapan Data ke tabel profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          nik: nik,
          nama: formData.nama,
          tanggal_lahir: formData.tanggal_lahir,
          no_hp: formData.no_hp,
          email: formData.email,
          role: 'warga',
          status: 'pending' 
        }]);

      if (profileError) throw profileError;

      // 3. Update status is_registered di master_warga
      const { error: updateError } = await supabase
        .from('master_warga')
        .update({ is_registered: true })
        .eq('nik', nik);

      if (updateError) throw updateError;

      // 🚨 EKSEKUSI API NOTIFIKASI REGISTRASI KE KETUA RT
      try {
        const notifResponse = await fetch('/api/notify-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: formData.nama,
            nik: nik,
            no_hp: formData.no_hp,
            email: formData.email
          })
        });
        
        if (!notifResponse.ok) {
          console.warn("Gagal mengirim email ke Ketua RT. Server merespon dengan status:", notifResponse.status);
        }
      } catch (notifErr) {
        console.error("Gagal mengeksekusi API Notifikasi (Mungkin masalah jaringan/CORS):", notifErr);
      }

      // Pendaftaran Berhasil
      setShowSuccessModal(true);

    } catch (error) {
      setErrorMsg(error.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 relative overflow-hidden font-sans py-10">
      
      {/* BACKGROUND DECORATION MEWAH DENGAN WARGA BIRU */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* KARTU FORM REGISTRASI ELEGANT */}
      <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[500px] border border-white/50 relative z-10 transition-all duration-500">
        
        <div className="text-center mb-8">
          {/* LOGO MAENG */}
          <div className="flex items-center justify-center mx-auto mb-6">
            <img 
              src="/logo-maeng.png" 
              alt="Logo SIMAK RT Maeng" 
              className="w-24 h-auto object-contain drop-shadow-md" 
            />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Registrasi Warga</h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">Buat akun untuk akses layanan mandiri SIMAK RT</p>
        </div>

        {/* TAMPILAN TAHAP 1: INPUT NIK */}
        {step === 1 && (
          <form onSubmit={handleCheckNIK} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl mb-6">
              <p className="text-xs text-blue-800 font-bold leading-relaxed flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Langkah 1: Masukkan Nomor Induk Kependudukan (NIK) Anda untuk memverifikasi data di sistem RT.16.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-left">Nomor Induk Kependudukan</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                </div>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="16 Digit NIK" 
                  value={nik}
                  onChange={handleNikChange} 
                  required 
                  disabled={isLocked || isLoading}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-800 text-lg font-bold tracking-widest outline-none disabled:bg-gray-100 disabled:opacity-60 transition-all bg-gray-50 focus:bg-white"
                />
              </div>
              {nik.length > 0 && nik.length < 16 && (
                <p className="mt-1.5 text-[10px] text-amber-500 font-bold tracking-wide uppercase text-right">
                  {nik.length} dari 16 digit
                </p>
              )}
            </div>

            {errorMsg && (
              <div className={`p-4 rounded-xl text-sm font-medium border ${isLocked ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                <div className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <div>
                    <p>{errorMsg}</p>
                    {isLocked && <p className="mt-1.5 font-bold">Sisa waktu tunggu: <span className="text-red-600">{lockdownTimer}</span> detik</p>}
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || isLocked}
              className={`w-full mt-4 py-4 px-4 rounded-xl shadow-[0_8px_20px_rgb(37,99,235,0.2)] text-base font-black text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                isLoading || isLocked ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-[0_8px_25px_rgb(37,99,235,0.4)]'
              }`}
            >
              {isLoading ? (
                <><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memeriksa Database...</>
              ) : isLocked ? 'Terkunci Sementara' : 'Cek NIK Saya'}
            </button>
          </form>
        )}

        {/* TAMPILAN TAHAP 2: LENGKAPI DATA */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-6">
              <p className="text-xs text-blue-800 font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                NIK Terverifikasi! Silakan lengkapi formulir pendaftaran di bawah ini.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">NIK Kependudukan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>
                  <input type="text" value={nik} disabled className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm cursor-not-allowed" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tanggal Lahir</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                  <input type="text" value={formData.tanggal_lahir} disabled className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nama Sesuai KK</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>
                <input type="text" value={formData.nama} disabled className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm cursor-not-allowed uppercase" />
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nomor WhatsApp / HP <span className="text-blue-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg></div>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Contoh: 08123456789" 
                  value={formData.no_hp}
                  onChange={handlePhoneChange} 
                  required 
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-800 outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Alamat Email Aktif <span className="text-blue-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                <input 
                  type="email" 
                  placeholder="email@contoh.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-800 outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Buat Kata Sandi <span className="text-blue-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Minimal 8 karakter" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required 
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-800 outline-none transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.391 5.302 9.26 1 15.75 1c3.24 0 6.21 1.05 8.64 2.822a1.012 1.012 0 010 .644C20.609 18.698 14.74 23 9.25 23c-3.24 0-6.21-1.05-8.64-2.822z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 mt-2">
                <div className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-5">
              <button 
                type="button" 
                onClick={() => { setStep(1); setFormData({nama: '', tanggal_lahir: '', no_hp: '', email: '', password: ''}); }}
                className="w-1/3 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
              >
                Kembali
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-2/3 bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-[0_8px_20px_rgb(37,99,235,0.2)] hover:shadow-[0_8px_25px_rgb(37,99,235,0.4)] active:scale-95 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memproses...</>
                ) : 'Buat Akun Saya'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button onClick={() => router.push('/login')} className="text-gray-500 font-medium text-sm hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Sudah punya akun? <span className="font-bold">Kembali ke Halaman Login</span>
          </button>
        </div>
      </div>

      {/* MODAL SUKSES REGISTRASI (GLASSMORPHISM) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 mb-6 shadow-lg shadow-blue-500/40 rotate-3">
              <svg className="h-10 w-10 text-white -rotate-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Registrasi Berhasil!</h3>
            <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">Pendaftaran berhasil dikirim. Akun Anda sedang menunggu persetujuan (ACC) dari Ketua RT. Anda akan menerima Notifikasi melalui Email jika telah disetujui.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gray-900 text-white font-bold rounded-xl px-6 py-4 hover:bg-black shadow-[0_8px_20px_rgb(0,0,0,0.15)] transition-all active:scale-95"
            >
              Menuju Halaman Login
            </button>
          </div>
        </div>
      )}

      {/* COPYRIGHT */}
      <div className="absolute bottom-6 text-center w-full text-xs text-gray-400/60 font-medium pointer-events-none">
        &copy; {new Date().getFullYear()} SIMAK RT. Hak Cipta Dilindungi.
      </div>
    </div>
  );
}