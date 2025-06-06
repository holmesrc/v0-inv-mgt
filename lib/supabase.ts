import { createClient } from "@supabase/supabase-js"

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 10
  )
}

// Create client only if environment variables are available and valid
export const supabase = isSupabaseConfigured()
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null

// Server-side client for API routes
export const createServerSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")) {
    throw new Error("Invalid Supabase URL format")
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 10) {
    throw new Error("Invalid Supabase service role key")
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Helper to check if Supabase operations are available
export const canUseSupabase = () => {
  return isSupabaseConfigured() && supabase !== null
}
