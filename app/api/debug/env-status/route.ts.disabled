import { NextResponse } from "next/server"

export async function GET() {
  // Simple environment variable check that works in both preview and production
  const envStatus = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "preview/local",

    // Check each required variable
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        startsWithHttps: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") || false,
        preview: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...`
          : "Not found",
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        isValidLength: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0) > 100,
        preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
          : "Not found",
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        isValidLength: (process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0) > 100,
        preview: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`
          : "Not found",
      },
      SLACK_WEBHOOK_URL: {
        exists: !!process.env.SLACK_WEBHOOK_URL,
        length: process.env.SLACK_WEBHOOK_URL?.length || 0,
        isValidSlackUrl: process.env.SLACK_WEBHOOK_URL?.startsWith("https://hooks.slack.com/") || false,
        preview: process.env.SLACK_WEBHOOK_URL ? `${process.env.SLACK_WEBHOOK_URL.substring(0, 30)}...` : "Not found",
      },
      UPLOAD_PASSWORD: {
        exists: !!process.env.UPLOAD_PASSWORD,
        length: process.env.UPLOAD_PASSWORD?.length || 0,
        preview: process.env.UPLOAD_PASSWORD ? "***hidden***" : "Not found",
      },
      NEXT_PUBLIC_APP_URL: {
        exists: !!process.env.NEXT_PUBLIC_APP_URL,
        length: process.env.NEXT_PUBLIC_APP_URL?.length || 0,
        preview: process.env.NEXT_PUBLIC_APP_URL || "Not found",
      },
    },

    // Overall status
    allRequiredPresent: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SLACK_WEBHOOK_URL
    ),

    // Environment context
    context: {
      isPreview: !process.env.VERCEL_ENV || process.env.VERCEL_ENV !== "production",
      isV0Preview: !process.env.VERCEL_URL, // v0 preview won't have VERCEL_URL
      deploymentUrl: process.env.VERCEL_URL || "Not available (likely v0 preview)",
      message: !process.env.VERCEL_URL
        ? "Running in v0 preview - environment variables not available"
        : "Running in Vercel deployment with environment variables",
    },
  }

  return NextResponse.json(envStatus)
}
