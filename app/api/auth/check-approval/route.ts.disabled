import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get("approval-auth")

    if (authCookie?.value === "authenticated") {
      return NextResponse.json({ authenticated: true })
    } else {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
