import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test multiple ways to access environment variables
    const envTests = {
      timestamp: new Date().toISOString(),

      // Direct process.env access
      directAccess: {
        SLACK_WEBHOOK_URL: {
          exists: !!process.env.SLACK_WEBHOOK_URL,
          length: process.env.SLACK_WEBHOOK_URL?.length || 0,
          preview: process.env.SLACK_WEBHOOK_URL ? `${process.env.SLACK_WEBHOOK_URL.substring(0, 30)}...` : "Not found",
        },
        NEXT_PUBLIC_SUPABASE_URL: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          preview: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not found",
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
          preview: process.env.SUPABASE_SERVICE_ROLE_KEY
            ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`
            : "Not found",
        },
        UPLOAD_PASSWORD: {
          exists: !!process.env.UPLOAD_PASSWORD,
          length: process.env.UPLOAD_PASSWORD?.length || 0,
          preview: process.env.UPLOAD_PASSWORD ? "***hidden***" : "Not found",
        },
      },

      // Environment detection
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_REGION: process.env.VERCEL_REGION,
        isV0Preview: !process.env.VERCEL_URL && !process.env.VERCEL_ENV,
        isVercelPreview: process.env.VERCEL_ENV === "preview",
        isProduction: process.env.VERCEL_ENV === "production",
        isDevelopment: process.env.NODE_ENV === "development",
      },

      // All environment variable keys (for debugging)
      allEnvKeys: Object.keys(process.env).sort(),

      // Count by category
      counts: {
        total: Object.keys(process.env).length,
        supabase: Object.keys(process.env).filter((key) => key.toLowerCase().includes("supabase")).length,
        slack: Object.keys(process.env).filter((key) => key.toLowerCase().includes("slack")).length,
        vercel: Object.keys(process.env).filter((key) => key.startsWith("VERCEL_")).length,
        next: Object.keys(process.env).filter((key) => key.startsWith("NEXT_")).length,
      },

      // Runtime information
      runtime: {
        platform: process.platform,
        nodeVersion: process.version,
        architecture: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    }

    return NextResponse.json({
      success: true,
      message: "Environment access test completed",
      data: envTests,
    })
  } catch (error) {
    console.error("Environment access test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
