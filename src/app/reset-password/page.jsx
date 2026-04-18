"use client";

import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const router = useRouter();
  const supabase = getSupabaseClient(); // Diperbarui menggunakan getter agar konsisten dan aman
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setIsLoading(true);

    // Update data user yang sedang aktif (dari link email) dengan password baru
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg("Gagal mereset password: " + error.message);
    } else {
      setMessage("Kata sandi berhasil diubah! Mengarahkan ke halaman login...");
      // Arahkan kembali ke halaman login setelah 2 detik
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION MEWAH */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* KARTU FORM GLASSMORPHISM ELEGANT */}
      <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[440px] border border-white/50 relative z-10 animate-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 rotate-3">
            <svg className="w-8 h-8 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sandi Baru</h2>
          <p className="mt-3 text-sm text-gray-500 font-medium leading-relaxed">
            Silakan buat kata sandi baru Anda. Pastikan menggunakan kombinasi yang kuat dan mudah diingat.
          </p>
        </div>
        
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Kata Sandi Baru</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Minimal 6 karakter" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                minLength="6"
                disabled={isLoading || message !== ''}
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 disabled:opacity-60 transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || message !== ''}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors focus:outline-none disabled:opacity-50"
                title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              >
                {showPassword ? (
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.391 5.302 9.26 1 15.75 1c3.24 0 6.21 1.05 8.64 2.822a1.012 1.012 0 010 .644C20.609 18.698 14.74 23 9.25 23c-3.24 0-6.21-1.05-8.64-2.822z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ALERT PESAN ERROR */}
          {errorMsg && (
            <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}
          
          {/* ALERT PESAN SUKSES */}
          {message && (
            <div className="p-4 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <p className="leading-relaxed">{message}</p>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || message !== ''}
            className={`w-full py-4 px-4 rounded-xl text-base font-black text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2 ${
              isLoading || message !== '' 
              ? 'bg-emerald-400 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-[0_8px_20px_rgb(16,185,129,0.2)] hover:shadow-[0_8px_25px_rgb(16,185,129,0.4)]'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Menyimpan...
              </>
            ) : message !== '' ? 'Berhasil' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      </div>

      <div className="absolute bottom-6 text-center text-xs text-gray-500/50 font-medium">
        &copy; {new Date().getFullYear()} SIMAK RT. Hak Cipta Dilindungi.
      </div>
    </div>
  );
}