import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get all environment variable keys (not values for security)
    const allEnvVars = process.env

    // Check specific variables we need
    const slackWebhookConfigured = !!process.env.SLACK_WEBHOOK_URL
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL

    const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      slackWebhookConfigured,
      supabaseConfigured,
      nextPublicAppUrl,
      environmentDetails: {
        hasSlackWebhook: slackWebhookConfigured,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseAnonKey: !!supabaseAnonKey,
        hasSupabaseServiceKey: !!supabaseServiceKey,
        hasNextPublicAppUrl: !!nextPublicAppUrl,
      },
      // Include all env var keys (but not values) for debugging
      allEnvVars: Object.keys(allEnvVars).reduce(
        (acc, key) => {
          // Only show safe values, hide sensitive ones
          if (key.includes("SECRET") || key.includes("KEY") || key.includes("WEBHOOK") || key.includes("PASSWORD")) {
            acc[key] = "***hidden***"
          } else {
            acc[key] = allEnvVars[key]
          }
          return acc
        },
        {} as Record<string, string>,
      ),
    })
  } catch (error) {
    console.error("Error checking environment variables:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
