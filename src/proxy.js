import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (pathname.startsWith('/dashboard')) {
    if (!user || authError) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const TWELVE_HOURS = 12 * 60 * 60
    const now = Date.now()
    const lastActiveCookie = request.cookies.get('last_active')?.value

    if (lastActiveCookie) {
      const timeElapsed = now - parseInt(lastActiveCookie, 10)
      if (timeElapsed > TWELVE_HOURS * 1000) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('expired', 'true')
        const redirectResponse = NextResponse.redirect(url)
        redirectResponse.cookies.delete('last_active')
        return redirectResponse
      }
    }

    response.cookies.set('last_active', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TWELVE_HOURS,
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (!role && !pathname.startsWith('/dashboard/warga')) {
      return NextResponse.redirect(new URL('/dashboard/warga', request.url))
    }

    if (role === 'ketua_rt' && pathname.startsWith('/dashboard/warga')) {
      return NextResponse.redirect(new URL('/dashboard/ketua', request.url))
    }

    if (role !== 'ketua_rt' && pathname.startsWith('/dashboard/ketua')) {
      return NextResponse.redirect(new URL('/dashboard/warga', request.url))
    }
  }

  if (pathname === '/' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'ketua_rt') {
      return NextResponse.redirect(new URL('/dashboard/ketua', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard/warga', request.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}

