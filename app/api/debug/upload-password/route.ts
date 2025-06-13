import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envPassword = process.env.UPLOAD_PASSWORD
    const fallbackPassword = "admin123"
    const actualPassword = envPassword || fallbackPassword

    return NextResponse.json({
      hasEnvPassword: !!envPassword,
      envPasswordLength: envPassword?.length || 0,
      usingFallback: !envPassword,
      actualPasswordLength: actualPassword.length,
      // For security, only show first 2 and last 2 characters
      passwordPreview:
        actualPassword.length > 4
          ? `${actualPassword.substring(0, 2)}***${actualPassword.substring(actualPassword.length - 2)}`
          : "****",
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to check password configuration" }, { status: 500 })
  }
}
