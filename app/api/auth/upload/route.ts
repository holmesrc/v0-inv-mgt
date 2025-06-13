import { type NextRequest, NextResponse } from "next/server"

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "admin123"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    console.log("Upload auth attempt:", {
      passwordProvided: !!password,
      passwordLength: password?.length || 0,
      expectedLength: UPLOAD_PASSWORD.length,
      hasEnvVar: !!process.env.UPLOAD_PASSWORD,
      passwordsMatch: password === UPLOAD_PASSWORD,
      // For debugging - remove in production
      expectedPreview:
        UPLOAD_PASSWORD.length > 4
          ? `${UPLOAD_PASSWORD.substring(0, 2)}***${UPLOAD_PASSWORD.substring(UPLOAD_PASSWORD.length - 2)}`
          : "****",
      providedPreview:
        password && password.length > 4
          ? `${password.substring(0, 2)}***${password.substring(password.length - 2)}`
          : "****",
    })

    if (password === UPLOAD_PASSWORD) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid password",
          debug: {
            expectedLength: UPLOAD_PASSWORD.length,
            providedLength: password?.length || 0,
            hasEnvVar: !!process.env.UPLOAD_PASSWORD,
          },
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Upload auth error:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
