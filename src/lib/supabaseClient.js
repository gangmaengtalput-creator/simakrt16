import { createBrowserClient } from '@supabase/ssr'

let client = null

export function getSupabaseClient() {
  // 1. Reuse instance (predictable & optimal)
  if (client) return client

  // 2. Ambil env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 3. Hard fail jika env tidak ada (hindari silent bug)
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing')
  }

  // 4. Create client (browser-safe)
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}