import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Upload auth debug not available in production for security",
      },
      { status: 403 },
    )
  }

  const uploadPassword = process.env.UPLOAD_PASSWORD

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    uploadPassword: {
      exists: !!uploadPassword,
      length: uploadPassword?.length || 0,
      value: uploadPassword, // Only in non-production
      type: typeof uploadPassword,
    },
  })
}
