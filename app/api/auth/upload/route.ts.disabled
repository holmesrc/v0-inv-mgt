import { type NextRequest, NextResponse } from "next/server"

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "PHL10"

export async function POST(request: NextRequest) {
  try {
    const { password, type } = await request.json()

    if (password === UPLOAD_PASSWORD) {
      // Set a session cookie for authentication
      const response = NextResponse.json({ success: true })

      if (type === "approval") {
        response.cookies.set("approval-auth", "authenticated", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24, // 24 hours
        })
      } else {
        // Default to upload auth
        response.cookies.set("upload-auth", "authenticated", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24, // 24 hours
        })
      }

      return response
    } else {
      return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}
