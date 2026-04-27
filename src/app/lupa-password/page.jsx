"use client";

import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient'; 
import { useRouter } from 'next/navigation';

export default function LupaPassword() {
  const router = useRouter();
  // PERBAIKAN: Inisialisasi Supabase agar fungsi resetPasswordForEmail bisa berjalan
  const supabase = getSupabaseClient(); 

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setIsLoading(true);

    try {
      // Kirim instruksi reset password ke email
      // redirectTo akan mengarahkan user setelah mereka klik link di email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Tangkap error lain (seperti terlalu sering mencoba)
        if (error.message.includes("rate limit")) {
          setErrorMsg("Anda meminta terlalu cepat. Tunggu 1 menit sebelum mencoba lagi.");
        } else {
          setErrorMsg("Terjadi kesalahan: " + error.message);
        }
      } else {
        // Pesan diubah menjadi standar keamanan tinggi
        setMessage('Jika email Anda terdaftar di sistem kami, tautan untuk mereset password telah dikirim. Silakan cek kotak masuk atau folder Spam Anda.');
        setEmail(''); // Kosongkan form
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND DECORATION MEWAH (DIUBAH MENJADI BIRU BERSIH) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* KARTU FORM GLASSMORPHISM ELEGANT */}
      <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[440px] border border-white/50 relative z-10 animate-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
          
          {/* LOGO MAENG DITAMBAHKAN DI SINI */}
          <div className="flex items-center justify-center mx-auto mb-6">
            <img 
              src="/logo-maeng.png" 
              alt="Logo SIMAK RT Maeng" 
              className="w-24 h-auto object-contain drop-shadow-md" 
            />
          </div>

          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Lupa Sandi?</h2>
          <p className="mt-3 text-sm text-gray-500 font-medium leading-relaxed">
            Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan untuk membuat kata sandi baru Anda.
          </p>
        </div>
        
        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Alamat Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <input 
                type="email" 
                placeholder="contoh: warga@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:opacity-60 transition-all"
              />
            </div>
          </div>

          {/* ALERT PESAN ERROR (Elegan) */}
          {errorMsg && (
            <div className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}
          
          {/* ALERT PESAN SUKSES (Elegan) */}
          {message && (
            <div className="p-4 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <p className="leading-relaxed">{message}</p>
              </div>
            </div>
          )}

          {/* TOMBOL SUBMIT WARNA BIRU SOLID */}
          <button 
            type="submit" 
            disabled={isLoading || message !== ''}
            className={`w-full py-4 px-4 rounded-xl text-base font-black text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2 ${
              isLoading || message !== '' 
              ? 'bg-blue-400 cursor-not-allowed shadow-none' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-[0_8px_20px_rgb(37,99,235,0.2)] hover:shadow-[0_8px_25px_rgb(37,99,235,0.4)]'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Mengirim Tautan...
              </>
            ) : message !== '' ? 'Tautan Terkirim' : 'Kirim Tautan Reset'}
          </button>

          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <button onClick={() => router.push('/login')} type="button" className="text-sm text-gray-500 font-medium hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              <span className="font-bold">Kembali ke Halaman Login</span>
            </button>
          </div>
        </form>
      </div>

      <div className="absolute bottom-6 text-center text-xs text-gray-500/50 font-medium">
        &copy; {new Date().getFullYear()} SIMAK RT. Hak Cipta Dilindungi.
      </div>
    </div>
  );
}