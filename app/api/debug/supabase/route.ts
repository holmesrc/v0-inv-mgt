import { NextResponse } from "next/server"
import { canUseSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check if Supabase is configured
    const isConfigured = canUseSupabase()

    if (!isConfigured) {
      return NextResponse.json({
        status: "error",
        message: "Supabase is not configured",
        env: {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      })
    }

    // Try to create a Supabase client
    try {
      const { createClient } = await import("@supabase/supabase-js")

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing required environment variables")
      }

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

      // Simple ping test - just check if we can connect
      const { data, error } = await supabase.from("settings").select("count").limit(1)

      if (error) {
        return NextResponse.json({
          status: "error",
          message: "Supabase connection failed",
          error: error.message,
        })
      }

      return NextResponse.json({
        status: "success",
        message: "Supabase connection successful",
      })
    } catch (error) {
      return NextResponse.json({
        status: "error",
        message: "Failed to create Supabase client",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Unhandled error in debug endpoint",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
