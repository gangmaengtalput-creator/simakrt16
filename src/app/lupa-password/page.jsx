"use client";

import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient'; 
import { useRouter } from 'next/navigation';

export default function LupaPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setIsLoading(true);

    // Kirim instruksi reset password ke email
    // redirectTo akan mengarahkan user setelah mereka klik link di email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Lupa Password</h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Masukkan alamat email yang Anda gunakan saat mendaftar. Kami akan mengirimkan tautan untuk membuat password baru.
        </p>
        
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Alamat Email</label>
            <input 
              type="email" 
              placeholder="contoh: warga@gmail.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="mt-1 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Alert Pesan Error */}
          {errorMsg && (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-red-600 text-sm text-center font-medium">{errorMsg}</p>
            </div>
          )}
          
          {/* Alert Pesan Sukses */}
          {message && (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <p className="text-green-700 text-sm text-center font-medium">{message}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
          >
            {isLoading ? 'Mengecek...' : 'Kirim Link Reset'}
          </button>

          <div className="text-center mt-4">
            <a href="/login" className="text-sm text-blue-600 hover:underline font-medium">
              &larr; Kembali ke halaman Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}