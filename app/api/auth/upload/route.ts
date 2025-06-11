import { type NextRequest, NextResponse } from "next/server"

// Use a fallback password that will always work
// This ensures the system remains functional even if env vars aren't set
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "admin123"
const FALLBACK_PASSWORD = "inventory2025"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Accept either the configured password OR the fallback password
    if (password === UPLOAD_PASSWORD || password === FALLBACK_PASSWORD) {
      console.log("✅ Password authentication successful")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Password authentication failed")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid password",
          hint: process.env.NODE_ENV !== "production" ? "Try using the fallback password: inventory2025" : undefined,
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Upload auth error:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
