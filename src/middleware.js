// File: src/middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 1. Inisialisasi response awal Next.js
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Buat Supabase Client khusus untuk Server/Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Ambil data user dari sesi (berdasarkan Cookies)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 4. LOGIKA KEAMANAN 1: Cek Status Login
  if (!user && path.startsWith('/dashboard')) {
    // Jika belum login, tendang ke halaman login
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 5. LOGIKA KEAMANAN 2: Cek Role / Jabatan (Jika sudah login)
  if (user && path.startsWith('/dashboard')) {
    // Ambil role user dari tabel profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Skenario A: Ketua RT mencoba masuk ke dashboard warga
    if (role === 'ketua_rt' && path.startsWith('/dashboard/warga')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/ketua' // Kembalikan ke habitatnya
      return NextResponse.redirect(url)
    }

    // Skenario B: Warga biasa mencoba masuk ke dashboard ketua RT
    if (role !== 'ketua_rt' && path.startsWith('/dashboard/ketua')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/warga' // Kembalikan ke habitatnya
      return NextResponse.redirect(url)
    }
  }

  // Jika semua pengecekan aman, izinkan masuk ke halaman yang dituju
  return supabaseResponse
}

// MATCHER: Tentukan rute mana saja yang akan dijaga oleh Satpam (Middleware) ini
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}