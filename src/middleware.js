// File: src/middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // 1. Inisialisasi Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Ambil User Sesi Saat Ini
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // ===== PROTEKSI HALAMAN DASHBOARD =====
  if (pathname.startsWith('/dashboard')) {
    
    // Jika tidak ada user -> Tendang ke Login
    if (!user || authError) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // ==========================================
    // 🔒 AUTO-LOGOUT CHECK (INACTIVITY 5 MENIT)
    // ==========================================
    const FIVE_MINUTES = 5 * 60 * 1000;
    const now = Date.now();
    const lastActiveCookie = request.cookies.get('last_active')?.value;

    if (lastActiveCookie) {
      const timeElapsed = now - parseInt(lastActiveCookie, 10);
      if (timeElapsed > FIVE_MINUTES) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('expired', 'true');
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('last_active');
        return redirectResponse;
      }
    }

    // Perbarui waktu aktif (agar tidak logout jika user masih nge-klik)
    response.cookies.set('last_active', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    // ==========================================

    // ==========================================
    // 🔑 AMBIL ROLE DARI TABEL PROFILES (PENTING!)
    // ==========================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // CCTV Debugging: Cek di Terminal VS Code Anda!
    console.log("=== DEBUG MIDDLEWARE ===");
    console.log("User ID:", user.id);
    console.log("Role di Database:", role);
    if (profileError) console.error("Error baca profile:", profileError.message);

    // Default ke warga jika belum ada role
    if (!role) {
      console.warn('User tanpa role terdeteksi, diarahkan ke warga.');
      if (!pathname.startsWith('/dashboard/warga')) {
        return NextResponse.redirect(new URL('/dashboard/warga', request.url))
      }
    }

    // Skenario A: Ketua RT nyasar ke dashboard warga -> Kembalikan ke Ketua
    if (role === 'ketua_rt' && pathname.startsWith('/dashboard/warga')) {
      return NextResponse.redirect(new URL('/dashboard/ketua', request.url))
    }

    // Skenario B: Warga biasa mencoba masuk ke dashboard ketua -> Usir ke Warga
    if (role !== 'ketua_rt' && pathname.startsWith('/dashboard/ketua')) {
      return NextResponse.redirect(new URL('/dashboard/warga', request.url))
    }
  }

  // ===== REDIRECT PINTAR DARI HALAMAN DEPAN (/) =====
  if (pathname === '/' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'ketua_rt') {
      return NextResponse.redirect(new URL('/dashboard/ketua', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard/warga', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}