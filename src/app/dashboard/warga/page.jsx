"use client";

import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DashboardWarga() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-500 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dasbor Warga</h1>
            <p className="text-gray-600">Selamat datang di portal layanan mandiri warga RT.</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Keluar
          </button>
        </div>
        
        {/* Tempat untuk menu warga nanti (misal: Lapor Kas, Surat Pengantar, dll) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-lg text-gray-700">Buat Surat Pengantar</h3>
            <p className="text-sm text-gray-500 mt-2">Layanan administrasi mandiri.</p>
          </div>
        </div>
      </div>
    </div>
  );
}