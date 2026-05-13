'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// MENGGUNAKAN RELATIVE PATH
import { getSupabaseClient } from '../lib/supabaseClient';

export default function AutoLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;

    let timeoutId;
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;

    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login?expired=true');
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, TWELVE_HOURS);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [pathname, router, supabase]);

  return null; 
}