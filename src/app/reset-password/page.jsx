"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const router = useRouter();
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
      setMessage("Password berhasil diubah!");
      // Arahkan kembali ke halaman login setelah 2 detik
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Buat Password Baru</h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Password Baru</label>
            <div className="relative mt-1">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Minimal 6 karakter" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                minLength="6"
                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Tutup" : "Intip"}
              </button>
            </div>
          </div>

          {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
          {message && <p className="text-green-600 font-semibold text-center">{message}</p>}

          <button 
            type="submit" 
            disabled={isLoading || message !== ''}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}