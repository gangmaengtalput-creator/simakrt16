import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    const response = NextResponse.json({ success: true })
    response.cookies.delete('session_started_at')
    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 })
  }
}
