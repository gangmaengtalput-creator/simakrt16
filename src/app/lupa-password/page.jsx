"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
      setErrorMsg(error.message);
    } else {
      setMessage('Tautan untuk mereset password telah dikirim. Silakan cek kotak masuk (Inbox) atau folder Spam di email Anda.');
      setEmail(''); // Kosongkan form
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
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
              className="mt-1 w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
          {message && <p className="text-green-600 text-sm text-center bg-green-50 p-2 rounded border border-green-200">{message}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>

          <div className="text-center mt-4">
            <a href="/login" className="text-sm text-blue-600 hover:underline">Kembali ke halaman Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}