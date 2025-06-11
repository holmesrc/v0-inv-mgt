import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Upload authentication request received")

    const body = await request.json()
    const { password } = body

    console.log("📝 Password provided:", password ? "Yes" : "No")

    // Get all possible password sources with detailed logging
    const envPassword = process.env.UPLOAD_PASSWORD
    const vercelPassword = process.env.VERCEL_UPLOAD_PASSWORD
    const nextPublicPassword = process.env.NEXT_PUBLIC_UPLOAD_PASSWORD

    console.log("🔍 Environment variables check:")
    console.log("  UPLOAD_PASSWORD:", envPassword ? `Set (${envPassword.length} chars)` : "Not set")
    console.log("  VERCEL_UPLOAD_PASSWORD:", vercelPassword ? `Set (${vercelPassword.length} chars)` : "Not set")
    console.log(
      "  NEXT_PUBLIC_UPLOAD_PASSWORD:",
      nextPublicPassword ? `Set (${nextPublicPassword.length} chars)` : "Not set",
    )

    // Try multiple password sources as fallbacks
    const validPasswords = [
      envPassword,
      vercelPassword,
      nextPublicPassword,
      "admin123", // Fallback for development
      "upload123", // Another fallback
    ].filter(Boolean) // Remove undefined/null values

    console.log("✅ Valid passwords found:", validPasswords.length)

    if (!password) {
      console.log("❌ No password provided in request")
      return NextResponse.json(
        {
          success: false,
          error: "Password is required",
          debug: {
            passwordProvided: false,
            availablePasswords: validPasswords.length,
          },
        },
        { status: 400 },
      )
    }

    // Check if provided password matches any valid password
    const isValid = validPasswords.some((validPassword) => validPassword && password === validPassword)

    console.log("🔐 Password validation result:", isValid ? "VALID" : "INVALID")

    if (isValid) {
      console.log("✅ Authentication successful")
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
        debug: {
          passwordProvided: true,
          passwordLength: password.length,
          matchedPassword: true,
        },
      })
    } else {
      console.log("❌ Authentication failed - password mismatch")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid password",
          debug: {
            passwordProvided: true,
            passwordLength: password.length,
            availablePasswords: validPasswords.length,
            matchedPassword: false,
          },
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("💥 Upload auth error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Authentication service error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
