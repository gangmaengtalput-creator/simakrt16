'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '../lib/supabaseClient';

export default function AutoLogout() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;

    let expiryTimeoutId;
    let sessionCheckInterval;
    let isCheckingSession = false;
    let isLoggingOut = false;
    const SESSION_CHECK_INTERVAL = 15 * 1000;
    const supabase = getSupabaseClient();

    const checkSessionAndNik = async () => {
      if (isCheckingSession || isLoggingOut) return;
      isCheckingSession = true;

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;

        const expiryStorageKey = `simakrt16:session-expiry:${user.id}`;
        const sessionExpiresAt = Number(window.localStorage.getItem(expiryStorageKey));
        if (Number.isSafeInteger(sessionExpiresAt) && sessionExpiresAt > 0) {
          clearTimeout(expiryTimeoutId);
          expiryTimeoutId = setTimeout(
            () => window.location.assign('/login?expired=true'),
            Math.max(0, sessionExpiresAt - Date.now())
          );
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nik')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile?.nik) throw new Error('NIK profil pengguna tidak ditemukan.');

        const storageKey = `simakrt16:session-nik:${user.id}`;
        const currentNik = String(profile.nik).trim();
        const loginNik = window.sessionStorage.getItem(storageKey);

        if (!loginNik) {
          window.sessionStorage.setItem(storageKey, currentNik);
          return;
        }

        if (loginNik !== currentNik) {
          isLoggingOut = true;
          const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          if (!response.ok) throw new Error('Server gagal mengakhiri sesi setelah NIK diperbarui.');
          window.sessionStorage.removeItem(storageKey);
          window.localStorage.removeItem(expiryStorageKey);
          window.location.assign('/login?nik-updated=true');
        }
      } catch (error) {
        isLoggingOut = false;
        console.error('Gagal memeriksa perubahan NIK sesi:', error);
      } finally {
        isCheckingSession = false;
      }
    };

    checkSessionAndNik();
    sessionCheckInterval = setInterval(checkSessionAndNik, SESSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(expiryTimeoutId);
      clearInterval(sessionCheckInterval);
    };
  }, [pathname]);

  return null; 
}