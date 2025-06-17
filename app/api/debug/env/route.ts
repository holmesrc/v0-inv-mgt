import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get environment information
    const nodeEnv = process.env.NODE_ENV
    const vercelEnv = process.env.VERCEL_ENV
    const vercelUrl = process.env.VERCEL_URL

    // Check Supabase configuration
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey)

    // Check app URL configuration
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL

    // Get all environment variables (safe version)
    const allEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_URL: supabaseUrl ? "[SET]" : undefined,
      SUPABASE_ANON_KEY: supabaseAnonKey ? "[SET]" : undefined,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? "[SET]" : undefined,
    }

    // Detailed environment checks
    const environmentDetails = {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasNextPublicAppUrl: !!nextPublicAppUrl,
    }

    return NextResponse.json({
      nodeEnv,
      vercelEnv,
      vercelUrl,
      supabaseConfigured,
      environmentDetails,
      allEnvVars,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in environment check:", error)
    return NextResponse.json(
      {
        error: "Failed to check environment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
