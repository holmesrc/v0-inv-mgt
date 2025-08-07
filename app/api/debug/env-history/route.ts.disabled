import { NextResponse } from "next/server"

export async function GET() {
  const timestamp = new Date().toISOString()

  // Comprehensive environment detection
  const envInfo = {
    timestamp,

    // Runtime environment detection
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelRegion: process.env.VERCEL_REGION,
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    },

    // Check if we're in different types of environments
    environmentType: {
      isProduction: process.env.VERCEL_ENV === "production",
      isPreview: process.env.VERCEL_ENV === "preview",
      isDevelopment: process.env.VERCEL_ENV === "development",
      isLocal: !process.env.VERCEL_URL,
      isV0Preview: !process.env.VERCEL_URL && !process.env.VERCEL_ENV,
      isVercelDeployment: !!process.env.VERCEL_URL,
    },

    // Environment variable availability
    envVarAccess: {
      totalEnvVars: Object.keys(process.env).length,
      hasVercelVars: Object.keys(process.env).some((key) => key.startsWith("VERCEL_")),
      hasNextVars: Object.keys(process.env).some((key) => key.startsWith("NEXT_")),
      hasCustomVars: !!(process.env.SLACK_WEBHOOK_URL || process.env.UPLOAD_PASSWORD),
      hasSupabaseVars: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY),
    },

    // Specific variable checks
    criticalVars: {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        source: process.env.NEXT_PUBLIC_SUPABASE_URL ? "environment" : "missing",
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      },
      SLACK_WEBHOOK_URL: {
        exists: !!process.env.SLACK_WEBHOOK_URL,
        source: process.env.SLACK_WEBHOOK_URL ? "environment" : "missing",
        length: process.env.SLACK_WEBHOOK_URL?.length || 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        source: process.env.SUPABASE_SERVICE_ROLE_KEY ? "environment" : "missing",
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
    },

    // Browser/client-side detection (for NEXT_PUBLIC vars)
    clientSideAccess: {
      note: "NEXT_PUBLIC vars should be available on client-side",
      nextPublicVarsCount: Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_")).length,
    },

    // Possible reasons for change
    diagnostics: {
      likelyV0Preview: !process.env.VERCEL_URL && !process.env.VERCEL_ENV,
      likelyVercelPreview: process.env.VERCEL_ENV === "preview" && !!process.env.VERCEL_URL,
      likelyLocalDev: process.env.NODE_ENV === "development" && !process.env.VERCEL_URL,
      likelyProduction: process.env.VERCEL_ENV === "production",
    },

    // Historical context
    possibleReasons: [
      "v0 preview environment isolation has been strengthened",
      "You were previously testing in a Vercel preview deployment, not pure v0 preview",
      "Browser caching was serving old responses with environment data",
      "App fallback logic was masking missing environment variables",
      "Different version of v0 preview environment was being used",
    ],
  }

  return NextResponse.json(envInfo)
}
