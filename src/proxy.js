import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  // 1. Buat response dasar Next.js
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // 2. Inisialisasi Supabase Client khusus untuk Proxy
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Perbarui cookie di request
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // Perbarui response dasar
          supabaseResponse = NextResponse.next({ request })
          
          // Set cookie ke response DENGAN options lengkap (path, maxAge, dll)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // 3. Ambil data sesi User dari Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // --- FUNGSI KRUSIAL: Membawa Cookie secara utuh saat Redirect ---
  const redirectWithCookies = (url) => {
    const response = NextResponse.redirect(url)
    // Salin SEMUA cookie (beserta options-nya) dari supabaseResponse ke response redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // --- LOGIKA PROTEKSI & ROUTING APLIKASI ---

  // A. Jika mengakses /login tapi SUDAH login
  if (pathname === '/login' && user && !authError) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const dashboardPath = profile?.role === 'ketua_rt' ? '/dashboard/ketua' : '/dashboard/warga'
    return redirectWithCookies(new URL(dashboardPath, request.url))
  }

  // B. Jika mengakses /dashboard
  if (pathname.startsWith('/dashboard')) {
    // Jika BELUM login, lempar ke halaman login
    if (!user || authError) {
      return redirectWithCookies(new URL('/login', request.url))
    }

    // Fitur Auto Logout 12 Jam
    const TWELVE_HOURS = 12 * 60 * 60
    const now = Date.now()
    const lastActiveCookie = request.cookies.get('last_active')?.value

    if (lastActiveCookie) {
      const timeElapsed = now - parseInt(lastActiveCookie, 10)
      if (timeElapsed > TWELVE_HOURS * 1000) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('expired', 'true')
        
        const response = redirectWithCookies(url)
        response.cookies.delete('last_active') // Bersihkan cookie expired
        return response
      }
    }

    // Set/Perbarui cookie last_active
    supabaseResponse.cookies.set({
      name: 'last_active',
      value: now.toString(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TWELVE_HOURS,
    })

    // Proteksi Hak Akses Role (Ketua RT vs Warga)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (!role && !pathname.startsWith('/dashboard/warga')) {
      return redirectWithCookies(new URL('/dashboard/warga', request.url))
    }
    if (role === 'ketua_rt' && pathname.startsWith('/dashboard/warga')) {
      return redirectWithCookies(new URL('/dashboard/ketua', request.url))
    }
    if (role !== 'ketua_rt' && pathname.startsWith('/dashboard/ketua')) {
      return redirectWithCookies(new URL('/dashboard/warga', request.url))
    }
  }

  // C. Jika mengakses Root (/) dan SUDAH login
  if (pathname === '/' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'ketua_rt') {
      return redirectWithCookies(new URL('/dashboard/ketua', request.url))
    }
    return redirectWithCookies(new URL('/dashboard/warga', request.url))
  }

  // Biarkan request lain (seperti CSS, gambar) lewat
  return supabaseResponse
}

// Konfigurasi Matcher: Cegat rute halaman utama, kecualikan file statis/gambar
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}