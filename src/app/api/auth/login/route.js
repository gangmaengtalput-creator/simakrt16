import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export async function POST(request) {
  try {
    const { nik, password } = await request.json()

    if (!nik || !password) {
      return NextResponse.json(
        { error: 'NIK dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    const { data: profileData, error: profileError } = await supabase.rpc(
      'get_login_info_by_nik',
      { input_nik: String(nik).trim() }
    )

    if (profileError || !profileData?.length) {
      return NextResponse.json(
        { error: 'NIK Anda belum terdaftar di sistem kami.' },
        { status: 404 }
      )
    }

    const profile = profileData[0]

    if (profile.status === 'pending') {
      return NextResponse.json(
        { error: 'Akun Anda sedang diverifikasi oleh Ketua RT. Harap bersabar.' },
        { status: 403 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Password yang Anda masukkan salah.' },
        { status: 401 }
      )
    }

    let role = profile.role

    if (!role && authData?.user?.id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      role = userProfile?.role
    }

    const redirectTo = role === 'ketua_rt' ? '/dashboard/ketua' : '/dashboard/warga'

    return NextResponse.json({ success: true, redirectTo })
  } catch (err) {
    console.error('Login API error:', err)
    return NextResponse.json(
      { error: 'Gagal menghubungi server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
