import { type NextRequest, NextResponse } from "next/server"

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "admin123"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Add debugging logs
    console.log("Upload auth attempt:", {
      receivedPassword: password,
      expectedPassword: UPLOAD_PASSWORD,
      passwordsMatch: password === UPLOAD_PASSWORD,
      receivedType: typeof password,
      expectedType: typeof UPLOAD_PASSWORD,
      receivedLength: password?.length,
      expectedLength: UPLOAD_PASSWORD?.length,
    })

    if (password === UPLOAD_PASSWORD) {
      console.log("✅ Password authentication successful")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Password authentication failed")
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
    }
  } catch (error) {
    console.error("Upload auth error:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
