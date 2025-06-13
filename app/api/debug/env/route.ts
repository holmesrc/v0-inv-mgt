import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get relevant environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ? "SET" : "NOT SET",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "NOT SET",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "SET" : "NOT SET",
      UPLOAD_PASSWORD: process.env.UPLOAD_PASSWORD ? "SET" : "NOT SET",
    }

    // Additional debugging info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "unknown",
    }

    return NextResponse.json({
      success: true,
      variables: envVars,
      debug: debugInfo,
      message: "Environment variables retrieved successfully",
    })
  } catch (error) {
    console.error("Error retrieving environment variables:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to retrieve environment variables",
      },
      { status: 500 },
    )
  }
}
