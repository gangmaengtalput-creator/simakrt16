"use client";

import { useState, useEffect } from 'react';
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
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ==========================================
  // STATE KEAMANAN: Proteksi Anti-Enumerasi NIK
  // ==========================================
  const [failedChecks, setFailedChecks] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockdownTimer, setLockdownTimer] = useState(0);

  // Cek status lockout dari localStorage (Anti-Refresh Bypass)
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

  // Timer untuk sistem Lockout
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

  // Handler Keamanan untuk input NIK (Hanya Angka)
  const handleNikChange = (e) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length <= 16) setNik(onlyNumbers);
  };

  // Handler Keamanan untuk input No HP (Hanya Angka)
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

    // KEAMANAN: Validasi Panjang NIK
    if (nik.length !== 16) {
      setErrorMsg("NIK harus terdiri dari tepat 16 digit angka.");
      return;
    }

    setIsLoading(true);

    try {
      // Cek di tabel referensi RT sekaligus mengambil nama & tanggal lahir
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

      // Reset jejak kegagalan jika NIK valid
      setFailedChecks(0);
      localStorage.removeItem('register_failed_checks');

      // Jika NIK valid dan belum daftar, isi form otomatis dan lanjut ke Tahap 2
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
  // TAHAP 2: PROSES PENDAFTARAN AKUN
  // ==========================================
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // KEAMANAN: Validasi Kekuatan Password & No HP minimal
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
          status: 'pending' // Rekomendasi keamanan: Akun baru harus di-approve RT
        }]);

      if (profileError) throw profileError;

      // 3. Update status is_registered di master_warga
      const { error: updateError } = await supabase
        .from('master_warga')
        .update({ is_registered: true })
        .eq('nik', nik);

      if (updateError) throw updateError;

      // Berhasil
      setShowSuccessModal(true);

    } catch (error) {
      setErrorMsg(error.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-green-600">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Registrasi Warga</h2>
          <p className="text-sm text-gray-500 mt-2">Daftarkan akun untuk akses layanan mandiri RT.16</p>
        </div>

        {/* ========================================== */}
        {/* TAMPILAN TAHAP 1: INPUT NIK */}
        {/* ========================================== */}
        {step === 1 && (
          <form onSubmit={handleCheckNIK} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-left">Langkah 1: Cek NIK Anda untuk memastikan bahwa anda adalah warga RT 16.</label>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="Masukkan 16 Digit NIK" 
                value={nik}
                onChange={handleNikChange} 
                required 
                disabled={isLocked || isLoading}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 text-center text-lg tracking-widest outline-none disabled:bg-gray-100 disabled:opacity-60 transition-colors"
              />
            </div>
            {errorMsg && (
              <div className={`p-2 rounded text-sm font-medium text-center ${isLocked ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                <p>{errorMsg}</p>
                {isLocked && <p className="mt-1">Sisa waktu: {lockdownTimer} detik</p>}
              </div>
            )}
            <button 
              type="submit" 
              disabled={isLoading || isLocked}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:bg-green-400"
            >
              {isLoading ? 'Mengecek Database...' : isLocked ? 'Terkunci Sementara' : 'Cek NIK Saya'}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* TAMPILAN TAHAP 2: LENGKAPI DATA */}
        {/* ========================================== */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
              <p className="text-xs text-green-800 font-medium">✅ NIK Anda terdaftar. Silakan lengkapi formulir di bawah ini untuk melanjutkan.</p>
            </div>

            {/* FIELD TERKUNCI (READ-ONLY) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIK</label>
              <input 
                type="text" 
                value={nik} 
                disabled 
                className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Sesuai KK</label>
              <input 
                type="text" 
                value={formData.nama} 
                disabled 
                className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-500 font-medium cursor-not-allowed uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Lahir</label>
              <input 
                type="date" 
                value={formData.tanggal_lahir} 
                disabled 
                className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
              />
            </div>
            
            {/* FIELD YANG BISA DIISI */}
            <div className="pt-2 border-t">
              <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp / HP <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="Contoh: 08123456789" 
                value={formData.no_hp}
                onChange={handlePhoneChange} 
                required 
                className="w-full px-4 py-2 border rounded-md focus:ring-green-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Email Aktif <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                placeholder="email@contoh.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
                className="w-full px-4 py-2 border rounded-md focus:ring-green-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Buat Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Minimal 8 karakter" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required 
                  className="w-full px-4 py-2 border rounded-md focus:ring-green-500 outline-none pr-12" 
                />
                
                {/* ICON MATA (EYE ICON) */}
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-green-600 transition-colors focus:outline-none"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
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

            {errorMsg && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded">{errorMsg}</p>}
            
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => { setStep(1); setFormData({nama: '', tanggal_lahir: '', no_hp: '', email: '', password: ''}); }}
                className="w-1/3 bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Kembali
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-2/3 bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-md"
              >
                {isLoading ? 'Memproses...' : 'Buat Akun'}
              </button>
            </div>
          </form>
        )}

        <button onClick={() => router.push('/')} className="w-full mt-6 text-green-600 font-medium text-sm hover:underline">
          Sudah punya akun? Kembali ke Halaman Login
        </button>
      </div>

      {/* MODAL SUKSES */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Registrasi Berhasil!</h3>
            <p className="text-sm text-gray-600 mb-6">Akun Anda telah berhasil dibuat. Silakan login untuk masuk ke dasbor layanan mandiri.</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-green-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-green-700 shadow-lg transition-colors"
            >
              Menuju Halaman Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}