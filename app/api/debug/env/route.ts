import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Environment debug not available in production for security",
      },
      { status: 403 },
    )
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configured" : "❌ Missing",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Configured" : "❌ Missing",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Configured" : "❌ Missing",
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL ? "✅ Configured" : "❌ Missing",
    },
    app: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "❌ Not set",
    },
    deployment: {
      url: process.env.VERCEL_URL,
      branch: process.env.VERCEL_GIT_COMMIT_REF,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
    },
  })
}
