import { NextResponse } from "next/server"

// Always run as a Serverless/Node function (not Edge) for full env access
export const runtime = "nodejs"
// Ensure no ISR caching so we always get fresh env values
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Gather env values with sensible fallbacks
    const NODE_ENV = process.env.NODE_ENV ?? "unknown"
    const VERCEL_ENV = process.env.VERCEL_ENV ?? "unknown"
    const VERCEL_URL = process.env.VERCEL_URL ?? "vercel-url-not-set"
    const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "app-url-not-set"

    // Decide which URL your code should use at runtime
    const recommendedUrl =
      VERCEL_ENV === "production"
        ? NEXT_PUBLIC_APP_URL
        : NEXT_PUBLIC_APP_URL !== "app-url-not-set"
          ? NEXT_PUBLIC_APP_URL
          : `https://${VERCEL_URL}`

    return NextResponse.json(
      {
        NODE_ENV,
        VERCEL_ENV,
        VERCEL_URL,
        NEXT_PUBLIC_APP_URL,
        recommendedUrl,
      },
      { status: 200 },
    )
  } catch (err) {
    // Never throw - always return a readable error
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error",
      },
      { status: 500 },
    )
  }
}
